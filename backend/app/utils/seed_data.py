#!/usr/bin/env python3
"""
Seed initial sample detections into SQLite database for demonstration.
"""
import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from ..database.database import SessionLocal, BASE_DIR
from ..database.models import Detection, DetectionDetail
from ..services.detector import detector_service
import json

def seed_initial_samples():
    db = SessionLocal()
    existing_count = db.query(Detection).count()
    if existing_count > 0:
        print(f"[Seed] Database already contains {existing_count} records. Skipping.")
        db.close()
        return

    sample_dir = Path(BASE_DIR).parent / "sample_media"
    upload_dir = Path(BASE_DIR) / "uploads"
    processed_dir = Path(BASE_DIR) / "processed"
    upload_dir.mkdir(parents=True, exist_ok=True)
    processed_dir.mkdir(parents=True, exist_ok=True)

    sample_items = [
        {
            "src": sample_dir / "sample_pothole_1.png",
            "name": "sample_highway_sector4.png",
            "lat": 12.9716,
            "lng": 77.5946,
            "loc": "Bangalore Central Arterial Ring Rd",
            "days_ago": 1
        },
        {
            "src": sample_dir / "sample_pothole_2.png",
            "name": "sample_urban_lane7.png",
            "lat": 12.9352,
            "lng": 77.6245,
            "loc": "Koramangala 80ft Inner Corridor",
            "days_ago": 0
        }
    ]

    for item in sample_items:
        if not item["src"].exists():
            continue

        target_upload = upload_dir / item["name"]
        shutil.copy(item["src"], target_upload)

        ann_name = f"annotated_{item['name']}"
        res = detector_service.detect_image(
            image_path=str(target_upload),
            output_dir=str(processed_dir),
            conf_threshold=0.20,
            target_filename=ann_name
        )

        d = Detection(
            image_filename=item["name"],
            processed_image_filename=ann_name,
            media_type="image",
            total_potholes=res["total_potholes"],
            low_severity=res["low_severity"],
            medium_severity=res["medium_severity"],
            high_severity=res["high_severity"],
            overall_severity=res["overall_severity"],
            latitude=item["lat"],
            longitude=item["lng"],
            location_name=item["loc"],
            confidence_score=res["confidence_score"],
            created_at=datetime.utcnow() - timedelta(days=item["days_ago"], hours=2)
        )
        db.add(d)
        db.commit()
        db.refresh(d)

        for detail in res["details"]:
            det = DetectionDetail(
                detection_id=d.id,
                bounding_box=json.dumps(detail["bounding_box"]),
                confidence=detail["confidence"],
                severity=detail["severity"],
                area_ratio=detail["area_ratio"],
                estimated_width_px=detail["estimated_width_px"],
                estimated_height_px=detail["estimated_height_px"]
            )
            db.add(det)
        db.commit()
        print(f"[Seed] Ingested sample: {item['name']} -> ID #{d.id} ({d.total_potholes} potholes)")

    db.close()

if __name__ == "__main__":
    seed_initial_samples()
