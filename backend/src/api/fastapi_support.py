import asyncio
import base64
import json
import os
import re
import shutil
import sys
import subprocess
import threading
import uuid
import zipfile
import random
from contextlib import suppress
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import unquote,urlparse

from fastapi import HTTPException, WebSocket
from pydantic import BaseModel, Field

with suppress(Exception):
    import tkinter as tk
    from tkinter import filedialog
with suppress(Exception):
    from faker import Faker

ROOT = Path(__file__).resolve().parents[2]
WORKSPACE_ROOT = ROOT.parent
FRONTEND_DIR = WORKSPACE_ROOT / "frontend"
PUBLIC_DIR = FRONTEND_DIR
STATIC_DIR = FRONTEND_DIR / "static"
CODEGEN_DIR = ROOT / "codegen-output"
TESTS_DIR = ROOT / "tests"
PROJECTS_ROOT = TESTS_DIR
PROJECT_PACKAGE_TEMPLATE_PATH = TESTS_DIR / "sunny_rewards" / "package.json"
RESERVED_TEST_FOLDERS = {"generated", "masked", "regression", "sanity", "smoke", "healed"}
REPORT_PATH = ROOT / "test-results" / "report.json"
WORKFLOW_STATE_PATH = CODEGEN_DIR / "latest-workflow.json"
PROJECT_REGISTRY_PATH = CODEGEN_DIR / "local-projects.json"
PROJECT_METADATA_FILE_NAME = ".project-metadata.json"
PORT = int(os.getenv("PORT", "8000"))
PROJECT_PATH: Path | None = None
PROJECT_TEST_DATA_BACKUP_FILE_NAME = "test-data.base.json"
PROJECT_FAKER_FIELDS_METADATA_KEY = "fakerFields"
PROJECT_FAKER_FIELD_MODES_METADATA_KEY = "fakerFieldModes"
FAKER_LOCALE = os.getenv("FAKER_LOCALE", "en_IN")
_FAKER: Any | None = None

DEFAULT_PROJECT_PACKAGE_JSON = {
    "name": "playwright-generated-framework",
    "private": True,
    "version": "1.0.0",
    "scripts": {
        "test": "playwright test",
        "test:sanity": "playwright test sanity --project=chromium --headed",
        "test:regression": "playwright test regression --project=chromium --headed",
    },
    "devDependencies": {
        "@playwright/test": "^1.58.2",
        "allure-playwright": "^3.7.2",
    },
}

GENERATED_PLAYWRIGHT_CONFIG = """const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: '**/*.js',
  testIgnore: '**/healed/**',
  timeout: 120000,           
  expect: {
    timeout: 1200000         
  },
  reporter: [
    ['line'],
    ['json', { outputFile: 'test-results/report.json' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', { resultsDir: 'allure-results' }],
  ],
  use: {
    actionTimeout: 60000,     
    navigationTimeout: 60000,
    headless: process.env.HEADLESS !== 'false',
    screenshot: 'only-on-failure',
    slowMo: 30000,
    // slowMo REMOVED — was adding 60s pause before every action
    trace: 'on',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', channel: 'chrome' } },
    { name: 'msedge', use: { browserName: 'chromium', channel: 'msedge' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
"""

GENERATED_JENKINSFILE = """pipeline {
  agent any
  options {
    timestamps()
  }
  parameters {
    choice(
      name: 'EXECUTION_MODE',
      choices: ['suite', 'spec'],
      description: 'suite = run sanity/regression folder, spec = run one spec file'
    )
    choice(
      name: 'BROWSER',
      choices: ['chromium', 'chrome', 'msedge', 'firefox', 'webkit'],
      description: 'Playwright project name'
    )
    booleanParam(
      name: 'HEADED',
      defaultValue: false,
      description: 'Run browser in headed mode'
    )
    choice(
      name: 'EXECUTION',
      choices: ['parallel', 'sequential'],
      description: 'parallel = multiple workers, sequential = one worker'
    )
    string(
      name: 'WORKERS',
      defaultValue: '4',
      description: 'Number of parallel workers (only used when EXECUTION=parallel)'
    )
    string(
      name: 'TARGET',
      defaultValue: 'regression',
      description: 'For suite mode use sanity or regression. For spec mode use a spec path like regression/test.spec.js'
    )
  }
  stages {
    stage('Clean Workspace') {
      steps {
        cleanWs()
        checkout scm
      }
    }
    stage('Install') {
      steps {
        powershell 'npm ci'
        powershell 'npx playwright install'
      }
    }
    stage('Run Tests') {
      steps {
        script {
          def headedArg = params.HEADED ? '--headed' : ''
          def browserArg = '--project=' + params.BROWSER
          def workersArg = params.EXECUTION == 'sequential' ? '--workers=1' : '--workers=' + params.WORKERS.trim()
          def suiteTarget = params.TARGET.trim()
          def target = params.EXECUTION_MODE == 'suite'
              ? (suiteTarget == 'sanity' ? 'sanity' : 'regression')
              : suiteTarget
          def command = 'npx playwright test "' + target + '" ' + browserArg + ' ' + workersArg
          if (headedArg) {
            command = command + ' ' + headedArg
          }
          catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
            powershell(command)
          }
        }
      }
    }
    stage('Generate Allure Report') {
      steps {
        powershell '''
          if (Test-Path "allure-results") {
            try {
              npx -p allure-commandline allure generate allure-results -o allure-report --clean
              Write-Host "Allure HTML report generated."
            } catch {
              Write-Host "Allure generation failed: $_"
            }
          } else {
            Write-Host "No allure-results directory; skipping Allure HTML generation."
          }
        '''
      }
    }
  }
  post {
    always {
      archiveArtifacts(
        artifacts: 'test-results/**, playwright-report/**, allure-results/**, allure-report/**',
        allowEmptyArchive: true
      )
      allure([
        includeProperties: false,
        jdk: '',
        results: [[path: 'allure-results']]
      ])
      publishHTML([
        reportDir: 'playwright-report',
        reportFiles: 'index.html',
        reportName: 'Playwright HTML Report',
        keepAll: true,
        alwaysLinkToLastBuild: true,
        allowMissing: true
      ])
    }
  }
}
"""

GENERATED_HEALED_CONFIG = """const { defineConfig } = require('@playwright/test');

 module.exports = defineConfig({
  testDir: '.',
  testMatch: '**/*.js',
  timeout: 120000,           
  expect: {
    timeout: 1200000         
  },
  reporter: [
    ['line'],
    ['json', { outputFile: 'test-results/report.json' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['allure-playwright', { resultsDir: 'allure-results' }],
  ],
  use: {
    actionTimeout: 60000,     
    navigationTimeout: 60000,
    headless: process.env.HEADLESS !== 'false',
    screenshot: 'only-on-failure',
    slowMo: 30000,
    trace: 'on',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium', channel: 'chrome' } },
    { name: 'msedge', use: { browserName: 'chromium', channel: 'msedge' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
"""



GENERATED_PROJECT_GITIGNORE = """# Dependencies
node_modules/

# Playwright outputs
test-results/
playwright-report/

# Allure outputs
allure-results/
allure-report/

# Local environment
.env
"""


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def timestamp() -> str:
    return datetime.now().isoformat().replace(":", "-").replace(".", "-")[:19]


def ensure_dir(dir_path: Path) -> None:
    dir_path.mkdir(parents=True, exist_ok=True)


def path_key(path: Path) -> str:
    resolved = str(path.resolve())
    return resolved.lower() if os.name == "nt" else resolved


def read_env_file(env_path: Path) -> dict[str, str]:
    if not env_path.exists():
        return {}

    values: dict[str, str] = {}
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'\"")
        if key and key not in values:
            values[key] = value
    return values


def get_run_env() -> dict[str, str]:
    values = os.environ.copy()
    values.update(read_env_file(ROOT / ".env"))
    return values


def read_project_package_template() -> dict[str, Any]:
    package_json = dict(DEFAULT_PROJECT_PACKAGE_JSON)
    if not PROJECT_PACKAGE_TEMPLATE_PATH.exists():
        return package_json

    try:
        template = json.loads(PROJECT_PACKAGE_TEMPLATE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return package_json

    if not isinstance(template, dict):
        return package_json

    package_json.update({key: value for key, value in template.items() if key not in {"scripts", "dependencies", "devDependencies"}})
    for section in ("scripts", "dependencies", "devDependencies"):
        merged = dict(package_json.get(section) or {})
        if isinstance(template.get(section), dict):
            merged.update(template[section])
        if merged:
            package_json[section] = merged
    return package_json


def merge_package_section(target: dict[str, Any], template: dict[str, Any], section: str) -> bool:
    template_section = template.get(section)
    if not isinstance(template_section, dict):
        return False

    target_section = target.get(section)
    if not isinstance(target_section, dict):
        target[section] = dict(template_section)
        return True

    changed = False
    for key, value in template_section.items():
        if key not in target_section:
            target_section[key] = value
            changed = True
    return changed


def ensure_project_package_json(package_json_path: Path) -> bool:
    template = read_project_package_template()
    if not package_json_path.exists():
        package_json_path.write_text(f"{json.dumps(template, indent=2)}\n", encoding="utf-8")
        return True

    try:
        current = json.loads(package_json_path.read_text(encoding="utf-8"))
    except Exception:
        return False

    if not isinstance(current, dict):
        return False

    changed = False
    for key in ("scripts", "dependencies", "devDependencies"):
        changed = merge_package_section(current, template, key) or changed

    if changed:
        package_json_path.write_text(f"{json.dumps(current, indent=2)}\n", encoding="utf-8")
    return changed


def ensure_project_gitignore(gitignore_path: Path) -> bool:
    if not gitignore_path.exists():
        gitignore_path.write_text(GENERATED_PROJECT_GITIGNORE, encoding="utf-8")
        return True

    current = gitignore_path.read_text(encoding="utf-8")
    current_lines = {line.strip() for line in current.splitlines()}
    missing_lines = [
        line
        for line in GENERATED_PROJECT_GITIGNORE.splitlines()
        if line.strip() and line.strip() not in current_lines
    ]
    if not missing_lines:
        return False

    separator = "\n" if current.endswith("\n") else "\n\n"
    gitignore_path.write_text(f"{current}{separator}{chr(10).join(missing_lines)}\n", encoding="utf-8")
    return True


def resolve_python_executable() -> str:
    candidates = [
        Path(sys.executable),
        ROOT / ".venv" / "Scripts" / "python.exe",
        ROOT / ".venv" / "bin" / "python",
    ]
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    return "python"


def resolve_command(command: str) -> str:
    if os.name != "nt":
        return command

    windows_wrappers = {
        "allure": "allure.cmd",
        "npm": "npm.cmd",
        "npx": "npx.cmd",
    }
    return windows_wrappers.get(command.lower(), command)


def node_package_available(package_name: str, project_path: Path) -> bool:
    package_parts = package_name.split("/")
    project_node_modules = project_path.resolve() / "node_modules"
    project_package_path = project_node_modules / Path(*package_parts)
    if project_package_path.exists():
        return True

    if package_name == "allure-playwright" and (project_node_modules / "@playwright" / "test").exists():
        return False

    search_roots = [project_path.resolve(), ROOT.resolve()]
    for search_root in search_roots:
        current = search_root if search_root.is_dir() else search_root.parent
        for parent in [current, *current.parents]:
            if (parent / "node_modules" / Path(*package_parts)).exists():
                return True
            if parent == ROOT.resolve():
                break

    node_script = (
        "const pkg = process.argv[1];"
        "const paths = process.argv.slice(2);"
        "try { require.resolve(pkg, { paths }); process.exit(0); }"
        "catch { process.exit(1); }"
    )
    try:
        result = subprocess.run(
            [resolve_command("node"), "-e", node_script, package_name, *[str(path) for path in search_roots]],
            cwd=str(ROOT),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=5,
            check=False,
        )
    except Exception:
        return False
    return result.returncode == 0


def to_relative(file_path: Path | str) -> str:
    return Path(file_path).resolve().relative_to(ROOT.resolve()).as_posix()


def to_workspace_relative_or_absolute(file_path: Path | str) -> str:
    try:
        return to_relative(file_path)
    except ValueError:
        return str(Path(file_path).resolve())


def encode_report_token(report_path: Path) -> str:
    encoded = base64.urlsafe_b64encode(str(report_path.resolve()).encode("utf-8")).decode("ascii")
    return encoded.rstrip("=")


def decode_report_token(report_token: str) -> Path:
    padded = report_token + ("=" * (-len(report_token) % 4))
    try:
        decoded = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid report token.") from exc
    return resolve_project_or_tests_path(decoded)


def list_files_by_prefix(dir_path: Path, prefix: str, suffix: str) -> list[Path]:
    ensure_dir(dir_path)
    return sorted(
        [item for item in dir_path.iterdir() if item.is_file() and item.name.startswith(prefix) and item.name.endswith(suffix)],
        key=lambda item: item.name,
        reverse=True,
    )


def list_codegen_artifacts() -> dict[str, list[Path]]:
    return {
        "codegen_files": list_files_by_prefix(CODEGEN_DIR, "codegen-", ".js"),
        "action_files": list_files_by_prefix(CODEGEN_DIR, "actions-", ".json"),
    }


def get_artifact_stamp(file_path: Path, prefix: str, suffix: str) -> str:
    name = file_path.name
    if not name.startswith(prefix) or not name.endswith(suffix):
        return ""
    return name[len(prefix): len(name) - len(suffix)]


def get_latest_artifact_pair() -> dict[str, Any] | None:
    artifacts = list_codegen_artifacts()
    codegen_files = artifacts["codegen_files"]
    action_files = artifacts["action_files"]
    if not codegen_files or not action_files:
        return None

    actions_by_stamp = {
        get_artifact_stamp(file_path, "actions-", ".json"): file_path
        for file_path in action_files
    }

    for codegen_path in codegen_files:
        stamp = get_artifact_stamp(codegen_path, "codegen-", ".js")
        trace_path = actions_by_stamp.get(stamp)
        if trace_path:
            return {
                "stamp": stamp,
                "codegen_path": codegen_path,
                "trace_path": trace_path,
            }

    return {
        "stamp": get_artifact_stamp(codegen_files[0], "codegen-", ".js") or timestamp(),
        "codegen_path": codegen_files[0],
        "trace_path": action_files[0],
    }


def list_generated_specs() -> list[Path]:
    # files = [item for item in TESTS_DIR.rglob("*.spec.js") if item.is_file()]
    files = [
        item
        for item in TESTS_DIR.rglob("*.spec.js")
        if item.is_file() and "healed" not in [part.lower() for part in item.relative_to(TESTS_DIR).parts]
    ]
    return [item for item, _ in sorted(((item, item.stat().st_mtime) for item in files), key=lambda pair: pair[1], reverse=True)]


def get_latest_generated_spec() -> Path | None:
    specs = list_generated_specs()
    return specs[0] if specs else None


def find_spec_by_name(file_name: str) -> Path | None:
    safe_name = Path(file_name).name
    if not safe_name:
        return None
    return next((item for item in list_generated_specs() if item.name == safe_name), None)


def write_latest_workflow_state(payload: dict[str, Any]) -> None:
    ensure_dir(WORKFLOW_STATE_PATH.parent)
    WORKFLOW_STATE_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def read_latest_workflow_state() -> dict[str, Any] | None:
    if not WORKFLOW_STATE_PATH.exists() or not WORKFLOW_STATE_PATH.is_file():
        return None
    try:
        payload = json.loads(WORKFLOW_STATE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return None
    return payload if isinstance(payload, dict) else None


def build_latest_workflow_state(
    trace_path: Path,
    codegen_path: Path,
    output_path: Path,
    project_copy_path: Path | None = None,
) -> dict[str, Any]:
    masking = build_masking_payload(output_path)
    return {
        "tracePath": to_relative(trace_path),
        "codegenPath": to_relative(codegen_path),
        "generatedSpecPath": to_workspace_relative_or_absolute(output_path),
        "projectCopyPath": str(project_copy_path) if project_copy_path else None,
        "maskedTracePath": masking["maskedTracePath"],
        "maskedCodegenPath": masking["maskedCodegenPath"],
        "testDataPath": masking["testDataPath"],
    }


def sanitize_base_name(value: str | None) -> str:
    normalized = re.sub(r"-+", "-", re.sub(r"[^a-zA-Z0-9._-]", "-", re.sub(r"\s+", "-", (value or "").strip())))
    normalized = re.sub(r"\.spec\.js$|\.js$", "", normalized, flags=re.IGNORECASE).strip("-")
    return normalized


def spec_file_base_name(path: Path) -> str:
    name = path.name
    if name.lower().endswith(".spec.js"):
        return name[:-len(".spec.js")]
    return path.stem


def is_playwright_spec_file(path: Path) -> bool:
    name = path.name.lower()
    return bool(re.search(r"(?:\.spec(?:-\d+)?|\.test)\.[jt]s$", name))


def project_folder_name(project_path: Path | str | None = None) -> str | None:
    if not project_path:
        return None
    return sanitize_base_name(Path(project_path).name)


def get_generated_spec_dir(test_type: str | None = None, project_path: Path | str | None = None) -> Path:
    normalized_type = normalize_test_type(test_type)
    if project_path:
        resolved_project = Path(project_path).expanduser().resolve()
        suite_folder = TEST_TYPE_FOLDERS.get(normalized_type)
        if suite_folder:
            return resolved_project / suite_folder
        return resolved_project
    return TESTS_DIR


def build_generated_spec_path(
    output_name: str | None,
    fallback_stamp: str | None,
    test_type: str | None = None,
    project_path: Path | str | None = None,
) -> Path:
    safe_base = sanitize_base_name(output_name)
    if not safe_base:
        safe_base = f"generated-{fallback_stamp or timestamp()}"
    return make_non_overwriting_path(get_generated_spec_dir(test_type, project_path) / f"{safe_base}.spec.js")


def find_duplicate_project_spec(project_path: Path, spec_base_name: str, test_type: str | None = None) -> Path | None:
    safe_key = sanitize_base_name(spec_base_name).lower()
    if not safe_key or not project_path.exists() or not project_path.is_dir():
        return None

    for item in project_path.rglob("*.spec.js"):
        if not item.is_file():
            continue
        if sanitize_base_name(spec_file_base_name(item)).lower() == safe_key:
            return item
        normalized_type = normalize_test_type(test_type)
        if normalized_type and item.parent.name.lower() == normalized_type and item.name.lower() == f"{safe_key}.spec.js":
            return item
    return None


def validate_record_output_name_available(
    output_name: str | None,
    test_type: str | None = None,
    project_path: Path | str | None = None,
) -> None:
    safe_base = sanitize_base_name(output_name)
    if not safe_base or not project_path:
        return

    project_root = Path(project_path).resolve()
    duplicate = find_duplicate_project_spec(project_root, safe_base, test_type)
    if not duplicate and project_root.is_relative_to(TESTS_DIR.resolve()):
        mirror_root = TESTS_DIR / project_folder_name(project_root)
        if mirror_root.resolve() != project_root and mirror_root.exists():
            duplicate = find_duplicate_project_spec(mirror_root, safe_base, test_type)

    if duplicate:
        try:
            relative_duplicate = duplicate.relative_to(project_root)
        except ValueError:
            relative_duplicate = duplicate
        raise HTTPException(
            status_code=400,
            detail=f"Test file '{safe_base}.spec.js' already exists in this project at '{relative_duplicate.as_posix()}'. Choose a different output name.",
        )


def write_inline_generated_spec(
    spec_content: str,
    spec_name: str | None = None,
    test_type: str | None = None,
    project_path: Path | str | None = None,
) -> Path:
    safe_base = sanitize_base_name(spec_name)
    if not safe_base:
        safe_base = f"chroma-{timestamp()}"
    target_path = make_non_overwriting_path(get_generated_spec_dir(test_type, project_path) / f"{safe_base}.spec.js")
    ensure_dir(target_path.parent)
    target_path.write_text(f"{spec_content.rstrip()}\n", encoding="utf-8")
    return target_path


def normalize_viewport_value(value: Any, label: str) -> int | None:
    if value is None or str(value).strip() == "":
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"`{label}` must be a number.") from exc
    if parsed < 320 or parsed > 3840:
        raise ValueError(f"`{label}` must be between 320 and 3840.")
    return parsed


def build_record_command(url: str, browser: str = "chromium", viewport_width: Any = None, viewport_height: Any = None) -> list[str]:
    command = ["node", "record-trace.js", url, browser]
    width = normalize_viewport_value(viewport_width, "viewportWidth")
    height = normalize_viewport_value(viewport_height, "viewportHeight")
    if width and height:
        command.append(f"{width}x{height}")
    elif width or height:
        raise ValueError("Provide both `viewportWidth` and `viewportHeight`, or leave both blank.")
    return command


def build_refine_command(trace_path: Path, codegen_path: Path, output_path: Path, test_name: str | None) -> list[str]:
    command = [
        "npm",
        "run",
        "refine:llm",
        "--",
        f"--trace={to_relative(trace_path)}",
        f"--codegen={to_relative(codegen_path)}",
        f"--output={to_workspace_relative_or_absolute(output_path)}",
    ]
    if (test_name or "").strip():
        command.append(f"--test-name={test_name.strip()}")
    return command


def build_run_command(spec_path: Path, project: list[str] | str | None = None, headed: bool = True) -> list[str]:
    rel = to_relative(spec_path)
    if rel.startswith("tests/"):
        rel = rel[len("tests/"):]
    safe_pattern = rel.replace("(", r"\(").replace(")", r"\)")
    projects = project if isinstance(project, list) else [project] if project else []
    projects = [item for item in projects if item] or ["chromium"]
    command = ["npx", "playwright", "test", safe_pattern, "--reporter=line,json"]
    for item in projects:
        command.extend(["--project", item])
    if headed:
        command.append("--headed")
    return command


def summarize_report(report_path: Path | None = None) -> dict[str, int]:
    summary = {"total": 0, "passed": 0, "failed": 0, "skipped": 0}
    target_report = report_path or REPORT_PATH
    if not target_report.exists():
        return summary

    try:
        report = json.loads(target_report.read_text(encoding="utf-8"))
    except Exception:
        return summary

    return summarize_report_data(report)


def summarize_report_data(report: dict[str, Any] | None) -> dict[str, int]:
    summary = {"total": 0, "passed": 0, "failed": 0, "skipped": 0}
    if not isinstance(report, dict):
        return summary

    def walk_suite(suite: dict[str, Any]) -> list[str]:
        statuses: list[str] = []
        for spec in suite.get("specs", []):
            for test in spec.get("tests", []):
                results = test.get("results", [])
                if results:
                    for result in results:
                        statuses.append(result.get("status") or test.get("status") or test.get("outcome") or "unknown")
                else:
                    statuses.append(test.get("status") or test.get("outcome") or "unknown")
        for child in suite.get("suites", []):
            statuses.extend(walk_suite(child))
        return statuses

    statuses: list[str] = []
    for suite in report.get("suites", []):
        statuses.extend(walk_suite(suite))

    summary["total"] = len(statuses)
    for status in statuses:
        normalized = str(status or "").lower()
        if normalized == "passed":
            summary["passed"] += 1
        elif normalized == "skipped":
            summary["skipped"] += 1
        else:
            summary["failed"] += 1
    return summary


def summarize_report_text(output: str) -> dict[str, int]:
    decoder = json.JSONDecoder()
    text = output or ""

    for match in re.finditer(r"\{", text):
        try:
            payload, _end = decoder.raw_decode(text[match.start():])
        except Exception:
            continue
        if isinstance(payload, dict) and isinstance(payload.get("suites"), list):
            return summarize_report_data(payload)

    return {"total": 0, "passed": 0, "failed": 0, "skipped": 0}


def parse_record_output(stdout: str) -> dict[str, Any] | None:
    for line in stdout.splitlines():
        if not line.startswith("FINAL_OUTPUT::"):
            continue
        try:
            payload = json.loads(line[len("FINAL_OUTPUT::"):])
            if payload.get("scriptPath"):
                payload["scriptPath"] = to_relative(Path(payload["scriptPath"]))
            if payload.get("actionsPath"):
                payload["actionsPath"] = to_relative(Path(payload["actionsPath"]))
            return payload
        except Exception:
            return None
    return None


def parse_json_from_output(output: str) -> Any:
    trimmed = (output or "").strip()
    if not trimmed:
        raise ValueError("Empty JSON output.")

    lines = [line.strip() for line in trimmed.splitlines() if line.strip()]
    for line in reversed(lines):
        try:
            return json.loads(line)
        except Exception:
            continue
    return json.loads(trimmed)


def read_file_if_exists(file_path: Path | None) -> str | None:
    if not file_path or not file_path.exists() or not file_path.is_file():
        return None
    return file_path.read_text(encoding="utf-8")


def project_metadata_path(project_path: Path) -> Path:
    return project_path / PROJECT_METADATA_FILE_NAME


def read_project_metadata(project_path: Path) -> dict[str, Any]:
    return read_json_file_object(project_metadata_path(project_path))


def write_project_metadata(project_path: Path, metadata: dict[str, Any]) -> None:
    project_path.mkdir(parents=True, exist_ok=True)
    project_metadata_path(project_path).write_text(f"{json.dumps(metadata, indent=2)}\n", encoding="utf-8")


def is_git_repository(project_path: Path) -> bool:
    return (project_path / ".git").exists()


def run_git_command(project_path: Path, args: list[str]) -> tuple[int, str, str]:
    process = subprocess.run(
        ["git", "-C", str(project_path), *args],
        capture_output=True,
        text=True,
        check=False,
    )
    return int(process.returncode or 0), process.stdout or "", process.stderr or ""


def commit_and_push_project(project_path: Path, commit_message: str) -> dict[str, Any]:
    if not project_path.exists() or not project_path.is_dir():
        raise HTTPException(status_code=400, detail="Project path is invalid.")
    if not is_git_repository(project_path):
        raise HTTPException(status_code=400, detail="This project is not linked to a git repository yet.")

    message = str(commit_message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Commit message is required.")

    status_code, status_stdout, status_stderr = run_git_command(project_path, ["status", "--porcelain"])
    if status_code != 0:
        raise HTTPException(status_code=400, detail=status_stderr.strip() or status_stdout.strip() or "Unable to read git status.")

    if not status_stdout.strip():
        branch_code, branch_stdout, branch_stderr = run_git_command(project_path, ["rev-parse", "--abbrev-ref", "HEAD"])
        if branch_code != 0:
            raise HTTPException(status_code=400, detail=branch_stderr.strip() or branch_stdout.strip() or "Unable to determine git branch.")
        branch_name = branch_stdout.strip()
        push_code, push_stdout, push_stderr = run_git_command(project_path, ["push", "origin", branch_name])
        if push_code != 0:
            raise HTTPException(status_code=400, detail=push_stderr.strip() or push_stdout.strip() or "Git push failed.")
        return {
            "action": "push",
            "branch": branch_name,
            "changed": False,
            "message": "No local changes to commit. Branch pushed successfully.",
        }

    add_code, add_stdout, add_stderr = run_git_command(project_path, ["add", "-A"])
    if add_code != 0:
        raise HTTPException(status_code=400, detail=add_stderr.strip() or add_stdout.strip() or "Git add failed.")

    commit_code, commit_stdout, commit_stderr = run_git_command(project_path, ["commit", "-m", message])
    if commit_code != 0:
        combined = (commit_stdout + "\n" + commit_stderr).strip()
        if "nothing to commit" in combined.lower():
            return {
                "action": "commit",
                "changed": False,
                "message": "No changes to commit.",
            }
        raise HTTPException(status_code=400, detail=combined or "Git commit failed.")

    branch_code, branch_stdout, branch_stderr = run_git_command(project_path, ["rev-parse", "--abbrev-ref", "HEAD"])
    if branch_code != 0:
        raise HTTPException(status_code=400, detail=branch_stderr.strip() or branch_stdout.strip() or "Unable to determine git branch.")
    branch_name = branch_stdout.strip()

    push_code, push_stdout, push_stderr = run_git_command(project_path, ["push", "origin", branch_name])
    if push_code != 0:
        raise HTTPException(status_code=400, detail=push_stderr.strip() or push_stdout.strip() or "Git push failed.")

    return {
        "action": "commit_push",
        "branch": branch_name,
        "changed": True,
        "message": "Changes committed and pushed successfully.",
    }


def read_json_file_object(file_path: Path) -> dict[str, Any]:
    if not file_path.exists() or not file_path.is_file():
        return {}
    try:
        payload = json.loads(file_path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return payload if isinstance(payload, dict) else {}


def values_match(left: Any, right: Any) -> bool:
    return json.dumps(left, sort_keys=True, ensure_ascii=False) == json.dumps(right, sort_keys=True, ensure_ascii=False)


def next_available_json_key(payload: dict[str, Any], base_key: str) -> str:
    if base_key not in payload:
        return base_key
    for index in range(1, 1000):
        candidate = f"{base_key}{index}"
        if candidate not in payload:
            return candidate
    return f"{base_key}{timestamp().replace('-', '')}"


def merge_test_data_json(source_path: Path, target_path: Path, target_spec_path: Path | None = None) -> None:
    source_payload = read_json_file_object(source_path)
    if not source_payload:
        return

    target_payload = read_json_file_object(target_path)
    key_replacements: dict[str, str] = {}

    for key, value in source_payload.items():
        if key not in target_payload:
            target_payload[key] = value
            continue

        if values_match(target_payload[key], value):
            continue

        replacement_key = next_available_json_key(target_payload, key)
        target_payload[replacement_key] = value
        key_replacements[key] = replacement_key

    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(f"{json.dumps(target_payload, indent=2)}\n", encoding="utf-8")

    if target_spec_path and key_replacements and target_spec_path.exists():
        content = target_spec_path.read_text(encoding="utf-8")
        for original_key, replacement_key in key_replacements.items():
            content = re.sub(
                rf"\btestData\.{re.escape(original_key)}\b",
                f"testData.{replacement_key}",
                content,
            )
        target_spec_path.write_text(content, encoding="utf-8")


def read_registered_project_paths() -> list[Path]:
    if not PROJECT_REGISTRY_PATH.exists() or not PROJECT_REGISTRY_PATH.is_file():
        return []
    try:
        payload = json.loads(PROJECT_REGISTRY_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []

    raw_items = payload.get("projects") if isinstance(payload, dict) else payload
    if not isinstance(raw_items, list):
        return []

    paths: list[Path] = []
    seen: set[str] = set()
    for item in raw_items:
        raw_path = item.get("path") if isinstance(item, dict) else item
        if not raw_path:
            continue
        resolved = Path(unquote(str(raw_path))).expanduser().resolve()
        key = path_key(resolved)
        if key in seen or not resolved.exists() or not resolved.is_dir():
            continue
        seen.add(key)
        paths.append(resolved)
    return paths


def register_project_path(project_path: Path | str | None) -> None:
    if not project_path:
        return
    resolved = Path(project_path).expanduser().resolve()
    if not resolved.exists() or not resolved.is_dir():
        return

    paths = read_registered_project_paths()
    current_key = path_key(resolved)
    if not any(path_key(item) == current_key for item in paths):
        paths.insert(0, resolved)

    ensure_dir(PROJECT_REGISTRY_PATH.parent)
    PROJECT_REGISTRY_PATH.write_text(
        json.dumps({
            "projects": [
                {
                    "path": str(item),
                    "name": item.name,
                }
                for item in paths
            ],
        }, indent=2),
        encoding="utf-8",
    )


def set_project_path(path: str | None) -> Path | None:
    global PROJECT_PATH
    candidate = str(path or "").strip()
    if not candidate:
        PROJECT_PATH = None
        return PROJECT_PATH
    PROJECT_PATH = Path(unquote(candidate)).expanduser().resolve()
    register_project_path(PROJECT_PATH)
    return PROJECT_PATH


def get_project_path() -> Path | None:
    return PROJECT_PATH


def project_file_items(project_path: Path) -> list[dict[str, Any]]:
    ignored_dirs = {
        "node_modules",
        "test-results",
        "playwright-report",
        "allure-results",
        "allure-report",
        "__pycache__",
        ".git",
        "healed",
        "masked",
    }
    files: list[Path] = []
    for item in project_path.rglob("*"):
        if not item.is_file():
            continue
        relative_parts = item.relative_to(project_path).parts
        if any(part in ignored_dirs for part in relative_parts):
            continue
        is_project_test_data = len(relative_parts) == 1 and item.name == "test-data.json"
        is_suite_file = bool(relative_parts) and relative_parts[0] in TEST_TYPE_FOLDERS.values()
        is_spec = is_playwright_spec_file(item)
        is_script = item.suffix.lower() in {".js", ".ts"}
        is_json = item.suffix.lower() == ".json"
        if is_suite_file:
            if not is_script and not is_json:
                continue
        elif not is_project_test_data and not is_spec:
            continue
        files.append(item)

    sorted_files = sorted(files, key=lambda path: path.stat().st_mtime, reverse=True)
    return [
        {
            "name": item.name,
            "path": str(item.resolve()),
            "relativePath": item.relative_to(project_path).as_posix(),
            "workspacePath": to_workspace_relative_or_absolute(item),
            "size": item.stat().st_size,
            "modifiedAt": datetime.fromtimestamp(item.stat().st_mtime).isoformat(),
            "suite": item.parent.name if item.parent.name in TEST_TYPE_FOLDERS.values() else None,
            "isSpec": is_playwright_spec_file(item),
            "isScript": item.suffix.lower() in {".js", ".ts"},
            "isJson": item.suffix.lower() == ".json",
            "content": read_file_if_exists(item) or "",
        }
        for item in sorted_files
    ]


def project_latest_mtime(project_path: Path, files: list[dict[str, Any]]) -> float:
    latest = project_path.stat().st_mtime
    for item in files:
        try:
            latest = max(latest, Path(item["path"]).stat().st_mtime)
        except Exception:
            continue
    return latest


def summarize_project_run_reports(project_path: Path, limit: int = 3) -> list[dict[str, Any]]:
    test_results_dir = project_path / "test-results"
    if not test_results_dir.exists() or not test_results_dir.is_dir():
        return []

    run_dirs = sorted(
        [item for item in test_results_dir.glob("run-*") if item.is_dir()],
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )
    reports: list[dict[str, Any]] = []
    for run_dir in run_dirs[:max(1, min(10, limit))]:
        html_dir = run_dir / "html"
        html_index = html_dir / "index.html"
        json_path = run_dir / "report.json"
        allure_dir = run_dir / "allure-results"
        allure_report_dir = run_dir / "allure-report"
        allure_report_index = allure_report_dir / "index.html"
        has_allure_results = (
            allure_dir.exists()
            and any(item.is_file() and item.name != ".gitignore" for item in allure_dir.iterdir())
        )
        reports.append({
            "runName": run_dir.name,
            "runPath": str(run_dir.resolve()),
            "updatedAt": datetime.fromtimestamp(run_dir.stat().st_mtime).isoformat(),
            "summary": summarize_report(json_path),
            "json": str(json_path.resolve()) if json_path.exists() else None,
            "html": str(html_index.resolve()) if html_index.exists() else None,
            "htmlUrl": f"/api/reports/html/{encode_report_token(html_dir)}/" if html_index.exists() else None,
            "allureResults": str(allure_dir.resolve()) if has_allure_results else None,
            "allureHtml": str(allure_report_index.resolve()) if allure_report_index.exists() else None,
            "allureHtmlUrl": f"/api/reports/html/{encode_report_token(allure_report_dir)}/" if allure_report_index.exists() else None,
            "download": f"/api/reports/download?reportPath={run_dir.resolve()}",
        })

    legacy_json = test_results_dir / "report.json"
    if legacy_json.exists() and not reports:
        reports.append({
            "runName": "latest",
            "runPath": str(test_results_dir.resolve()),
            "updatedAt": datetime.fromtimestamp(legacy_json.stat().st_mtime).isoformat(),
            "summary": summarize_report(legacy_json),
            "json": str(legacy_json.resolve()),
            "html": None,
            "htmlUrl": None,
            "allureResults": str((project_path / "allure-results").resolve()) if (project_path / "allure-results").exists() else None,
            "allureHtml": None,
            "allureHtmlUrl": None,
            "download": f"/api/reports/download?reportPath={test_results_dir.resolve()}",
        })

    return reports


def is_playwright_framework_project(project_path: Path) -> bool:
    has_suite_folder = any((project_path / folder).is_dir() for folder in TEST_TYPE_FOLDERS.values())
    has_project_file = (
        (project_path / "package.json").exists()
        or (project_path / "playwright.config.js").exists()
        or (project_path / "playwright.config.ts").exists()
    )
    return has_suite_folder or has_project_file


def build_project_option(project_path: Path) -> dict[str, Any]:
    preview_test_data = read_project_test_data(project_path)
    faker_modes = read_project_faker_field_modes(project_path)
    faker_fields = set(faker_modes.keys())
    files = project_file_items(project_path) if project_path.is_dir() else []
    latest_mtime = project_latest_mtime(project_path, files)
    reports = summarize_project_run_reports(project_path)
    metadata = read_project_metadata(project_path)
    return {
        "name": project_path.name or str(project_path),
        "path": str(project_path.resolve()),
        "workspacePath": to_workspace_relative_or_absolute(project_path),
        "updatedAt": datetime.fromtimestamp(latest_mtime).isoformat(),
        "files": files,
        "reports": reports,
        "latestReport": reports[0] if reports else None,
        "fileCount": len(files),
        "specCount": len([file for file in files if file["isSpec"]]),
        "githubUrl": metadata.get("githubUrl"),
        "jenkinsJobName": metadata.get("jenkinsJobName"),
        "fakerFields": read_project_faker_fields(project_path),
        "testDataFields": [
            {
                "key": key,
                "value": value,
                "valueType": type(value).__name__,
                "selected": key in faker_fields,
                "mode": faker_modes.get(key, "normal"),
                "fakeValue": generate_faker_value(key, value, "fake") if key in faker_fields else value,
            }
            for key, value in preview_test_data.items()
        ],
    }


def discover_local_project_paths() -> list[Path]:
    search_roots: list[Path] = [PROJECTS_ROOT.resolve()]
    current_path = get_project_path()
    if current_path and current_path.exists():
        current_resolved = current_path.resolve()
        search_roots.extend([current_resolved, current_resolved.parent])

    for registered_path in read_registered_project_paths():
        if registered_path.exists():
            search_roots.extend([registered_path.resolve(), registered_path.resolve().parent])

    projects: list[Path] = []
    seen_roots: set[str] = set()
    seen_projects: set[str] = set()
    for root in search_roots:
        root_key = path_key(root)
        if root_key in seen_roots or not root.exists():
            continue
        seen_roots.add(root_key)

        candidates = [root] if root.is_dir() else []
        if root.is_dir():
            with suppress(OSError):
                candidates.extend(item for item in root.iterdir() if item.is_dir())

        for candidate in candidates:
            if candidate.name.lower() in RESERVED_TEST_FOLDERS:
                continue
            candidate_key = path_key(candidate)
            if candidate_key in seen_projects or not is_playwright_framework_project(candidate):
                continue
            seen_projects.add(candidate_key)
            projects.append(candidate.resolve())

    return projects


def list_project_options() -> list[dict[str, Any]]:
    projects: list[dict[str, Any]] = []
    ensure_dir(PROJECTS_ROOT)
    seen_paths: set[str] = set()

    for project_path in discover_local_project_paths():
        option = build_project_option(project_path)
        option_key = path_key(Path(option["path"]))
        if option_key in seen_paths:
            continue
        projects.append(option)
        seen_paths.add(option_key)

    projects.sort(key=lambda project: project.get("updatedAt") or "", reverse=True)

    current_path = get_project_path()
    if current_path and current_path.exists():
        current_value = path_key(current_path)
        if current_value not in seen_paths:
            projects.insert(0, build_project_option(current_path))

    return projects


def _infer_project_name_from_github_url(github_url: str) -> str:
    candidate = str(github_url or "").strip().rstrip("/")
    if not candidate:
        return ""
    repo_name = Path(candidate).name
    if repo_name.endswith(".git"):
        repo_name = repo_name[:-4]
    return sanitize_base_name(repo_name)


def _clone_project_from_github(github_url: str, project_path: Path) -> None:
    clone_url = str(github_url or "").strip()
    if not clone_url:
        return

    project_path.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        ["git", "clone", "--depth", "1", clone_url, str(project_path)],
        cwd=str(project_path.parent),
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        message = (result.stderr or result.stdout or "git clone failed.").strip()
        raise HTTPException(status_code=400, detail=f"Unable to clone GitHub repository: {message}")


def create_project(project_name: str, parent_path: str | None = None, github_url: str | None = None) -> Path:
    safe_name = sanitize_base_name(project_name)
    if not safe_name and github_url:
        safe_name = _infer_project_name_from_github_url(github_url)
    if not safe_name:
        raise HTTPException(status_code=400, detail="Project name is required.")
    safe_key = safe_name.lower()

    parent = Path(unquote(str(parent_path or "").strip())).expanduser().resolve() if parent_path else PROJECTS_ROOT.resolve()
    if parent.exists() and not parent.is_dir():
        raise HTTPException(status_code=400, detail="Project location must be a folder.")

    project_path = (parent / safe_name).resolve()
    if project_path.exists():
        raise HTTPException(status_code=400, detail=f"Project '{safe_name}' already exists at this location.")

    duplicate_project = next(
        (
            project
            for project in list_project_options()
            if sanitize_base_name(project.get("name")).lower() == safe_key
        ),
        None,
    )
    if duplicate_project:
        raise HTTPException(status_code=400, detail=f"Project '{safe_name}' already exists.")

    if github_url and str(github_url).strip():
        _clone_project_from_github(github_url, project_path)

    ensure_playwright_project_scaffold(project_path)
    write_project_metadata(project_path, {
        "githubUrl": str(github_url or "").strip() or None,
        "createdAt": utc_now_iso(),
    })
    set_project_path(str(project_path))
    return project_path


def prefer_registered_project_for_duplicate(project_path: Path | None) -> Path | None:
    if not project_path:
        return None

    resolved = project_path.resolve()
    try:
        relative_to_backend_tests = resolved.relative_to(TESTS_DIR.resolve())
    except ValueError:
        return resolved

    if len(relative_to_backend_tests.parts) != 1:
        return resolved

    for registered_path in read_registered_project_paths():
        if registered_path.name.lower() == resolved.name.lower() and registered_path.resolve() != resolved:
            return registered_path.resolve()

    desktop_candidate = Path.home() / "Desktop" / resolved.name
    if desktop_candidate.exists() and desktop_candidate.is_dir() and is_playwright_framework_project(desktop_candidate):
        register_project_path(desktop_candidate)
        return desktop_candidate.resolve()

    return resolved


def resolve_tests_path(input_path: str, must_exist: bool = True) -> Path:
    raw = Path(unquote(str(input_path or "").strip()))
    if not str(raw):
        raise HTTPException(status_code=400, detail="Path is required.")

    resolved = raw if raw.is_absolute() else (ROOT / raw).resolve()
    try:
        resolved.relative_to(TESTS_DIR.resolve())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Path must stay inside tests/.") from exc

    if must_exist and not resolved.exists():
        raise HTTPException(status_code=404, detail="Path not found.")
    return resolved


def resolve_project_download_path(project_path: str) -> Path:
    resolved = resolve_project_or_tests_path(project_path)
    if not resolved.is_dir():
        raise HTTPException(status_code=400, detail="Project path must be a folder.")
    if resolved.is_relative_to(TESTS_DIR.resolve()) and resolved.name.lower() in RESERVED_TEST_FOLDERS:
        raise HTTPException(status_code=400, detail="Reserved test folder cannot be downloaded as a project.")
    return resolved


def allowed_project_roots() -> list[Path]:
    roots: list[Path] = [TESTS_DIR.resolve()]
    current_path = get_project_path()
    if current_path:
        roots.append(current_path.resolve())
    roots.extend(item.resolve() for item in read_registered_project_paths())

    roots.extend(discover_local_project_paths())
 
    try:

        from ..db.database import list_projects as _db_list_projects

        for _row in _db_list_projects():

            _p = _row.get("path")

            if _p:

                try:

                    roots.append(Path(_p).resolve())

                except Exception:

                    pass

    except Exception as _db_exc:

        print(f"[allowed_project_roots] DB lookup skipped: {_db_exc}")

    unique_roots: list[Path] = []
    seen: set[str] = set()
    for root in roots:
        key = path_key(root)
        if key in seen:
            continue
        seen.add(key)
        unique_roots.append(root)
    return unique_roots


def resolve_project_or_tests_path(input_path: str, must_exist: bool = True) -> Path:
    raw = Path(unquote(str(input_path or "").strip()))
    if not str(raw):
        raise HTTPException(status_code=400, detail="Path is required.")

    candidates = [raw.resolve()] if raw.is_absolute() else [(root / raw).resolve() for root in allowed_project_roots()]

    for resolved in candidates:
        try:
            if any(resolved == root or resolved.is_relative_to(root) for root in allowed_project_roots()):
                if must_exist and not resolved.exists():
                    continue
                return resolved
        except Exception:
            continue

    raise HTTPException(status_code=400, detail="Path must stay inside backend tests or a registered local project.")


def resolve_editable_project_file(file_path: str) -> Path:
    resolved = resolve_project_or_tests_path(file_path)
    if not resolved.is_file():
        raise HTTPException(status_code=400, detail="File path must be a file.")
    if resolved.suffix.lower() not in {".js", ".ts", ".json"}:
        raise HTTPException(status_code=400, detail="Only script and JSON files can be edited here.")
    return resolved


def resolve_project_root_for_write(project_path: str | None) -> Path:
    resolved = resolve_project_or_tests_path(project_path or "")
    if not resolved.is_dir():
        raise HTTPException(status_code=400, detail="Project path must be a folder.")
    if not is_playwright_framework_project(resolved):
        raise HTTPException(status_code=400, detail="Project path must be a Playwright framework folder.")
    return resolved


def create_project_file(project_path: str | None, file_name: str | None, test_type: str | None, file_type: str | None = "spec") -> Path:
    project_root = resolve_project_root_for_write(project_path)
    kind = str(file_type or "spec").strip().lower()
    safe_base = sanitize_base_name(file_name)
    if not safe_base:
        raise HTTPException(status_code=400, detail="File name is required.")
    safe_key = safe_base.lower()

    if kind == "json":
        target_path = project_root / f"{safe_base}.json"
        if target_path.exists():
            raise HTTPException(status_code=400, detail=f"File '{target_path.name}' already exists in this project.")
        default_content = "{\n}\n"
    else:
        normalized_type = normalize_test_type(test_type) or "sanity"
        suite_folder = TEST_TYPE_FOLDERS.get(normalized_type, "sanity")
        target_dir = project_root / suite_folder
        target_path = target_dir / f"{safe_base}.spec.js"
        duplicate_spec = next(
            (
                item
                for item in project_root.rglob("*.spec.js")
                if sanitize_base_name(spec_file_base_name(item)).lower() == safe_key
            ),
            None,
        )
        if duplicate_spec:
            relative_duplicate = duplicate_spec.relative_to(project_root)
            raise HTTPException(status_code=400, detail=f"Spec file '{relative_duplicate.as_posix()}' already exists in this project.")
        title = safe_base.replace("-", " ")
        tag = test_tag_for_type(normalized_type) or ""
        default_content = (
            "const { test, expect } = require('@playwright/test');\n\n"
            f"test('{title}{f' {tag}' if tag else ''}', async ({{ page }}) => {{\n"
            "  // Add test steps here.\n"
            "});\n"
        )

    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_text(default_content, encoding="utf-8")
    return target_path


def build_project_zip(project_path: Path) -> Path:
    downloads_dir = ROOT / "test-results" / "downloads"
    ensure_dir(downloads_dir)
    zip_path = downloads_dir / f"{sanitize_base_name(project_path.name) or 'project'}-{timestamp()}.zip"
    ignored_dirs = {"node_modules", "test-results", "playwright-report", "__pycache__", ".git"}

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for item in project_path.rglob("*"):
            if not item.is_file():
                continue
            relative_parts = item.relative_to(project_path).parts
            if any(part in ignored_dirs for part in relative_parts):
                continue
            archive.write(item, Path(project_path.name) / item.relative_to(project_path))

    return zip_path


def _open_windows_path_picker(mode: str = "directory", initial_path: str | None = None) -> str | None:
    initial_dir = ""
    if initial_path:
        candidate = Path(initial_path).expanduser()
        initial_dir = str(candidate if candidate.is_dir() else candidate.parent)

    if mode == "file":
        script = f"""
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = 'Select local framework file'
$dialog.InitialDirectory = '{initial_dir.replace("'", "''")}'
$dialog.Filter = 'JavaScript Files (*.js)|*.js|All Files (*.*)|*.*'
$dialog.Multiselect = $false
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{
  [Console]::Write($dialog.FileName)
}}
"""
    else:
        script = f"""
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select local framework folder'
$dialog.UseDescriptionForTitle = $true
$dialog.SelectedPath = '{initial_dir.replace("'", "''")}'
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{
  [Console]::Write($dialog.SelectedPath)
}}
"""

    result = subprocess.run(
        ["powershell", "-NoProfile", "-STA", "-Command", script],
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "Windows path picker failed.")

    selected_path = result.stdout.strip()
    return selected_path or None


def open_native_path_picker(mode: str = "directory", initial_path: str | None = None) -> str | None:
    if os.name == "nt":
        return _open_windows_path_picker(mode, initial_path)

    if "tk" not in globals() or "filedialog" not in globals():
        raise RuntimeError("Native file picker is unavailable in this Python environment.")

    selection: dict[str, str | None] = {"path": None}
    error_holder: dict[str, Exception | None] = {"error": None}

    def choose_path() -> None:
        root = None
        try:
            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)

            options: dict[str, str] = {}
            initial_dir = str(Path(initial_path).expanduser()) if initial_path else ""
            if initial_dir:
                candidate = Path(initial_dir)
                options["initialdir"] = str(candidate if candidate.is_dir() else candidate.parent)

            if mode == "file":
                selection["path"] = filedialog.askopenfilename(
                    title="Select local framework file",
                    **options,
                ) or None
            else:
                selection["path"] = filedialog.askdirectory(
                    title="Select local framework folder",
                    mustexist=False,
                    **options,
                ) or None
        except Exception as exc:
            error_holder["error"] = exc
        finally:
            if root is not None:
                root.destroy()

    thread = threading.Thread(target=choose_path)
    thread.start()
    thread.join()

    if error_holder["error"] is not None:
        raise error_holder["error"]

    return selection["path"]


TEST_TYPE_FOLDERS = {
    "sanity": "sanity",
    "regression": "regression",
}


def normalize_test_type(value: str | None) -> str | None:
    text = str(value or "").strip().lower().replace("_", "-").replace(" ", "-")
    if text in {"sanity", "sanity-test", "sanitytest", "smoke", "smoke-test", "smoketest"}:
        return "sanity"
    if text in {"regression", "regression-test", "regressiontest"}:
        return "regression"
    return None


def test_tag_for_type(test_type: str | None) -> str | None:
    normalized = normalize_test_type(test_type)
    return f"@{normalized}" if normalized else None


def test_name_with_type_tag(test_name: str | None, test_type: str | None) -> str | None:
    tag = test_tag_for_type(test_type)
    name = str(test_name or "").strip()
    if not tag:
        return name or None
    if tag in name:
        return name
    return f"{name or 'generated flow'} {tag}"


def make_non_overwriting_path(target_path: Path) -> Path:
    if not target_path.exists():
        return target_path

    spec_suffix = next(
        (
            suffix
            for suffix in (".spec.js", ".spec.ts", ".test.js", ".test.ts")
            if target_path.name.lower().endswith(suffix)
        ),
        None,
    )
    if spec_suffix:
        base_name = target_path.name[:-len(spec_suffix)]
        for index in range(1, 1000):
            candidate = target_path.with_name(f"{base_name}-{index}{spec_suffix}")
            if not candidate.exists():
                return candidate

        return target_path.with_name(f"{base_name}-{timestamp()}{spec_suffix}")

    for index in range(1, 1000):
        candidate = target_path.with_name(f"{target_path.stem}-{index}{target_path.suffix}")
        if not candidate.exists():
            return candidate

    return target_path.with_name(f"{target_path.stem}-{timestamp()}{target_path.suffix}")


def add_test_tag_to_spec(spec_path: Path, test_type: str | None) -> None:
    tag = test_tag_for_type(test_type)
    if not tag or not spec_path.exists():
        return

    content = spec_path.read_text(encoding="utf-8")
    if tag in content:
        return

    def replace_title(match):
        quote = match.group(1)
        title = match.group(2).strip()
        return f"test({quote}{title} {tag}{quote},"

    updated = re.sub(
        r"test\(\s*(['\"])([^'\"]+)\1\s*,",
        replace_title,
        content,
        count=1,
    )
    if updated != content:
        spec_path.write_text(updated, encoding="utf-8")


def resolve_project_copy_path(project_path: Path, output_path: Path, test_type: str | None = None) -> Path:
    if project_path.suffix.lower() == ".js":
        return make_non_overwriting_path(project_path)

    normalized_type = normalize_test_type(test_type)
    suite_folder = TEST_TYPE_FOLDERS.get(normalized_type)

    if project_path.resolve().is_relative_to(TESTS_DIR.resolve()):
        target_dir = project_path / suite_folder if suite_folder else project_path
    elif suite_folder and any((project_path / folder).exists() for folder in TEST_TYPE_FOLDERS.values()):
        target_dir = project_path / suite_folder
    elif (project_path / "tests").exists() or (project_path / "package.json").exists() or (project_path / "playwright.config.js").exists():
        target_dir = project_path / "tests" / suite_folder if suite_folder else project_path / "tests"
    else:
        target_dir = project_path / suite_folder if suite_folder else project_path

    return make_non_overwriting_path(target_dir / output_path.name)


def resolve_test_data_path(spec_path: Path) -> Path:
    suite_name = spec_path.parent.name.lower()
    if suite_name in TEST_TYPE_FOLDERS.values():
        return (spec_path.parent.parent / "test-data.json").resolve()
    return (spec_path.parent / "test-data.json").resolve()


def resolve_masked_artifact_paths(spec_path: Path) -> dict[str, Path]:
    masked_dir = ROOT / "tests" / "masked"
    base_name = spec_path.stem
    return {
        "masked_trace_path": masked_dir / f"{base_name}.masked.trace.json",
        "masked_codegen_path": masked_dir / f"{base_name}.masked.codegen.js",
    }


def build_masking_payload(spec_path: Path | None, include_content: bool = True) -> dict[str, Any]:
    if not spec_path:
        return {
            "maskedTracePath": None,
            "maskedCodegenPath": None,
            "testDataPath": None,
            "maskedTraceContent": None,
            "maskedCodegenContent": None,
            "testDataContent": None,
        }

    masked_paths = resolve_masked_artifact_paths(spec_path)
    test_data_path = resolve_test_data_path(spec_path)
    return {
        "maskedTracePath": to_relative(masked_paths["masked_trace_path"]) if masked_paths["masked_trace_path"].exists() else None,
        "maskedCodegenPath": to_relative(masked_paths["masked_codegen_path"]) if masked_paths["masked_codegen_path"].exists() else None,
        "testDataPath": to_workspace_relative_or_absolute(test_data_path) if test_data_path.exists() else None,
        "maskedTraceContent": read_file_if_exists(masked_paths["masked_trace_path"]) if include_content else None,
        "maskedCodegenContent": read_file_if_exists(masked_paths["masked_codegen_path"]) if include_content else None,
        "testDataContent": read_file_if_exists(test_data_path) if include_content else None,
    }


def copy_generated_spec_to_project(output_path: Path, project_path: Path | None, test_type: str | None = None) -> Path | None:
    if not project_path:
        return None

    add_test_tag_to_spec(output_path, test_type)
    try:
        output_path.resolve().relative_to(project_path.resolve())
        return None
    except ValueError:
        pass

    target_path = resolve_project_copy_path(project_path, output_path, test_type)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(output_path, target_path)

    source_test_data_path = resolve_test_data_path(output_path)
    if source_test_data_path.exists():
        target_test_data_path = resolve_test_data_path(target_path)
        merge_test_data_json(source_test_data_path, target_test_data_path, target_path)
        if project_path:
            apply_project_faker_modes_to_test_data(project_path, target_test_data_path)
    return target_path


def prepare_project_spec_for_run(spec_path: Path, project_path: Path) -> Path:
    resolved_spec = spec_path.resolve()
    resolved_project = project_path.resolve()

    try:
        resolved_spec.relative_to(resolved_project)
        return resolved_spec
    except ValueError:
        pass

    target_path = copy_generated_spec_to_project(resolved_spec, resolved_project)
    if not target_path:
        raise HTTPException(status_code=400, detail="Unable to prepare spec file for the selected project.")
    return target_path.resolve()


async def run_process(command: str, args: list[str], cwd: Path | None = None, env: dict[str, str] | None = None) -> dict[str, Any]:
    process = await asyncio.create_subprocess_exec(
        resolve_command(command),
        *args,
        cwd=str(cwd or ROOT),
        env=env or get_run_env(),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout_bytes, stderr_bytes = await process.communicate()
    return {
        "code": process.returncode,
        "stdout": stdout_bytes.decode("utf-8", errors="replace"),
        "stderr": stderr_bytes.decode("utf-8", errors="replace"),
    }


async def run_command(command: list[str], cwd: Path | None = None, env: dict[str, str] | None = None) -> dict[str, Any]:
    return await run_process(command[0], command[1:], cwd=cwd, env=env)


async def run_python_script(script_path: Path, args: list[str]) -> dict[str, Any]:
    return await run_command([resolve_python_executable(), str(script_path), *args])


async def run_command_with_line_callback(
    command: list[str],
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    on_line=None,
) -> dict[str, Any]:
    process = await asyncio.create_subprocess_exec(
        resolve_command(command[0]),
        *command[1:],
        cwd=str(cwd or ROOT),
        env=env or get_run_env(),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )

    lines: list[str] = []
    assert process.stdout is not None
    async for raw_line in process.stdout:
        line = raw_line.decode("utf-8", errors="replace").rstrip()
        lines.append(line)
        if on_line:
            await on_line(line)

    await process.wait()
    return {
        "code": process.returncode,
        "stdout": "\n".join(lines),
        "stderr": "",
    }


async def stream_command_lines(
    command: list[str],
    cwd: Path,
    on_line,
    env: dict[str, str] | None = None,
) -> int:
    process = await asyncio.create_subprocess_exec(
        resolve_command(command[0]),
        *command[1:],
        cwd=str(cwd),
        env=env or get_run_env(),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )

    assert process.stdout is not None
    async for line in process.stdout:
        await on_line(line.decode("utf-8", errors="replace").rstrip())

    await process.wait()
    return int(process.returncode or 0)


async def run_command_with_watched_file(command: list[str], watched_file_path: Path | None, on_file_ready) -> dict[str, Any]:
    process = await asyncio.create_subprocess_exec(
        resolve_command(command[0]),
        *command[1:],
        cwd=str(ROOT),
        env=get_run_env(),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    stdout_chunks: list[str] = []
    stderr_chunks: list[str] = []
    file_reported = False
    last_content: str | None = None

    async def maybe_report_file() -> None:
        nonlocal file_reported, last_content
        if not watched_file_path or not watched_file_path.exists() or not watched_file_path.is_file():
            return
        content = watched_file_path.read_text(encoding="utf-8")
        if not content or content == last_content:
            return
        last_content = content
        file_reported = True
        await on_file_ready(content)

    async def read_stream(stream, chunks: list[str]) -> None:
        while True:
            chunk = await stream.read(4096)
            if not chunk:
                break
            chunks.append(chunk.decode("utf-8", errors="replace"))
            await maybe_report_file()

    async def poll_file() -> None:
        try:
            while process.returncode is None:
                await maybe_report_file()
                await asyncio.sleep(0.5)
        except asyncio.CancelledError:
            raise

    stdout_task = asyncio.create_task(read_stream(process.stdout, stdout_chunks))
    stderr_task = asyncio.create_task(read_stream(process.stderr, stderr_chunks))
    poller = asyncio.create_task(poll_file())

    await process.wait()
    await stdout_task
    await stderr_task
    poller.cancel()
    with suppress(asyncio.CancelledError):
        await poller
    await maybe_report_file()

    return {
        "code": process.returncode,
        "stdout": "".join(stdout_chunks),
        "stderr": "".join(stderr_chunks),
        "fileReported": file_reported,
    }


def ensure_playwright_project_scaffold(project_path: Path) -> list[str]:
    project_path.mkdir(parents=True, exist_ok=True)
    logs: list[str] = []

    for test_type_folder in TEST_TYPE_FOLDERS.values():
        target_dir = project_path / test_type_folder
        target_dir.mkdir(parents=True, exist_ok=True)
        logs.append(f"Ensured folder: {target_dir}")
    # Copy fixtures into project so it's self-contained
    fixtures_target_dir = project_path / "fixtures"
    fixtures_target_dir.mkdir(parents=True, exist_ok=True)
    fixtures_source_dir = Path(__file__).resolve().parent.parent.parent / "tests" / "fixtures"
    for fixture_name in ("walker_fixture.js", "inline_healer.js", "browser_script.js"):
        source_file = fixtures_source_dir / fixture_name
        target_file = fixtures_target_dir / fixture_name
        if source_file.exists() and not target_file.exists():
            import shutil as _shutil
            _shutil.copyfile(source_file, target_file)
            logs.append(f"Copied fixture: {fixture_name}")
    package_json_path = project_path / "package.json"
    package_json_existed = package_json_path.exists()
    if ensure_project_package_json(package_json_path):
        logs.append("Updated package.json" if package_json_existed else "Created package.json")

    gitignore_path = project_path / ".gitignore"
    gitignore_existed = gitignore_path.exists()
    if ensure_project_gitignore(gitignore_path):
        logs.append("Updated .gitignore" if gitignore_existed else "Created .gitignore")

    playwright_config_path = project_path / "playwright.config.js"
    if not playwright_config_path.exists():
        playwright_config_path.write_text(GENERATED_PLAYWRIGHT_CONFIG, encoding="utf-8")
        logs.append("Created playwright.config.js")
    
    playwright_healed_config_path = project_path / "playwright.healed.config.js"
    if not playwright_healed_config_path.exists():
        playwright_healed_config_path.write_text(GENERATED_HEALED_CONFIG, encoding="utf-8")
        logs.append("Created playwright.healed.config.js")

    jenkinsfile_path = project_path / "Jenkinsfile"
    if not jenkinsfile_path.exists():
        jenkinsfile_path.write_text(GENERATED_JENKINSFILE, encoding="utf-8")
        logs.append("Created Jenkinsfile")

    readme_path = project_path / "README.md"
    if not readme_path.exists():
        readme_path.write_text(
            f"""# Playwright Generated Framework

This folder is prepared to run AI-generated Playwright test files.

## Project Structure

- `sanity/` stores sanity spec files
- `regression/` stores regression spec files
- `playwright.config.js` contains the Playwright config
- `Jenkinsfile` contains the CI/CD pipeline definition
- `package.json` contains the test script and dependencies

## Install

Run these commands inside this folder:

```powershell
npm install
npx playwright install
```

## Run All Tests

```powershell
npm test
```

## Run Sanity Tests

```powershell
npm run test:sanity
```

## Run Regression Tests

```powershell
npm run test:regression
```

## Jenkins CI/CD

Use the root `Jenkinsfile` to create a Jenkins Pipeline job that checks out this repo and runs the selected suite or spec.

```powershell
EXECUTION_MODE=suite
TARGET=regression
```

or

```powershell
EXECUTION_MODE=spec
TARGET=regression/test_kortis_01.spec.js
```

## Run One Spec File

```powershell
npx playwright test sanity/<your-file>.spec.js --project=chromium --headed
```

## Run On Specific Browsers

```powershell
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Notes

- Save or copy typed generated specs into `sanity/` or `regression/`
- Use `--headed` if you want to watch the browser run
- Current framework folder: `{project_path}`
""",
            encoding="utf-8",
        )
        logs.append("Created README.md")

    return logs


def resolve_user_path(input_path: str, expected_root: Path) -> Path:
    raw = Path(unquote(input_path))
    resolved = raw if raw.is_absolute() else (ROOT / raw).resolve()
    try:
        resolved.relative_to(expected_root.resolve())
    except ValueError as exc:
        label = to_relative(expected_root) if expected_root.exists() else expected_root.name
        raise HTTPException(status_code=400, detail=f"Path must stay inside {label}.") from exc
    return resolved


def resolve_artifact_selection(body: dict[str, Any]) -> dict[str, Any]:
    latest_pair = get_latest_artifact_pair()
    trace_path = resolve_user_path(body["tracePath"], CODEGEN_DIR) if body.get("tracePath") else (latest_pair or {}).get("trace_path")
    codegen_path = resolve_user_path(body["codegenPath"], CODEGEN_DIR) if body.get("codegenPath") else (latest_pair or {}).get("codegen_path")
    if not trace_path or not codegen_path:
        raise HTTPException(status_code=400, detail="No trace/codegen artifacts found. Run the recorder first.")
    return {"trace_path": trace_path, "codegen_path": codegen_path, "stamp": (latest_pair or {}).get("stamp")}


@dataclass
class Job:
    id: str
    status: str
    step: str
    message: str
    created_at: str
    updated_at: str
    result: dict[str, Any] | None = None
    error: str | None = None
    progress: list[dict[str, Any]] = field(default_factory=list)
    clients: set[WebSocket] = field(default_factory=set)


jobs: dict[str, Job] = {}


def create_job(initial_message: str | None = None) -> Job:
    message = initial_message or "Queued"
    job = Job(
        id=f"{int(datetime.now().timestamp() * 1000)}-{uuid.uuid4().hex[:6]}",
        status="queued",
        step="queued",
        message=message,
        created_at=utc_now_iso(),
        updated_at=utc_now_iso(),
    )
    job.progress.append({
        "step": "queued",
        "status": "running",
        "message": message,
        "timestamp": job.created_at,
    })
    jobs[job.id] = job
    return job


def sanitize_job(job: Job) -> dict[str, Any]:
    return {
        "id": job.id,
        "status": job.status,
        "step": job.step,
        "message": job.message,
        "createdAt": job.created_at,
        "updatedAt": job.updated_at,
        "result": job.result,
        "error": job.error,
        "progress": job.progress,
    }


def parse_llm_usage_summary(text: str | None) -> dict[str, Any] | None:
    if not text:
        return None

    matches = re.findall(r'^\[llm-usage\]\s+(\{.*\})$', str(text), flags=re.MULTILINE)
    if not matches:
        return None

    for raw_json in reversed(matches):
        try:
            payload = json.loads(raw_json)
        except Exception:
            continue
        if isinstance(payload, dict):
            return payload

    return None


async def emit_job(job: Job) -> None:
    payload = json.dumps({"type": "job.update", "job": sanitize_job(job)})
    stale_clients: list[WebSocket] = []
    for client in list(job.clients):
        try:
            await client.send_text(payload)
        except Exception:
            stale_clients.append(client)
    for client in stale_clients:
        job.clients.discard(client)


async def update_job(job: Job, patch: dict[str, Any]) -> None:
    progress_item = patch.pop("progressItem", None)
    for key, value in patch.items():
        if key == "createdAt":
            job.created_at = value
        elif key == "updatedAt":
            job.updated_at = value
        else:
            setattr(job, key, value)
    job.updated_at = utc_now_iso()
    if progress_item:
        job.progress.append({
            "step": progress_item.get("step") or job.step,
            "status": progress_item.get("status") or job.status,
            "message": progress_item.get("message") or job.message,
            "timestamp": job.updated_at,
        })
    await emit_job(job)


async def add_job_progress(job: Job, step: str, message: str, status: str | None = None) -> None:
    await update_job(job, {
        "step": step,
        "message": message,
        "progressItem": {
            "step": step,
            "status": status or job.status,
            "message": message,
        },
    })


class RecordBody(BaseModel):
    url: str | None = Field(default=None, description="Target URL to start recording from.")
    browser: str | None = Field(default="chromium", description="Browser to use for the recorder.")
    viewportWidth: int | str | None = Field(default=None, description="Optional viewport width.")
    viewportHeight: int | str | None = Field(default=None, description="Optional viewport height.")
    fileName: str | None = Field(default=None, description="Output spec file name without extension.")
    testName: str | None = Field(default=None, description="Human-friendly test title.")
    testType: str | None = Field(default=None, description="Optional suite tag: sanity or regression.")
    outputPath: str | None = Field(default=None, description="Optional explicit output path for the generated spec.")
    projectPath: str | None = Field(default=None, description="Project folder where the spec should be saved.")


class RefineBody(BaseModel):
    tracePath: str | None = Field(default=None, description="Path to the recorder trace artifact.")
    codegenPath: str | None = Field(default=None, description="Path to the raw codegen artifact.")
    outputPath: str | None = Field(default=None, description="Optional explicit output spec path.")
    fileName: str | None = Field(default=None, description="Output spec file name without extension.")
    testName: str | None = Field(default=None, description="Human-friendly test title.")
    testType: str | None = Field(default=None, description="Optional suite tag: sanity or regression.")
    projectPath: str | None = Field(default=None, description="Project folder where the spec should be saved.")


class ProjectPathBody(BaseModel):
    projectPath: str | None = Field(default=None, description="Selected project folder path.")


class ProjectCreateBody(BaseModel):
    projectName: str | None = Field(default=None, description="Local project folder name.")
    parentPath: str | None = Field(default=None, description="Parent folder where the project will be created.")
    githubUrl: str | None = Field(default=None, description="Optional GitHub repository URL to clone for the project.")


class ProjectFileSaveBody(BaseModel):
    filePath: str | None = Field(default=None, description="Absolute path to the project file.")
    content: str | None = Field(default=None, description="Updated file content.")


class ProjectFileCreateBody(BaseModel):
    projectPath: str | None = Field(default=None, description="Project folder path.")
    fileName: str | None = Field(default=None, description="File name to create.")
    testType: str | None = Field(default=None, description="Optional suite folder: sanity or regression.")
    fileType: str | None = Field(default="spec", description="File kind to create.")


class ProjectFolderBody(BaseModel):
    folder_path: str | None = Field(default=None, description="Folder path to prepare as a framework project.")


class PathPickerBody(BaseModel):
    mode: str | None = Field(default="directory", description="directory or file picker mode.")
    initialPath: str | None = Field(default=None, description="Optional starting path for the picker.")


class RunBody(BaseModel):
    specPath: str | None = Field(default=None, description="Path to the spec file to run.")
    specContent: str | None = Field(default=None, description="Inline spec content to run without saving first.")
    specName: str | None = Field(default=None, description="Optional label for inline content.")
    project: str | None = Field(default=None, description="Single Playwright project name such as chromium.")
    projects: list[str] | None = Field(default=None, description="List of Playwright project names to run.")
    headed: bool | None = Field(default=True, description="Whether to run in headed mode.")


class JenkinsTriggerBody(BaseModel):
    testType: str | None = Field(default=None, description="sanity or regression.")
    jobName: str | None = Field(default=None, description="Jenkins job name to trigger.")
    projectPath: str | None = Field(default=None, description="Selected project path.")
    browser: str | None = Field(default="chromium", description="Playwright browser selection.")
    headed: bool | None = Field(default=False, description="Run Jenkins job in headed mode.")
    execution: str | None = Field(default="parallel", description="parallel or sequential.")


class JenkinsJobCreateBody(BaseModel):
    projectPath: str | None = Field(default=None, description="Selected project path.")
    jobName: str | None = Field(default=None, description="Jenkins job name to create.")
    githubUrl: str | None = Field(default=None, description="GitHub repository URL for the Jenkins SCM source.")
    branchName: str | None = Field(default="main", description="Git branch to use in Jenkins.")
    jenkinsfilePath: str | None = Field(default="Jenkinsfile", description="Path to the Jenkinsfile in the repo.")


class ProjectPushBody(BaseModel):
    projectPath: str | None = Field(default=None, description="Selected project path.")
    commitMessage: str | None = Field(default=None, description="Git commit message to use before pushing.")


class AssertionSuggestionsBody(BaseModel):
    scriptText: str | None = Field(default=None, description="Full Playwright script text.")
    line: str | None = Field(default=None, description="Current line text.")
    lineNumber: int | None = Field(default=None, description="1-based line number.")
    allLines: list[str] | None = Field(default=None, description="All lines in the current script.")


def detect_project_config(project_path: Path | None) -> dict[str, Any]:
    path = project_path.resolve() if project_path else None
    package_json = path / "package.json" if path and path.is_dir() else None
    playwright_config_js = path / "playwright.config.js" if path and path.is_dir() else None
    playwright_config_ts = path / "playwright.config.ts" if path and path.is_dir() else None
    tests_dir = path / "tests" if path and path.is_dir() else None
    sanity_dir = (
        path / "sanity"
        if path and (path / "sanity").exists()
        else tests_dir / "sanity" if tests_dir and tests_dir.exists()
        else None
    )
    regression_dir = (
        path / "regression"
        if path and (path / "regression").exists()
        else tests_dir / "regression" if tests_dir and tests_dir.exists()
        else None
    )

    return {
        "project_path": str(path) if path else None,
        "exists": bool(path and path.exists()),
        "is_file": bool(path and path.is_file()),
        "is_directory": bool(path and path.is_dir()),
        "has_package_json": bool(package_json and package_json.exists()),
        "has_playwright_config": bool(
            (playwright_config_js and playwright_config_js.exists())
            or (playwright_config_ts and playwright_config_ts.exists())
        ),
        "tests_dir": str(tests_dir) if tests_dir and tests_dir.exists() else None,
        "sanity_dir": str(sanity_dir) if sanity_dir and sanity_dir.exists() else None,
        "regression_dir": str(regression_dir) if regression_dir and regression_dir.exists() else None,
        "detected_type": (
            "file" if path and path.is_file()
            else "playwright-project" if path and path.is_dir() and (
                (package_json and package_json.exists())
                or (playwright_config_js and playwright_config_js.exists())
                or (playwright_config_ts and playwright_config_ts.exists())
            )
            else "folder" if path and path.is_dir()
            else "missing" if path
            else "unconfigured"
        ),
    }


def build_folder_tree(root_path: Path, max_depth: int = 3, max_entries: int = 200) -> list[dict[str, Any]]:
    counter = {"count": 0}

    def walk(path: Path, depth: int) -> list[dict[str, Any]]:
        if depth > max_depth or counter["count"] >= max_entries:
            return []

        try:
            entries = sorted(
                list(path.iterdir()),
                key=lambda item: (not item.is_dir(), item.name.lower()),
            )
        except Exception:
            return []

        items: list[dict[str, Any]] = []
        for entry in entries:
            if counter["count"] >= max_entries:
                break
            counter["count"] += 1
            node = {
                "name": entry.name,
                "path": str(entry.resolve()),
                "type": "folder" if entry.is_dir() else "file",
            }
            if entry.is_dir():
                node["children"] = walk(entry, depth + 1)
            items.append(node)
        return items

    return walk(root_path, 1)


async def run_record_and_refine_job(job: Job, body: dict[str, Any]) -> None:
    record_command: list[str] | None = None
    refine_command: list[str] | None = None
    record_result: dict[str, Any] | None = None
    refine_result: dict[str, Any] | None = None

    async def emit_wait_messages(step: str, message: str, stop_event: asyncio.Event) -> None:
        started_at = datetime.now(timezone.utc)
        try:
            while not stop_event.is_set():
                await asyncio.sleep(8)
                if stop_event.is_set():
                    return
                elapsed_seconds = int((datetime.now(timezone.utc) - started_at).total_seconds())
                await update_job(job, {
                    "step": step,
                    "message": f"{message} ({elapsed_seconds}s elapsed)",
                })
        except asyncio.CancelledError:
            raise

    try:
        url = str(body.get("url") or "").strip()
        browser = str(body.get("browser") or "chromium").strip().lower()
        test_type = normalize_test_type(body.get("testType"))
        tagged_test_name = test_name_with_type_tag(body.get("testName"), test_type)
        project_path = set_project_path(body.get("projectPath")) if body.get("projectPath") is not None else get_project_path()
        project_path = prefer_registered_project_for_duplicate(project_path)
        if project_path:
            set_project_path(str(project_path))
        if not url:
            raise ValueError("`url` is required.")
        if not project_path:
            raise ValueError("Select or create a project before generating a test.")

        await update_job(job, {
            "status": "running",
            "step": "recording",
            "message": "Recorder started. Close the browser after your actions to continue AI generation.",
            "progressItem": {
                "step": "recording",
                "status": "running",
                "message": "Recorder opened. Perform the flow, then close the browser window.",
            },
        })

        record_command = build_record_command(url, browser, body.get("viewportWidth"), body.get("viewportHeight"))
        recording_stop = asyncio.Event()
        recording_heartbeat = asyncio.create_task(emit_wait_messages(
            "recording",
            "Recording is active. Waiting for the browser session to close",
            recording_stop,
        ))
        try:
            recorder_ready_reported = False

            async def on_record_line(line: str) -> None:
                nonlocal recorder_ready_reported
                if not recorder_ready_reported and "Recorder ready" in line:
                    recorder_ready_reported = True
                    await add_job_progress(
                        job,
                        "recording",
                        "Recorder window is ready. Complete your browser actions, then close it.",
                        "running",
                    )

            record_result = await run_command_with_line_callback(record_command, on_line=on_record_line)
        finally:
            recording_stop.set()
            recording_heartbeat.cancel()
            with suppress(asyncio.CancelledError):
                await recording_heartbeat
        record_output = parse_record_output(record_result["stdout"])
        if record_result["code"] != 0:
            raise RuntimeError(record_result["stderr"] or record_result["stdout"] or "Recording failed.")

        await add_job_progress(job, "recording_done", "Recording saved. Preparing trace and codegen files.", "running")
        latest_pair = get_latest_artifact_pair()
        if not latest_pair:
            raise RuntimeError("No trace/codegen artifacts found after recording.")

        output_path = (
            resolve_project_or_tests_path(body["outputPath"], must_exist=False)
            if body.get("outputPath")
            else build_generated_spec_path(body.get("fileName"), latest_pair["stamp"], test_type, project_path)
        )

        await update_job(job, {
            "status": "running",
            "step": "refining",
            "message": "Recording complete. AI is generating the optimized Playwright file.",
            "progressItem": {
                "step": "refining",
                "status": "running",
                "message": "AI generation started. The generated spec will appear here when ready.",
            },
            "result": {
                "browser": browser,
                "url": url,
                "recordOutput": record_output,
                "tracePath": to_relative(latest_pair["trace_path"]),
                "codegenPath": to_relative(latest_pair["codegen_path"]),
                "outputPath": to_workspace_relative_or_absolute(output_path),
                "codegenContent": None,
                "aiSpecContent": None,
                "projectPath": str(project_path) if project_path else None,
                "projectCopyPath": None,
                "testType": test_type,
                **build_masking_payload(None),
            },
        })

        refine_command = build_refine_command(latest_pair["trace_path"], latest_pair["codegen_path"], output_path, tagged_test_name)

        async def on_file_ready(ai_spec_content: str) -> None:
            masking = build_masking_payload(output_path)
            await update_job(job, {
                "status": "running",
                "step": "refining",
                "message": "AI file created. Finalizing generated output.",
                "progressItem": {
                    "step": "file_detected",
                    "status": "running",
                    "message": "AI file detected. Final checks and project save are running.",
                },
                "result": {
                    "browser": browser,
                    "url": url,
                    "recordOutput": record_output,
                    "tracePath": to_relative(latest_pair["trace_path"]),
                    "codegenPath": to_relative(latest_pair["codegen_path"]),
                    "outputPath": to_workspace_relative_or_absolute(output_path),
                    "outputExists": True,
                    "codegenContent": masking["maskedCodegenContent"],
                    "aiSpecContent": ai_spec_content,
                    "projectPath": str(project_path) if project_path else None,
                    "projectCopyPath": None,
                    "testType": test_type,
                    **masking,
                },
            })

        refine_stop = asyncio.Event()
        refine_heartbeat = asyncio.create_task(emit_wait_messages(
            "refining",
            "AI generation is still running. Waiting for the spec file",
            refine_stop,
        ))
        try:
            refine_result = await run_command_with_watched_file(refine_command, output_path, on_file_ready)
        finally:
            refine_stop.set()
            refine_heartbeat.cancel()
            with suppress(asyncio.CancelledError):
                await refine_heartbeat
        if refine_result["code"] != 0:
            raise RuntimeError(refine_result["stderr"] or refine_result["stdout"] or "Refine failed.")
        await add_job_progress(job, "finalizing", "AI generation finished. Saving tags and test data.", "running")
        add_test_tag_to_spec(output_path, test_type)
        project_copy_path = copy_generated_spec_to_project(output_path, project_path, test_type)
        project_copy_test_data_path = resolve_test_data_path(project_copy_path) if project_copy_path else None
        llm_usage = parse_llm_usage_summary(refine_result["stdout"] if refine_result else None)
        # Record the test case in the tracking database
        try:
            # Use copy if it exists, else use the original output_path
            effective_spec_path = project_copy_path or output_path
            if effective_spec_path and project_path:
                from ..db.database import upsert_test_case
                import re as _re

                # Compute relative path from project root: e.g. "sanity/test_login.spec.js"
                try:
                    spec_relpath = str(Path(effective_spec_path).relative_to(Path(project_path))).replace("\\", "/")
                except ValueError:
                    spec_relpath = str(effective_spec_path).replace("\\", "/")

                # Extract test name from the spec file: test('XXX', ...) â†’ "XXX"
                try:
                    spec_content = Path(effective_spec_path).read_text(encoding="utf-8")
                    name_match = _re.search(r"test\(\s*['\"]([^'\"]+)['\"]", spec_content)
                    raw_name = name_match.group(1) if name_match else (tagged_test_name or "unnamed test")
                    # Strip trailing tags like " @sanity" / " @regression" / " @smoke"
                    extracted_test_name = _re.sub(r"\s*@\w+\s*$", "", raw_name).strip() or raw_name
                except Exception:
                    extracted_test_name = _re.sub(r"\s*@\w+\s*$", "", tagged_test_name or "").strip() or "unnamed test"

                db_record = upsert_test_case(
                    project_path=str(project_path),
                    spec_relpath=spec_relpath,
                    test_name=extracted_test_name,
                    test_type=test_type or "sanity",
                )
                if db_record:
                    print(f"[db] test_case recorded: key={db_record.get('test_case_key')} name={extracted_test_name} type={test_type}")
        except Exception as _db_exc:
            # DB failures should not break the recording workflow
            print(f"[db] Failed to record test_case: {_db_exc}")
        write_latest_workflow_state(build_latest_workflow_state(
            latest_pair["trace_path"],
            latest_pair["codegen_path"],
            output_path,
            project_copy_path,
        ))
        masking = build_masking_payload(output_path)

        await update_job(job, {
            "status": "completed",
            "step": "completed",
            "message": "AI generated file is ready.",
            "progressItem": {
                "step": "completed",
                "status": "completed",
                "message": "AI generated file is ready in the UI and project folder.",
            },
            "result": {
                "browser": browser,
                "url": url,
                "recordOutput": record_output,
                "tracePath": to_relative(latest_pair["trace_path"]),
                "codegenPath": to_relative(latest_pair["codegen_path"]),
                "outputPath": to_workspace_relative_or_absolute(output_path),
                "outputExists": output_path.exists(),
                "codegenContent": masking["maskedCodegenContent"],
                "aiSpecContent": read_file_if_exists(output_path),
                "projectPath": str(project_path) if project_path else None,
                "projectCopyPath": str(project_copy_path) if project_copy_path else None,
                "projectCopyTestDataPath": str(project_copy_test_data_path) if project_copy_test_data_path and project_copy_test_data_path.exists() else None,
                "projectCopyTestDataContent": read_file_if_exists(project_copy_test_data_path),
                "testType": test_type,
                **masking,
                "recordStdout": record_result["stdout"],
                "recordStderr": record_result["stderr"],
                "refineStdout": refine_result["stdout"],
                "refineStderr": refine_result["stderr"],
                "llmUsage": llm_usage,
            },
        })
    except Exception as error:
        await update_job(job, {
            "status": "failed",
            "step": "failed",
            "message": "Workflow failed.",
            "error": str(error),
            "progressItem": {
                "step": "failed",
                "status": "failed",
                "message": f"Workflow failed: {error}",
            },
            "result": {
                "browser": str(body.get("browser") or "chromium").strip().lower(),
                "url": str(body.get("url") or "").strip(),
                "projectPath": str(get_project_path()) if get_project_path() else None,
                "recordCommand": " ".join(record_command) if record_command else None,
                "refineCommand": " ".join(refine_command) if refine_command else None,
                "recordStdout": record_result["stdout"] if record_result else None,
                "recordStderr": record_result["stderr"] if record_result else None,
                "recordCode": record_result["code"] if record_result else None,
                "refineStdout": refine_result["stdout"] if refine_result else None,
                "refineStderr": refine_result["stderr"] if refine_result else None,
                "refineCode": refine_result["code"] if refine_result else None,
                "llmUsage": parse_llm_usage_summary((refine_result or {}).get("stdout") if refine_result else None),
            },
        })


def _run_git(args: list[str], cwd: Path, timeout: int = 60) -> dict[str, Any]:
    """Run a git command, return {ok, stdout, stderr, returncode}."""
    import subprocess
    try:
        result = subprocess.run(
            ["git"] + args,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            "ok": result.returncode == 0,
            "returncode": result.returncode,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
        }
    except subprocess.TimeoutExpired:
        return {"ok": False, "returncode": -1, "stdout": "", "stderr": "timeout"}
    except FileNotFoundError:
        return {"ok": False, "returncode": -1, "stdout": "", "stderr": "git not found"}


def git_remote_status(project_path: Path, branch: str = "main") -> dict[str, Any]:
    """
    Returns info about the remote branch:
      { ok, status, branch, local_sha, remote_sha, ahead, behind,
        last_commit_at, last_commit_message, last_commit_author }
    status is one of: "up_to_date" | "ahead" | "behind" | "diverged" | "no_remote" | "error"
    """
    project_path = Path(project_path)
    if not (project_path / ".git").exists():
        return {"ok": False, "status": "error", "error": "Not a git repository"}

    # Check if a remote exists
    remotes = _run_git(["remote"], project_path)
    if not remotes["ok"] or not remotes["stdout"].strip():
        return {"ok": True, "status": "no_remote", "branch": branch}

    # Fetch using explicit refspec so origin/<branch> gets updated
    # This handles repos where remote-tracking refs were never set up properly
    fetch = _run_git(
        ["fetch", "origin", f"+refs/heads/{branch}:refs/remotes/origin/{branch}"],
        project_path,
        timeout=30,
    )
    if not fetch["ok"]:
        err = fetch["stderr"].lower()
        if "couldn't find remote ref" in err or "no such ref" in err or "remote branch" in err:
            return {"ok": True, "status": "no_remote", "branch": branch, "stderr": fetch["stderr"]}
        return {"ok": False, "status": "error", "error": fetch["stderr"]}

    # Get local + remote SHAs
    local = _run_git(["rev-parse", branch], project_path)
    if not local["ok"]:
        # Local branch doesn't exist — try HEAD
        local = _run_git(["rev-parse", "HEAD"], project_path)
        if not local["ok"]:
            # No commits at all — fresh repo, allow first push
            return {
                "ok": True,
                "status": "no_commits",
                "branch": branch,
                "hint": "No commits yet — make your first commit and push to create the branch on the remote.",
            }

    remote = _run_git(["rev-parse", f"refs/remotes/origin/{branch}"], project_path)
    if not remote["ok"]:
        # Fallback to FETCH_HEAD if the remote-tracking ref still doesn't exist
        remote = _run_git(["rev-parse", "FETCH_HEAD"], project_path)
        if not remote["ok"]:
            return {"ok": False, "status": "error", "error": f"Failed to resolve remote ref: {remote['stderr']}"}

    local_sha = local["stdout"]
    remote_sha = remote["stdout"]

    # Counts: how many commits ahead/behind
    ahead = behind = 0
    counts = _run_git(
        ["rev-list", "--left-right", "--count", f"{local_sha}...{remote_sha}"],
        project_path,
    )
    if counts["ok"] and counts["stdout"]:
        parts = counts["stdout"].split()
        if len(parts) == 2:
            try:
                ahead, behind = int(parts[0]), int(parts[1])
            except ValueError:
                pass

    if local_sha == remote_sha:
        status = "up_to_date"
    elif ahead > 0 and behind == 0:
        status = "ahead"
    elif behind > 0 and ahead == 0:
        status = "behind"
    else:
        status = "diverged"

    # Get last commit info from remote SHA
    log = _run_git(
        ["log", "-1", "--format=%cI%n%an%n%s", remote_sha],
        project_path,
    )
    last_commit_at = last_commit_author = last_commit_message = ""
    if log["ok"]:
        parts = log["stdout"].split("\n", 2)
        if len(parts) >= 3:
            last_commit_at, last_commit_author, last_commit_message = parts[0], parts[1], parts[2]

    return {
        "ok": True,
        "status": status,
        "branch": branch,
        "local_sha": local_sha[:8],
        "remote_sha": remote_sha[:8],
        "ahead": ahead,
        "behind": behind,
        "last_commit_at": last_commit_at,
        "last_commit_author": last_commit_author,
        "last_commit_message": last_commit_message,
    }

def git_pull_with_stash(project_path: Path, branch: str = "main") -> dict[str, Any]:
    """
    Pull latest from remote. Behavior:
      0. Check if HEAD exists (initial commit was made) — if not, skip stash logic
      1. Clear ALL existing stashes (avoid accumulation)
      2. If working dir has uncommitted changes, create a new stash
      3. git pull
      4. Leave stash in place (caller is expected to pop it on next commit/push)

    Returns: { ok, status, stashed, stash_name, steps }
    """
    project_path = Path(project_path)
    if not (project_path / ".git").exists():
        return {"ok": False, "error": "Not a git repository"}

    steps: list[str] = []
    stashed = False
    stash_name = ""

    # 0. Check if any commits exist (HEAD points to something)
    head_check = _run_git(["rev-parse", "--verify", "HEAD"], project_path)
    has_initial_commit = head_check["ok"]

    if not has_initial_commit:
        # Fresh repo, no initial commit. Skip stash; just check if remote has anything.
        steps.append("No initial commit yet — skipping stash")
        # Try a fetch to see if remote exists
        fetch = _run_git(["fetch", "origin", branch], project_path, timeout=60)
        if not fetch["ok"]:
            return {
                "ok": False,
                "error": (
                    "Cannot pull: no initial commit exists locally and no remote branch was found. "
                    "Make your first commit and push it to create the branch on the remote."
                ),
                "hint": "Use 'Commit & Push' to create your first commit.",
                "steps": steps,
            }
        # If remote has the branch, we can checkout / reset
        ref_check = _run_git(["show-ref", f"refs/remotes/origin/{branch}"], project_path)
        if not ref_check["ok"]:
            return {
                "ok": False,
                "error": f"Remote branch 'origin/{branch}' does not exist yet. Push your first commit.",
                "steps": steps,
            }
        # We have a remote branch but no local commits — fast-forward
        ff = _run_git(["pull", "origin", branch], project_path, timeout=60)
        if not ff["ok"]:
            return {"ok": False, "error": f"Initial pull failed: {ff['stderr']}", "steps": steps}
        steps.append(f"Pulled from origin/{branch} (initial)")
        return {
            "ok": True,
            "status": "pulled",
            "branch": branch,
            "stashed": False,
            "stash_name": "",
            "steps": steps,
        }

    # 1. Clear ALL existing stashes
    list_before = _run_git(["stash", "list"], project_path)
    if list_before["ok"] and list_before["stdout"].strip():
        clear = _run_git(["stash", "clear"], project_path)
        if clear["ok"]:
            steps.append("Cleared existing stashes")

    # 2. Stash uncommitted changes if any
    diff = _run_git(["status", "--porcelain"], project_path)
    if diff["ok"] and diff["stdout"]:
        stash_name = f"ui-autopull-{int(__import__('time').time())}"
        stash = _run_git(["stash", "push", "-u", "-m", stash_name], project_path)
        if not stash["ok"]:
            return {"ok": False, "error": f"Stash failed: {stash['stderr']}", "steps": steps}
        stashed = True
        steps.append(f"Stashed uncommitted changes ({stash_name})")

    # 3. Pull
    pull = _run_git(["pull", "--no-rebase", "origin", branch], project_path, timeout=60)
    if not pull["ok"]:
        # If pull failed, leave the stash for the user to recover
        return {
            "ok": False,
            "error": f"Pull failed: {pull['stderr']}",
            "hint": "Resolve in your IDE. Your changes are saved in stash.",
            "stash_name": stash_name if stashed else "",
            "steps": steps,
        }
    steps.append(f"Pulled from origin/{branch}")

    return {
        "ok": True,
        "status": "pulled",
        "branch": branch,
        "stashed": stashed,
        "stash_name": stash_name,
        "steps": steps,
    }


def git_safe_push(project_path: Path, commit_message: str, branch: str = "main") -> dict[str, Any]:
    """
    Push flow assuming the caller has already pulled (if needed):
      1. Pop any pending stash (created during prior pull)
      2. Stage + commit
      3. Push
    Returns a dict describing what happened.
    """
    project_path = Path(project_path)
    if not (project_path / ".git").exists():
        return {"ok": False, "error": "Not a git repository"}

    steps: list[str] = []

    # 1. Pop a pending stash (if any). We popped it by exact name (created
    # in git_pull_with_stash) â€” but here we pop the latest, since only ours
    # should exist (we cleared all before pull).
    stash_list = _run_git(["stash", "list"], project_path)
    if stash_list["ok"] and stash_list["stdout"].strip():
        pop = _run_git(["stash", "pop"], project_path)
        if not pop["ok"]:
            return {
                "ok": False,
                "error": "Stash pop had conflicts. Your changes are saved in stash.",
                "hint": "Run: git stash list  and  git stash pop  in your IDE to resolve manually.",
                "steps": steps,
            }
        steps.append("Restored stashed changes")

    # 2. Stage everything
    add = _run_git(["add", "-A"], project_path)
    if not add["ok"]:
        return {"ok": False, "error": f"git add failed: {add['stderr']}", "steps": steps}

    # 3. Commit (or skip if nothing to commit)
    has_changes = _run_git(["diff", "--cached", "--quiet"], project_path)
    nothing_to_commit = has_changes["returncode"] == 0
    if not nothing_to_commit:
        commit = _run_git(["commit", "-m", commit_message], project_path)
        if not commit["ok"]:
            return {"ok": False, "error": f"Commit failed: {commit['stderr']}", "steps": steps}
        steps.append(f"Committed: {commit_message}")
    else:
        steps.append("No new changes to commit")

    # 4. Push
    push = _run_git(["push", "origin", branch], project_path, timeout=60)
    if not push["ok"]:
        # Detect "non-fast-forward" â€” means remote moved between pull and push
        if "rejected" in push["stderr"].lower() or "non-fast-forward" in push["stderr"].lower():
            return {
                "ok": False,
                "error": "Push rejected â€” remote has new changes again. Please pull first.",
                "hint": "Click Pull Latest, then try again.",
                "steps": steps,
            }
        return {"ok": False, "error": f"Push failed: {push['stderr']}", "steps": steps}
    steps.append(f"Pushed to origin/{branch}")

    return {
        "ok": True,
        "status": "pushed",
        "branch": branch,
        "committed": not nothing_to_commit,
        "steps": steps,
    }

def find_failed_tests_with_healed_twins(report_json_path: Path, project_path: Path) -> list[dict]:
    """
    Parse a Playwright report.json and return a list of failed tests that have
    a corresponding healed file on disk.

    Returns list of dicts:
      [{ "test_name": str, "plain_spec_relpath": str, "healed_spec_relpath": str }, ...]
    """
    if not report_json_path.exists():
        return []
    import json as _json
    try:
        with open(report_json_path, encoding="utf-8") as f:
            data = _json.load(f)
    except Exception as exc:
        print(f"[heal-rerun] Failed to read report.json: {exc}")
        return []

    failed: list[dict] = []

    def _walk(suites_list, parent_file: str = ""):
        for suite in suites_list or []:
            suite_file = suite.get("file") or parent_file
            for spec in suite.get("specs") or []:
                for test in spec.get("tests") or []:
                    results = test.get("results") or []
                    if not results:
                        continue
                    final_status = results[-1].get("status") or ""
                    if final_status in ("passed", "skipped"):
                        continue
                    plain_relpath = suite_file.replace("\\", "/")
                    # Skip if this is already a healed file
                    if "/healed/" in plain_relpath or plain_relpath.startswith("healed/"):
                        continue
                    # Build healed twin path: sanity/foo.spec.js -> healed/sanity/foo.healed.spec.js
                    parts = plain_relpath.split("/")
                    if len(parts) < 2:
                        continue
                    suite_folder = parts[0]  # 'sanity' or 'regression'
                    file_name = parts[-1]    # 'foo.spec.js'
                    healed_name = file_name.replace(".spec.js", ".healed.spec.js")
                    healed_relpath = f"healed/{suite_folder}/{healed_name}"
                    full_healed_path = project_path / healed_relpath
                    if full_healed_path.exists():
                        failed.append({
                            "test_name": spec.get("title") or "",
                            "plain_spec_relpath": plain_relpath,
                            "healed_spec_relpath": healed_relpath,
                        })
            _walk(suite.get("suites") or [], suite_file)

    _walk(data.get("suites") or [])
    return failed


def parse_inline_heal_events(log_lines: list[str]) -> list[dict]:
    """
    Parse `[inline-heal]` lines from log output into structured events.

    Looks for pairs like:
      [inline-heal] step "username field" — original failed, attempting heal...
      [inline-heal] step "username field" — HEALED: placeholder Username

    Returns:
      [{"step": "username field", "healed_via": "placeholder Username", "status": "healed"}, ...]
    """
    import re as _re
    events_by_step: dict[str, dict] = {}

    for line in log_lines or []:
        # Strip ANSI color codes
        clean = _re.sub(r"\x1b\[[0-9;]*m", "", line).strip()
        if "[inline-heal]" not in clean:
            continue

        # Match: [inline-heal] step "STEP_NAME" — original failed, attempting heal...
        m_attempt = _re.search(r'\[inline-heal\]\s+step\s+"([^"]+)"\s*[—-]\s*original failed', clean)
        if m_attempt:
            step_name = m_attempt.group(1)
            events_by_step.setdefault(step_name, {"step": step_name, "status": "attempting"})
            continue

        # Match: [inline-heal] step "STEP_NAME" — HEALED: <description>
        m_healed = _re.search(r'\[inline-heal\]\s+step\s+"([^"]+)"\s*[—-]\s*HEALED:\s*(.+)$', clean)
        if m_healed:
            step_name = m_healed.group(1)
            healed_via = m_healed.group(2).strip()
            events_by_step[step_name] = {
                "step": step_name,
                "healed_via": healed_via,
                "status": "healed",
            }

    return list(events_by_step.values())

def update_project_metadata(project_path: Path, updates: dict[str, Any]) -> None:
    metadata = read_project_metadata(project_path)
    metadata.update({key: value for key, value in updates.items() if value is not None})
    write_project_metadata(project_path, metadata)


def read_project_test_data(project_path: Path) -> dict[str, Any]:
    return read_json_file_object(project_path / "test-data.json")


def project_test_data_backup_path(project_path: Path) -> Path:
    return project_path / PROJECT_TEST_DATA_BACKUP_FILE_NAME


def read_project_test_data_preview(project_path: Path) -> dict[str, Any]:
    backup_path = project_test_data_backup_path(project_path)
    if backup_path.exists():
        return read_json_file_object(backup_path)
    return read_project_test_data(project_path)


def normalize_project_faker_fields(fields: Any) -> list[str]:
    if isinstance(fields, dict):
        items = [key for key, enabled in fields.items() if enabled]
    elif isinstance(fields, list):
        items = fields
    else:
        items = []
    normalized: list[str] = []
    seen: set[str] = set()
    for item in items:
        key = str(item or "").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        normalized.append(key)
    return normalized


def normalize_project_faker_mode(mode: Any) -> str:
    if isinstance(mode, bool):
        return "fake" if mode else "normal"

    normalized = str(mode or "").strip().lower()
    if normalized in {"fake", "faker", "faked", "semantic", "random", "rand"}:
        return "fake"
    if normalized in {"normal", "none", "off", "original", "keep", "plain"}:
        return "normal"
    return "fake" if normalized else "normal"


def normalize_project_faker_field_modes(fields: Any) -> dict[str, str]:
    modes: dict[str, str] = {}

    if isinstance(fields, dict):
        items = fields.items()
    elif isinstance(fields, list):
        items = []
        for item in fields:
            if isinstance(item, dict):
                key = str(item.get("key") or item.get("field") or item.get("name") or "").strip()
                if not key:
                    continue
                mode = item.get("mode")
                if mode is None:
                    mode = "fake" if item.get("selected", True) else "normal"
                items.append((key, mode))
            else:
                key = str(item or "").strip()
                if key:
                    items.append((key, "fake"))
    else:
        items = []

    for key, value in items:
        field_key = str(key or "").strip()
        if not field_key:
            continue

        mode = value
        if isinstance(value, dict):
            mode = value.get("mode")
            if mode is None:
                if "selected" in value:
                    mode = "fake" if value.get("selected") else "normal"
                elif "enabled" in value:
                    mode = "fake" if value.get("enabled") else "normal"

        normalized_mode = normalize_project_faker_mode(mode)
        if normalized_mode != "normal":
            modes[field_key] = normalized_mode

    return modes


def read_project_faker_fields(project_path: Path) -> list[str]:
    return list(read_project_faker_field_modes(project_path).keys())


def read_project_faker_field_modes(project_path: Path) -> dict[str, str]:
    metadata = read_project_metadata(project_path)
    modes = normalize_project_faker_field_modes(metadata.get(PROJECT_FAKER_FIELD_MODES_METADATA_KEY))
    if modes:
        return modes

    legacy_fields = normalize_project_faker_fields(metadata.get(PROJECT_FAKER_FIELDS_METADATA_KEY))
    return {field: "fake" for field in legacy_fields}


def update_project_faker_fields(project_path: Path, fields: Any) -> list[str]:
    normalized_modes = normalize_project_faker_field_modes(fields)
    available_fields = set(read_project_test_data(project_path).keys())
    if available_fields:
        normalized_modes = {field: mode for field, mode in normalized_modes.items() if field in available_fields}

    current_test_data_path = project_path / "test-data.json"
    backup_test_data_path = project_test_data_backup_path(project_path)
    if current_test_data_path.exists() and not backup_test_data_path.exists():
        backup_test_data_path.write_text(current_test_data_path.read_text(encoding="utf-8"), encoding="utf-8")

    update_project_metadata(project_path, {
        PROJECT_FAKER_FIELDS_METADATA_KEY: list(normalized_modes.keys()),
        PROJECT_FAKER_FIELD_MODES_METADATA_KEY: normalized_modes,
    })

    base_payload = read_json_file_object(backup_test_data_path) if backup_test_data_path.exists() else read_json_file_object(current_test_data_path)
    if base_payload:
        updated_payload = dict(base_payload)
        for field_name, mode in normalized_modes.items():
            if field_name not in updated_payload:
                continue
            updated_payload[field_name] = generate_faker_value(field_name, updated_payload[field_name], mode)
        current_test_data_path.write_text(f"{json.dumps(updated_payload, indent=2)}\n", encoding="utf-8")

    return list(normalized_modes.keys())

def write_project_test_data(project_path: Path, payload: dict[str, Any], target_path: Path | None = None) -> None:
    runtime_path = target_path or (project_path / "test-data.json")
    runtime_path.write_text(
        json.dumps(payload, indent=2),
        encoding="utf-8"
    )

def build_project_faker_test_data(project_path: Path) -> dict[str, Any]:
    base_payload = read_project_test_data_preview(project_path)

    if not base_payload:
        return {}

    faker_modes = read_project_faker_field_modes(project_path)
    refreshed = dict(base_payload)

    for field_name, mode in faker_modes.items():
        if field_name not in refreshed:
            continue

        refreshed[field_name] = generate_faker_value(
            field_name,
            base_payload[field_name],
            mode
        )

    return refreshed

def refresh_project_faker_test_data(project_path: Path):
    refreshed = build_project_faker_test_data(project_path)
    if not refreshed:
        return {}
    write_project_test_data(project_path, refreshed)
    return refreshed


def generate_faker_value(field_name: str, original_value: Any = None, mode: str | None = "fake") -> Any:
    if normalize_project_faker_mode(mode) == "normal":
        return original_value
    fake = get_faker()
    if fake is not None:
        return _faker_value_for_field(fake, field_name, original_value)
    return _fallback_faker_value(field_name, original_value)

def get_faker() -> Any | None:
    global _FAKER
    if _FAKER is not None:
        return _FAKER or None
    if "Faker" not in globals():
        _FAKER = False
        return None
    with suppress(Exception):
        _FAKER = Faker(FAKER_LOCALE)
        with suppress(Exception):
            _FAKER.seed_instance(random.randint(1, 1_000_000_000))
        return _FAKER
    _FAKER = False
    return None


def field_name_tokens(field_name: str) -> list[str]:
    raw = str(field_name or "").strip()
    if not raw:
        return []
    spaced = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", raw)
    pieces = re.split(r"[^A-Za-z0-9]+", spaced)
    tokens: list[str] = []
    for piece in pieces:
        if not piece:
            continue
        piece = re.sub(r"([a-z])([A-Z])", r"\1 \2", piece)
        for token in piece.split():
            cleaned = token.strip().lower()
            if cleaned:
                tokens.append(cleaned)
    return tokens


def field_name_has(tokens: list[str], *needles: str) -> bool:
    token_set = set(tokens)
    return any(needle.lower() in token_set for needle in needles)


def faker_call(fake: Any | None, provider: str, *args: Any, **kwargs: Any) -> Any | None:
    if fake is None:
        return None
    method = getattr(fake, provider, None)
    if not callable(method):
        return None
    with suppress(Exception):
        return method(*args, **kwargs)
    return None


def _fallback_token_value(tokens: list[str], original_value: Any = None) -> Any:
    if field_name_has(tokens, "email", "mail") or (isinstance(original_value, str) and "@" in original_value):
        local = ".".join(tokens[:2]) if tokens else f"mail.{_random_digits(4)}"
        local = re.sub(r"[^a-z0-9.]+", ".", local).strip(".") or f"mail.{_random_digits(4)}"
        return f"{local}.{_random_digits(3)}@example.com"
    if field_name_has(tokens, "postal", "zip", "postcode"):
        return _random_digits(6)
    if field_name_has(tokens, "address", "street"):
        return f"{random.randint(1, 999)} {random.choice(['Oak', 'Maple', 'Cedar', 'Park', 'Lake'])} {random.choice(['Road', 'Street', 'Avenue', 'Lane'])}"
    if field_name_has(tokens, "city"):
        return f"City-{uuid.uuid4().hex[:6]}"
    if field_name_has(tokens, "state"):
        return f"State-{uuid.uuid4().hex[:6]}"
    if field_name_has(tokens, "country"):
        return f"Country-{uuid.uuid4().hex[:6]}"
    if field_name_has(tokens, "phone", "mobile", "tel", "telephone", "fax"):
        return f"+91-{_random_digits(5)}-{_random_digits(5)}"
    if field_name_has(tokens, "num", "number", "qty", "quantity", "count", "amount", "price", "total", "id", "code", "otp", "age"):
        return _random_digits(random.randint(2, 8))
    if field_name_has(tokens, "product"):
        return f"{_random_word().title()} {_random_word().title()}"
    if field_name_has(tokens, "customer", "company", "organization", "org", "business", "vendor"):
        return f"{_random_word().title()} {_random_word().title()}"
    if field_name_has(tokens, "note", "comment", "description", "desc", "details", "remarks"):
        return f"Generated note {uuid.uuid4().hex[:8]}."
    if field_name_has(tokens, "title", "subject", "label"):
        return f"Text-{uuid.uuid4().hex[:6]}"
    if field_name_has(tokens, "name", "first", "last", "person", "contact"):
        return f"{_random_word().title()} {_random_word().title()}"
    return f"{_random_word()}.{_random_digits(6)}"


def _faker_value_for_field(fake: Any, field_name: str, original_value: Any = None) -> Any:
    tokens = field_name_tokens(field_name)
    key = str(field_name or "").strip().lower()

    if isinstance(original_value, str):
        looks_like_url = bool(urlparse(original_value).scheme) or bool(
            re.search(r"\b(url|uri|link|website|web|domain|site|homepage|page)\b", key)
        )
        if looks_like_url:
            return fake.url()

    provider_rules = [
        (("email", "mail"), "email", lambda: None),
        (("postal", "zip", "postcode"), "postcode", lambda: _random_digits(6)),
        (("address", "street"), "street_address", lambda: _fallback_token_value(tokens, original_value)),
        (("city",), "city", lambda: _fallback_token_value(tokens, original_value)),
        (("state",), "state", lambda: _fallback_token_value(tokens, original_value)),
        (("country",), "country", lambda: _fallback_token_value(tokens, original_value)),
        (("phone", "mobile", "tel", "telephone", "fax"), "phone_number", lambda: _fallback_token_value(tokens, original_value)),
        (("num", "number", "qty", "quantity", "count", "amount", "price", "total", "id", "code", "otp", "age"), "random_number", lambda: _fallback_token_value(tokens, original_value)),
        (("product",), "catch_phrase", lambda: _fallback_token_value(tokens, original_value)),
        (("customer", "company", "organization", "org", "business", "vendor"), "company", lambda: _fallback_token_value(tokens, original_value)),
        (("note", "comment", "description", "desc", "details", "remarks"), "text", lambda: _fallback_token_value(tokens, original_value)),
        (("title", "subject", "label"), "catch_phrase", lambda: _fallback_token_value(tokens, original_value)),
        (("name", "first", "last", "person", "contact"), "name", lambda: _fallback_token_value(tokens, original_value)),
    ]

    for tokens_match, provider, fallback in provider_rules:
        if field_name_has(tokens, *tokens_match) or (
            provider == "email" and ("@" in key or (isinstance(original_value, str) and "@" in original_value))
        ):
            if provider == "random_number":
                value = faker_call(fake, provider, digits=random.randint(2, 8))
            elif provider == "text":
                value = faker_call(fake, provider, max_nb_chars=random.randint(40, 120))
            else:
                value = faker_call(fake, provider)
            if value is not None:
                return value.strip() if isinstance(value, str) else value
            return fallback()

    if isinstance(original_value, str) and original_value.strip():
        value = faker_call(fake, "word")
        if value is not None:
            return value
    return faker_call(fake, "word") or _fallback_token_value(tokens, original_value)


def _fallback_faker_value(field_name: str = "", original_value: Any = None) -> Any:
    fake = get_faker()
    if fake is not None:
        return _faker_value_for_field(fake, field_name, original_value)

    if isinstance(original_value, bool):
        return bool(random.getrandbits(1))
    if isinstance(original_value, int) and not isinstance(original_value, bool):
        return random.randint(10, 999999)
    if isinstance(original_value, float):
        return round(random.uniform(10.0, 9999.0), 2)
    if isinstance(original_value, str):
        if re.fullmatch(r"\d+", original_value):
            return _random_digits(len(original_value))
        if "@" in original_value:
            local = f"{_random_first_name().lower()}.{_random_last_name().lower()}"
            return f"{local}.{_random_digits(3)}@example.com"
        if len(original_value.strip()) >= 8:
            return _random_sentence()

    tokens = field_name_tokens(field_name)
    return _fallback_token_value(tokens, original_value)


def generate_faker_value(field_name: str, original_value: Any = None, mode: str | None = "fake") -> Any:
    fake = get_faker()
    if fake is not None:
        return _faker_value_for_field(fake, field_name, original_value)
    return _fallback_faker_value(field_name, original_value)


def apply_project_faker_modes_to_test_data(project_path: Path, test_data_path: Path) -> bool:
    modes = read_project_faker_field_modes(project_path)
    if not modes or not test_data_path.exists():
        return False

    payload = read_json_file_object(test_data_path)
    if not payload:
        return False

    changed = False
    for field_name, mode in modes.items():
        if field_name not in payload:
            continue
        original_value = payload[field_name]
        generated_value = generate_faker_value(field_name, original_value, mode)
        if values_match(original_value, generated_value):
            continue
        payload[field_name] = generated_value
        changed = True

    if changed:
        test_data_path.parent.mkdir(parents=True, exist_ok=True)
        test_data_path.write_text(f"{json.dumps(payload, indent=2)}\n", encoding="utf-8")

    return changed

class ProjectFakerFieldsBody(BaseModel):
    projectPath: str | None = Field(default=None, description="Selected project path.")
    fields: list[str] | dict[str, Any] | None = Field(default=None, description="Selected test-data fields and their modes.")

class NewStepSuggestionsBody(BaseModel):
    scriptText: str | None = Field(default=None, description="Full Playwright script text.")
    line: str | None = Field(default=None, description="Current line text.")
    lineNumber: int | None = Field(default=None, description="1-based line number.")
    allLines: list[str] | None = Field(default=None, description="All lines in the current script.")
    category: str | None = Field(default=None, description="Optional step category to suggest.")
    hintText: str | None = Field(default=None, description="Optional free-text hint to guide step suggestions.")
