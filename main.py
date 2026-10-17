"""
================================================================================
SMART CROP DISEASE DETECTOR - ROOT ENTRYPOINT
================================================================================
Convenience entry point forwarding to the core application in backend/main.py.

Supported execution modes:
  1. python main.py
  2. uvicorn main:app --host 0.0.0.0 --port 8000 --reload
  3. uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
================================================================================
"""

import os
import sys

# Ensure repository root and backend/ are in PYTHONPATH
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")

if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Forward core application symbols from backend
from backend.main import (
    app,
    model_state,
    CONFIDENCE_THRESHOLD,
    MAX_FILE_SIZE_BYTES,
    ALLOWED_EXTENSIONS,
    ALLOWED_CONTENT_TYPES,
)

__all__ = [
    "app",
    "model_state",
    "CONFIDENCE_THRESHOLD",
    "MAX_FILE_SIZE_BYTES",
    "ALLOWED_EXTENSIONS",
    "ALLOWED_CONTENT_TYPES",
]

if __name__ == "__main__":
    import uvicorn
    print("\nStarting Smart Crop Disease Detector API Server...")
    print("Serving from backend.main:app on http://0.0.0.0:8000")
    print("Docs available at: http://127.0.0.1:8000/docs\n")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
