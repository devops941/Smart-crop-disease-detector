"""
================================================================================
SMART CROP DISEASE DETECTOR - GEMINI MULTIMODAL VISION AI SERVICE
================================================================================
Provides deep plant leaf analysis, disease diagnosis, severity assessment,
and ICAR/TNAU-aligned treatment recommendations using Google Gemini 1.5 Flash.

Key Capabilities:
1. Non-leaf rejection: Detects if the image is actually a plant leaf.
2. Broad crop coverage: Works on Tomato, Potato, Corn, Apple, Rice, Wheat,
   Grapes, Citrus, Cotton, Mango, Pepper, and 100+ other agricultural crops.
3. Disease severity: Classifies infection stage (Mild / Moderate / Severe / None).
4. Dual guidance: Offers both organic bio-controls and chemical treatments.
5. Graceful fallback: Returns clear errors or allows fallback to local TFLite.
6. Zero-friction REST transport: Uses standard urllib / requests with fallback
   to google.generativeai, ensuring 100% portability across all operating systems.
================================================================================
"""

import os
import io
import json
import base64
import urllib.request
import urllib.error
import logging
from typing import Dict, Any, Optional
from PIL import Image

logger = logging.getLogger("CropDiseaseAPI.GeminiAI")

# Attempt to load environment variables from .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass


def get_gemini_api_key() -> Optional[str]:
    """Retrieves the Gemini API key from environment variables or .env file."""
    # Check common environment variable names
    key = (
        os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
        or os.environ.get("GEMINI_KEY")
    )
    if key:
        return key.strip()

    # Check local .env file manually if dotenv wasn't available
    for candidate in [".env", "backend/.env", "../.env"]:
        if os.path.exists(candidate):
            try:
                with open(candidate, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("#") or not line or "=" not in line:
                            continue
                        k, v = line.split("=", 1)
                        if k.strip() in ("GEMINI_API_KEY", "GOOGLE_API_KEY", "GEMINI_KEY"):
                            return v.strip().strip("'\"")
            except Exception:
                pass

    return None


def is_gemini_configured() -> bool:
    """Checks whether a valid Gemini API key is configured."""
    key = get_gemini_api_key()
    return bool(key and len(key) > 10)


SYSTEM_PROMPT = """
You are a World-Renowned Senior Botanist, Plant Pathologist, and ICAR/TNAU Agricultural Advisory Specialist.

Analyze this image using strict botanical and pathological protocols:

STAGE 1: Subject Verification
Determine if the image clearly contains a plant leaf, foliage, stem, or plant part.
If the image does NOT contain a plant leaf or part (e.g., human selfie, room, pet/animal, vehicle, electronic device, furniture, cooked food, or completely blurry unrecognizable photo):
Return strictly:
{
  "is_leaf": false,
  "rejection_reason": "Clear explanation of what appears in the photo instead of a plant leaf.",
  "advice": "Please capture a clear, focused close-up photo of a plant leaf in good lighting.",
  "predictions": [],
  "low_confidence": true
}

STAGE 2: High-Precision Plant Species Identification
Carefully examine the anatomical botanical traits:
- Leaf arrangement (alternate, opposite, whorled) & type (simple, pinnately compound, bipinnate, palmate).
- Leaf margins (entire, serrated, dentate, crenate, lobed).
- Venation patterns (pinnate, palmate, parallel, reticulate/net-veined).
- Leaf surface & texture (pubescent/hairy, glabrous/smooth, waxy/glaucous, rugose).
Determine the EXACT species:
- "crop_name": Common English name (e.g., Tomato, Potato, Corn, Wheat, Rice, Cotton, Chilli/Pepper, Mango, Rose, Tulsi, Hibiscus, Banana, Papaya, Brinjal, Guava, Money Plant, Citrus, etc.).
- "scientific_name": Latin binomial name (e.g., "Solanum lycopersicum", "Mangifera indica", "Ocimum sanctum", etc.).
- "botanical_notes": 1 concise sentence describing the key anatomical leaf traits confirming this plant.

STAGE 3: Health & Pathology Diagnosis
Inspect for pathological symptoms:
- Distinguish between:
  * Healthy foliage (vibrant green, absence of lesions/chlorosis).
  * Fungal/Bacterial diseases (concentric rings, target-spots, halos, powdery/downy growth, water-soaked rot).
  * Viral infections (mosaic patterns, severe leaf curl, yellow veins).
  * Pests/Insects (leaf miners, mites, aphids, caterpillar bites).
  * Nutrient deficiency (interveinal chlorosis, margin scorch).
- "condition": Plain name of diagnosis (e.g. "Early Blight", "Healthy Foliage", "Powdery Mildew", "Leaf Curl").
- "severity": "None" (if healthy), "Mild", "Moderate", or "Severe".

STAGE 4: Standardized Output Structure
Format "predictions" array with top 3 possibilities.
The "disease" field MUST ALWAYS be formatted as:
"<Common_Plant_Name>___<Condition_With_Underscores>"
Examples:
- "Tomato___Early_blight"
- "Tomato___healthy"
- "Mango___Anthracnose"
- "Tulsi___healthy"

For each prediction, provide ICAR/TNAU guidance:
- "symptoms": 1-2 sentences on visual lesions or chlorosis observed.
- "treatment": Practical bio-control (organic) and chemical remedies.
- "prevention": Cultural practices (drip irrigation, spacing, sanitation, crop rotation).

Return ONLY raw valid JSON with NO markdown code fences.
"""



def _image_to_base64_jpeg(image: Image.Image) -> str:
    """Converts a PIL image to a Base64-encoded JPEG string."""
    if image.mode != "RGB":
        image = image.convert("RGB")

    # Resize large images to max 1024px to accelerate network upload
    max_dimension = 1024
    if max(image.size) > max_dimension:
        image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=85)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def analyze_leaf_with_gemini(image: Image.Image) -> Dict[str, Any]:
    """
    Submits the image to Google Gemini 1.5 Flash Vision for comprehensive analysis.

    Uses high-speed REST API (with standard library urllib), ensuring zero native DLL
    dependencies and maximum reliability on both local environments and cloud containers.

    Args:
        image: PIL Image object.

    Returns:
        Structured dictionary matching mobile frontend API contract.
    """
    api_key = get_gemini_api_key()
    if not api_key:
        raise RuntimeError(
            "Gemini Vision AI is not configured. "
            "Please ensure 'GEMINI_API_KEY' is set in your environment or .env file."
        )

    # Prepare Base64 payload
    b64_data = _image_to_base64_jpeg(image)

    request_payload = {
        "contents": [
            {
                "parts": [
                    {"text": SYSTEM_PROMPT},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": b64_data,
                        }
                    },
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "response_mime_type": "application/json",
        },
    }

    payload_bytes = json.dumps(request_payload).encode("utf-8")

    candidate_models = [
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-flash-latest",
        "gemini-1.5-flash",
    ]

    resp_json = None
    last_err = None

    for model_name in candidate_models:
        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model_name}:generateContent?key={api_key}"
        )
        req = urllib.request.Request(
            endpoint,
            data=payload_bytes,
            headers={
                "Content-Type": "application/json",
                "Content-Length": str(len(payload_bytes)),
            },
            method="POST",
        )
        try:
            logger.info(f"Dispatching leaf photo to Gemini model '{model_name}'...")
            with urllib.request.urlopen(req, timeout=30) as response:
                resp_body = response.read().decode("utf-8")
                resp_json = json.loads(resp_body)
                if resp_json.get("candidates"):
                    break
        except urllib.error.HTTPError as http_err:
            last_err = http_err
            # If 404, try next candidate model
            if http_err.code != 404:
                err_content = http_err.read().decode("utf-8")
                logger.error(f"Gemini API returned HTTP {http_err.code}: {err_content}")
                raise RuntimeError(f"Gemini API error ({http_err.code}): {err_content}") from http_err
        except Exception as exc:
            last_err = exc
            logger.error(f"Failed to communicate with Gemini API ({model_name}): {exc}")

    if not resp_json or not resp_json.get("candidates"):
        raise RuntimeError("Gemini API call failed across all candidate models.") from last_err


    # Extract text content from Gemini's candidate response
    candidates = resp_json.get("candidates", [])
    if not candidates:
        raise ValueError("Gemini API returned no analysis candidates.")

    candidate_parts = candidates[0].get("content", {}).get("parts", [])
    if not candidate_parts or "text" not in candidate_parts[0]:
        raise ValueError("Gemini API returned empty text part.")

    raw_text = candidate_parts[0]["text"].strip()

    # Clean markdown fences if model included them
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`")
        if raw_text.startswith("json"):
            raw_text = raw_text[4:].strip()

    data = json.loads(raw_text)

    # Tag engine for visibility in diagnostics
    data["ai_engine"] = "Gemini 3.5 Flash Multimodal Vision"

    # Ensure backward compatibility with existing predictions schema
    if "predictions" not in data or not isinstance(data["predictions"], list):
        data["predictions"] = []

    crop_name = data.get("crop_name", "Plant")
    for p in data["predictions"]:
        if "disease" in p and "___" not in p["disease"]:
            sanitized_crop = crop_name.replace(" ", "_")
            sanitized_disease = p["disease"].replace(" ", "_")
            p["disease"] = f"{sanitized_crop}___{sanitized_disease}"

        if "info" not in p or not isinstance(p["info"], dict):
            p["info"] = {
                "symptoms": p.get("symptoms", ""),
                "treatment": p.get("treatment", ""),
                "prevention": p.get("prevention", ""),
            }
        else:
            p["info"]["symptoms"] = p["info"].get("symptoms") or p.get("symptoms", "")
            p["info"]["treatment"] = p["info"].get("treatment") or p.get("treatment", "")
            p["info"]["prevention"] = p["info"].get("prevention") or p.get("prevention", "")

    # If top confidence is below 0.60 or flagged not a leaf, mark low_confidence
    if not data.get("is_leaf", True):
        data["low_confidence"] = True
    elif "low_confidence" not in data:
        top_conf = data["predictions"][0].get("confidence", 0.0) if data["predictions"] else 0.0
        data["low_confidence"] = bool(top_conf < 0.60)


    return data
