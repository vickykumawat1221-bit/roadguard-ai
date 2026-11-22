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

        last_annotated_frame = None

        try:
            while cap.isOpened() and frame_idx < MAX_VIDEO_FRAMES:
                ret, frame = cap.read()
                if not ret:
                    break

                # Run inference on every N-th frame
                if frame_idx % frame_stride == 0:
                    annotated_frame, details, frame_sev, frame_conf = detector_service.detect_frame(
                        frame,
                        conf_threshold=conf_threshold,
                        annotate=True
                    )
                    last_annotated_frame = annotated_frame

                    frame_pothole_count = len(details)
                    if frame_pothole_count > peak_potholes_in_frame:
                        peak_potholes_in_frame = frame_pothole_count

                    total_potholes_encountered += frame_pothole_count

                    for d in details:
                        all_severities.append(d["severity"])
                        conf_values.append(d["confidence"])

                    # Save best keyframe for thumbnail
                    if frame_pothole_count > best_thumb_potholes:
                        best_thumb_potholes = frame_pothole_count
                        best_thumb_frame = annotated_frame.copy()
                        best_pothole_details = details
                else:
                    # Write last annotated frame or current raw frame
                    annotated_frame = last_annotated_frame if last_annotated_frame is not None else frame

                out.write(annotated_frame)
                frame_idx += 1

        finally:
            cap.release()
            out.release()

        # Save thumbnail frame
        if best_thumb_frame is not None:
            cv2.imwrite(output_thumb_path, best_thumb_frame)
        else:
            # Fallback frame
            cap_fallback = cv2.VideoCapture(video_input_path)
            ret_f, first_frame = cap_fallback.read()
            cap_fallback.release()
            if ret_f and first_frame is not None:
                cv2.imwrite(output_thumb_path, first_frame)
            else:
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
            "total_potholes": peak_potholes_in_frame,
            "total_detections_across_video": total_potholes_encountered,
            "low_severity": low_count,
            "medium_severity": med_count,
            "high_severity": high_count,
            "overall_severity": overall_severity,
            "confidence_score": avg_conf,
            "details": best_pothole_details
        }

video_processor = VideoProcessorService()
