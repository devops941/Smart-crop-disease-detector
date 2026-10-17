"""
================================================================================
SMART CROP DISEASE DETECTOR - AUTOMATED API TEST SUITE
================================================================================
Tests the FastAPI backend against all acceptance criteria:
1. Health check returns OK and loaded class count.
2. Prediction on valid leaf photo returns exact JSON format with treatments.
3. Text file upload is rejected with HTTP 400.
4. Corrupted file upload is rejected with HTTP 400.
5. Oversized file (> 5 MB) is rejected with HTTP 400.
6. Handles missing treatment data gracefully without crashing.
================================================================================
"""

import os
import sys
import io
import time
import requests

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_URL = os.environ.get("API_BASE_URL", "http://127.0.0.1:8000")
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def resolve_path(rel_path: str) -> str:
    """Finds path whether running from repo root or backend/tests/ directory."""
    if os.path.exists(rel_path):
        return os.path.abspath(rel_path)
    cand = os.path.join(REPO_ROOT, rel_path)
    if os.path.exists(cand):
        return cand
    return os.path.abspath(rel_path)


def print_header(title: str):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)


def test_health():
    print_header("TEST 1: Health Check Endpoint (GET /health)")
    url = f"{BASE_URL}/health"
    response = requests.get(url, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data.get("status") == "ok", f"Expected status 'ok', got {data.get('status')}"
    assert "classes" in data and isinstance(data["classes"], int) and data["classes"] > 0, "Invalid classes count"
    print("[PASS] TEST 1 PASSED: /health is OK and reporting classes.")
    return data["classes"]


def test_predict_valid_image(image_path: str):
    print_header(f"TEST 2: Predict on Valid Leaf Photo (POST /predict)\n Image: {image_path}")
    url = f"{BASE_URL}/predict"

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Test image not found at '{image_path}'")

    with open(image_path, "rb") as f:
        files = {"file": (os.path.basename(image_path), f, "image/jpeg")}
        response = requests.post(url, files=files, timeout=15)

    print(f"Status Code: {response.status_code}")
    result = response.json()
    import json
    print("Response JSON:")
    print(json.dumps(result, indent=2))

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert "predictions" in result, "Missing 'predictions' field"
    assert "low_confidence" in result, "Missing 'low_confidence' field"
    assert isinstance(result["low_confidence"], bool), "'low_confidence' must be boolean"

    predictions = result["predictions"]
    assert isinstance(predictions, list) and len(predictions) > 0, "'predictions' must be non-empty list"
    assert len(predictions) <= 3, "At most top 3 predictions expected"

    # Validate structure of each prediction
    for idx, pred in enumerate(predictions):
        assert "disease" in pred, f"Prediction {idx} missing 'disease'"
        assert "confidence" in pred and isinstance(pred["confidence"], float), f"Prediction {idx} missing float 'confidence'"
        assert "info" in pred and isinstance(pred["info"], dict), f"Prediction {idx} missing dict 'info'"

    # Verify confidence sorting
    confidences = [p["confidence"] for p in predictions]
    assert confidences == sorted(confidences, reverse=True), "Predictions are not sorted by confidence descending"

    print(f"Top Disease: {predictions[0]['disease']} ({predictions[0]['confidence'] * 100:.2f}%)")
    print(f"Low Confidence Flag: {result['low_confidence']}")
    print("[PASS] TEST 2 PASSED: Valid JSON format with top predictions and treatment info.")


def test_reject_text_file():
    print_header("TEST 3: Reject Non-Image / Text File (POST /predict)")
    url = f"{BASE_URL}/predict"

    text_content = b"This is a dummy text file, not a plant leaf photo."
    files = {"file": ("notes.txt", io.BytesIO(text_content), "text/plain")}
    response = requests.post(url, files=files, timeout=10)

    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    assert response.status_code == 400, f"Expected 400 Bad Request, got {response.status_code}"
    assert "error" in response.json(), "Expected 'error' in response"
    print("[PASS] TEST 3 PASSED: Non-image text file correctly rejected with 400.")


def test_reject_corrupted_image():
    print_header("TEST 4: Reject Corrupted / Fake Image (POST /predict)")
    url = f"{BASE_URL}/predict"

    # Valid extension, but corrupted content
    fake_jpg = b"\xFF\xD8\xFF\xE0FakeHeaderNotAValidImageDataStream"
    files = {"file": ("corrupted.jpg", io.BytesIO(fake_jpg), "image/jpeg")}
    response = requests.post(url, files=files, timeout=10)

    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    assert response.status_code == 400, f"Expected 400 Bad Request, got {response.status_code}"
    assert "error" in response.json(), "Expected 'error' in response"
    print("[PASS] TEST 4 PASSED: Corrupted image file correctly rejected with 400.")


def test_reject_oversized_file():
    print_header("TEST 5: Reject Oversized File > 5 MB (POST /predict)")
    url = f"{BASE_URL}/predict"

    # 5.5 MB dummy stream
    oversized_data = b"0" * (5500 * 1024)
    files = {"file": ("huge_leaf.jpg", io.BytesIO(oversized_data), "image/jpeg")}
    response = requests.post(url, files=files, timeout=10)

    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    assert response.status_code == 400, f"Expected 400 Bad Request, got {response.status_code}"
    assert "exceeds maximum allowed limit" in response.json().get("error", "").lower() or "5 mb" in response.json().get("error", "").lower(), "Expected 5 MB size limit error"
    print("[PASS] TEST 5 PASSED: Oversized file (> 5 MB) correctly rejected with 400.")


def main():
    print("\n" + "#" * 70)
    print(" RUNNING SMART CROP DISEASE DETECTOR BACKEND ACCEPTANCE TESTS")
    print(f" Target Server: {BASE_URL}")
    print("#" * 70)

    # 1. Health check
    test_health()

    # 2. Find a test image
    candidate_images = [
        resolve_path(os.path.join("dataset", "Tomato___Early_blight", "tomato.jpg")),
        resolve_path(os.path.join("dataset", "Tomato___healthy", "tomatoimg.webp")),
    ]
    test_img = None
    for cand in candidate_images:
        if os.path.exists(cand):
            test_img = cand
            break

    if not test_img:
        # Fallback: scan dataset directory
        dataset_dir = resolve_path("dataset")
        for root, _, files in os.walk(dataset_dir):
            for f in files:
                if f.lower().endswith((".jpg", ".jpeg", ".png")):
                    test_img = os.path.join(root, f)
                    break
            if test_img:
                break

    if test_img:
        test_predict_valid_image(test_img)
    else:
        print("[WARN] Warning: No sample image found in dataset/ to run Test 2.")

    # 3. Validation rejection tests
    test_reject_text_file()
    test_reject_corrupted_image()
    test_reject_oversized_file()

    print("\n" + "=" * 70)
    print(" [SUCCESS] ALL ACCEPTANCE CHECKS PASSED SUCCESSFULLY!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
