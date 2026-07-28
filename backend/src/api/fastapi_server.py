from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os
from .fastapi_routes import router
from .fastapi_support import STATIC_DIR


API_DESCRIPTION = """
Playwright workflow backend for project creation, script generation, artifact browsing, file editing, report serving, and test execution.

Swagger/OpenAPI documents HTTP endpoints, including project file APIs and report APIs.
The UI also uses WebSocket endpoints for live setup, recorder, and test-run progress.
Use `GET /api/docs/websocket-apis` in Swagger to view those WebSocket payloads.
"""

OPENAPI_TAGS = [
    {"name": "App", "description": "Frontend shell and basic app metadata."},
    {"name": "Artifacts", "description": "Recorder, codegen, generated spec, and masking artifacts."},
    {"name": "Projects", "description": "Generated Playwright project discovery, setup, files, and downloads."},
    {"name": "Reports", "description": "Playwright JSON/HTML and Allure report files, downloads, and assets."},
    {"name": "Workflow", "description": "Record/refine jobs and job status."},
    {"name": "Healing", "description": "Inline heal metadata and healed spec lookup."},
    {"name": "Docs", "description": "Swagger-visible documentation for non-HTTP APIs such as WebSockets."},
]


app = FastAPI(
    title="Playwright Workflow API",
    description=API_DESCRIPTION,
    version="1.0.0",
    servers=[
        {
            "url": os.getenv("API_BASE_URL", "http://localhost:8000"),
            "description": "Local backend API server",
        },
    ],
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    swagger_ui_parameters={
        "displayRequestDuration": True,
        "persistAuthorization": True,
    },
    openapi_tags=OPENAPI_TAGS,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.include_router(router)


@app.exception_handler(HTTPException)
async def http_error_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"ok": False, "error": exc.detail},
        headers=exc.headers,
    )


@app.exception_handler(Exception)
async def generic_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={"ok": False, "error": str(exc)},
    )
