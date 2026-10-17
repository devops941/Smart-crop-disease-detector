# Smart Crop Disease Detector - Viva Examination Technical Q&A

15 concise technical questions and answers designed for academic presentations, project reviews, and viva voce defense.

---

### Q1: What is a Convolutional Neural Network (CNN) and why is it used for plant disease detection?
**Answer:**  
A CNN is a specialized deep neural network designed for grid-like spatial data such as images. It uses learnable convolutional filter kernels that slide across the image to extract local visual patterns (e.g. edges, texture, color changes, and lesions) in a translation-invariant manner. This allows the network to recognize fungal spots, leaf blight, and curling regardless of where the symptom appears on the leaf blade.

---

### Q2: What is Transfer Learning and why did you choose it over training a model from scratch?
**Answer:**  
Transfer learning involves taking a neural network pretrained on a massive general-purpose visual benchmark (ImageNet with 1.4 million images across 1,000 classes) and adapting its learned feature extractors to our specialized crop disease domain. Training a deep network from scratch requires hundreds of thousands of agricultural images and days of compute. Transfer learning allows us to achieve high accuracy with a smaller localized dataset while converging in only a few epochs.

---

### Q3: Why did you choose MobileNetV2 as your base model architecture?
**Answer:**  
MobileNetV2 is specifically architected for mobile and edge device deployment. It introduces **Depthwise Separable Convolutions** and **Inverted Residual Blocks with Linear Bottlenecks**, reducing the total number of floating-point operations (FLOPs) and parameters by over 70% compared to heavy architectures like ResNet-50 or VGG-16, with minimal loss in top-1 accuracy.

---

### Q4: What is TensorFlow Lite (TFLite) and why is it used here?
**Answer:**  
TensorFlow Lite is Google's lightweight runtime engine for deploying machine learning models on mobile devices, embedded hardware, and microcontrollers. It strips training-specific graph metadata, fuses operations, and optimizes kernel execution for ARM and mobile CPUs, enabling fast inference (typically <100 ms) and small binary footprints.

---

### Q5: What is Model Quantization and how does Dynamic Range Quantization work?
**Answer:**  
Quantization reduces the precision of model weights from 32-bit floating-point (`float32`) to 8-bit integers (`int8`). In **dynamic range post-training quantization**, the model weights are compressed to 8 bits on disk (reducing file size from ~9 MB to ~2.4 MB), while activation calculations are dynamically converted to 8-bit integers during execution on the CPU. This provides a 4x reduction in storage and memory bandwidth with negligible impact on diagnostic accuracy.

---

### Q6: What data augmentations did you apply and why?
**Answer:**  
We applied horizontal and vertical flips, random rotations (up to 20%), random zooms (up to 20%), and subtle brightness and contrast adjustments. Augmentation synthetically exposes the neural network to diverse field conditions (e.g., leaves photographed upside down, tilted angles, and morning vs. midday sunlight), which improves model generalization and prevents the model from memorizing fixed orientations.

---

### Q7: What is Overfitting and what techniques did you employ to prevent it?
**Answer:**  
Overfitting occurs when a neural network memorizes training set noise and specific background details rather than learning general disease traits, resulting in high training accuracy but poor validation performance. We prevented overfitting using:
1. **Data Augmentation** during training.
2. **Dropout (0.3)** before the dense classification layer.
3. **Early Stopping with weight restoration** monitoring validation loss.
4. **Freezing Batch Normalization layers** during fine-tuning so running population statistics were not corrupted by small batches.

---

### Q8: What was your two-stage training strategy?
**Answer:**  
- **Stage 1 (Frozen Base):** The entire MobileNetV2 convolutional backbone was frozen, training only the custom GlobalAveragePooling and Dense classification head with Adam optimizer (`lr = 0.001`) for rapid alignment.
- **Stage 2 (Fine-Tuning):** The top 30 convolutional layers of MobileNetV2 were unfrozen and trained alongside the classification head using a very small learning rate (`lr = 1e-5`) to fine-tune high-level feature representations without destroying lower-level edge filters.

---

### Q9: Why is a Confidence Threshold (0.60) necessary in agricultural applications?
**Answer:**  
Standard Softmax outputs always sum to 100%, meaning the model will produce a prediction even if a farmer accidentally photographs their finger, soil, a weed, or a blank piece of paper. A confidence threshold of 0.60 acts as a safety guardrail: if the top prediction probability is below 60%, the system flags `"low_confidence": true` and alerts the farmer to retake the photo in better lighting or consult a human agricultural officer.

---

### Q10: What is the "Lab vs. Field Data Gap" in crop disease detection?
**Answer:**  
Most benchmark datasets (such as PlantVillage) consist of isolated leaves photographed against uniform gray or black backgrounds in controlled indoor lighting. In real agricultural fields, photos contain complex soil backgrounds, variable sunlight, insect bites, dust, overlapping leaves, and co-occurring nutrient deficiencies. A model evaluated solely on lab photos often drops in accuracy when deployed in real fields unless fine-tuned with real field imagery.

---

### Q11: Why did you perform image resizing and compression on the mobile phone before uploading?
**Answer:**  
Modern smartphone cameras generate high-resolution images between 4 MB and 12 MB (12–48 megapixels). The neural network requires an input of only 224x224 pixels. Uploading multi-megabyte raw photos over weak 2G/3G rural mobile networks causes high latency, network timeouts, and heavy data consumption for farmers. Compressing images to a maximum side of 1024 px on-device reduces upload payload size to under 250 KB, speeding up round-trip inference to <1 second.

---

### Q12: Why did you place the image normalization layer inside the TFLite model?
**Answer:**  
MobileNetV2 expects pixel values normalized in the range $[-1, 1]$. By placing a `Rescaling(scale=1/127.5, offset=-1.0)` layer directly inside the model graph, the model accepts raw pixel values in the range $[0, 255]$. This eliminates platform-dependent preprocessing bugs between iOS, Android, and backend Python code, guaranteeing identical mathematical inputs across all clients.

---

### Q13: How does your backend handle missing treatments or new disease classes?
**Answer:**  
The backend uses a resilient dictionary lookup (`model_state["treatments"].get(disease_name, {})`). If a newly added disease class does not yet have an entry in `treatments.json`, the API returns an empty `info: {}` object rather than throwing a KeyError or returning a 500 server crash, ensuring uninterrupted operation.

---

### Q14: What are the primary technical limitations of this system?
**Answer:**  
1. **Single Leaf Constraint:** The model is trained on individual leaves and cannot currently diagnose whole-plant or canopy-level diseases.
2. **Co-infections:** If a plant suffers from both nutrient deficiency and early blight simultaneously, the current single-label classification architecture predicts only the dominant visual pattern.
3. **Regional Diversity:** Fungal symptoms can vary across plant cultivars and local micro-climates.

---

### Q15: What is the Future Scope for expanding this project?
**Answer:**  
1. **On-Device Offline Inference:** Integrating `react-native-fast-tflite` to run the model directly on Android/iOS devices without internet.
2. **Object Detection (YOLO / SSD MobileNet):** Detecting and bounding multiple infected spots on a plant canopy simultaneously.
3. **Multilingual Voice Assistance:** Adding Tamil, Hindi, and regional language audio output for illiterate or semi-literate farmers.
4. **Geo-tagging & Outbreak Mapping:** Tagging disease detections with GPS coordinates to alert neighboring farmers of impending pest or fungal outbreaks.
