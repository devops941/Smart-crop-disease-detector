# Smart Crop Disease Detector - Manual Test Cases Checklist

This document contains the standard 7 test cases matching the project report.

| Test ID | Test Scenario | Input / Steps | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- | :---: |
| **TC-01** | **Server Health & Class Count** | Send `GET /health` request via browser, cURL, or Postman. | Returns HTTP 200 with `{"status": "ok", "classes": 4}` indicating all model classes loaded. | [ ] |
| **TC-02** | **Clear Leaf Disease Diagnosis** | Upload a clear photo of an infected leaf (e.g. `Tomato___Early_blight/tomato.jpg`) via `POST /predict`. | Returns HTTP 200 with top 3 ranked predictions, confidence $> 90\%$, `low_confidence: false`, and ICAR symptom/treatment advice. | [ ] |
| **TC-03** | **Non-Image File Rejection** | Upload a `.txt` or `.pdf` file in the `file` field via `POST /predict`. | Returns HTTP 400 with error: *"Unsupported file extension. Allowed formats: JPEG, PNG"*. | [ ] |
| **TC-04** | **Corrupted Image File Rejection** | Upload an image file with corrupted/damaged binary header bytes via `POST /predict`. | Returns HTTP 400 with error: *"File could not be opened as a valid image"*. | [ ] |
| **TC-05** | **Oversized Image File Rejection** | Upload an image file larger than 5 MB via `POST /predict`. | Returns HTTP 400 with error: *"File size exceeds maximum allowed limit of 5 MB"*. | [ ] |
| **TC-06** | **Missing Treatment Graceful Fallback** | Request prediction for a class that has no entry in `treatments.json`. | Server does not crash; returns HTTP 200 with an empty info object `{}` for that prediction. | [ ] |
| **TC-07** | **Low-Confidence Uncertainty Warning** | Photograph an ambiguous, overexposed, or non-agricultural object where top confidence is $< 60\%$. | Returns HTTP 200 with `"low_confidence": true`, and the mobile app displays the yellow advisory warning banner. | [ ] |

---

### Verification Instructions

1. **Automated Backend Suite**:
   ```powershell
   pytest backend/tests/test_backend.py -v
   ```
2. **End-to-End Image Scenarios**:
   ```powershell
   python e2e_test.py
   ```
3. **Mobile Screen Verification**:
   Run the Expo app and test Camera capture, Gallery picker, Low-confidence warning, and Scan History persistence.
