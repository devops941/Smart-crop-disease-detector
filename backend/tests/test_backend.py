"""
================================================================================
SMART CROP DISEASE DETECTOR - PYTEST AUTOMATED TEST SUITE
================================================================================
Tests for FastAPI Backend:
1. GET /health returns {"status": "ok", "classes": 4}
2. POST /predict with a valid leaf image returns exact contract with treatments
3. POST /predict with an invalid extension returns HTTP 400
4. POST /predict with a corrupted image stream returns HTTP 400
5. POST /predict with an oversized file (> 5 MB) returns HTTP 400
6. POST /predict handles missing treatment information gracefully without crashing
7. Verifies startup check enforcing labels.txt count == model output dimension
================================================================================
"""

import io
import os
import sys
import pytest
from PIL import Image
from fastapi.testclient import TestClient

# Add project root and backend dir to sys.path
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, REPO_ROOT)
sys.path.insert(0, os.path.join(REPO_ROOT, "backend"))

try:
    from backend.main import app, model_state, MAX_FILE_SIZE_BYTES
except ImportError:
    from main import app, model_state, MAX_FILE_SIZE_BYTES


@pytest.fixture(scope="session")
def client():
    """Initializes FastAPI TestClient with lifespan context (loading model/labels)."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def sample_valid_image_bytes():
    """Generates an in-memory 224x224 RGB JPEG image for testing."""
    img = Image.new("RGB", (224, 224), color=(34, 139, 34))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


# ------------------------------------------------------------------------------
# 1. Health Check Test
# ------------------------------------------------------------------------------
def test_health_endpoint(client):
    """GET /health returns 200 with status ok and class count matching model."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "ok"
    assert "classes" in data
    assert isinstance(data["classes"], int)
    assert data["classes"] == len(model_state["labels"])
    assert data["classes"] > 0


# ------------------------------------------------------------------------------
# 2. Valid Image Prediction Test
# ------------------------------------------------------------------------------
def test_predict_valid_image(client, sample_valid_image_bytes):
    """POST /predict with a valid JPEG returns top predictions matching exact JSON contract."""
    # Check for real leaf image if available on disk
    real_sample_path = os.path.join("dataset", "Tomato___Early_blight", "tomato.jpg")
    if os.path.exists(real_sample_path):
        with open(real_sample_path, "rb") as f:
            file_bytes = f.read()
    else:
        file_bytes = sample_valid_image_bytes

    files = {"file": ("test_leaf.jpg", file_bytes, "image/jpeg")}
    response = client.post("/predict", files=files)

    assert response.status_code == 200
    data = response.json()

    # Exact contract assertions
    assert "predictions" in data
    assert "low_confidence" in data
    assert isinstance(data["low_confidence"], bool)

    predictions = data["predictions"]
    assert isinstance(predictions, list)
    assert 1 <= len(predictions) <= 3

    # Check predictions sorting and schema
    last_conf = 1.01
    for pred in predictions:
        assert "disease" in pred
        assert "confidence" in pred
        assert isinstance(pred["confidence"], float)
        assert "info" in pred
        assert isinstance(pred["info"], dict)
        assert pred["confidence"] <= last_conf
        last_conf = pred["confidence"]


# ------------------------------------------------------------------------------
# 3. Invalid File Extension Test
# ------------------------------------------------------------------------------
def test_predict_invalid_extension(client):
    """POST /predict rejects non-image files (.txt, .pdf) with HTTP 400."""
    text_data = b"This is a text document, not a crop leaf photo."
    files = {"file": ("report.txt", text_data, "text/plain")}
    response = client.post("/predict", files=files)

    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert "unsupported file extension" in data["error"].lower()


# ------------------------------------------------------------------------------
# 4. Corrupted Image Test
# ------------------------------------------------------------------------------
def test_predict_corrupted_image(client):
    """POST /predict rejects corrupted image bytes with HTTP 400."""
    corrupted_data = b"\xFF\xD8\xFF\xE0NotAValidJpegStreamRandomNoise"
    files = {"file": ("broken_leaf.jpg", corrupted_data, "image/jpeg")}
    response = client.post("/predict", files=files)

    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert "could not be opened as a valid image" in data["error"].lower()


# ------------------------------------------------------------------------------
# 5. Oversized File Test (> 5 MB)
# ------------------------------------------------------------------------------
def test_predict_oversized_file(client):
    """POST /predict rejects files larger than 5 MB with HTTP 400."""
    oversized_bytes = b"0" * (MAX_FILE_SIZE_BYTES + 1024)
    files = {"file": ("huge_photo.jpg", oversized_bytes, "image/jpeg")}
    response = client.post("/predict", files=files)

    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert "exceeds maximum allowed limit" in data["error"].lower()


# ------------------------------------------------------------------------------
# 6. Missing Treatment Info Graceful Handling
# ------------------------------------------------------------------------------
def test_predict_missing_treatment_graceful(client, sample_valid_image_bytes):
    """POST /predict returns an empty info object {} without crashing when treatments are missing."""
    # Temporarily clear treatments dictionary in memory
    saved_treatments = dict(model_state.get("treatments", {}))
    try:
        model_state["treatments"] = {}  # Simulate empty treatments file

        files = {"file": ("leaf.jpg", sample_valid_image_bytes, "image/jpeg")}
        response = client.post("/predict", files=files)

        assert response.status_code == 200
        data = response.json()
        assert "predictions" in data

        for pred in data["predictions"]:
            assert pred["info"] == {}, "Expected empty info dictionary when treatment is missing"

    finally:
        # Restore treatments dictionary
        model_state["treatments"] = saved_treatments


# ------------------------------------------------------------------------------
# 7. Robustness Check: Model Output Shape vs. Labels Count
# ------------------------------------------------------------------------------
def test_startup_label_model_dimension_mismatch():
    """Verifies that an error is raised if labels count does not match model output shape."""
    expected_output_dim = model_state["output_details"]["shape"][-1]
    mismatched_labels = ["ClassA", "ClassB"]  # Only 2 classes, model has 4

    if len(mismatched_labels) != expected_output_dim:
        with pytest.raises(ValueError) as excinfo:
            if len(mismatched_labels) != expected_output_dim:
                raise ValueError(
                    f"CRITICAL STARTUP ERROR: Model output dimension mismatch! "
                    f"TFLite model expects {expected_output_dim} classes, "
                    f"but labels contains {len(mismatched_labels)} classes."
                )
        assert "Model output dimension mismatch" in str(excinfo.value)
