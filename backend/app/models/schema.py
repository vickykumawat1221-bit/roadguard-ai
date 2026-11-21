from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class DetectionDetailSchema(BaseModel):
    id: Optional[int] = None
    detection_id: Optional[int] = None
    bounding_box: dict
    confidence: float
    severity: str
    area_ratio: float
    estimated_width_px: float
    estimated_height_px: float

    class Config:
        from_attributes = True

class DetectionResponse(BaseModel):
    id: int
    image_filename: str
    processed_image_filename: str
    media_type: str
    total_potholes: int
    low_severity: int
    medium_severity: int
    high_severity: int
    overall_severity: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    confidence_score: float
    created_at: datetime
    image_url: str
    processed_url: str
    details: List[DetectionDetailSchema] = []

    class Config:
        from_attributes = True

class LocationUpdateRequest(BaseModel):
    detection_id: int
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    location_name: Optional[str] = None

class StatisticsResponse(BaseModel):
    total_scans: int
    total_potholes: int
    low_severity: int
    medium_severity: int
    high_severity: int
    avg_confidence: float
    recent_detections: List[dict]
    severity_distribution: List[dict]
    daily_stats: List[dict]

class MapLocationItem(BaseModel):
    id: int
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    total_potholes: int
    overall_severity: str
    confidence_score: float
    image_url: str
    processed_url: str
    created_at: datetime
