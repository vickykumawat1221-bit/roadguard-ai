import os
import cv2
import urllib.request
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
from .severity import classify_pothole_severity, calculate_overall_severity

# Configure Ultralytics directory inside app sandbox to prevent macOS permission errors
BASE_DIR = Path(__file__).resolve().parent.parent.parent
CONFIG_DIR = BASE_DIR.parent / ".ultralytics"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)
os.environ["YOLO_CONFIG_DIR"] = str(CONFIG_DIR)

from ultralytics import YOLO

# Cyberpunk / Smart-City HUD Color Scheme in BGR for OpenCV
SEVERITY_BGR_COLORS = {
    "LOW": (16, 185, 129),       # #10B981 (Emerald Green)
    "MEDIUM": (11, 158, 245),    # #F59E0B (Amber/Orange)
    "HIGH": (68, 68, 239),       # #EF4444 (Crimson Red)
    "NONE": (160, 160, 160)
}

MODEL_URLS = {
    "pothole_yolov8.pt": "https://huggingface.co/peterhdd/pothole-detection-yolov8/resolve/main/best.pt",
    "pothole_samdutse.pt": "https://huggingface.co/samdutse/pothole-yolov8s/resolve/main/best.pt"
}

def compute_box_iou(boxA: List[float], boxB: List[float]) -> float:
    """Compute Intersection over Union between two bounding boxes [xmin, ymin, xmax, ymax]"""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interW = max(0.0, xB - xA)
    interH = max(0.0, yB - yA)
    interArea = interW * interH

    areaA = max(0.0, boxA[2] - boxA[0]) * max(0.0, boxA[3] - boxA[1])
    areaB = max(0.0, boxB[2] - boxB[0]) * max(0.0, boxB[3] - boxB[1])
    unionArea = areaA + areaB - interArea

    return (interArea / unionArea) if unionArea > 0 else 0.0

def apply_clahe_enhancement(img_bgr: np.ndarray) -> np.ndarray:
    """Apply Contrast Limited Adaptive Histogram Equalization on L-channel of LAB space"""
    try:
        lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        enhanced_lab = cv2.merge((cl, a, b))
        return cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
    except Exception:
        return img_bgr

class PotholeDetectorService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PotholeDetectorService, cls).__new__(cls)
            cls._instance._models: List[Tuple[str, YOLO]] = []
            cls._instance._initialize()
        return cls._instance

    def _ensure_weights(self, filename: str) -> Path:
        weights_dir = BASE_DIR / "weights"
        weights_dir.mkdir(parents=True, exist_ok=True)
        path = weights_dir / filename
        if not path.exists():
            url = MODEL_URLS.get(filename)
            if url:
                print(f"[Detector] Weights {filename} not found at {path}. Downloading from Hugging Face...")
                try:
                    urllib.request.urlretrieve(url, str(path))
                    print(f"[Detector] Successfully downloaded {filename}.")
                except Exception as e:
                    print(f"[Detector Warning] Could not download {filename}: {e}")
        return path

    def _initialize(self):
        """Loads both specialized pothole detection models for dual-engine ensemble inference."""
        self._models = []
        for filename in ["pothole_yolov8.pt", "pothole_samdutse.pt"]:
            p = self._ensure_weights(filename)
            if p.exists():
                try:
                    print(f"[Detector] Initializing neural checkpoint: {filename}...")
                    m = YOLO(str(p))
                    self._models.append((filename, m))
                    print(f"[Detector] Loaded {filename} successfully on CPU/MPS.")
                except Exception as e:
                    print(f"[Detector Error] Failed loading {filename}: {e}")
            else:
                print(f"[Detector Warning] Checkpoint {filename} not available.")

        if not self._models:
            print("[Detector Error] No pothole model weights available! Model inference will fail.")

    @property
    def is_ensemble_active(self) -> bool:
        return len(self._models) >= 2

    @property
    def _model(self):
        """Primary model fallback for legacy callers"""
        return self._models[0][1] if self._models else None

    def detect_raw_candidates(
        self,
        frame: np.ndarray,
        conf_threshold: float = 0.20
    ) -> List[Dict[str, Any]]:
        """
        Runs dual-model inference with resolution preservation and CLAHE enhancement.
        Returns unified list of candidate bounding boxes before fusion.
        """
        h, w = frame.shape[:2]
        if h == 0 or w == 0:
            return []

        # Adaptive scaling: if image is small (<480px), upscale with Lanczos-4
        # to preserve high-frequency edge gradients in YOLO's 640 feature pyramids
        scale = 1.0
        max_dim = max(h, w)
        if max_dim < 480:
            scale = 640.0 / float(max_dim)
            infer_frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_LANCZOS4)
        else:
            infer_frame = frame

        raw_candidates: List[Dict[str, Any]] = []

        for model_name, model in self._models:
            try:
                results = model(infer_frame, conf=conf_threshold, verbose=False)
                boxes = results[0].boxes
                for box in boxes:
                    xyxy = (box.xyxy[0].cpu().numpy() / scale).tolist()
                    conf = float(box.conf[0].cpu().numpy())
                    raw_candidates.append({
                        "bbox": xyxy,
                        "conf": conf,
                        "source": model_name
                    })
            except Exception as e:
                print(f"[Detector Inference Error in {model_name}]: {e}")

        # If zero detections were found on dark or high-glare image, retry with CLAHE
        if len(raw_candidates) == 0 and len(self._models) > 0:
            clahe_frame = apply_clahe_enhancement(infer_frame)
            for model_name, model in self._models:
                try:
                    results = model(clahe_frame, conf=max(0.18, conf_threshold - 0.05), verbose=False)
                    for box in results[0].boxes:
                        xyxy = (box.xyxy[0].cpu().numpy() / scale).tolist()
                        conf = float(box.conf[0].cpu().numpy())
                        raw_candidates.append({
                            "bbox": xyxy,
                            "conf": conf,
                            "source": f"{model_name}-clahe"
                        })
                except Exception:
                    pass

        # Filter out extreme false positives:
        # Horizon filter: potholes don't exist in the upper 10% of road viewport
        # Aspect ratio filter: filter extreme slivers (e.g., telephone wires or thin poles)
        valid_candidates = []
        for cand in raw_candidates:
            xmin, ymin, xmax, ymax = cand["bbox"]
            bw = max(1.0, xmax - xmin)
            bh = max(1.0, ymax - ymin)
            y_center = (ymin + ymax) / 2.0
            
            # Horizon check (discard top 10% of frame unless large box)
            if y_center < (h * 0.10) and (bh / h) < 0.25:
                continue
            # Aspect ratio check
            aspect = bw / bh
            if aspect > 8.0 or aspect < 0.12:
                continue

            # Clip within image boundaries
            clipped_box = [
                max(0.0, min(float(w), xmin)),
                max(0.0, min(float(h), ymin)),
                max(0.0, min(float(w), xmax)),
                max(0.0, min(float(h), ymax))
            ]
            cand["bbox"] = clipped_box
            valid_candidates.append(cand)

        return valid_candidates

    def fuse_detections(
        self,
        candidates: List[Dict[str, Any]],
        iou_threshold: float = 0.35,
        min_conf: float = 0.22
    ) -> List[Dict[str, Any]]:
        """
        Weighted Box Fusion (WBF):
        Fuses overlapping candidate boxes from multiple models and applies
        cross-validation confidence boosting for dual-confirmed detections.
        """
        if not candidates:
            return []

        sorted_cands = sorted(candidates, key=lambda c: c["conf"], reverse=True)
        fused_boxes = []
        used = [False] * len(sorted_cands)

        for i in range(len(sorted_cands)):
            if used[i]:
                continue
            cluster = [sorted_cands[i]]
            used[i] = True

            for j in range(i + 1, len(sorted_cands)):
                if not used[j]:
                    iou = compute_box_iou(sorted_cands[i]["bbox"], sorted_cands[j]["bbox"])
                    if iou >= iou_threshold:
                        cluster.append(sorted_cands[j])
                        used[j] = True

            # Weighted average coordinates by confidence scores
            total_weight = sum(c["conf"] for c in cluster)
            xmin = sum(c["bbox"][0] * c["conf"] for c in cluster) / total_weight
            ymin = sum(c["bbox"][1] * c["conf"] for c in cluster) / total_weight
            xmax = sum(c["bbox"][2] * c["conf"] for c in cluster) / total_weight
            ymax = sum(c["bbox"][3] * c["conf"] for c in cluster) / total_weight

            # Model consensus check
            models_in_cluster = set(c["source"].split("-")[0] for c in cluster)
            max_conf = max(c["conf"] for c in cluster)

            # Consensus boost: if confirmed by both independent YOLO models, boost confidence
            if len(models_in_cluster) > 1:
                final_conf = min(0.98, max_conf * 1.15 + 0.05)
                dual_confirmed = True
            else:
                final_conf = max_conf
                dual_confirmed = False

            if final_conf >= min_conf:
                fused_boxes.append({
                    "bbox": [round(xmin, 1), round(ymin, 1), round(xmax, 1), round(ymax, 1)],
                    "confidence": round(final_conf, 4),
                    "dual_confirmed": dual_confirmed,
                    "cluster_size": len(cluster)
                })

        return fused_boxes

    def detect_frame(
        self,
        frame: np.ndarray,
        conf_threshold: float = 0.25,
        annotate: bool = True
    ) -> Tuple[np.ndarray, List[Dict[str, Any]], str, float]:
        """
        Detects potholes on a single in-memory frame (used by image detection and streaming video).
        Returns: (annotated_frame, pothole_details, overall_severity, avg_confidence)
        """
        img_h, img_w = frame.shape[:2]
        candidates = self.detect_raw_candidates(frame, conf_threshold=max(0.18, conf_threshold - 0.05))
        fused = self.fuse_detections(candidates, iou_threshold=0.35, min_conf=conf_threshold)

        pothole_details: List[Dict[str, Any]] = []
        severities: List[str] = []
        conf_list: List[float] = []

        annotated = frame.copy() if annotate else frame

        # Create semi-transparent overlay canvas
        overlay = annotated.copy() if annotate else None

        for item in fused:
            xmin, ymin, xmax, ymax = item["bbox"]
            conf = item["confidence"]
            conf_list.append(conf)

            # Classify severity using perspective distance calibration
            sev_info = classify_pothole_severity(
                bbox=(xmin, ymin, xmax, ymax),
                img_width=img_w,
                img_height=img_h
            )
            severity = sev_info["severity"]
            severities.append(severity)

            detail_dict = {
                "bounding_box": {
                    "xmin": xmin,
                    "ymin": ymin,
                    "xmax": xmax,
                    "ymax": ymax,
                    "width": sev_info["width_px"],
                    "height": sev_info["height_px"],
                    "estimated_diameter_cm": sev_info["estimated_diameter_cm"],
                    "depth_category": sev_info["depth_category"]
                },
                "confidence": conf,
                "severity": severity,
                "area_ratio": sev_info["area_ratio"],
                "estimated_width_px": sev_info["width_px"],
                "estimated_height_px": sev_info["height_px"],
                "estimated_diameter_cm": sev_info["estimated_diameter_cm"],
                "depth_category": sev_info["depth_category"],
                "dual_confirmed": item["dual_confirmed"]
            }
            pothole_details.append(detail_dict)

            if annotate:
                color = SEVERITY_BGR_COLORS.get(severity, (0, 255, 255))
                pt1 = (int(xmin), int(ymin))
                pt2 = (int(xmax), int(ymax))

                # Draw semi-transparent cavity fill
                cv2.rectangle(overlay, pt1, pt2, color, -1)

                # Draw bounding box outline
                cv2.rectangle(annotated, pt1, pt2, color, thickness=2)

                # Draw futuristic corner bracket HUD ticks
                bracket_len = max(6, min(24, int(min(xmax - xmin, ymax - ymin) * 0.25)))
                self._draw_corner_brackets(annotated, pt1, pt2, color, bracket_len, thickness=3)

                # Pill label text
                consensus_badge = "★ DUAL" if item["dual_confirmed"] else ""
                label_text = f"{severity} {int(conf * 100)}% (~{int(sev_info['estimated_diameter_cm'])}cm)"
                if consensus_badge:
                    label_text = f"{consensus_badge} | {label_text}"

                font = cv2.FONT_HERSHEY_SIMPLEX
                font_scale = max(0.42, min(0.68, img_w / 1400.0))
                font_thickness = 1
                (tw, th), baseline = cv2.getTextSize(label_text, font, font_scale, font_thickness)

                # Pill background
                label_y1 = max(0, int(ymin) - th - 10)
                label_y2 = int(ymin)
                cv2.rectangle(annotated, (int(xmin), label_y1), (int(xmin) + tw + 12, label_y2), (15, 23, 42), -1)
                cv2.rectangle(annotated, (int(xmin), label_y1), (int(xmin) + tw + 12, label_y2), color, 1)

                # Label text
                cv2.putText(
                    annotated,
                    label_text,
                    (int(xmin) + 6, label_y2 - 4),
                    font,
                    font_scale,
                    (255, 255, 255),
                    font_thickness,
                    cv2.LINE_AA
                )

        if annotate and len(fused) > 0:
            # Blend semi-transparent cavity overlay with 18% opacity
            cv2.addWeighted(overlay, 0.18, annotated, 0.82, 0, annotated)

        overall_sev = calculate_overall_severity(severities)
        avg_conf = round(sum(conf_list) / len(conf_list), 4) if conf_list else 0.0

        if annotate:
            self._draw_hud_banner(annotated, len(pothole_details), overall_sev, avg_conf)

        return annotated, pothole_details, overall_sev, avg_conf

    def detect_image(
        self,
        image_path: str,
        output_dir: str,
        conf_threshold: float = 0.25,
        target_filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process an image file through the dual-engine neural ensemble,
        draw HUD annotations, and save the resulting image.
        """
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not load image from {image_path}")

        annotated_img, details, overall_severity, avg_conf = self.detect_frame(
            img,
            conf_threshold=conf_threshold,
            annotate=True
        )

        low_count = sum(1 for d in details if d["severity"] == "LOW")
        med_count = sum(1 for d in details if d["severity"] == "MEDIUM")
        high_count = sum(1 for d in details if d["severity"] == "HIGH")

        os.makedirs(output_dir, exist_ok=True)
        if not target_filename:
            target_filename = f"annotated_{Path(image_path).name}"
        output_file_path = os.path.join(output_dir, target_filename)
        cv2.imwrite(output_file_path, annotated_img)

        return {
            "total_potholes": len(details),
            "low_severity": low_count,
            "medium_severity": med_count,
            "high_severity": high_count,
            "overall_severity": overall_severity,
            "confidence_score": avg_conf,
            "processed_image_filename": target_filename,
            "processed_image_path": output_file_path,
            "details": details
        }

    def _draw_corner_brackets(
        self,
        img: np.ndarray,
        pt1: Tuple[int, int],
        pt2: Tuple[int, int],
        color: Tuple[int, int, int],
        length: int,
        thickness: int = 2
    ):
        """Draws aesthetic cyber-HUD corner tick marks around bounding box"""
        x1, y1 = pt1
        x2, y2 = pt2

        # Top-Left
        cv2.line(img, (x1, y1), (x1 + length, y1), color, thickness)
        cv2.line(img, (x1, y1), (x1, y1 + length), color, thickness)

        # Top-Right
        cv2.line(img, (x2, y1), (x2 - length, y1), color, thickness)
        cv2.line(img, (x2, y1), (x2, y1 + length), color, thickness)

        # Bottom-Left
        cv2.line(img, (x1, y2), (x1 + length, y2), color, thickness)
        cv2.line(img, (x1, y2), (x1, y2 - length), color, thickness)

        # Bottom-Right
        cv2.line(img, (x2, y2), (x2 - length, y2), color, thickness)
        cv2.line(img, (x2, y2), (x2, y2 - length), color, thickness)

    def _draw_hud_banner(self, img: np.ndarray, total: int, overall_sev: str, avg_conf: float):
        """Draws sleek top HUD telemetry bar with dual-engine status"""
        h, w = img.shape[:2]
        banner_h = max(40, int(h * 0.065))

        overlay = img.copy()
        cv2.rectangle(overlay, (0, 0), (w, banner_h), (11, 19, 43), -1)
        cv2.addWeighted(overlay, 0.88, img, 0.12, 0, img)

        color = SEVERITY_BGR_COLORS.get(overall_sev, (200, 200, 200))
        cv2.rectangle(img, (0, banner_h - 2), (w, banner_h), color, 2)

        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = max(0.42, min(0.68, w / 1400.0))
        engine_status = "DUAL NEURAL FUSION" if self.is_ensemble_active else "SINGLE YOLOv8"
        text = f"RoadGuard AI [{engine_status}] // Potholes: {total} // Risk: {overall_sev}"
        if total > 0:
            text += f" // Avg Conf: {int(avg_conf * 100)}%"

        cv2.putText(img, text, (15, int(banner_h * 0.65)), font, font_scale, (255, 255, 255), 1, cv2.LINE_AA)

detector_service = PotholeDetectorService()
