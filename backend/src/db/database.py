"""
Database connection and helpers for the tracking schema.

Reads connection settings from .env:
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

Provides:
  - get_db_connection() — short-lived connection (caller closes it)
  - upsert_project(name, path) — insert or fetch project row, returns dict
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv


# Load .env from the backend root (one level above this file's directory)
_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=_BACKEND_ROOT / ".env")


def get_db_connection():
    """Return a new psycopg2 connection. Caller is responsible for closing it."""
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        dbname=os.getenv("DB_NAME", "automation_db"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
        cursor_factory=RealDictCursor,
    )


@contextmanager
def db_cursor() -> Iterator[Any]:
    """Context manager: opens a connection, yields cursor, commits on success."""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        try:
            yield cur
            conn.commit()
        finally:
            cur.close()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def upsert_project(name: str, path: str, git_initialized: bool = False) -> dict[str, Any]:
    """
    Insert a project row. If a project with the same name already exists,
    return that existing row instead (with path/git_initialized updated).
    """
    with db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO projects (name, path, git_initialized)
            VALUES (%s, %s, %s)
            ON CONFLICT (name) DO UPDATE
              SET path = EXCLUDED.path,
                  git_initialized = EXCLUDED.git_initialized,
                  updated_at = NOW()
            RETURNING id, name, path, git_initialized, created_at, updated_at,
                      (xmax = 0) AS is_new
            """,
            (name, path, git_initialized),
        )
        row = cur.fetchone()
        return {
            "id": str(row["id"]),
            "name": row["name"],
            "path": row["path"],
            "git_initialized": bool(row["git_initialized"]),
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
            "is_new": bool(row["is_new"]),
        }



def list_projects() -> list[dict]:
    """Return all projects stored in the projects table (DB source of truth)."""
    with db_cursor() as cur:
        cur.execute("SELECT id, name, path, created_at, updated_at FROM projects ORDER BY name ASC")
        rows = cur.fetchall()
        return [
            {
                "id": str(r["id"]),
                "name": r["name"],
                "path": r["path"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
            }
            for r in rows
        ]


def get_project_by_path(path: str) -> dict[str, Any] | None:
    """Return the project row matching this absolute path, or None."""
    with db_cursor() as cur:
        cur.execute(
            "SELECT id, name, path, git_initialized, created_at, updated_at FROM projects WHERE path = %s LIMIT 1",
            (path,),
        )
        row = cur.fetchone()
        if not row:
            return None
        return {
            "id": str(row["id"]),
            "name": row["name"],
            "path": row["path"],
            "git_initialized": bool(row["git_initialized"]),
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
        }
    
def set_git_initialized(project_path: str, value: bool = True) -> dict[str, Any] | None:
    """Mark a project as git-initialized (or not) in the DB. Returns updated row or None if not found."""
    with db_cursor() as cur:
        cur.execute(
            """
            UPDATE projects
            SET git_initialized = %s,
                updated_at = NOW()
            WHERE path = %s
            RETURNING id, name, path, git_initialized, created_at, updated_at
            """,
            (value, project_path),
        )
        row = cur.fetchone()
        if not row:
            return None
        return {
            "id": str(row["id"]),
            "name": row["name"],
            "path": row["path"],
            "git_initialized": bool(row["git_initialized"]),
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
        }
    
def touch_project(project_path: str) -> bool:
    """Update the updated_at timestamp for a project. Returns True if a row was updated."""
    with db_cursor() as cur:
        cur.execute(
            "UPDATE projects SET updated_at = NOW() WHERE path = %s",
            (project_path,),
        )
        return cur.rowcount > 0

def _next_test_case_key(cur, project_id: str) -> str:
    """Generate the next sequential test_case_key for a project: TC-001, TC-002, ..."""
    cur.execute(
        """
        SELECT test_case_key FROM test_cases
        WHERE project_id = %s AND test_case_key LIKE 'TC-%%'
        ORDER BY test_case_key DESC LIMIT 1
        """,
        (project_id,),
    )
    row = cur.fetchone()
    if not row:
        return "TC-001"
    try:
        last_num = int(str(row["test_case_key"]).split("-")[1])
        return f"TC-{last_num + 1:03d}"
    except (ValueError, IndexError):
        return "TC-001"


def upsert_test_case(
    project_path: str,
    spec_relpath: str,
    test_name: str,
    test_type: str = "sanity",
) -> dict[str, Any] | None:
    """
    Insert or update a test_cases row for the given (project, spec, test).

    - Looks up the project by path. If not found, returns None and logs a warning.
    - Auto-generates test_case_key (TC-001, TC-002, ...) on first insert.
    - On conflict (same project+relpath+name), updates tags/updated_at only.

    Returns the row dict or None.
    """
    with db_cursor() as cur:
        # Find project_id
        cur.execute(
            "SELECT id FROM projects WHERE path = %s LIMIT 1",
            (project_path,),
        )
        project_row = cur.fetchone()
        if not project_row:
            print(f"[db] upsert_test_case: project not found for path {project_path}")
            return None
        project_id = project_row["id"]

        # Check if test_case already exists
        cur.execute(
            """
            SELECT testcase_id FROM test_cases
            WHERE project_id = %s AND spec_relpath = %s AND test_name = %s
            LIMIT 1
            """,
            (project_id, spec_relpath, test_name),
        )
        existing = cur.fetchone()

        if existing:
            # Update tags + updated_at on existing row
            cur.execute(
                """
                UPDATE test_cases
                SET tags = %s, updated_at = NOW()
                WHERE testcase_id = %s
                RETURNING testcase_id, project_id, test_case_key, spec_relpath,
                          test_name, tags, created_at, updated_at, is_spec_modified
                """,
                (test_type, existing["testcase_id"]),
            )
        else:
            # Insert new row
            test_case_key = _next_test_case_key(cur, project_id)
            cur.execute(
                """
                INSERT INTO test_cases
                  (project_id, test_case_key, spec_relpath, test_name, tags, is_spec_modified)
                VALUES (%s, %s, %s, %s, %s, FALSE)
                RETURNING testcase_id, project_id, test_case_key, spec_relpath,
                          test_name, tags, created_at, updated_at, is_spec_modified
                """,
                (project_id, test_case_key, spec_relpath, test_name, test_type),
            )

        row = cur.fetchone()
        return {
            "testcase_id": str(row["testcase_id"]),
            "project_id": str(row["project_id"]),
            "test_case_key": row["test_case_key"],
            "spec_relpath": row["spec_relpath"],
            "test_name": row["test_name"],
            "tags": row["tags"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
            "is_spec_modified": bool(row["is_spec_modified"]),
        }


def mark_spec_modified(
    project_path: str,
    spec_relpath: str,
    test_name: str | None = None,
    modified: bool = True,
) -> int:
    """
    Set is_spec_modified for matching test_cases.

    - If test_name is provided, updates only that specific test.
    - Otherwise updates all test_cases for that project + spec_relpath.

    Returns the number of rows updated.
    """
    with db_cursor() as cur:
        cur.execute(
            "SELECT id FROM projects WHERE path = %s LIMIT 1",
            (project_path,),
        )
        project_row = cur.fetchone()
        if not project_row:
            return 0
        project_id = project_row["id"]

        if test_name:
            cur.execute(
                """
                UPDATE test_cases
                SET is_spec_modified = %s, updated_at = NOW()
                WHERE project_id = %s AND spec_relpath = %s AND test_name = %s
                """,
                (modified, project_id, spec_relpath, test_name),
            )
        else:
            cur.execute(
                """
                UPDATE test_cases
                SET is_spec_modified = %s, updated_at = NOW()
                WHERE project_id = %s AND spec_relpath = %s
                """,
                (modified, project_id, spec_relpath),
            )
        return cur.rowcount
    

def start_test_run(
    project_path: str,
    run_type: str,
    browser: str = "chromium",
    browser_mode: str = "headless",
    execution_mode: str = "parallel",
    triggered_via: str = "direct",
) -> dict[str, Any] | None:
    """
    Insert a new test_runs row with status='running' and started_at=NOW().
    Returns dict with run_id and metadata, or None if project not found.
    """
    with db_cursor() as cur:
        # Find project_id
        cur.execute("SELECT id FROM projects WHERE path = %s LIMIT 1", (project_path,))
        project_row = cur.fetchone()
        if not project_row:
            print(f"[db] start_test_run: project not found for path {project_path}")
            return None

        cur.execute(
            """
            INSERT INTO test_runs
              (project_id, run_type, browser, browser_mode, execution_mode,
               triggered_via, status, started_at)
            VALUES (%s, %s, %s, %s, %s, %s, 'running', NOW())
            RETURNING run_id, project_id, run_type, browser, browser_mode,
                      execution_mode, triggered_via, status, started_at
            """,
            (project_row["id"], run_type, browser, browser_mode, execution_mode, triggered_via),
        )
        row = cur.fetchone()
        return {
            "run_id": str(row["run_id"]),
            "project_id": str(row["project_id"]),
            "run_type": row["run_type"],
            "browser": row["browser"],
            "browser_mode": row["browser_mode"],
            "execution_mode": row["execution_mode"],
            "triggered_via": row["triggered_via"],
            "status": row["status"],
            "started_at": row["started_at"].isoformat() if row["started_at"] else None,
        }


def finish_test_run(
    run_id: str,
    status: str = "passed",
    total_tests: int = 0,
    passed_count: int = 0,
    failed_count: int = 0,
    skipped_count: int = 0,
) -> dict[str, Any] | None:
    """
    Update a test_runs row to mark it finished.
    Sets finished_at=NOW() and computes duration_ms from started_at.
    Returns the updated row or None if not found.
    """
    with db_cursor() as cur:
        cur.execute(
            """
            UPDATE test_runs
            SET status = %s,
                total_tests = %s,
                passed_count = %s,
                failed_count = %s,
                skipped_count = %s,
                finished_at = NOW(),
                duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
            WHERE run_id = %s
            RETURNING run_id, status, total_tests, passed_count, failed_count,
                      skipped_count, started_at, finished_at, duration_ms
            """,
            (status, total_tests, passed_count, failed_count, skipped_count, run_id),
        )
        row = cur.fetchone()
        if not row:
            return None
        return {
            "run_id": str(row["run_id"]),
            "status": row["status"],
            "total_tests": row["total_tests"],
            "passed_count": row["passed_count"],
            "failed_count": row["failed_count"],
            "skipped_count": row["skipped_count"],
            "started_at": row["started_at"].isoformat() if row["started_at"] else None,
            "finished_at": row["finished_at"].isoformat() if row["finished_at"] else None,
            "duration_ms": int(row["duration_ms"]) if row["duration_ms"] is not None else None,
        }
    
def clear_spec_modified_for_run(
    project_path: str,
    run_type: str,
    spec_relpath: str | None = None,
) -> int:
    """
    Clear is_spec_modified flag after a successful test run.
    - If spec_relpath is provided AND run_type is 'single', clear only that spec.
    - If run_type is 'sanity' or 'regression', clear all test_cases with that tag in the project.
    Returns number of rows updated.
    """
    with db_cursor() as cur:
        cur.execute("SELECT id FROM projects WHERE path = %s LIMIT 1", (project_path,))
        project_row = cur.fetchone()
        if not project_row:
            return 0
        project_id = project_row["id"]

        if run_type == "single" and spec_relpath:
            cur.execute(
                """
                UPDATE test_cases
                SET is_spec_modified = FALSE, updated_at = NOW()
                WHERE project_id = %s AND spec_relpath = %s AND is_spec_modified = TRUE
                """,
                (project_id, spec_relpath),
            )
        elif run_type in ("sanity", "regression"):
            cur.execute(
                """
                UPDATE test_cases
                SET is_spec_modified = FALSE, updated_at = NOW()
                WHERE project_id = %s AND tags = %s AND is_spec_modified = TRUE
                """,
                (project_id, run_type),
            )
        else:
            return 0

        return cur.rowcount
    
def record_test_execution(
    run_id: str,
    testcase_id: str | None,
    spec_kind: str,
    status: str,
    duration_ms: int | None = None,
    error_message: str | None = None,
    retry_attempt: int = 0,
    started_at: str | None = None,
    finished_at: str | None = None,
) -> dict[str, Any] | None:
    """
    Insert a row into test_executions. Returns the inserted row or None on failure.
    testcase_id may be None if no matching test_case was found.
    Also updates flakiness_stats for the testcase.
    """
    with db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO test_executions
              (run_id, testcase_id, spec_kind, status, duration_ms,
               error_message, retry_attempt, started_at, finished_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING execution_id, run_id, testcase_id, spec_kind, status,
                      duration_ms, error_message, retry_attempt, started_at, finished_at
            """,
            (run_id, testcase_id, spec_kind, status, duration_ms,
             error_message, retry_attempt, started_at, finished_at),
        )
        row = cur.fetchone()
        if not row:
            return None
        result = {
            "execution_id": str(row["execution_id"]),
            "run_id": str(row["run_id"]),
            "testcase_id": str(row["testcase_id"]) if row["testcase_id"] else None,
            "spec_kind": row["spec_kind"],
            "status": row["status"],
            "duration_ms": row["duration_ms"],
            "error_message": row["error_message"],
            "retry_attempt": row["retry_attempt"],
        }

    # Update flakiness_stats (only for plain spec runs, not healed retries)
    if testcase_id and spec_kind == "plain":
        try:
            upsert_flakiness_stats(testcase_id=testcase_id, status=status)
        except Exception as _flaky_exc:
            print(f"[flakiness] upsert failed: {_flaky_exc}")

    return result


def upsert_flakiness_stats(testcase_id: str, status: str) -> dict | None:
    """
    Update or insert a row in flakiness_stats for this testcase.
    Recomputes flaky_score and is_flaky.
    A test is considered "flaky" if 0.1 <= flaky_score <= 0.9 AND total_runs >= 5.
    """
    status_normalized = (status or "").lower()
    is_passed = status_normalized == "passed"
    is_failed = status_normalized in ("failed", "timedout", "interrupted")
    if not is_passed and not is_failed:
        # Skip skipped/unknown statuses
        return None

    with db_cursor() as cur:
        # Get project_id from the testcase
        cur.execute("SELECT project_id FROM test_cases WHERE testcase_id = %s", (testcase_id,))
        tc_row = cur.fetchone()
        if not tc_row:
            return None
        project_id = tc_row["project_id"]

        # Get existing row
        cur.execute(
            "SELECT flaky_id, total_runs, passed_count, failed_count FROM flakiness_stats WHERE testcase_id = %s",
            (testcase_id,),
        )
        existing = cur.fetchone()

        if existing:
            new_total = existing["total_runs"] + 1
            new_passed = existing["passed_count"] + (1 if is_passed else 0)
            new_failed = existing["failed_count"] + (1 if is_failed else 0)
        else:
            new_total = 1
            new_passed = 1 if is_passed else 0
            new_failed = 1 if is_failed else 0

        new_score = (new_failed / new_total) if new_total > 0 else 0.0
        # Flaky if pass rate is mixed AND we have enough samples
        is_flaky = (new_total >= 5) and (0.1 <= new_score <= 0.9)

        if existing:
            cur.execute(
                """
                UPDATE flakiness_stats
                SET total_runs = %s,
                    passed_count = %s,
                    failed_count = %s,
                    flaky_score = %s,
                    is_flaky = %s,
                    last_status = %s,
                    last_run_at = NOW(),
                    updated_at = NOW()
                WHERE testcase_id = %s
                RETURNING flaky_id
                """,
                (new_total, new_passed, new_failed, new_score, is_flaky, status_normalized, testcase_id),
            )
        else:
            cur.execute(
                """
                INSERT INTO flakiness_stats
                  (testcase_id, project_id, total_runs, passed_count, failed_count,
                   flaky_score, is_flaky, last_status, last_run_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING flaky_id
                """,
                (testcase_id, project_id, new_total, new_passed, new_failed,
                 new_score, is_flaky, status_normalized),
            )
        row = cur.fetchone()
        return {"flaky_id": row["flaky_id"], "flaky_score": new_score, "is_flaky": is_flaky} if row else None


def list_flakiness_for_project(project_id: str) -> list[dict]:
    """Return all flakiness records for a project, ordered by flaky_score DESC then total_runs DESC."""
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT fs.flaky_id, fs.testcase_id, fs.total_runs, fs.passed_count, fs.failed_count,
                   fs.flaky_score, fs.is_flaky, fs.last_status, fs.last_run_at,
                   tc.test_case_key, tc.test_name, tc.spec_relpath
            FROM flakiness_stats fs
            JOIN test_cases tc ON tc.testcase_id = fs.testcase_id
            WHERE fs.project_id = %s
            ORDER BY fs.flaky_score DESC, fs.total_runs DESC
            """,
            (project_id,),
        )
        rows = cur.fetchall()
        return [
            {
                "flaky_id": r["flaky_id"],
                "testcase_id": r["testcase_id"],
                "test_case_key": r["test_case_key"],
                "test_name": r["test_name"],
                "spec_relpath": r["spec_relpath"],
                "total_runs": r["total_runs"],
                "passed_count": r["passed_count"],
                "failed_count": r["failed_count"],
                "flaky_score": float(r["flaky_score"]),
                "is_flaky": r["is_flaky"],
                "last_status": r["last_status"],
                "last_run_at": r["last_run_at"].isoformat() if r["last_run_at"] else None,
            }
            for r in rows
        ]

def get_flakiness_summary(project_id: str) -> dict:
    """Return aggregate counts for a project's tests."""
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM test_cases WHERE project_id = %s) AS total_tests,
                COALESCE(SUM(total_runs), 0) AS total_runs,
                COUNT(*) FILTER (WHERE is_flaky = TRUE) AS flaky_count,
                COUNT(*) FILTER (WHERE LOWER(last_status) IN ('failed', 'timedout', 'interrupted')) AS failed_count,
                COUNT(*) FILTER (WHERE flaky_score = 0 AND total_runs >= 3) AS stable_count,
                COUNT(*) FILTER (WHERE LOWER(last_status) = 'passed' AND failed_count > 0) AS recovering_count,
                COUNT(*) FILTER (WHERE total_runs = 1) AS first_run_count
            FROM flakiness_stats
            WHERE project_id = %s
            """,
            (project_id, project_id),
        )
        row = cur.fetchone()
        if not row:
            return {
                "total_tests": 0, "total_runs": 0, "flaky_count": 0,
                "failed_count": 0, "stable_count": 0, "recovering_count": 0,
                "first_run_count": 0,
            }
        return {
            "total_tests": int(row["total_tests"] or 0),
            "total_runs": int(row["total_runs"] or 0),
            "flaky_count": int(row["flaky_count"] or 0),
            "failed_count": int(row["failed_count"] or 0),
            "stable_count": int(row["stable_count"] or 0),
            "recovering_count": int(row["recovering_count"] or 0),
            "first_run_count": int(row["first_run_count"] or 0),
        }


def find_testcase_id(project_path: str, spec_relpath: str, test_name: str) -> str | None:
    """Match a test result back to a testcase_id by file path + test name. Returns None if not found."""
    with db_cursor() as cur:
        cur.execute("SELECT id FROM projects WHERE path = %s LIMIT 1", (project_path,))
        project_row = cur.fetchone()
        if not project_row:
            return None
        project_id = project_row["id"]

        # First try: exact match
        cur.execute(
            """
            SELECT testcase_id FROM test_cases
            WHERE project_id = %s AND spec_relpath = %s AND test_name = %s
            LIMIT 1
            """,
            (project_id, spec_relpath, test_name),
        )
        row = cur.fetchone()
        if row:
            return str(row["testcase_id"])

        # Fallback: try with @sanity / @regression suffix stripped from test_name
        import re as _re
        cleaned_name = _re.sub(r"\s*@\w+\s*$", "", test_name).strip()
        if cleaned_name and cleaned_name != test_name:
            cur.execute(
                """
                SELECT testcase_id FROM test_cases
                WHERE project_id = %s AND spec_relpath = %s AND test_name = %s
                LIMIT 1
                """,
                (project_id, spec_relpath, cleaned_name),
            )
            row = cur.fetchone()
            if row:
                return str(row["testcase_id"])
        return None


def record_heal_event(
    execution_id: str,
    step_label: str,
    action: str | None,
    original_locator: str | None,
    healed_locator: str | None,
    healed_description: str | None,
    status: str,
) -> dict[str, Any] | None:
    """
    Insert one row into healed_locators. Returns the inserted row.
    status: 'healed' or 'heal_failed' (matches what inline_healer.js writes)
    """
    with db_cursor() as cur:
        cur.execute(
            """
            INSERT INTO healed_locators
              (execution_id, step_label, action, original_locator,
               healed_locator, healed_description, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING heal_id, execution_id, step_label, action, original_locator,
                      healed_locator, healed_description, status, created_at
            """,
            (execution_id, step_label, action, original_locator,
             healed_locator, healed_description, status),
        )
        row = cur.fetchone()
        if not row:
            return None
        return {
            "heal_id": str(row["heal_id"]),
            "execution_id": str(row["execution_id"]),
            "step_label": row["step_label"],
            "action": row["action"],
            "original_locator": row["original_locator"],
            "healed_locator": row["healed_locator"],
            "healed_description": row["healed_description"],
            "status": row["status"],
        }


def list_heal_events_for_run(run_id: str) -> list[dict]:
    """
    Get all heal events for a given test_runs.run_id.
    Returns list joining healed_locators -> test_executions -> test_cases.
    """
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT
              hl.heal_id, hl.step_label, hl.action,
              hl.original_locator, hl.healed_locator,
              hl.healed_description, hl.status, hl.created_at,
              te.execution_id, te.spec_kind, te.status AS execution_status,
              tc.test_case_key, tc.test_name, tc.spec_relpath
            FROM healed_locators hl
            JOIN test_executions te ON hl.execution_id = te.execution_id
            LEFT JOIN test_cases tc ON te.testcase_id = tc.testcase_id
            WHERE te.run_id = %s
            ORDER BY te.started_at ASC, hl.created_at ASC
            """,
            (run_id,),
        )
        rows = cur.fetchall() or []
        return [
            {
                "heal_id": str(r["heal_id"]),
                "execution_id": str(r["execution_id"]),
                "test_case_key": r["test_case_key"],
                "test_name": r["test_name"],
                "spec_relpath": r["spec_relpath"],
                "spec_kind": r["spec_kind"],
                "execution_status": r["execution_status"],
                "step_label": r["step_label"],
                "action": r["action"],
                "original_locator": r["original_locator"],
                "healed_locator": r["healed_locator"],
                "healed_description": r["healed_description"],
                "status": r["status"],
            }
            for r in rows
        ]
    

def set_jenkins_info(
    run_id: str,
    jenkins_job_name: str | None = None,
    jenkins_build_url: str | None = None,
    jenkins_html_report_url: str | None = None,
    jenkins_allure_report_url: str | None = None,
) -> bool:
    """Update Jenkins-related fields on a test_runs row."""
    fields: list[str] = []
    values: list[Any] = []
    if jenkins_job_name is not None:
        fields.append("jenkins_job_name = %s")
        values.append(jenkins_job_name)
    if jenkins_build_url is not None:
        fields.append("jenkins_build_url = %s")
        values.append(jenkins_build_url)
    if jenkins_html_report_url is not None:
        fields.append("jenkins_html_report_url = %s")
        values.append(jenkins_html_report_url)
    if jenkins_allure_report_url is not None:
        fields.append("jenkins_allure_report_url = %s")
        values.append(jenkins_allure_report_url)
    if not fields:
        return False
    values.append(run_id)
    with db_cursor() as cur:
        cur.execute(
            f"UPDATE test_runs SET {', '.join(fields)} WHERE run_id = %s",
            tuple(values),
        )
        return cur.rowcount > 0


def get_jenkins_run_info(run_id: str) -> dict | None:
    """Get all Jenkins-related info for a test_runs row."""
    with db_cursor() as cur:
        cur.execute(
            """
            SELECT run_id, status, total_tests, passed_count, failed_count, skipped_count,
                   jenkins_job_name, jenkins_build_url,
                   jenkins_html_report_url, jenkins_allure_report_url,
                   started_at, finished_at
            FROM test_runs WHERE run_id = %s
            """,
            (run_id,),
        )
        row = cur.fetchone()
        if not row:
            return None
        return {
            "run_id": str(row["run_id"]),
            "status": row["status"],
            "total_tests": row["total_tests"],
            "passed_count": row["passed_count"],
            "failed_count": row["failed_count"],
            "skipped_count": row["skipped_count"],
            "jenkins_job_name": row["jenkins_job_name"],
            "jenkins_build_url": row["jenkins_build_url"],
            "jenkins_html_report_url": row["jenkins_html_report_url"],
            "jenkins_allure_report_url": row["jenkins_allure_report_url"],
            "started_at": row["started_at"].isoformat() if row["started_at"] else None,
            "finished_at": row["finished_at"].isoformat() if row["finished_at"] else None,
        }