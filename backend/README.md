# Script Generator Backend

Backend API for recording browser flows, refining them into Playwright specs, managing generated projects, and serving Playwright/Allure reports.

## Setup

```powershell
pip install -r requirements.txt
npm install
npx playwright install
```

Required `.env` keys:

- `GROQ_API_KEY`
- `CHROMA_DB_PATH`
- `COLLECTION_NAME`
- `TEST_COLLECTION_NAME`
- `HISTORY_LOG_PATH`

Optional Jenkins keys for triggering sanity/regression runs from the UI:

- `JENKINS_URL`
- `JENKINS_JOB_NAME`
- `JENKINS_USER`
- `JENKINS_API_TOKEN`
- `JENKINS_CRUMB_URL` if your Jenkins crumb endpoint is non-standard

## Run

From `backend/`:

```powershell
npm run start:api
```

The API runs at `http://localhost:8000/`. Start the frontend separately from `frontend/` with:

```powershell
npm start
```

## Swagger / OpenAPI

FastAPI exposes the HTTP API docs automatically:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

Swagger includes the HTTP routes below, including the newer project file and report APIs. WebSocket APIs are documented in this README because OpenAPI does not represent them like normal HTTP endpoints.

## Generated Projects

Projects live under `backend/tests/<project-name>/`. The scaffold creates:

- `sanity/`
- `regression/`
- `package.json`
- `playwright.config.js`
- `README.md`
- `.gitignore`

Each project `.gitignore` ignores `node_modules/`, `test-results/`, `playwright-report/`, `allure-results/`, `allure-report/`, and `.env`.

## Recorder Flow

The recorder uses `record-trace.js` to create both:

- `codegen-output/actions-*.json`
- `codegen-output/codegen-*.js`

Manual recorder command:

```powershell
npm run record:trace -- https://www.amazon.in/ chrome 1366x768
```

Manual refine command:

```powershell
npm run refine:llm -- --trace=codegen-output/actions-2026-05-09T08-07-15.json --codegen=codegen-output/codegen-2026-05-09T08-07-15.js --output=tests/shop-demo/sanity/test1.spec.js
```

## Reports

Test runs create per-run folders:

```text
tests/<project>/test-results/run-<timestamp>/
  artifacts/
  html/
  allure-results/
  allure-report/
  report.json
```

The app serves report HTML through tokenized URLs:

```text
/api/reports/html/{report_token}/
/api/reports/html/{report_token}/{asset_path}
```

Use the trailing slash on report index URLs so relative CSS/JS assets load correctly.

Allure requires `allure-playwright` in the project and the `allure` CLI available on PATH. Project setup installs `@playwright/test` and `allure-playwright`.

## HTTP APIs

Project and artifact APIs:

- `GET /api/artifacts` - latest recorder/refine artifacts and generated spec content.
- `GET /api/project-path` - selected project path.
- `POST /api/project-path` - set selected project path.
- `GET /api/projects` - list projects with files and latest reports.
- `POST /api/projects` - create project.
- `GET /api/projects/download?projectPath=...` - download project zip.
- `GET /api/projects/file?filePath=...` - read editable project file.
- `POST /api/projects/file` - save editable project file.
- `POST /api/projects/file/create` - create spec or JSON file.
- `GET /api/projects/file/download?filePath=...` - download one project file.
- `GET /api/test-types` - sanity/regression metadata.

Report APIs:

- `GET /api/reports/file?reportPath=...` - download one report file.
- `GET /api/reports/download?reportPath=...` - download report file or zip a report folder.
- `GET /api/reports/html/{report_token}` - redirects to trailing slash.
- `GET /api/reports/html/{report_token}/` - serve report `index.html`.
- `GET /api/reports/html/{report_token}/{asset_path}` - serve report assets.

Workflow APIs:

- `POST /api/record-and-refine` - start recorder/refine job.
- `GET /api/jobs/{job_id}` - job status.
- `GET /api/inline-heals?projectPath=...` - latest inline heal data.
- `POST /api/find-healed-spec` - find healed spec for a source spec.

## WebSocket APIs

- `WS /ws/pick-path` - native file/folder picker.
- `WS /ws/jobs?jobId={job_id}` - live record/refine progress.
- `WS /api/project/setup` - setup logs; installs Playwright and Allure reporter.
- `WS /api/project/run` - live Playwright run logs and report summary.

Run WebSocket payload example:

```json
{
  "projectPath": "C:\\Users\\rakhi.mandal\\Desktop\\Script_Generator_Record_And_Play\\backend\\tests\\shop-demo",
  "specPath": "sanity/test1.spec.js",
  "projects": ["chromium"],
  "headed": true,
  "reportTypes": ["json", "html", "allure"]
}
```

Done message includes:

```json
{
  "reports": {
    "json": "...\\report.json",
    "htmlUrl": "/api/reports/html/<token>/",
    "allureHtmlUrl": "/api/reports/html/<token>/",
    "download": "/api/reports/download?reportPath=..."
  },
  "summary": {
    "total": 1,
    "passed": 0,
    "failed": 1,
    "skipped": 0
  }
}
```

## Example Record And Refine

```powershell
curl -X POST http://localhost:8000/api/record-and-refine `
  -H "Content-Type: application/json" `
  -d "{\"projectPath\":\"tests/shop-demo\",\"url\":\"https://shop.polymer-project.org/\",\"outputName\":\"shop-flow\",\"testName\":\"Shop flow\",\"testType\":\"sanity\",\"browser\":\"chrome\",\"viewportWidth\":1366,\"viewportHeight\":768}"
```

## Example Test Commands

```powershell
npx playwright test sanity/test1.spec.js --project=chromium --headed
npx playwright test sanity --grep '@sanity' --project=chromium
npx playwright test regression --grep '@regression' --project=chromium
```
