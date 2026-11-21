from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ..database.database import get_db
from ..database.models import Detection, DetectionDetail
from .detections import format_detection_response

router = APIRouter(prefix="/api", tags=["Statistics"])

@router.get("/statistics")
def get_dashboard_statistics(db: Session = Depends(get_db)):
    """
    Retrieve live aggregated statistics for the RoadGuard AI dashboard.
    """
    total_scans = db.query(Detection).count()
    
    # Aggregated sums
    totals = db.query(
        func.coalesce(func.sum(Detection.total_potholes), 0),
        func.coalesce(func.sum(Detection.low_severity), 0),
        func.coalesce(func.sum(Detection.medium_severity), 0),
        func.coalesce(func.sum(Detection.high_severity), 0),
        func.coalesce(func.avg(Detection.confidence_score), 0.0)
    ).first()

    total_potholes = int(totals[0])
    low_count = int(totals[1])
    med_count = int(totals[2])
    high_count = int(totals[3])
    avg_conf = round(float(totals[4]), 4)

    # Severity distribution for donut/pie chart
    severity_distribution = [
        {"name": "High Severity", "value": high_count, "color": "#EF4444", "severity": "HIGH"},
        {"name": "Medium Severity", "value": med_count, "color": "#F59E0B", "severity": "MEDIUM"},
        {"name": "Low Severity", "value": low_count, "color": "#10B981", "severity": "LOW"},
    ]

    # Daily detection trend for the past 7 days
    today = datetime.utcnow().date()
    daily_stats = []
    for i in range(6, -1, -1):
        day_date = today - timedelta(days=i)
        next_day = day_date + timedelta(days=1)
        day_str = day_date.strftime("%b %d")

        day_query = db.query(
            func.count(Detection.id),
            func.coalesce(func.sum(Detection.total_potholes), 0),
            func.coalesce(func.sum(Detection.high_severity), 0),
            func.coalesce(func.sum(Detection.medium_severity), 0),
            func.coalesce(func.sum(Detection.low_severity), 0)
        ).filter(
            Detection.created_at >= datetime.combine(day_date, datetime.min.time()),
            Detection.created_at < datetime.combine(next_day, datetime.min.time())
        ).first()

        daily_stats.append({
            "date": day_str,
            "scans": int(day_query[0]),
            "potholes": int(day_query[1]),
            "high": int(day_query[2]),
            "medium": int(day_query[3]),
            "low": int(day_query[4])
        })

    # Recent 6 detections
    recent_records = db.query(Detection).order_by(desc(Detection.created_at)).limit(6).all()
    recent_detections = [format_detection_response(r) for r in recent_records]

    return {
        "total_scans": total_scans,
        "total_potholes": total_potholes,
        "low_severity": low_count,
        "medium_severity": med_count,
        "high_severity": high_count,
        "avg_confidence": avg_conf,
        "severity_distribution": severity_distribution,
        "daily_stats": daily_stats,
        "recent_detections": recent_detections
    }
