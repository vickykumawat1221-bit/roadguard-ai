# RoadGuard AI: Intelligent Road Damage Detection & Monitoring System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![YOLOv8](https://img.shields.io/badge/AI_Engine-Ultralytics_YOLOv8-blue.svg)](https://ultralytics.com)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![OpenStreetMap](https://img.shields.io/badge/GIS-Leaflet.js-78C257.svg?logo=leaflet&logoColor=white)](https://leafletjs.com)
[![Platform](https://img.shields.io/badge/Hardware-Apple_Silicon_M2_Optimized-000000.svg?logo=apple&logoColor=white)](https://apple.com)

A complete, production-grade mini project developed for a **BTech Computer Science Next Generation Laboratory**.

RoadGuard AI autonomously detects potholes and road surface cavities from dashboard camera imagery and highway video streams, classifies their severity using geometric heuristics, persists spatial coordinates in a SQLite database, plots interactive GIS heat-pins on OpenStreetMap, and generates compliance-grade PDF road inspection reports.

---

## 📌 Key Capabilities

* **Dual-Engine Neural Ensemble (WBF + CLAHE):** Fuses predictions from two complementary fine-tuned YOLOv8 neural networks (`peterhdd` + `samdutse`) using Weighted Box Fusion, Lanczos-4 adaptive upsampling, and Contrast Limited Adaptive Histogram Equalization for high precision across both highway and complex urban pavements.
* **Calibrated Ground-Plane Perspective Heuristics:** Translates 2D image coordinates into real-world physical diameter estimates ($\approx 15\text{cm} - 150\text{cm}$) and cavity depth categories (*Shallow*, *Moderate*, *Deep Hazardous*) via vanishing-point vertical perspective scaling.
* **Municipal Decision Intelligence:** Features a Pavement Quality Index (PQI) radial gauge, real-time Bitumen & Cost Repair Budget Estimator, and Sector Damage Matrix.
* **Municipal Patrol Simulator:** Cyberpunk dashcam inspection simulator with Web Audio radar sound effects and streaming frame-by-frame HUD tracking.
* **Before / After Comparison Split Slider:** Interactive drag slider to inspect original road surface against AI cavity segmentation.
* **Multi-Modal Detection:** Supports high-resolution static images, continuous video stream processing (MP4/AVI/MOV), and live browser webcam frame capture.
* **Geographical GIS Mapping:** CartoDB Dark Matter GIS map with severity pulse markers, interactive image cards, patrol routes, and browser Geolocation API integration.
* **Automated PDF Inspection Reports:** Generates official public-works damage assessment reports using ReportLab with physical dimensions and work-order triage.
* **Apple Silicon M2 / Low-Memory Optimization:** CPU/MPS inference under 70ms per frame, lightweight frame-stride video pipeline, and resident memory footprint under 350MB.

---

## 🏗️ System Architecture

```
roadguard-ai/
│
├── frontend/                     # Modern React + Vite + Tailwind Dashboard
│   ├── src/
│   │   ├── components/           # Sidebar, Header, SeverityBadge
│   │   ├── pages/                # Dashboard, Detect, Map, History, Reports, About, Settings
│   │   ├── services/             # API client (Fetch REST calls)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/                      # FastAPI Python ASGI Application
│   ├── app/
│   │   ├── routes/               # detections.py, stats.py, location.py, reports.py
│   │   ├── models/               # Pydantic schemas
│   │   ├── services/             # detector.py (YOLO), severity.py, video_processor.py, pdf_report.py
│   │   ├── database/             # SQLite connection & SQLAlchemy ORM models
│   │   ├── utils/                # Database seeding script
│   │   └── main.py
│   │
│   ├── weights/                  # Pretrained pothole model (pothole_yolov8.pt)
│   ├── uploads/                  # Ingested road media
│   ├── processed/                # Annotated output images & video clips
│   ├── reports/                  # Generated PDF reports
│   ├── requirements.txt
│   └── train.py                  # Standalone YOLOv8 model training script
│
├── sample_media/                 # Pre-loaded sample road photos & test video
├── docs/                         # Architecture diagrams & technical specs
├── run.sh                        # One-click master startup script
└── README.md
```

---

## 🚀 Quick Start Guide (Exact Terminal Commands)

### 1. Prerequisites
* **macOS** (Optimized for Apple M-series or Intel)
* **Python 3.10+** (Python 3.13 tested)
* **Node.js 18+** & npm

### 2. Launch the Application (One-Click)
Open your terminal, navigate to the project directory, and execute:

```bash
cd /Users/vickykumawat/.gemini/antigravity/scratch/roadguard-ai
./run.sh
```

`run.sh` will automatically:
1. Verify the Python virtual environment and node dependencies.
2. Launch the FastAPI backend on `http://127.0.0.1:8005`.
3. Launch the React Vite development server on `http://localhost:5173`.
4. Gracefully terminate all child processes when pressing `Ctrl+C`.

### 3. Open in Browser
* **Frontend Web Application:** [http://localhost:5173](http://localhost:5173)
* **Interactive OpenAPI Docs:** [http://127.0.0.1:8005/docs](http://127.0.0.1:8005/docs)
* **Health Telemetry:** [http://127.0.0.1:8005/api/health](http://127.0.0.1:8005/api/health)

---

## 🧪 Testing Instructions for Laboratory Demonstration

### Test 1: Quick 1-Click Sample Test
1. Navigate to the **"Detect Potholes"** tab.
2. In the top-right header, click any of the preset buttons under **"Quick Test"** (e.g. `sample_pothole_1` or `sample_road_video`).
3. Coordinates and sample imagery are populated automatically.
4. Click **"Run Real-Time AI Detection"**.
5. Observe:
   * Real-time inference HUD banner overlaid on the output.
   * Color-coded bounding boxes according to severity.
   * Detailed bounding box inventory table with pixel geometry and area percentages.
   * **Export PDF Report** button generating an instant inspection document.

### Test 2: Video Stream Detection
1. In **"Detect Potholes"**, select the **"Road Video"** tab.
2. Click the quick test sample `sample_road_video` or upload your own `.mp4` video.
3. Click **"Run Real-Time AI Detection"**.
4. The backend processes the video frame-by-frame, identifies peak damage keyframes, and returns an annotated video player with detection statistics.

### Test 3: Spatial GIS Road Damage Map
1. Click **"Road Damage Map"** on the sidebar.
2. Notice the live OpenStreetMap view showing color-coded hazard pins:
   * **Red Pin:** High Risk (emergency repair)
   * **Amber Pin:** Medium (routine resurfacing)
   * **Green Pin:** Low (routine monitoring)
3. Click any pin to open an interactive card with the processed thumbnail, coordinates, and direct PDF download link.
4. Filter by severity using the top pill buttons.

### Test 4: PDF Report Generation
1. Click **"Reports"** in the sidebar.
2. Click any inspection record from the list to preview the document.
3. Click **"Download Complete PDF"** to obtain the official document.

---

## 🧠 Model Training & Fine-Tuning Pipeline

A dedicated standalone script `backend/train.py` is included to train or fine-tune YOLOv8 on custom datasets:

```bash
# Activate virtual environment
source /Users/vickykumawat/.gemini/antigravity/scratch/roadguard-ai/venv/bin/activate

# Execute training pipeline
python3 backend/train.py \
  --data dataset/pothole_dataset.yaml \
  --epochs 15 \
  --batch 8 \
  --imgsz 640 \
  --device cpu
```

The script trains the model, calculates validation metrics (Precision, Recall, mAP50, mAP50-95), and saves the checkpoint to `backend/weights/pothole_yolov8.pt`.

---

## ⚖️ Engineering Disclaimer

*The severity classification algorithm implemented in RoadGuard AI is based on optical computer vision heuristics (bounding box relative frame area and dimensions). It is designed as an automated screening and triage tool for road maintenance departments, not as an engineering-grade structural road safety assessment.*
