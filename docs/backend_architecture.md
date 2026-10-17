# Smart Crop Disease Detector - Stage 2: FastAPI Backend

Production-ready backend API serving real-time crop disease diagnosis using the quantized MobileNetV2 TensorFlow Lite model.

---

## 📋 Features

- **TFLite Model Caching**: Model and treatments loaded **once at startup** via FastAPI Lifespan.
- **Strict Input Validation**: Rejects files larger than **5 MB**, non-images, or corrupted files with clear `400 Bad Request` responses.
- **Fixed Model Contract**: Accepts JPEG/PNG leaf images, converts to RGB, resizes to `224x224`, preserving raw `[0, 255]` float32 format.
- **Top 3 Predictions**: Sorted in descending order of confidence with ICAR/TNAU symptom & management guidelines.
- **Low Confidence Flag**: Sets `"low_confidence": true` when the top prediction is below 60%.
- **CORS Enabled**: Ready for mobile apps (Flutter/React Native) and web browsers.

---

## 🚀 Quickstart & Local Execution

### 1. Install Dependencies
Using your virtual environment:
```powershell
# Activate your environment
.venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt
```

### 2. Start the API Server
Run Uvicorn bound to `0.0.0.0` so other devices on your local network can connect:
```powershell
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Once running, access the interactive OpenAPI documentation at:
- **Local Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🧪 Testing the API

Run the automated acceptance test script:
```powershell
python test_api.py
```

### Manual Testing with cURL

#### 1. Health Check
```bash
curl http://127.0.0.1:8000/health
```
**Expected Response:**
```json
{
  "status": "ok",
  "classes": 4
}
```

#### 2. Disease Prediction
```bash
curl -X POST "http://127.0.0.1:8000/predict" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@dataset/Tomato___Early_blight/tomato.jpg"
```

**Expected Response Format:**
```json
{
  "predictions": [
    {
      "disease": "Tomato___Early_blight",
      "confidence": 0.9991,
      "info": {
        "symptoms": "[TO BE VERIFIED from TNAU/ICAR] Concentric dark brown-to-black ring spots...",
        "treatment": "[TO BE VERIFIED from TNAU/ICAR] Prune and discard diseased lower leaves...",
        "prevention": "[TO BE VERIFIED from TNAU/ICAR] Apply organic mulch around plant bases..."
      }
    },
    {
      "disease": "Tomato___healthy",
      "confidence": 0.0009,
      "info": {
        "symptoms": "Healthy leaf tissue...",
        "treatment": "No disease treatment required...",
        "prevention": "Ensure adequate spacing..."
      }
    },
    {
      "disease": "Potato___Late_blight",
      "confidence": 0.0001,
      "info": { ... }
    }
  ],
  "low_confidence": false
}
```

---

## 📱 Testing From a Phone on the Same Wi-Fi

You can test your backend from an Android or iOS phone connected to the same Wi-Fi router:

### Step 1: Find Your Laptop's Local IP Address
In Windows PowerShell, run:
```powershell
ipconfig
```
Look for **Wireless LAN adapter Wi-Fi** ➔ **IPv4 Address** (typically looks like `192.168.1.X` or `192.168.0.X`).

### Step 2: Open on Your Phone
Make sure Uvicorn is running with `--host 0.0.0.0`:
```powershell
uvicorn main:app --host 0.0.0.0 --port 8000
```
On your mobile browser, open:
```text
http://<YOUR_LAPTOP_IP>:8000/docs
```
*(Example: `http://192.168.1.15:8000/docs`)*

You will see the Swagger UI. Expand `POST /predict`, tap **Try it out**, take a leaf photo using your phone camera, and tap **Execute**!

> **Windows Firewall Note:** If your phone cannot connect, allow port `8000` through Windows Defender Firewall, or temporarily allow private network access when prompted by Windows.

---

## ☁️ Deploying to Cloud (Render & Railway)

### Deploying on Railway
1. Push your repository to GitHub.
2. Sign in to [railway.app](https://railway.app) and create a **New Project** ➔ **Deploy from GitHub repo**.
3. Railway automatically detects Python. Set the **Start Command** in Settings:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

### Deploying on Render
1. Create a new **Web Service** on [render.com](https://render.com) linked to your GitHub repo.
2. Set the configuration:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Click **Deploy**. Render will generate a public HTTPS URL (e.g., `https://smart-crop-detector.onrender.com`).
