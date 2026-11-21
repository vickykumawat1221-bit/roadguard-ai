import os
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database.database import get_db, BASE_DIR
from ..database.models import Detection
from ..services.pdf_report import generate_pdf_report

router = APIRouter(prefix="/api", tags=["Reports"])

REPORTS_DIR = os.path.join(BASE_DIR, "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")

@router.get("/reports/{detection_id}")
def get_pdf_report(detection_id: int, db: Session = Depends(get_db)):
    """
    Generate or download official RoadGuard AI PDF damage inspection report.
    """
    record = db.query(Detection).filter(Detection.id == detection_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Detection #{detection_id} not found")

    pdf_filename = f"RoadGuard_Report_ID{detection_id}.pdf"
    pdf_path = os.path.join(REPORTS_DIR, pdf_filename)

    # Format details
    details_data = []
    for d in record.details:
        bbox = json.loads(d.bounding_box) if isinstance(d.bounding_box, str) else d.bounding_box
        details_data.append({
            "severity": d.severity,
            "confidence": d.confidence,
            "area_ratio": d.area_ratio,
            "estimated_width_px": d.estimated_width_px,
            "estimated_height_px": d.estimated_height_px,
            "bounding_box": bbox
        })

    payload = {
        "id": record.id,
        "image_filename": record.image_filename,
        "processed_image_filename": record.processed_image_filename,
        "media_type": record.media_type or "image",
        "total_potholes": record.total_potholes,
        "low_severity": record.low_severity,
        "medium_severity": record.medium_severity,
        "high_severity": record.high_severity,
        "overall_severity": record.overall_severity,
        "latitude": record.latitude,
        "longitude": record.longitude,
        "location_name": record.location_name,
        "confidence_score": record.confidence_score,
        "created_at": record.created_at,
        "orig_image_path": os.path.join(UPLOAD_DIR, record.image_filename),
        "proc_image_path": os.path.join(PROCESSED_DIR, record.processed_image_filename),
        "details": details_data
    }

    try:
        generate_pdf_report(payload, pdf_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=pdf_filename,
        headers={"Content-Disposition": f"attachment; filename={pdf_filename}"}
    )
