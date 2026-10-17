# Smart Crop Disease Detector - Stage 3: Mobile App (Expo / React Native)

A mobile app built with Expo and React Native designed for farmers to photograph crop leaves and receive instant disease diagnoses, confidence scores, and ICAR/TNAU management advisories.

---

## 📱 How to Run on an Android Phone (Expo Go)

### Step 1: Install Expo Go on Your Phone
Download and install **Expo Go** from the [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) on your Android device.

---

### Step 2: Connect Phone and Laptop to the Same Wi-Fi
Ensure your laptop running the backend and your Android phone are connected to the **same Wi-Fi network**.

---

### Step 3: Find Your Laptop's IP Address
In Windows PowerShell, run:
```powershell
ipconfig
```
Look for **Wireless LAN adapter Wi-Fi** ➔ **IPv4 Address** (e.g., `192.168.1.15`).

---

### Step 4: Set the API URL in the App
Open [mobile/src/config.js](file:///d:/Smart%20Crop%20Disease%20Detector/mobile/src/config.js) and update `API_URL`:

```javascript
export const CONFIG = {
  // Replace with your laptop's Wi-Fi IP address:
  API_URL: 'http://192.168.1.15:8000',

  // Set to true if you want to test offline without running the backend:
  USE_MOCK_API: false,
  
  TIMEOUT_MS: 15000,
  ...
};
```

---

### Step 5: Start the Backend Server
In the project root, make sure your FastAPI backend is running with `--host 0.0.0.0`:
```powershell
.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```

---

### Step 6: Start the Expo App
In a new terminal window:
```powershell
cd mobile
npm start
```
*(Or `npx expo start -c` to clear cache).*

---

### Step 7: Open in Expo Go
1. Open the **Expo Go** app on your Android phone.
2. Tap **Scan QR code**.
3. Point your camera at the QR code printed in your computer terminal.
4. The JavaScript bundle will compile and launch the **Smart Crop Doctor** app on your phone!

---

## 🧪 Testing in Offline Mock Mode (No Server Needed)

You can test all screens, camera/gallery picking, and scan history completely offline:

1. In [mobile/src/config.js](file:///d:/Smart%20Crop%20Disease%20Detector/mobile/src/config.js), set:
   ```javascript
   USE_MOCK_API: true,
   ```
2. Save the file.
3. In Expo Go, taking or selecting any photo will immediately return realistic sample diagnosis data and save it to your local device history!

---

## 📋 Acceptance Verification Checklist

| Test Case | Expected Behavior |
| :--- | :--- |
| **1. Take Photo / Gallery** | Camera opens, user snaps leaf photo, image is compressed to $\le 1024\text{ px}$ before sending. |
| **2. Analysis & Loading** | Spinner displays with "Running neural network...". |
| **3. Results Display** | Displays top 3 predictions with colored confidence bars and ICAR treatment guidelines. |
| **4. Low-Confidence Warning** | If top confidence is $< 60\%$, shows warning banner: *"Uncertain Result — Please retake in better light"*. |
| **5. Scan History** | Scans are automatically saved to `AsyncStorage`. Tapping a history item reopens its full diagnosis even after restarting the app. |
| **6. Clear History** | Tapping "Clear History" prompts confirmation and deletes all saved entries. |
| **7. Network Error Handling** | If the phone is offline or server is down, shows a friendly alert with a "Try Again" button without crashing. |
