import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database.database import engine, Base, BASE_DIR
from .routes import detections, stats, location, reports
from .services.detector import detector_service

# Initialize database schemas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RoadGuard AI - Backend API",
    description="Real-Time AI-Based Pothole Detection & Road Monitoring System",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows local React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file routes
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")
REPORTS_DIR = os.path.join(BASE_DIR, "reports")
SAMPLE_MEDIA_DIR = str(Path(BASE_DIR).parent / "sample_media")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(REPORTS_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/processed", StaticFiles(directory=PROCESSED_DIR), name="processed")
if os.path.exists(SAMPLE_MEDIA_DIR):
    app.mount("/sample_media", StaticFiles(directory=SAMPLE_MEDIA_DIR), name="sample_media")

# Include Routers
app.include_router(detections.router)
app.include_router(stats.router)
app.include_router(location.router)
app.include_router(reports.router)

@app.get("/api/health")
def health_check():
    """
    Health check endpoint reporting system status and AI model readiness.
    """
    models_count = len(detector_service._models)
    is_ensemble = detector_service.is_ensemble_active
    return {
        "status": "healthy",
        "service": "RoadGuard AI Core Engine",
        "version": "2.0.0-hackathon-pro",
        "ai_model": "Dual-Engine YOLOv8 Weighted Box Fusion (WBF + CLAHE)",
        "model_loaded": models_count > 0,
        "models_count": models_count,
        "ensemble_active": is_ensemble,
        "runtime_device": "Apple Silicon CPU/MPS",
        "database": "SQLite (Persistent)",
        "timestamp": os.path.getmtime(os.path.join(BASE_DIR, "weights", "pothole_yolov8.pt")) if os.path.exists(os.path.join(BASE_DIR, "weights", "pothole_yolov8.pt")) else None
    }

@app.get("/api/sample-images")
def list_sample_images():
    """
    Lists bundled sample road images/videos for easy 1-click lab testing.
    """
    samples = []
    if os.path.exists(SAMPLE_MEDIA_DIR):
        for fname in sorted(os.listdir(SAMPLE_MEDIA_DIR)):
            if fname.lower().endswith(('.png', '.jpg', '.jpeg', '.mp4')):
                fpath = os.path.join(SAMPLE_MEDIA_DIR, fname)
                samples.append({
                    "filename": fname,
                    "url": f"/sample_media/{fname}",
                    "media_type": "video" if fname.lower().endswith('.mp4') else "image",
                    "size_kb": round(os.path.getsize(fpath) / 1024, 1)
                })
    return {"samples": samples}
