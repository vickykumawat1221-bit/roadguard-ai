from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database.database import get_db
from ..database.models import Detection
from ..models.schema import LocationUpdateRequest
from .detections import format_detection_response

router = APIRouter(prefix="/api", tags=["Locations & Mapping"])

@router.get("/map/locations")
def get_map_locations(
    severity: str = Query("ALL"),
    db: Session = Depends(get_db)
):
    """
    Retrieve all GPS-tagged pothole records for Leaflet map visualization.
    Filters out records without real coordinates.
    """
    query = db.query(Detection).filter(
        Detection.latitude.isnot(None),
        Detection.longitude.isnot(None)
    )

    if severity and severity.upper() != "ALL":
        query = query.filter(Detection.overall_severity == severity.upper())

    records = query.order_by(desc(Detection.created_at)).all()

    locations = []
    for r in records:
        locations.append({
            "id": r.id,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "location_name": r.location_name or f"Sector #{r.id}",
            "total_potholes": r.total_potholes,
            "overall_severity": r.overall_severity,
            "confidence_score": r.confidence_score,
            "media_type": r.media_type or "image",
            "image_url": f"/uploads/{r.image_filename}",
            "processed_url": f"/processed/{r.processed_image_filename}",
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "low_severity": r.low_severity,
            "medium_severity": r.medium_severity,
            "high_severity": r.high_severity,
        })

    return {
        "count": len(locations),
        "locations": locations
    }

@router.post("/location")
def update_detection_location(req: LocationUpdateRequest, db: Session = Depends(get_db)):
    """
    Update or manually assign GPS coordinates to an existing detection record.
    """
    record = db.query(Detection).filter(Detection.id == req.detection_id).first()
    if not record:
        raise HTTPException(status_code=404, detail=f"Detection #{req.detection_id} not found")

    record.latitude = req.latitude
    record.longitude = req.longitude
    if req.location_name:
        record.location_name = req.location_name

    db.commit()
    db.refresh(record)

    return {
        "status": "success",
        "message": f"Updated location for Detection #{req.detection_id}",
        "detection": format_detection_response(record)
    }
