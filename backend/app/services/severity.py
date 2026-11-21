"""
Pothole Severity Classification Heuristic Service
Categorizes detected potholes into LOW, MEDIUM, or HIGH severity
based on geometric bounding box dimensions and frame area occupancy.

Disclaimer:
This provides an estimated AI heuristic classification based on optical
visual cues; it does not replace calibrated civil engineering road inspections.
"""

from typing import Dict, Any, Tuple, List

SEVERITY_CONFIG = {
    "LOW": {
        "label": "Low",
        "description": "Small surface depression or minor road crack. Low immediate risk.",
        "color": "#10B981", # Emerald Green
        "badge_class": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    "MEDIUM": {
        "label": "Medium",
        "description": "Moderate asphalt cavity. Requires scheduled routine maintenance.",
        "color": "#F59E0B", # Amber / Orange
        "badge_class": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    "HIGH": {
        "label": "High",
        "description": "Large or deep pothole posing severe hazard to vehicles and riders.",
        "color": "#EF4444", # Red
        "badge_class": "bg-rose-500/10 text-rose-400 border-rose-500/20",
    }
}

def classify_pothole_severity(
    bbox: Tuple[float, float, float, float],
    img_width: int,
    img_height: int
) -> Dict[str, Any]:
    """
    Classify a single detected pothole.
    bbox format: (xmin, ymin, xmax, ymax) in pixels
    """
    xmin, ymin, xmax, ymax = bbox
    box_w = max(0.0, float(xmax - xmin))
    box_h = max(0.0, float(ymax - ymin))
    box_area = box_w * box_h
    img_area = max(1.0, float(img_width * img_height))

    area_ratio = box_area / img_area
    w_ratio = box_w / max(1.0, float(img_width))
    h_ratio = box_h / max(1.0, float(img_height))
    max_dim_ratio = max(w_ratio, h_ratio)

    # Severity heuristic thresholds:
    # HIGH: area ratio >= 6% of image or any dimension spans >= 30% of frame width/height
    # MEDIUM: area ratio >= 1.5% or dimension spans >= 14%
    # LOW: smaller than above
    if area_ratio >= 0.06 or max_dim_ratio >= 0.30:
        severity = "HIGH"
    elif area_ratio >= 0.015 or max_dim_ratio >= 0.14:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    config = SEVERITY_CONFIG[severity]

    return {
        "severity": severity,
        "label": config["label"],
        "description": config["description"],
        "color": config["color"],
        "badge_class": config["badge_class"],
        "area_ratio": round(area_ratio, 4),
        "width_px": round(box_w, 1),
        "height_px": round(box_h, 1),
        "disclaimer": "Estimated visual classification; not an engineering-grade road safety assessment."
    }

def calculate_overall_severity(severities: List[str]) -> str:
    """
    Determines overall image/video damage rating based on the worst detected pothole.
    """
    if not severities:
        return "NONE"
    if "HIGH" in severities:
        return "HIGH"
    if "MEDIUM" in severities:
        return "MEDIUM"
    if "LOW" in severities:
        return "LOW"
    return "NONE"
