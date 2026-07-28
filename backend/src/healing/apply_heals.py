"""
backend/src/healing/apply_heals.py

Reads inline_heals.json from a test run and patches BOTH the plain spec and
the healed spec to use the healed locators.

After this runs, the broken locator is gone from both files. Subsequent runs
won't need heal for those steps.

Safety:
  - Original files are backed up with .bak.<timestamp> suffix
  - JS syntax is validated after every rewrite; if invalid, restore from backup
  - Skips heals with status != "healed" (failures, cached entries, etc.)
  - Skips when no obvious match in the source file (avoids wild replacements)
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any, Optional


# =============================================================================
# Public API
# =============================================================================

def apply_heals_for_run(
    project_path: str | Path,
    plain_spec_path: Optional[str | Path] = None,
) -> dict[str, Any]:
    """
    Top-level entry point. Reads inline_heals.json from the project's
    test-results folder and applies all successful heals to both spec files.

    Args:
      project_path: absolute path to the project folder (where test-results/ lives)
      plain_spec_path: optional explicit path to the plain spec. If None, we
        try to infer it from the heal log entries (not always reliable).

    Returns:
      {
        "ok": True/False,
        "applied": int,
        "skipped": int,
        "plain_path": "...",
        "healed_path": "...",
        "backups": [...],
        "changes": [{step, action, original, healed}, ...],
        "errors": [...]
      }
    """
    project_root = Path(project_path).resolve()
    heals_file = project_root / "test-results" / "inline_heals.json"

    if not heals_file.exists():
        return _error_result("inline_heals.json not found", project_path=project_path)

    try:
        heals = json.loads(heals_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return _error_result(f"Failed to parse inline_heals.json: {exc}")

    # Keep only successful, non-cached heals
    actionable = [
        h for h in heals
        if h.get("status") == "healed"
        and h.get("reason") != "cached"
        and h.get("original_locator")
        and h.get("healed_locator")
    ]

    if not actionable:
        return {
            "ok": True,
            "applied": 0,
            "skipped": len(heals),
            "message": "No actionable heals to apply.",
            "errors": [],
            "changes": [],
            "backups": [],
        }

    # Deduplicate by step label (same step often heals for both 'visible' and 'action')
    actionable_sorted = sorted(
        actionable,
        key=lambda h: h.get("timestamp", ""),
    )
    by_step: dict[str, dict[str, Any]] = {}
    for entry in actionable_sorted:
        step = entry.get("step", "")
        if step:
            by_step[step] = entry 

    # Locate the healed file and infer plain file from it
    healed_path = _find_healed_spec_path(project_root, by_step, plain_spec_path)
    if not healed_path:
        return _error_result(
            "Could not locate the healed spec file. "
            "Pass plain_spec_path explicitly."
        )

    if plain_spec_path:
        plain_path = Path(plain_spec_path).resolve()
    else:
        plain_path = _infer_plain_from_healed(healed_path)

    if not plain_path or not plain_path.exists():
        return _error_result(f"Plain spec not found at {plain_path}")

    if not healed_path.exists():
        return _error_result(f"Healed spec not found at {healed_path}")

    # Apply to both files
    changes: list[dict[str, Any]] = []
    errors: list[str] = []
    backups: list[str] = []

    healed_result = _apply_to_healed_spec(healed_path, by_step)
    if healed_result["backup"]:
        backups.append(healed_result["backup"])
    if healed_result["errors"]:
        errors.extend(healed_result["errors"])
    changes.extend(healed_result["changes"])

    plain_result = _apply_to_plain_spec(plain_path, by_step)
    if plain_result["backup"]:
        backups.append(plain_result["backup"])
    if plain_result["errors"]:
        errors.extend(plain_result["errors"])
    # Only count plain changes if they ADDED beyond what healed already covered
    # We report total unique changes
    applied_count = len({
        (c["step"], c["original_locator"]) for c in changes
    })

    return {
        "ok": True,
        "applied": applied_count,
        "skipped": len(heals) - len(actionable),
        "plain_path": str(plain_path),
        "healed_path": str(healed_path),
        "backups": backups,
        "changes": changes,
        "errors": errors,
        "message": f"Applied {applied_count} locator update(s) to both files." if applied_count else "No matching lines found to update.",
    }


# =============================================================================
# Healed-spec patcher
# =============================================================================

def _apply_to_healed_spec(healed_path: Path, by_step: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """
    For each step, find heal(page, '<step>', ...) lines in the healed file
    and replace the locator factory body.
    """
    backup = _make_backup(healed_path)
    original_text = healed_path.read_text(encoding="utf-8")
    new_text = original_text
    changes: list[dict[str, Any]] = []
    errors: list[str] = []

    for step_label, entry in by_step.items():
        original_loc = entry["original_locator"]
        healed_loc = entry["healed_locator"]

        # Build the expected locator-factory body in the heal() call.
        # Pattern: () => page.<original_loc>
        # Original heal log shows original_locator without the leading "page."
        # (e.g. "locator('[data-test=\"x\"]')"), so we add it.
        original_chain = _ensure_page_prefix(original_loc)
        healed_chain = _ensure_page_prefix(healed_loc)

        # Try to find the locator factory body inside a heal() call with this step label
        # Pattern: `heal(page, '<step_label>', '<action>', <value>, () => <expr>)`
        # We match the arrow function and replace its body.
        pattern = re.compile(
            r"heal\(\s*page\s*,\s*"                          # heal(page,
            + r"(['\"`])" + re.escape(step_label) + r"\1\s*,\s*"  # 'step_label',
            + r"(['\"`])(\w+)\2\s*,\s*"                       # 'action',
            + r"([^,]+)\s*,\s*"                               # value
            + r"\(\)\s*=>\s*"                                 # () =>
            + r"(.+?)"                                        # locator expression (captured)
            + r"\s*\)\s*;?\s*$",                              # )
            re.MULTILINE
        )

        def replace(match: re.Match[str]) -> str:
            existing_chain = match.group(5).strip()
            if existing_chain == healed_chain:
                return match.group(0)  # already applied, skip
            replaced = match.group(0).replace(existing_chain, healed_chain, 1)
            return replaced

        before = new_text
        new_text = pattern.sub(replace, new_text)
        if new_text != before:
            changes.append({
                "file": str(healed_path),
                "step": step_label,
                "action": entry.get("action", ""),
                "original_locator": original_chain,
                "healed_locator": healed_chain,
            })

    # If nothing changed, no need to write. Also remove the unused backup.
    if new_text == original_text:
        try:
            backup.unlink(missing_ok=True)
        except Exception:
            pass
        return {"backup": None, "changes": changes, "errors": errors}

    # Validate syntax before saving
    syntax_error = _validate_js_syntax(new_text, healed_path.suffix)
    if syntax_error:
        errors.append(f"Healed file rewrite failed JS syntax check: {syntax_error}")
        # Keep the backup so the user can manually restore if needed.
        return {"backup": str(backup), "changes": [], "errors": errors}

    healed_path.write_text(new_text, encoding="utf-8")
    # Clean up the backup since the apply succeeded — no need to keep it
    try:
        backup.unlink(missing_ok=True)
        backup_kept = None
    except Exception:
        backup_kept = str(backup)
    return {"backup": backup_kept, "changes": changes, "errors": errors}


# =============================================================================
# Plain-spec patcher
# =============================================================================

def _apply_to_plain_spec(plain_path: Path, by_step: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """
    For each step, find the line in the plain file that uses the original
    locator and replace it with the healed locator.

    We anchor on the locator text itself since the plain file doesn't have
    step labels.
    """
    backup = _make_backup(plain_path)
    original_text = plain_path.read_text(encoding="utf-8")
    new_text = original_text
    changes: list[dict[str, Any]] = []
    errors: list[str] = []

    for step_label, entry in by_step.items():
        original_loc = entry["original_locator"]
        healed_loc = entry["healed_locator"]

        original_chain = _ensure_page_prefix(original_loc)
        healed_chain = _ensure_page_prefix(healed_loc)

        # Direct string replace, but only the FIRST occurrence to avoid
        # mass-replacing if the same locator is used twice.
        if original_chain in new_text:
            new_text = new_text.replace(original_chain, healed_chain, 1)
            changes.append({
                "file": str(plain_path),
                "step": step_label,
                "action": entry.get("action", ""),
                "original_locator": original_chain,
                "healed_locator": healed_chain,
            })
        else:
            # Try without the page prefix (some logs may not include it)
            bare_original = original_loc
            bare_healed = healed_loc
            if bare_original in new_text:
                new_text = new_text.replace(bare_original, bare_healed, 1)
                changes.append({
                    "file": str(plain_path),
                    "step": step_label,
                    "action": entry.get("action", ""),
                    "original_locator": bare_original,
                    "healed_locator": bare_healed,
                })

    # If nothing changed, no need to write. Also remove the unused backup.
    if new_text == original_text:
        try:
            backup.unlink(missing_ok=True)
        except Exception:
            pass
        return {"backup": None, "changes": changes, "errors": errors}

    syntax_error = _validate_js_syntax(new_text, plain_path.suffix)
    if syntax_error:
        errors.append(f"Plain file rewrite failed JS syntax check: {syntax_error}")
        # Keep the backup so the user can manually restore if needed.
        return {"backup": str(backup), "changes": [], "errors": errors}

    plain_path.write_text(new_text, encoding="utf-8")
    # Clean up the backup since the apply succeeded — no need to keep it
    try:
        backup.unlink(missing_ok=True)
        backup_kept = None
    except Exception:
        backup_kept = str(backup)
    return {"backup": backup_kept, "changes": changes, "errors": errors}


# =============================================================================
# Helpers
# =============================================================================

def _ensure_page_prefix(locator_text: str) -> str:
    """The heal log stores locators like 'locator(...)' or 'page.locator(...)'.
    Normalize to always have the page prefix."""
    text = locator_text.strip()
    if text.startswith("page."):
        return text
    if text.startswith("locator(") or text.startswith("getBy"):
        return f"page.{text}"
    return text


def _find_healed_spec_path(
    project_root: Path,
    by_step: dict[str, dict[str, Any]],
    plain_spec_path: Optional[str | Path],
) -> Optional[Path]:
    """Find the healed spec file. Prefer healed/<suite>/<name>.healed.spec.js
    layout. Falls back to legacy flat healed/<name>.healed.spec.js."""
    healed_root = project_root / "healed"
    if not healed_root.exists():
        return None

    # Strategy 1: derive from plain_spec_path if provided
    if plain_spec_path:
        plain = Path(plain_spec_path).resolve()
        name = plain.name
        suite = plain.parent.name.lower()
        if name.endswith(".spec.js"):
            stem = name[: -len(".spec.js")]
            healed_name = f"{stem}.healed.spec.js"
        else:
            healed_name = f"{name}.healed"

        for candidate in [
            healed_root / suite / healed_name if suite in ("sanity", "regression") else None,
            healed_root / healed_name,
        ]:
            if candidate and candidate.exists():
                return candidate

    # Strategy 2: just find the most recently modified .healed.spec.js
    candidates = sorted(
        healed_root.rglob("*.healed.spec.js"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return candidates[0] if candidates else None


def _infer_plain_from_healed(healed_path: Path) -> Optional[Path]:
    """Given healed/<suite>/<name>.healed.spec.js, find the matching
    <suite>/<name>.spec.js under the project root."""
    name = healed_path.name
    if not name.endswith(".healed.spec.js"):
        return None
    plain_name = name[: -len(".healed.spec.js")] + ".spec.js"

    # healed/<suite>/<file> → walk back to project root
    parent = healed_path.parent
    suite = parent.name.lower()
    if suite in ("sanity", "regression"):
        project_root = parent.parent.parent  # healed/<suite>/ → healed → project
        return project_root / suite / plain_name
    # flat layout: healed/<file>
    project_root = parent.parent  # healed → project
    # Try both possible suites
    for suite_name in ("sanity", "regression"):
        candidate = project_root / suite_name / plain_name
        if candidate.exists():
            return candidate
    return project_root / plain_name


def _make_backup(file_path: Path) -> Path:
    """Create a timestamped .bak copy of the file."""
    ts = time.strftime("%Y%m%d-%H%M%S")
    backup_path = file_path.with_suffix(file_path.suffix + f".bak.{ts}")
    shutil.copy2(file_path, backup_path)
    return backup_path


def _validate_js_syntax(content: str, suffix: str) -> Optional[str]:
    """Write content to a temp file and run `node --check`. Return error
    string or None if valid."""
    if suffix not in (".js", ".mjs", ".cjs"):
        return None  # only check JavaScript

    tmp_path = Path.cwd() / f".syntax_check_{int(time.time() * 1000)}.js"
    try:
        tmp_path.write_text(content, encoding="utf-8")
        result = subprocess.run(
            ["node", "--check", str(tmp_path)],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            return (result.stderr or result.stdout or "unknown syntax error").strip()
        return None
    except (subprocess.TimeoutExpired, FileNotFoundError) as exc:
        return f"node --check failed to run: {exc}"
    finally:
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass


def _error_result(message: str, **extra: Any) -> dict[str, Any]:
    return {
        "ok": False,
        "error": message,
        "applied": 0,
        "skipped": 0,
        "changes": [],
        "errors": [message],
        "backups": [],
        **extra,
    }