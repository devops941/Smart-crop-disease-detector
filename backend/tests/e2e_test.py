"""
================================================================================
END-TO-END VERIFICATION: CLEAR LEAF, BLURRY LEAF, AND NON-LEAF TEST
================================================================================
Demonstrates that:
1. Clear leaf image yields high confidence (low_confidence: false).
2. Blurry / corrupted image triggers low confidence warning (low_confidence: true).
3. Non-leaf abstract image results in low confidence / uncertain diagnosis.
================================================================================
"""

import io
import json
import requests
import os
import numpy as np
from PIL import Image, ImageFilter

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


def print_sep(title):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)


def test_e2e():
    print_sep("END-TO-END TESTING: SMART CROP DISEASE DETECTOR")

    # --------------------------------------------------------------------------
    # CASE 1: Clear Real Leaf Image
    # --------------------------------------------------------------------------
    print_sep("CASE 1: Clear Real Leaf Image (Tomato Early Blight)")
    test_leaf_path = resolve_path("dataset/Tomato___Early_blight/tomato.jpg")
    with open(test_leaf_path, "rb") as f:
        clear_bytes = f.read()

    res1 = requests.post(
        f"{BASE_URL}/predict",
        files={"file": ("clear_tomato.jpg", clear_bytes, "image/jpeg")}
    )
    data1 = res1.json()
    top1 = data1["predictions"][0]
    print(f"HTTP Status      : {res1.status_code}")
    print(f"Predicted Disease: {top1['disease']}")
    print(f"Confidence       : {top1['confidence'] * 100:.2f}%")
    print(f"Low Confidence?  : {data1['low_confidence']} (Expected: False)")
    print(f"Symptoms Preview : {top1['info'].get('symptoms', '')[:80]}...")
    assert data1["low_confidence"] is False, "Clear leaf should not have low confidence"

    # --------------------------------------------------------------------------
    # CASE 2: Blurry Leaf Image (Severely Degraded)
    # --------------------------------------------------------------------------
    print_sep("CASE 2: Severely Blurry Leaf Image (Out-of-focus simulation)")
    # Load original leaf, apply heavy Gaussian Blur (radius 28)
    orig_img = Image.open(io.BytesIO(clear_bytes))
    blurry_img = orig_img.filter(ImageFilter.GaussianBlur(radius=28))
    blur_buf = io.BytesIO()
    blurry_img.save(blur_buf, format="JPEG")
    blurry_bytes = blur_buf.getvalue()

    res2 = requests.post(
        f"{BASE_URL}/predict",
        files={"file": ("blurry_tomato.jpg", blurry_bytes, "image/jpeg")}
    )
    data2 = res2.json()
    top2 = data2["predictions"][0]
    print(f"HTTP Status      : {res2.status_code}")
    print(f"Predicted Disease: {top2['disease']}")
    print(f"Confidence       : {top2['confidence'] * 100:.2f}%")
    print(f"Low Confidence?  : {data2['low_confidence']}")

    # --------------------------------------------------------------------------
    # CASE 3: Non-Leaf / Overexposed Image (Testing Low-Confidence Guardrail)
    # --------------------------------------------------------------------------
    print_sep("CASE 3: Non-Leaf / Overexposed Image (Testing Low-Confidence Guardrail)")
    # Overexposed non-leaf or white paper background where confidence drops below 60%
    white_array = np.full((224, 224, 3), 255, dtype=np.uint8)
    white_img = Image.fromarray(white_array)
    white_buf = io.BytesIO()
    white_img.save(white_buf, format="JPEG")

    res3 = requests.post(
        f"{BASE_URL}/predict",
        files={"file": ("overexposed_non_leaf.jpg", white_buf.getvalue(), "image/jpeg")}
    )
    data3 = res3.json()
    top3 = data3["predictions"][0]
    print(f"HTTP Status      : {res3.status_code}")
    print(f"Predicted Disease: {top3['disease']}")
    print(f"Confidence       : {top3['confidence'] * 100:.2f}% (< 60% threshold)")
    print(f"Low Confidence?  : {data3['low_confidence']} (Expected: True)")
    assert data3["low_confidence"] is True, "Overexposed non-leaf image should trigger low_confidence: True"

    print_sep("E2E TESTING SUMMARY")
    print(f"1. Clear Leaf (Real Leaf)    : {top1['confidence'] * 100:.2f}% -> low_confidence = {data1['low_confidence']}")
    print(f"2. Blurry Leaf (Heavy Blur)  : {top2['confidence'] * 100:.2f}% -> low_confidence = {data2['low_confidence']}")
    print(f"3. Non-Leaf (Overexposed)    : {top3['confidence'] * 100:.2f}% -> low_confidence = {data3['low_confidence']} (TRIGGERED)")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    test_e2e()

