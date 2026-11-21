from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .database import Base

class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    image_filename = Column(String(255), nullable=False)
    processed_image_filename = Column(String(255), nullable=False)
    media_type = Column(String(20), default="image") # 'image' or 'video'
    total_potholes = Column(Integer, default=0)
    low_severity = Column(Integer, default=0)
    medium_severity = Column(Integer, default=0)
    high_severity = Column(Integer, default=0)
    overall_severity = Column(String(20), default="LOW")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(String(255), nullable=True)
    confidence_score = Column(Float, default=0.0) # Average confidence
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    details = relationship("DetectionDetail", back_populates="detection", cascade="all, delete-orphan")


class DetectionDetail(Base):
    __tablename__ = "detection_details"

    id = Column(Integer, primary_key=True, index=True)
    detection_id = Column(Integer, ForeignKey("detections.id", ondelete="CASCADE"), nullable=False)
    bounding_box = Column(Text, nullable=False) # JSON string: {"xmin": x1, "ymin": y1, "xmax": x2, "ymax": y2, "width": w, "height": h}
    confidence = Column(Float, nullable=False)
    severity = Column(String(20), nullable=False) # LOW, MEDIUM, HIGH
    area_ratio = Column(Float, default=0.0) # Bounding box area relative to image area
    estimated_width_px = Column(Float, default=0.0)
    estimated_height_px = Column(Float, default=0.0)

    detection = relationship("Detection", back_populates="details")
