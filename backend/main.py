import logging
from contextlib import asynccontextmanager

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("nuvero")

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

from app.utils.config import settings
from app.utils.db import db_manager, init_db_indexes
from app.api.auth import router as auth_router
from app.api.workspace import router as workspace_router
from app.api.team import router as team_router
from app.api.document import router as document_router
from app.api.announcement import router as announcement_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to DB and initialize indexes
    db_manager.connect_to_database()
    await init_db_indexes()
    yield
    # Shutdown: Close DB connections
    db_manager.close_database_connection()

app = FastAPI(
    title="Nurevo Enterprise SaaS API",
    description="FastAPI Backend for the Enterprise Knowledge Management & Team Collaboration Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Request validation failed at {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "message": "Input validation failed."}
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled server error at {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred."}
    )

# Include Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(workspace_router, prefix="/api/v1")
app.include_router(team_router, prefix="/api/v1")
app.include_router(document_router, prefix="/api/v1")
app.include_router(announcement_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Nurevo Enterprise SaaS Platform API",
        "version": "1.0.0"
    }
