import os
import cv2
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Tuple
from .severity import classify_pothole_severity, calculate_overall_severity

# Configure Ultralytics directory inside app sandbox
BASE_DIR = Path(__file__).resolve().parent.parent.parent
CONFIG_DIR = BASE_DIR.parent / ".ultralytics"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)
os.environ["YOLO_CONFIG_DIR"] = str(CONFIG_DIR)

from ultralytics import YOLO

# Color scheme in BGR for OpenCV
SEVERITY_BGR_COLORS = {
    "LOW": (16, 185, 129),       # #10B981 (Emerald Green)
    "MEDIUM": (11, 158, 245),    # #F59E0B (Amber/Orange)
    "HIGH": (68, 68, 239),       # #EF4444 (Crimson Red)
    "NONE": (160, 160, 160)
}

class PotholeDetectorService:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PotholeDetectorService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        weights_path = BASE_DIR / "weights" / "pothole_yolov8.pt"
        if not weights_path.exists():
            print(f"[Detector] Weights not found at {weights_path}. Downloading from Hugging Face...")
            weights_path.parent.mkdir(parents=True, exist_ok=True)
            import urllib.request
            url = "https://huggingface.co/peterhdd/pothole-detection-yolov8/resolve/main/best.pt"
            urllib.request.urlretrieve(url, str(weights_path))
            print("[Detector] Download complete.")
        print(f"[Detector] Loading YOLOv8 pothole model from {weights_path}...")
        self._model = YOLO(str(weights_path))
        print("[Detector] Model successfully initialized on CPU.")

    def detect_image(
        self,
        image_path: str,
        output_dir: str,
        conf_threshold: float = 0.25,
        target_filename: str = None
    ) -> Dict[str, Any]:
        """
        Process an image file, detect potholes, draw severity-colored bounding boxes,
        and save the annotated image.
        """
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not load image from {image_path}")

        img_h, img_w = img.shape[:2]

        # Run inference
        results = self._model(img, conf=conf_threshold, verbose=False)
        boxes_result = results[0].boxes

        pothole_details: List[Dict[str, Any]] = []
        low_count = 0
        med_count = 0
        high_count = 0
        conf_list: List[float] = []
        severities: List[str] = []

        annotated_img = img.copy()

        if len(boxes_result) > 0:
            for box in boxes_result:
                # Extract coordinates
                xyxy = box.xyxy[0].cpu().numpy().tolist()
                xmin, ymin, xmax, ymax = xyxy
                conf = float(box.conf[0].cpu().numpy())
                conf_list.append(conf)

                # Classify severity
                sev_info = classify_pothole_severity(
                    bbox=(xmin, ymin, xmax, ymax),
                    img_width=img_w,
                    img_height=img_h
                )
                severity = sev_info["severity"]
                severities.append(severity)

                if severity == "LOW":
                    low_count += 1
                elif severity == "MEDIUM":
                    med_count += 1
                elif severity == "HIGH":
                    high_count += 1

                # Append detail dictionary
                pothole_details.append({
                    "bounding_box": {
                        "xmin": round(xmin, 1),
                        "ymin": round(ymin, 1),
                        "xmax": round(xmax, 1),
                        "ymax": round(ymax, 1),
                        "width": sev_info["width_px"],
                        "height": sev_info["height_px"]
                    },
                    "confidence": round(conf, 4),
                    "severity": severity,
                    "area_ratio": sev_info["area_ratio"],
                    "estimated_width_px": sev_info["width_px"],
                    "estimated_height_px": sev_info["height_px"]
                })

                # Draw bounding box and label
                color = SEVERITY_BGR_COLORS.get(severity, (0, 255, 255))
                pt1 = (int(xmin), int(ymin))
                pt2 = (int(xmax), int(ymax))

                # Draw box
                cv2.rectangle(annotated_img, pt1, pt2, color, thickness=3)

                # Label text
                label = f"Pothole: {severity} ({int(conf * 100)}%)"
                font = cv2.FONT_HERSHEY_SIMPLEX
                font_scale = max(0.5, min(0.8, img_w / 1200.0))
                thickness = 2
                (text_w, text_h), baseline = cv2.getTextSize(label, font, font_scale, thickness)

                # Label background rectangle
                label_ymin = max(0, int(ymin) - text_h - 10)
                label_ymax = int(ymin)
                cv2.rectangle(
                    annotated_img,
                    (int(xmin), label_ymin),
                    (int(xmin) + text_w + 10, label_ymax),
                    color,
                    -1
                )
                # Label text in black or white
                text_color = (0, 0, 0) if severity in ["MEDIUM", "LOW"] else (255, 255, 255)
                cv2.putText(
                    annotated_img,
                    label,
                    (int(xmin) + 5, label_ymax - 5),
                    font,
                    font_scale,
                    text_color,
                    thickness,
                    cv2.LINE_AA
                )

        overall_severity = calculate_overall_severity(severities)
        total_potholes = len(pothole_details)
        avg_confidence = round(sum(conf_list) / len(conf_list), 4) if conf_list else 0.0

        # Draw HUD header bar
        self._draw_hud_banner(annotated_img, total_potholes, overall_severity, avg_confidence)

        # Save annotated image
        os.makedirs(output_dir, exist_ok=True)
        if not target_filename:
            target_filename = f"annotated_{Path(image_path).name}"
        output_file_path = os.path.join(output_dir, target_filename)
        cv2.imwrite(output_file_path, annotated_img)

        return {
            "total_potholes": total_potholes,
            "low_severity": low_count,
            "medium_severity": med_count,
            "high_severity": high_count,
            "overall_severity": overall_severity,
            "confidence_score": avg_confidence,
            "processed_image_filename": target_filename,
            "processed_image_path": output_file_path,
            "details": pothole_details
        }

    def _draw_hud_banner(self, img: np.ndarray, total: int, overall_sev: str, avg_conf: float):
        """Draws top HUD banner with detection summary"""
        h, w = img.shape[:2]
        banner_h = max(40, int(h * 0.06))
        
        # Overlay semi-transparent dark banner
        overlay = img.copy()
        cv2.rectangle(overlay, (0, 0), (w, banner_h), (11, 19, 43), -1)
        cv2.addWeighted(overlay, 0.85, img, 0.15, 0, img)

        # Add top border accent
        color = SEVERITY_BGR_COLORS.get(overall_sev, (200, 200, 200))
        cv2.rectangle(img, (0, banner_h - 2), (w, banner_h), color, 2)

        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = max(0.45, min(0.7, w / 1400.0))
        text = f"RoadGuard AI | Detected: {total} Pothole(s) | Overall Risk: {overall_sev}"
        if total > 0:
            text += f" | Avg Conf: {int(avg_conf * 100)}%"

        cv2.putText(img, text, (15, int(banner_h * 0.68)), font, font_scale, (255, 255, 255), 1, cv2.LINE_AA)

detector_service = PotholeDetectorService()
