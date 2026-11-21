# RoadGuard AI - System Architecture & Technical Specifications

**Project Title:** AI-Based Pothole Detection and Road Monitoring System  
**Lab Track:** BTech Computer Science Next Generation Laboratory  
**Target Hardware:** Apple Silicon M2 (8GB Unified RAM, CPU/MPS Optimized)  

---

## 1. High-Level Architecture Overview

```mermaid
flowchart TD
    subgraph Client ["Client Layer (React + Vite + Tailwind)"]
        UI["Modern Smart City Dashboard"]
        DetectPage["AI Detection Studio (Image / Video / Webcam)"]
        MapPage["Interactive GIS Map (Leaflet.js + OSM)"]
        HistoryPage["Inspection History & Filter"]
        ReportsPage["PDF Report Center"]
    end

    subgraph Server ["Backend API Layer (FastAPI + Uvicorn)"]
        API["REST API Router (/api/*)"]
        Health["Health & Diagnostics Controller"]
        DetectionCtrl["Detection & Upload Controller"]
        StatsCtrl["Live Aggregations Controller"]
        MapCtrl["GIS Spatial Controller"]
        ReportCtrl["PDF Export Controller"]
    end

    subgraph Engine ["AI & Computer Vision Layer"]
        YOLO["YOLOv8s Pothole Detector (PyTorch)"]
        CV["OpenCV Image & Video Processing Engine"]
        SeverityService["Severity Heuristic Estimator (Low/Med/High)"]
        ReportLab["ReportLab PDF Document Builder"]
    end

    subgraph Storage ["Persistence Layer"]
        DB[(SQLite Persistent Database: roadguard.db)]
        Uploads["Raw Ingestion Store (/uploads)"]
        Processed["Annotated Visual Store (/processed)"]
        Reports["Generated PDF Archive (/reports)"]
    end

    DetectPage -->|Multipart Upload| DetectionCtrl
    UI -->|Telemetry Poll| StatsCtrl
    MapPage -->|Fetch Lat/Lng Pins| MapCtrl
    ReportsPage -->|Request PDF Export| ReportCtrl

    DetectionCtrl -->|Decode Frame| CV
    CV -->|Normalized Tensor| YOLO
    YOLO -->|Bounding Box & Confidence| SeverityService
    SeverityService -->|Annotate Frames| CV
    DetectionCtrl -->|Store Metadata| DB
    CV -->|Save Images & Videos| Processed
    ReportCtrl -->|Query Details & Render| ReportLab
    ReportLab -->|Save Document| Reports
```

---

## 2. Pothole Severity Heuristic Mathematical Formulation

RoadGuard AI applies a geometric bounding-box area heuristic to estimate hazard urgency without claiming certified pavement structural engineering ratings:

### Primary Metrics:
1. **Area Occupancy Ratio ($A_{\text{ratio}}$):**
   $$A_{\text{ratio}} = \frac{W_{\text{box}} \times H_{\text{box}}}{W_{\text{frame}} \times H_{\text{frame}}}$$

2. **Maximum Span Ratio ($D_{\text{max}}$):**
   $$D_{\text{max}} = \max\left(\frac{W_{\text{box}}}{W_{\text{frame}}}, \frac{H_{\text{box}}}{H_{\text{frame}}}\right)$$

### Decision Boundary Matrix:
* **HIGH Severity ($A_{\text{ratio}} \ge 0.060 \lor D_{\text{max}} \ge 0.30$):**
  * *Color:* Crimson Red (`#EF4444`)
  * *Action:* Emergency cold-patch resurfacing within 24–48 hours to avert tire blowouts or cyclist accidents.
* **MEDIUM Severity ($A_{\text{ratio}} \ge 0.015 \lor D_{\text{max}} \ge 0.14$):**
  * *Color:* Amber Orange (`#F59E0B`)
  * *Action:* Scheduled routine asphalt filling during weekly municipal maintenance.
* **LOW Severity (Otherwise):**
  * *Color:* Emerald Green (`#10B981`)
  * *Action:* Logged for observation in quarterly resurfacing audits.

---

## 3. Database Schema (SQLite + SQLAlchemy ORM)

```mermaid
erDiagram
    DETECTION ||--o{ DETECTION_DETAIL : "has many"
    DETECTION {
        int id PK
        string image_filename
        string processed_image_filename
        string media_type "image or video"
        int total_potholes
        int low_severity
        int medium_severity
        int high_severity
        string overall_severity "LOW, MEDIUM, HIGH"
        float latitude
        float longitude
        string location_name
        float confidence_score
        datetime created_at
    }
    DETECTION_DETAIL {
        int id PK
        int detection_id FK
        text bounding_box "JSON string with coordinates"
        float confidence
        string severity "LOW, MEDIUM, HIGH"
        float area_ratio
        float estimated_width_px
        float estimated_height_px
    }
```

---

## 4. Video Detection Streaming Pipeline

1. **Stream Extraction:** Video is read sequentially frame-by-frame using `cv2.VideoCapture` to avoid buffering large files in RAM.
2. **Frame Sampling Stride:** Inference is triggered on every $N$-th frame (default $N=2$) to maintain high throughput on low-memory 8GB Apple Silicon.
3. **Keyframe Capture:** The frame exhibiting the highest pothole concentration is automatically captured, saved as a high-resolution thumbnail, and embedded into the official PDF compliance report.
4. **Encoding:** Processed frames are re-encoded with color-coded bounding boxes and top HUD banners using `mp4v` codec.
