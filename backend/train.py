#!/usr/bin/env python3
"""
RoadGuard AI - YOLOv8 Pothole Detection Model Training Pipeline
Comprehensive training, validation, and evaluation script.

Designed for Apple Silicon / M2 (CPU/MPS) with low memory footprint.
"""

import os
import sys
import argparse
import yaml
from pathlib import Path

# Ensure Ultralytics config is kept inside the project
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
CONFIG_DIR = PROJECT_ROOT / ".ultralytics"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)
os.environ["YOLO_CONFIG_DIR"] = str(CONFIG_DIR)

from ultralytics import YOLO

def create_dataset_yaml(dataset_dir: Path) -> Path:
    """Generate YOLOv8 dataset configuration file."""
    yaml_path = dataset_dir / "pothole_dataset.yaml"
    
    data = {
        "path": str(dataset_dir.resolve()),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test" if (dataset_dir / "images/test").exists() else "images/val",
        "names": {
            0: "pothole"
        }
    }
    
    with open(yaml_path, "w") as f:
        yaml.dump(data, f, default_flow_style=False)
        
    print(f"[Dataset Config] Generated dataset YAML at: {yaml_path}")
    return yaml_path

def train_pothole_model(
    data_yaml: str,
    weights_path: str = "yolov8n.pt",
    epochs: int = 15,
    imgsz: int = 640,
    batch: int = 8,
    output_dir: str = "runs/train",
    device: str = "cpu"
):
    """
    Train YOLOv8 on pothole dataset and save best weights.
    """
    print("=" * 60)
    print("RoadGuard AI - YOLOv8 Pothole Detection Model Training")
    print("=" * 60)
    print(f"Base Weights : {weights_path}")
    print(f"Dataset      : {data_yaml}")
    print(f"Epochs       : {epochs}")
    print(f"Image Size   : {imgsz}")
    print(f"Batch Size   : {batch}")
    print(f"Compute Dev  : {device}")
    print("=" * 60)

    # Initialize model
    model = YOLO(weights_path)

    # Train model
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        project=output_dir,
        name="pothole_detector",
        device=device,
        verbose=True,
        workers=2,
        save=True
    )

    print("\n[Training Complete] Evaluating best model checkpoint...")
    metrics = model.val()
    
    print("\n" + "=" * 60)
    print("VALIDATION & EVALUATION METRICS")
    print("=" * 60)
    print(f"Precision (P)       : {metrics.box.mp:.4f}")
    print(f"Recall (R)          : {metrics.box.mr:.4f}")
    print(f"mAP @ 0.50          : {metrics.box.map50:.4f}")
    print(f"mAP @ 0.50:0.95     : {metrics.box.map:.4f}")
    print("=" * 60)

    # Save target best.pt to weights directory
    target_weights_dir = BASE_DIR / "weights"
    target_weights_dir.mkdir(parents=True, exist_ok=True)
    best_pt = Path(model.trainer.save_dir) / "weights" / "best.pt"
    
    if best_pt.exists():
        import shutil
        dest = target_weights_dir / "pothole_yolov8.pt"
        shutil.copy(best_pt, dest)
        print(f"[Model Saved] Copied best weights to: {dest}")
    else:
        print("[Warning] Could not locate best.pt in trainer save directory.")

    return metrics

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train YOLOv8 for Pothole Detection")
    parser.add_argument("--data", type=str, default=str(PROJECT_ROOT / "dataset" / "pothole_dataset.yaml"), help="Path to dataset YAML")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=8, help="Batch size (8 recommended for 8GB RAM)")
    parser.add_argument("--imgsz", type=int, default=640, help="Input image dimension")
    parser.add_argument("--device", type=str, default="cpu", help="Device ('cpu' or 'mps' on Apple Silicon)")
    parser.add_argument("--weights", type=str, default="yolov8n.pt", help="Pretrained base model weights")

    args = parser.parse_args()
    
    dataset_path = Path(args.data)
    if not dataset_path.exists():
        print(f"Dataset YAML not found at {dataset_path}.")
        print("Creating boilerplate YAML configuration...")
        dataset_path = create_dataset_yaml(PROJECT_ROOT / "dataset")

    train_pothole_model(
        data_yaml=str(dataset_path),
        weights_path=args.weights,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device
    )
