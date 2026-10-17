"""
================================================================================
SMART CROP DISEASE DETECTOR - FASTAPI INFERENCE BACKEND
================================================================================
Stage 2 & 4: Production-ready backend for mobile and web apps.

Key Features:
- TFLite Model, Labels, and Treatments loaded ONCE at startup (Lifespan pattern).
- Strict startup contract verification: validates labels.txt count == model output size.
- Input validation: max 5 MB file size, strict JPEG/PNG checks, corruption protection.
- Model Contract: [1, 224, 224, 3] float32 with raw [0, 255] RGB values.
- Response includes top 3 disease predictions with ICAR/TNAU guideline info.
- CORS enabled, structured request logging, and clear error responses.
================================================================================
"""

import io
import os
import time
import json
import logging
from contextlib import asynccontextmanager
from typing import List, Dict, Any

import numpy as np
from PIL import Image, UnidentifiedImageError
from fastapi import FastAPI, UploadFile, File, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ------------------------------------------------------------------------------
# 1. LOGGING & CONSTANTS CONFIGURATION
# ------------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("CropDiseaseAPI")

# Threshold below which a prediction is flagged as uncertain
CONFIDENCE_THRESHOLD: float = 0.60

# File validation constraints
MAX_FILE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 Megabytes
ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png"}
ALLOWED_CONTENT_TYPES: set = {
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/x-png",
    "application/octet-stream",
}

# ------------------------------------------------------------------------------
# 2. PATH RESOLUTION HELPER
# ------------------------------------------------------------------------------
def resolve_file_path(relative_path: str) -> str:
    """
    Resolves file paths regardless of whether the server is started from:
    1. Project root ('d:/Smart Crop Disease Detector')
    2. 'backend/' subdirectory
    """
    # 1. Check direct relative path from current working directory
    if os.path.exists(relative_path):
        return os.path.abspath(relative_path)

    # 2. Check relative to this file's directory
    file_dir = os.path.dirname(os.path.abspath(__file__))
    candidate1 = os.path.join(file_dir, relative_path)
    if os.path.exists(candidate1):
        return candidate1

    # 3. Check relative to parent directory (if file is inside backend/)
    parent_dir = os.path.dirname(file_dir)
    candidate2 = os.path.join(parent_dir, relative_path)
    if os.path.exists(candidate2):
        return candidate2

    return os.path.abspath(relative_path)


# ------------------------------------------------------------------------------
# 3. TFLITE INTERPRETER LOADER (FLEXIBLE FALLBACK)
# ------------------------------------------------------------------------------
def get_tflite_interpreter(model_path: str):
    """
    Attempts to import the lightest available TFLite runtime:
    1. ai_edge_litert (modern official Google LiteRT)
    2. tflite_runtime (lightweight runtime)
    3. tensorflow.lite (full TensorFlow fallback)
    """
    try:
        from ai_edge_litert.interpreter import Interpreter
        logger.info("Using 'ai_edge_litert' interpreter (Google LiteRT).")
        return Interpreter(model_path=model_path)
    except ImportError:
        pass

    try:
        from tflite_runtime.interpreter import Interpreter
        logger.info("Using 'tflite_runtime' interpreter.")
        return Interpreter(model_path=model_path)
    except ImportError:
        pass

    try:
        import warnings
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", category=UserWarning)
            import tensorflow as tf
        logger.info("Using 'tensorflow.lite' interpreter.")
        return tf.lite.Interpreter(model_path=model_path)
    except ImportError as exc:
        logger.error("No compatible TFLite runtime found on this system.")
        raise RuntimeError(
            "No compatible TFLite runtime found. Please install the lightweight official runtime: "
            "'pip install ai-edge-litert' or 'pip install tensorflow'."
        ) from exc


# ------------------------------------------------------------------------------
# 4. GLOBAL APP STATE & LIFESPAN MANAGEMENT
# ------------------------------------------------------------------------------
model_state: Dict[str, Any] = {
    "interpreter": None,
    "input_details": None,
    "output_details": None,
    "labels": [],
    "treatments": {},
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs ONCE when the FastAPI server starts up.
    Loads the quantized TFLite model, labels list, and ICAR treatment guides into memory.
    Performs strict startup contract verification between model output shape and labels.txt.
    """
    logger.info("Starting Smart Crop Disease Detector API...")

    model_path = resolve_file_path(os.path.join("output", "crop_disease.tflite"))
    labels_path = resolve_file_path(os.path.join("output", "labels.txt"))
    treatments_path = resolve_file_path("treatments.json")

    # 1. Validate and Load Model
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"TFLite model not found at '{model_path}'. "
            "Please run 'python ml/train_and_export_tflite.py' to generate the model first."
        )

    interpreter = get_tflite_interpreter(model_path)
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()[0]
    output_details = interpreter.get_output_details()[0]

    model_state["interpreter"] = interpreter
    model_state["input_details"] = input_details
    model_state["output_details"] = output_details
    logger.info(
        f"TFLite model loaded successfully from {model_path}: "
        f"input shape={input_details['shape']}, dtype={input_details['dtype'].__name__}"
    )

    # 2. Validate and Load Labels
    if not os.path.exists(labels_path):
        raise FileNotFoundError(f"Labels file not found at '{labels_path}'.")

    with open(labels_path, "r", encoding="utf-8") as f:
        labels = [line.strip() for line in f if line.strip()]

    if not labels:
        raise ValueError(f"Labels file '{labels_path}' is empty.")

    # --------------------------------------------------------------------------
    # TASK 4 ROBUSTNESS CHECK: Model Output Dimension vs. Labels Count
    # --------------------------------------------------------------------------
    model_output_classes = int(output_details["shape"][-1])
    if len(labels) != model_output_classes:
        error_msg = (
            f"CRITICAL STARTUP ERROR: Model output dimension mismatch! "
            f"TFLite model expects {model_output_classes} classes, "
            f"but '{labels_path}' contains {len(labels)} classes: {labels}. "
            f"Please synchronize labels.txt or re-run the training pipeline."
        )
        logger.error(error_msg)
        raise ValueError(error_msg)

    model_state["labels"] = labels
    logger.info(
        f"Verified model contract: {len(labels)} labels match model output dimension ({model_output_classes}). "
        f"Classes: {labels}"
    )

    # 3. Load Treatments Reference (Non-fatal if missing)
    if os.path.exists(treatments_path):
        try:
            with open(treatments_path, "r", encoding="utf-8") as f:
                model_state["treatments"] = json.load(f)
            logger.info(f"Loaded treatments for {len(model_state['treatments'])} classes from {treatments_path}.")
        except Exception as e:
            logger.warning(f"Could not parse '{treatments_path}': {e}. Continuing with empty info.")
            model_state["treatments"] = {}
    else:
        logger.warning(f"'{treatments_path}' not found. Prediction info will be empty.")
        model_state["treatments"] = {}

    yield  # Application is running and serving requests

    logger.info("Shutting down Smart Crop Disease Detector API.")


# ------------------------------------------------------------------------------
# 5. FASTAPI APPLICATION SETUP
# ------------------------------------------------------------------------------
app = FastAPI(
    title="Smart Crop Disease Detector API",
    description="Mobile & Web API for real-time plant disease detection using quantized MobileNetV2.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable Cross-Origin Resource Sharing (CORS) for mobile apps & web browsers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# 6. REQUEST LOGGING MIDDLEWARE
# ------------------------------------------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Logs client IP, HTTP method, route, and processing latency in milliseconds."""
    start_time = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        f"{request.client.host if request.client else 'unknown'} "
        f"{request.method} {request.url.path} "
        f"-> Status {response.status_code} ({duration_ms:.1f}ms)"
    )
    return response


# ------------------------------------------------------------------------------
# 7. ENDPOINTS
# ------------------------------------------------------------------------------
@app.get(
    "/health",
    summary="Health Check",
    response_description="Server status and number of loaded crop disease classes",
)
async def health_check():
    """
    Returns the server health status and loaded model class count.
    Used by mobile clients, uptime monitors, and load balancers.
    """
    classes_count = len(model_state["labels"])
    return {
        "status": "ok",
        "classes": classes_count,
    }


@app.post(
    "/predict",
    summary="Detect Crop Disease from Leaf Image",
    response_description="Top 3 disease predictions with confidence scores and ICAR treatment info",
)
async def predict_crop_disease(file: UploadFile = File(...)):
    """
    Accepts a single leaf photo, validates it, runs TFLite inference,
    and returns top-3 predictions with treatment and prevention guidance.
    """
    # --------------------------------------------------------------------------
    # Step 1: Validate File Presence & Name
    # --------------------------------------------------------------------------
    if not file or not file.filename:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "No file uploaded. Please provide an image file in the 'file' field."},
        )

    # Validate file extension
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": f"Unsupported file extension '{file_ext}'. Allowed formats: JPEG, PNG (.jpg, .jpeg, .png)."
            },
        )

    # Validate Content-Type header if provided
    if file.content_type and file.content_type.lower() not in ALLOWED_CONTENT_TYPES:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": f"Invalid content type '{file.content_type}'. Must be 'image/jpeg' or 'image/png'."
            },
        )

    # --------------------------------------------------------------------------
    # Step 2: Validate File Size (Maximum 5 MB)
    # --------------------------------------------------------------------------
    try:
        contents = await file.read()
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": f"Failed to read uploaded file: {str(e)}"},
        )

    if len(contents) == 0:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "Uploaded file is empty (0 bytes)."},
        )

    if len(contents) > MAX_FILE_SIZE_BYTES:
        size_mb = len(contents) / (1024 * 1024)
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": f"File size ({size_mb:.2f} MB) exceeds maximum allowed limit of 5 MB."
            },
        )

    # --------------------------------------------------------------------------
    # Step 3: Verify and Decode Image using PIL
    # --------------------------------------------------------------------------
    try:
        # Open image from in-memory bytes
        image_stream = io.BytesIO(contents)
        img = Image.open(image_stream)

        # verify() confirms it is a genuine, uncorrupted image file
        img.verify()

        # Reopen after verify() because verify() exhausts the stream
        image_stream.seek(0)
        img = Image.open(image_stream)

        # Force conversion to RGB (stripping alpha channel if PNG, or grayscale)
        img_rgb = img.convert("RGB")

    except (UnidentifiedImageError, OSError, ValueError) as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": f"File could not be opened as a valid image: {str(e)}"},
        )

    # --------------------------------------------------------------------------
    # Step 4: Preprocess Image (Matching Model Contract)
    # --------------------------------------------------------------------------
    # Model contract: [1, 224, 224, 3], float32, raw pixel values [0, 255]
    # (Normalization [-1, 1] is handled by the internal Rescaling layer)
    img_resized = img_rgb.resize((224, 224), Image.Resampling.BILINEAR)
    img_array = np.array(img_resized, dtype=np.float32)
    input_tensor = np.expand_dims(img_array, axis=0)

    # --------------------------------------------------------------------------
    # Step 5: Execute TFLite Inference
    # --------------------------------------------------------------------------
    interpreter = model_state["interpreter"]
    input_details = model_state["input_details"]
    output_details = model_state["output_details"]
    labels = model_state["labels"]
    treatments = model_state["treatments"]

    if interpreter is None or not labels:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not ready or failed to initialize.",
        )

    try:
        interpreter.set_tensor(input_details["index"], input_tensor)
        interpreter.invoke()
        output_data = interpreter.get_tensor(output_details["index"])[0]
    except Exception as e:
        logger.error(f"Inference execution failed: {e}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": f"Model inference error: {str(e)}"},
        )

    # --------------------------------------------------------------------------
    # Step 6: Construct Predictions with Treatments Info
    # --------------------------------------------------------------------------
    # Sort indices in descending order of confidence
    sorted_indices = np.argsort(output_data)[::-1]
    top_k = min(3, len(labels))

    predictions: List[Dict[str, Any]] = []
    for rank in range(top_k):
        idx = int(sorted_indices[rank])
        disease_name = labels[idx] if idx < len(labels) else f"Unknown_class_{idx}"
        confidence = float(output_data[idx])

        # Retrieve ICAR treatment info; return empty object {} if class is missing
        disease_info = treatments.get(disease_name, {})

        predictions.append({
            "disease": disease_name,
            "confidence": round(confidence, 4),
            "info": disease_info,
        })

    # Flag low confidence if top prediction is below 60%
    top_confidence = predictions[0]["confidence"] if predictions else 0.0
    low_confidence = bool(top_confidence < CONFIDENCE_THRESHOLD)

    return {
        "predictions": predictions,
        "low_confidence": low_confidence,
    }
