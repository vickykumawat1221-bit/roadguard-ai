import os
import shutil
import uuid
import json
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database.database import get_db, BASE_DIR
from ..database.models import Detection, DetectionDetail
from ..models.schema import DetectionResponse, DetectionDetailSchema
from ..services.detector import detector_service
from ..services.video_processor import video_processor

router = APIRouter(prefix="/api", tags=["Detections"])

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
ALLOWED_VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
MAX_IMAGE_SIZE = 25 * 1024 * 1024 # 25MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024 # 100MB

def format_detection_response(d: Detection, base_url: str = "") -> dict:
    details_list = []
    for detail in d.details:
        bbox = json.loads(detail.bounding_box) if isinstance(detail.bounding_box, str) else detail.bounding_box
        
        # Extract diameter and depth from bounding box dictionary or heuristic fallback
        diam = 25.0
        depth = "Moderate (3-6 cm)"
        if isinstance(bbox, dict):
            diam = bbox.get("estimated_diameter_cm", round(detail.estimated_width_px * 0.25, 1))
            depth = bbox.get("depth_category", "Moderate (3-6 cm)")

        details_list.append({
            "id": detail.id,
            "detection_id": detail.detection_id,
            "bounding_box": bbox,
            "confidence": detail.confidence,
            "severity": detail.severity,
            "area_ratio": detail.area_ratio,
            "estimated_width_px": detail.estimated_width_px,
            "estimated_height_px": detail.estimated_height_px,
            "estimated_diameter_cm": diam,
            "depth_category": depth
        })

    return {
        "id": d.id,
        "image_filename": d.image_filename,
        "processed_image_filename": d.processed_image_filename,
        "media_type": d.media_type or "image",
        "total_potholes": d.total_potholes,
        "low_severity": d.low_severity,
        "medium_severity": d.medium_severity,
        "high_severity": d.high_severity,
        "overall_severity": d.overall_severity or "LOW",
        "latitude": d.latitude,
        "longitude": d.longitude,
        "location_name": d.location_name,
        "confidence_score": d.confidence_score,
        "created_at": d.created_at.isoformat() if d.created_at else datetime.utcnow().isoformat(),
        "image_url": f"/uploads/{d.image_filename}",
        "processed_url": f"/processed/{d.processed_image_filename}",
        "details": details_list
    }

@router.post("/detect/image")
async def detect_image(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    location_name: Optional[str] = Form(None),
    conf_threshold: Optional[float] = Form(0.25),
    db: Session = Depends(get_db)
):
    """
    Upload road image, run AI pothole detection, save bounding boxes & severity metrics to SQLite.
    """
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format '{ext}'. Allowed: {', '.join(ALLOWED_IMAGE_EXTS)}"
        )

    # Unique file name to prevent collision
    file_id = str(uuid.uuid4())[:8]
    safe_filename = f"img_{file_id}_{file.filename}"
    upload_path = os.path.join(UPLOAD_DIR, safe_filename)

    # Save uploaded file
    try:
        contents = await file.read()
        if len(contents) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=400, detail="Image file exceeds maximum 25MB limit")
        with open(upload_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save image: {str(e)}")

    # Run AI inference
    try:
        annotated_filename = f"annotated_{file_id}_{file.filename}"
        detection_result = detector_service.detect_image(
            image_path=upload_path,
            output_dir=PROCESSED_DIR,
            conf_threshold=conf_threshold or 0.25,
            target_filename=annotated_filename
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection inference failed: {str(e)}")

    # Store in database
    db_detection = Detection(
        image_filename=safe_filename,
        processed_image_filename=annotated_filename,
        media_type="image",
        total_potholes=detection_result["total_potholes"],
        low_severity=detection_result["low_severity"],
        medium_severity=detection_result["medium_severity"],
        high_severity=detection_result["high_severity"],
        overall_severity=detection_result["overall_severity"],
        latitude=latitude,
        longitude=longitude,
        location_name=location_name,
        confidence_score=detection_result["confidence_score"]
    )
    db.add(db_detection)
    db.commit()
    db.refresh(db_detection)

    # Store individual pothole details
    for detail in detection_result["details"]:
        db_detail = DetectionDetail(
            detection_id=db_detection.id,
            bounding_box=json.dumps(detail["bounding_box"]),
            confidence=detail["confidence"],
            severity=detail["severity"],
            area_ratio=detail["area_ratio"],
            estimated_width_px=detail["estimated_width_px"],
            estimated_height_px=detail["estimated_height_px"]
        )
        db.add(db_detail)
    db.commit()
    db.refresh(db_detection)

    return format_detection_response(db_detection)

@router.post("/detect/video")
async def detect_video(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    location_name: Optional[str] = Form(None),
    conf_threshold: Optional[float] = Form(0.25),
    db: Session = Depends(get_db)
):
    """
    Upload road video, process frames, detect potholes, generate annotated video, and store summary in SQLite.
    """
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_VIDEO_EXTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported video format '{ext}'. Allowed: {', '.join(ALLOWED_VIDEO_EXTS)}"
        )

    file_id = str(uuid.uuid4())[:8]
    safe_filename = f"vid_{file_id}_{file.filename}"
    upload_path = os.path.join(UPLOAD_DIR, safe_filename)

    try:
        contents = await file.read()
        if len(contents) > MAX_VIDEO_SIZE:
            raise HTTPException(status_code=400, detail="Video exceeds maximum 100MB limit")
        with open(upload_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save video: {str(e)}")

    try:
        video_result = video_processor.process_video(
            video_input_path=upload_path,
            output_dir=PROCESSED_DIR,
            conf_threshold=conf_threshold or 0.25
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video processing failed: {str(e)}")

    db_detection = Detection(
        image_filename=safe_filename,
        processed_image_filename=video_result["processed_image_filename"],
        media_type="video",
        total_potholes=video_result["total_potholes"],
        low_severity=video_result["low_severity"],
        medium_severity=video_result["medium_severity"],
        high_severity=video_result["high_severity"],
        overall_severity=video_result["overall_severity"],
        latitude=latitude,
        longitude=longitude,
        location_name=location_name,
        confidence_score=video_result["confidence_score"]
    )
    db.add(db_detection)
    db.commit()
    db.refresh(db_detection)

    for detail in video_result["details"]:
        db_detail = DetectionDetail(
            detection_id=db_detection.id,
            bounding_box=json.dumps(detail["bounding_box"]),
            confidence=detail["confidence"],
            severity=detail["severity"],
            area_ratio=detail["area_ratio"],
            estimated_width_px=detail["estimated_width_px"],
            estimated_height_px=detail["estimated_height_px"]
        )
        db.add(db_detail)
    db.commit()
    db.refresh(db_detection)

    res = format_detection_response(db_detection)
    res["processed_video_url"] = f"/processed/{video_result['processed_video_filename']}"
    return res

@router.get("/detections")
def get_detections(
    severity: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Retrieve all detection records with optional filtering and pagination.
    """
    query = db.query(Detection)
    if severity and severity.upper() != "ALL":
        query = query.filter(Detection.overall_severity == severity.upper())
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Detection.location_name.ilike(search_filter)) |
            (Detection.image_filename.ilike(search_filter))
        )

    total_count = query.count()
    records = query.order_by(desc(Detection.created_at)).offset(offset).limit(limit).all()

    return {
        "total": total_count,
        "items": [format_detection_response(r) for r in records]
    }

@router.get("/detections/{detection_id}")
def get_detection_by_id(detection_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a particular detection record by ID with full details.
    """
    record = db.query(Detection).filter(Detection.id == detection_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Detection #{detection_id} not found")
    return format_detection_response(record)

@router.delete("/detections/{detection_id}")
def delete_detection(detection_id: int, db: Session = Depends(get_db)):
    """
    Delete a detection record and associated image files.
    """
    record = db.query(Detection).filter(Detection.id == detection_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Detection #{detection_id} not found")

    # Delete physical files
    orig_path = os.path.join(UPLOAD_DIR, record.image_filename)
    proc_path = os.path.join(PROCESSED_DIR, record.processed_image_filename)
    if os.path.exists(orig_path):
        try:
            os.remove(orig_path)
        except Exception:
            pass
    if os.path.exists(proc_path):
        try:
            os.remove(proc_path)
        except Exception:
            pass

    db.delete(record)
    db.commit()

    return {"status": "success", "message": f"Detection #{detection_id} deleted successfully"}
