import os
import cv2
import time
from pathlib import Path
from typing import Dict, Any, List
from .severity import classify_pothole_severity, calculate_overall_severity
from .detector import detector_service, SEVERITY_BGR_COLORS

MAX_VIDEO_FRAMES = 1200 # ~40 seconds at 30fps to safeguard 8GB M2 RAM
MAX_FILE_SIZE_MB = 100

class VideoProcessorService:
    def process_video(
        self,
        video_input_path: str,
        output_dir: str,
        conf_threshold: float = 0.25,
        frame_stride: int = 2 # Process every 2nd frame for speed & efficiency
    ) -> Dict[str, Any]:
        """
        Process road video stream frame-by-frame, run pothole detection,
        write annotated output video, and extract key thumbnail frame.
        """
        cap = cv2.VideoCapture(video_input_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_input_path}")

        orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
        total_input_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # Output video naming
        base_name = Path(video_input_path).stem
        output_video_filename = f"annotated_{base_name}.mp4"
        output_thumb_filename = f"thumb_{base_name}.jpg"
        output_video_path = os.path.join(output_dir, output_video_filename)
        output_thumb_path = os.path.join(output_dir, output_thumb_filename)
        os.makedirs(output_dir, exist_ok=True)

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(output_video_path, fourcc, fps, (orig_w, orig_h))

        frame_idx = 0
        total_potholes_encountered = 0
        peak_potholes_in_frame = 0
        all_severities: List[str] = []
        conf_values: List[float] = []

        best_thumb_frame = None
        best_thumb_potholes = -1
        best_pothole_details: List[Dict[str, Any]] = []

        last_detections = [] # Cache detections for skipped frames

        try:
            while cap.isOpened() and frame_idx < MAX_VIDEO_FRAMES:
                ret, frame = cap.read()
                if not ret:
                    break

                # Run inference on every N-th frame
                if frame_idx % frame_stride == 0:
                    results = detector_service._model(frame, conf=conf_threshold, verbose=False)
                    boxes = results[0].boxes
                    last_detections = []

                    for box in boxes:
                        xyxy = box.xyxy[0].cpu().numpy().tolist()
                        conf = float(box.conf[0].cpu().numpy())
                        sev_info = classify_pothole_severity(
                            bbox=(xyxy[0], xyxy[1], xyxy[2], xyxy[3]),
                            img_width=orig_w,
                            img_height=orig_h
                        )
                        last_detections.append({
                            "bbox": xyxy,
                            "conf": conf,
                            "severity": sev_info["severity"],
                            "width_px": sev_info["width_px"],
                            "height_px": sev_info["height_px"],
                            "area_ratio": sev_info["area_ratio"]
                        })
                        all_severities.append(sev_info["severity"])
                        conf_values.append(conf)

                    frame_pothole_count = len(last_detections)
                    if frame_pothole_count > peak_potholes_in_frame:
                        peak_potholes_in_frame = frame_pothole_count

                    total_potholes_encountered += frame_pothole_count

                # Annotate current frame using current or cached detections
                annotated_frame = frame.copy()
                frame_severities = [d["severity"] for d in last_detections]
                current_frame_sev = calculate_overall_severity(frame_severities)

                for d in last_detections:
                    xmin, ymin, xmax, ymax = d["bbox"]
                    sev = d["severity"]
                    color = SEVERITY_BGR_COLORS.get(sev, (0, 255, 255))
                    cv2.rectangle(annotated_frame, (int(xmin), int(ymin)), (int(xmax), int(ymax)), color, 2)
                    
                    label = f"Pothole: {sev} ({int(d['conf'] * 100)}%)"
                    cv2.putText(
                        annotated_frame,
                        label,
                        (int(xmin), max(20, int(ymin) - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        color,
                        2,
                        cv2.LINE_AA
                    )

                # Add HUD banner
                detector_service._draw_hud_banner(
                    annotated_frame,
                    len(last_detections),
                    current_frame_sev,
                    d["conf"] if last_detections else 0.0
                )

                # Save best keyframe for thumbnail
                if len(last_detections) > best_thumb_potholes:
                    best_thumb_potholes = len(last_detections)
                    best_thumb_frame = annotated_frame.copy()
                    best_pothole_details = [
                        {
                            "bounding_box": {
                                "xmin": round(d["bbox"][0], 1),
                                "ymin": round(d["bbox"][1], 1),
                                "xmax": round(d["bbox"][2], 1),
                                "ymax": round(d["bbox"][3], 1),
                                "width": d["width_px"],
                                "height": d["height_px"]
                            },
                            "confidence": round(d["conf"], 4),
                            "severity": d["severity"],
                            "area_ratio": d["area_ratio"],
                            "estimated_width_px": d["width_px"],
                            "estimated_height_px": d["height_px"]
                        }
                        for d in last_detections
                    ]

                out.write(annotated_frame)
                frame_idx += 1

        finally:
            cap.release()
            out.release()

        # Save thumbnail frame
        if best_thumb_frame is not None:
            cv2.imwrite(output_thumb_path, best_thumb_frame)
        else:
            # fallback to black placeholder
            dummy = 255 * (cv2.imread(video_input_path) is not None)
            cv2.imwrite(output_thumb_path, dummy)

        overall_severity = calculate_overall_severity(all_severities)
        avg_conf = round(sum(conf_values) / len(conf_values), 4) if conf_values else 0.0

        low_count = all_severities.count("LOW")
        med_count = all_severities.count("MEDIUM")
        high_count = all_severities.count("HIGH")

        return {
            "processed_video_filename": output_video_filename,
            "processed_video_path": output_video_path,
            "processed_image_filename": output_thumb_filename,
            "total_frames_processed": frame_idx,
            "peak_potholes_in_frame": peak_potholes_in_frame,
            "total_potholes": peak_potholes_in_frame, # Use peak unique potholes in single view
            "total_detections_across_video": total_potholes_encountered,
            "low_severity": low_count,
            "medium_severity": med_count,
            "high_severity": high_count,
            "overall_severity": overall_severity,
            "confidence_score": avg_conf,
            "details": best_pothole_details
        }

video_processor = VideoProcessorService()
