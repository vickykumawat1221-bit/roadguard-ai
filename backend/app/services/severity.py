"""
Enhanced Pothole Severity & Physical Dimension Heuristic Service
Estimates real-world diameter (cm), cavity depth category, and municipal repair priority.
Incorporates vertical perspective ground-plane projection.

Disclaimer:
Provides computer vision visual estimation for smart-city maintenance triage;
does not replace calibrated in-situ mechanical profilometry.
"""

from typing import Dict, Any, Tuple, List

SEVERITY_CONFIG = {
    "LOW": {
        "label": "Low Severity",
        "description": "Small surface depression or early raveling (est. <25cm diameter).",
        "color": "#10B981", # Emerald Green
        "depth_category": "Shallow (1-3 cm)",
        "badge_class": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    "MEDIUM": {
        "label": "Medium Severity",
        "description": "Moderate asphalt cavity (est. 25-50cm diameter). Routine weekly repair.",
        "color": "#F59E0B", # Amber / Orange
        "depth_category": "Moderate (3-6 cm)",
        "badge_class": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    "HIGH": {
        "label": "High Hazard",
        "description": "Severe structural asphalt cavity (est. >50cm diameter). Immediate 24h patching.",
        "color": "#EF4444", # Red
        "depth_category": "Deep Hazardous (>6 cm)",
        "badge_class": "bg-rose-500/10 text-rose-400 border-rose-500/20",
    }
}

def classify_pothole_severity(
    bbox: Tuple[float, float, float, float],
    img_width: int,
    img_height: int
) -> Dict[str, Any]:
    """
    Classify a single detected pothole using vertical perspective depth weighting.
    bbox: (xmin, ymin, xmax, ymax) in pixels
    """
    xmin, ymin, xmax, ymax = bbox
    box_w = max(1.0, float(xmax - xmin))
    box_h = max(1.0, float(ymax - ymin))
    box_area = box_w * box_h
    img_area = max(1.0, float(img_width * img_height))

    # Center Y position relative to horizon
    y_center = (ymin + ymax) / 2.0
    norm_y = max(0.15, min(1.0, y_center / float(img_height)))

    # Perspective Ground-Plane Distance Scaling:
    # Objects higher in the frame are farther away; equivalent pixel width corresponds to larger physical meters
    perspective_weight = 1.0 / (norm_y ** 1.3)

    area_ratio = box_area / img_area
    w_ratio = box_w / max(1.0, float(img_width))
    h_ratio = box_h / max(1.0, float(img_height))
    max_dim_ratio = max(w_ratio, h_ratio)

    # Perspective-weighted virtual dimension metric
    weighted_metric = max_dim_ratio * perspective_weight

    # Estimate physical diameter in centimeters (standard lane assumption: 3.5m wide road spans ~80% of dashcam frame)
    # At norm_y=0.8 (close road), ~200px is roughly 40cm.
    # At norm_y=0.4 (distant road), ~100px is roughly 50cm.
    estimated_diameter_cm = round(max_dim_ratio * 350.0 * (perspective_weight ** 0.5), 1)
    estimated_diameter_cm = max(10.0, min(150.0, estimated_diameter_cm))

    # Multi-tier decision boundary:
    if weighted_metric >= 0.28 or area_ratio >= 0.05 or estimated_diameter_cm >= 48.0:
        severity = "HIGH"
    elif weighted_metric >= 0.12 or area_ratio >= 0.015 or estimated_diameter_cm >= 24.0:
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
        "depth_category": config["depth_category"],
        "estimated_diameter_cm": estimated_diameter_cm,
        "area_ratio": round(area_ratio, 4),
        "width_px": round(box_w, 1),
        "height_px": round(box_h, 1),
        "perspective_factor": round(perspective_weight, 2),
        "disclaimer": "Perspective-estimated visual heuristic; not certified civil profilometry."
    }

def calculate_overall_severity(severities: List[str]) -> str:
    """
    Determines overall road segment damage rating based on peak hazard.
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
