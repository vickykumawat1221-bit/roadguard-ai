#!/usr/bin/env bash
# ==============================================================================
# RoadGuard AI - Intelligent Road Damage Detection & Monitoring System
# Master Launcher Script for BTech Computer Science Next-Gen Laboratory
# ==============================================================================

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV_DIR="$PROJECT_DIR/venv"
PORT=${BACKEND_PORT:-8005}

echo "=================================================================="
echo "    RoadGuard AI - Next-Gen Pothole Detection & Road Monitoring   "
echo "=================================================================="
echo "Project Directory : $PROJECT_DIR"
echo "Device Target     : Apple Silicon M2 (CPU/MPS Optimized)"
echo "Backend Port      : $PORT"
echo "Frontend Port     : 5173"
echo "=================================================================="

# Configure Ultralytics local cache inside project sandbox
export YOLO_CONFIG_DIR="$PROJECT_DIR/.ultralytics"
mkdir -p "$YOLO_CONFIG_DIR"
export PYTHONPATH="$BACKEND_DIR:$PYTHONPATH"
export VITE_BACKEND_PORT="$PORT"

# Ensure virtual environment and model weights exist
if [ ! -d "$VENV_DIR" ]; then
    echo "Virtual environment not detected. Creating venv..."
    python3 -m venv "$VENV_DIR"
    "$VENV_DIR/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
fi

if [ ! -f "$BACKEND_DIR/weights/pothole_yolov8.pt" ]; then
    echo "Pretrained weights not found. Downloading YOLOv8 pothole weights..."
    mkdir -p "$BACKEND_DIR/weights"
    python3 -c "import urllib.request; urllib.request.urlretrieve('https://huggingface.co/peterhdd/pothole-detection-yolov8/resolve/main/best.pt', '$BACKEND_DIR/weights/pothole_yolov8.pt')"
    echo "Weights successfully downloaded."
fi

# Cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down RoadGuard AI servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "Services stopped cleanly."
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start Backend Server
echo "[1/2] Starting FastAPI Backend on http://127.0.0.1:$PORT ..."
cd "$BACKEND_DIR"
"$VENV_DIR/bin/uvicorn" app.main:app --host 127.0.0.1 --port "$PORT" &
BACKEND_PID=$!

# Wait briefly for backend to warm up
sleep 2

# 2. Start Frontend Server
echo "[2/2] Starting React Vite Frontend on http://localhost:5173 ..."
cd "$FRONTEND_DIR"
npm run dev -- --host &
FRONTEND_PID=$!

echo ""
echo "=================================================================="
echo " RoadGuard AI is LIVE and accessible at:"
echo "   -> Frontend Application : http://localhost:5173"
echo "   -> Interactive API Docs : http://127.0.0.1:$PORT/docs"
echo "   -> Health Telemetry     : http://127.0.0.1:$PORT/api/health"
echo "=================================================================="
echo "Press Ctrl+C to stop all servers."

# Wait indefinitely
wait
