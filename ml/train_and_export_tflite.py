"""
================================================================================
SMART CROP DISEASE DETECTOR - STAGE 1: ML TRAINING & TFLITE EXPORT
================================================================================
GOOGLE COLAB QUICKSTART GUIDE:
--------------------------------------------------------------------------------
1. Set GPU Runtime:
   In Google Colab, go to Runtime -> Change runtime type -> Hardware accelerator: T4 GPU.

2. Mount Google Drive (if your dataset is stored on Drive):
   from google.colab import drive
   drive.mount('/content/drive')

3. Upload / Set your dataset path:
   - If using Google Drive:
     python ml/train_and_export_tflite.py --dataset_dir "/content/drive/MyDrive/dataset"
   - Or clone your repo / upload dataset to /content/dataset and run:
     python ml/train_and_export_tflite.py --dataset_dir "dataset"

4. Install requirements:
   !pip install -r ml/requirements.txt

5. Run Training Pipeline:
   !python ml/train_and_export_tflite.py --epochs_stage1 15 --epochs_stage2 15

6. Test a Single Leaf Photo with the exported TFLite model:
   !python ml/train_and_export_tflite.py --test "dataset/Tomato___Early_blight/fake_sample_001.jpg"

7. Download the exported artifacts:
   from google.colab import files
   files.download('output/crop_disease.tflite')
   files.download('output/labels.txt')
   files.download('output/labels.json')
   files.download('output/training_history.png')
   files.download('output/confusion_matrix.png')
================================================================================
"""

import os
import sys
import json
import argparse

# Clean log outputs
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import numpy as np
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for server/Colab/headless environments
import matplotlib.pyplot as plt
import seaborn as sns
from PIL import Image

import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix


# ==============================================================================
# 1. DATA LOADING & FIXED DETERMINISTIC 70 / 15 / 15 SPLIT
# ==============================================================================
def load_and_split_data(dataset_dir: str, image_size: tuple = (224, 224), seed: int = 42):
    """
    Loads images from folder structure 'dataset/<ClassName>/*.jpg' using Keras
    image_dataset_from_directory and performs a deterministic 70% / 15% / 15%
    train / validation / test split with zero overlap.

    Why this approach:
    Loading unbatched with a fixed seed ensures that every image is partitioned
    strictly into one subset, preventing data leakage into validation/test sets.
    """
    if not os.path.exists(dataset_dir):
        raise FileNotFoundError(
            f"Dataset folder '{dataset_dir}' not found!\n"
            "If testing without real data, first run:\n"
            "  python ml/generate_fake_dataset.py\n"
            "to create a tiny synthetic dataset for testing."
        )

    print(f"\n[1/7] Loading dataset from: {os.path.abspath(dataset_dir)}", flush=True)
    full_ds = tf.keras.utils.image_dataset_from_directory(
        dataset_dir,
        shuffle=True,
        seed=seed,
        image_size=image_size,
        batch_size=None,  # Unbatched to allow precise sample-level splitting
        label_mode="categorical",
    )

    class_names = full_ds.class_names
    num_samples = len(full_ds)
    num_classes = len(class_names)

    print(f"  -> Found {num_samples} total images across {num_classes} classes: {class_names}", flush=True)

    # Calculate 70% train, 15% val, 15% test
    train_size = int(0.70 * num_samples)
    val_size = int(0.15 * num_samples)
    test_size = num_samples - train_size - val_size

    # Safeguard for small or toy test datasets (ensure at least 1 image in val & test if possible)
    if num_samples >= 3:
        if val_size == 0:
            val_size = 1
            train_size -= 1
        if test_size == 0:
            test_size = 1
            train_size -= 1

    print(f"  -> Data Split: Train = {train_size} (70%), Val = {val_size} (15%), Test = {test_size} (15%)", flush=True)

    train_ds = full_ds.take(train_size)
    remaining_ds = full_ds.skip(train_size)
    val_ds = remaining_ds.take(val_size)
    test_ds = remaining_ds.skip(val_size)

    return train_ds, val_ds, test_ds, class_names, (train_size, val_size, test_size)


# ==============================================================================
# 2. DATA AUGMENTATION (TRAINING ONLY)
# ==============================================================================
def get_augmentation_layer():
    """
    Builds data augmentation layers:
    - RandomFlip (horizontal & vertical)
    - RandomRotation (up to 20%)
    - RandomZoom (up to 20%)
    - RandomBrightness (factor 0.2)
    - RandomContrast (factor 0.2)

    Applied ONLY to the training dataset. Validation, test, and mobile inference
    must see the authentic image without random transformations.
    """
    return tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal_and_vertical", name="aug_flip"),
        tf.keras.layers.RandomRotation(0.2, name="aug_rotation"),
        tf.keras.layers.RandomZoom(0.2, name="aug_zoom"),
        tf.keras.layers.RandomBrightness(factor=0.2, name="aug_brightness"),
        tf.keras.layers.RandomContrast(factor=0.2, name="aug_contrast"),
    ], name="data_augmentation")


def prepare_datasets(train_raw, val_raw, test_raw, batch_size: int = 32):
    """
    Applies data augmentation to training data only, batches all datasets,
    and enables prefetching for maximum GPU/CPU throughput.
    """
    aug_layer = get_augmentation_layer()

    # Apply augmentation on training data only
    train_ds = train_raw.shuffle(buffer_size=1000)
    train_ds = train_ds.batch(batch_size)
    train_ds = train_ds.map(
        lambda x, y: (aug_layer(x, training=True), y),
        num_parallel_calls=tf.data.AUTOTUNE,
    )
    train_ds = train_ds.prefetch(buffer_size=tf.data.AUTOTUNE)

    # Validation and test datasets are only batched and prefetched (NO augmentation)
    val_ds = val_raw.batch(batch_size).prefetch(buffer_size=tf.data.AUTOTUNE)
    test_ds = test_raw.batch(batch_size).prefetch(buffer_size=tf.data.AUTOTUNE)

    return train_ds, val_ds, test_ds


# ==============================================================================
# 3. MODEL ARCHITECTURE & RESCALING CONTRACT
# ==============================================================================
def build_crop_disease_model(num_classes: int, image_shape: tuple = (224, 224, 3)):
    """
    Constructs the MobileNetV2 architecture.

    CONTRACT FOR LATER STAGES:
    1. Input: float32, shape [1, 224, 224, 3], raw pixel values 0-255.
    2. Rescaling layer INSIDE the model:
       MobileNetV2 expects input in [-1, 1].
       Layer: Rescaling(scale=1/127.5, offset=-1)
       Placing this layer inside the model ensures mobile clients don't need
       manual normalization, avoiding platform inconsistencies.
    3. MobileNetV2 feature extractor (ImageNet weights, include_top=False).
    4. GlobalAveragePooling2D: reduces spatial dimensions to feature vector.
    5. Dropout(0.3): prevents overfitting on smaller disease datasets.
    6. Dense(num_classes, activation='softmax'): produces class probabilities.
    """
    inputs = tf.keras.Input(shape=image_shape, dtype=tf.float32, name="input_image")

    # Rescaling layer inside the model: transforms [0, 255] -> [-1, 1]
    rescaled = tf.keras.layers.Rescaling(
        scale=1.0 / 127.5,
        offset=-1.0,
        name="rescaling",
    )(inputs)

    # Base pretrained model
    base_model = tf.keras.applications.MobileNetV2(
        input_shape=image_shape,
        include_top=False,
        weights="imagenet",
    )

    # Stage 1: Freeze all base model weights
    base_model.trainable = False

    # Execute base_model in inference mode so BatchNormalization statistics remain frozen
    features = base_model(rescaled, training=False)

    # Custom classification head
    pooled = tf.keras.layers.GlobalAveragePooling2D(name="global_average_pooling2d")(features)
    dropped = tf.keras.layers.Dropout(0.3, name="dropout")(pooled)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax", name="predictions")(dropped)

    model = tf.keras.Model(inputs=inputs, outputs=outputs, name="smart_crop_disease_detector")
    return model, base_model


# ==============================================================================
# 4. TWO-STAGE TRAINING PIPELINE
# ==============================================================================
def train_two_stages(
    model,
    base_model,
    train_ds,
    val_ds,
    epochs_stage1: int = 15,
    epochs_stage2: int = 15,
):
    """
    Stage 1: Feature Extraction (Frozen Base)
      - Learning rate = 1e-3 (0.001)
      - Trains only the newly initialized classification head.
      - Protects pretrained ImageNet feature extractors from large initial gradient shocks.

    Stage 2: Fine-Tuning (Top 30 Layers Unfrozen)
      - Learning rate = 1e-5 (0.00001)
      - Unfreezes the last 30 layers of MobileNetV2 so high-level convolutional
        filters specialize to plant leaf textures and disease lesions.
      - Uses EarlyStopping and ReduceLROnPlateau.
    """
    print("\n[2/7] Starting Stage 1: Training Classification Head (Frozen Base)...", flush=True)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    callbacks_stage1 = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=5,
            restore_best_weights=True,
            verbose=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.2,
            patience=3,
            min_lr=1e-6,
            verbose=1,
        ),
    ]

    history_stage1 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=epochs_stage1,
        callbacks=callbacks_stage1,
        shuffle=False,  # Already shuffled via tf.data
        verbose=1,
    )

    # --------------------------------------------------------------------------
    # Stage 2: Fine-Tuning
    # --------------------------------------------------------------------------
    print("\n[3/7] Starting Stage 2: Fine-Tuning Top 30 Layers of MobileNetV2...", flush=True)
    base_model.trainable = True

    # Freeze all layers except the last 30
    fine_tune_at = len(base_model.layers) - 30
    for layer in base_model.layers[:fine_tune_at]:
        layer.trainable = False

    # Freeze BatchNormalization layers inside the fine-tuning portion
    # to avoid distorting pretrained running statistics on small datasets
    for layer in base_model.layers[fine_tune_at:]:
        if isinstance(layer, tf.keras.layers.BatchNormalization):
            layer.trainable = False
        else:
            layer.trainable = True

    trainable_count = sum(np.prod(p.shape) for p in model.trainable_weights)
    print(f"  -> Total trainable parameters for fine-tuning: {trainable_count:,}", flush=True)

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    callbacks_stage2 = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss",
            patience=6,
            restore_best_weights=True,
            verbose=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.2,
            patience=3,
            min_lr=1e-7,
            verbose=1,
        ),
    ]

    initial_epoch = len(history_stage1.history["loss"])
    total_epochs = initial_epoch + epochs_stage2

    history_stage2 = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=total_epochs,
        initial_epoch=initial_epoch,
        callbacks=callbacks_stage2,
        shuffle=False,  # Already shuffled via tf.data
        verbose=1,
    )

    # Combine training histories for plotting
    combined_history = {
        "loss": history_stage1.history["loss"] + history_stage2.history["loss"],
        "val_loss": history_stage1.history["val_loss"] + history_stage2.history["val_loss"],
        "accuracy": history_stage1.history["accuracy"] + history_stage2.history["accuracy"],
        "val_accuracy": history_stage1.history["val_accuracy"] + history_stage2.history["val_accuracy"],
        "stage1_epochs": initial_epoch,
    }

    return model, combined_history


# ==============================================================================
# 5. TEST EVALUATION & METRICS
# ==============================================================================
def evaluate_model(model, test_ds, class_names, output_dir: str):
    """
    Evaluates model on the test dataset:
    - Real test accuracy
    - Per-class precision, recall, and F1-score
    - Confusion matrix heatmap
    """
    print("\n[4/7] Evaluating Model on Unseen Test Set...", flush=True)
    os.makedirs(output_dir, exist_ok=True)

    y_true_indices = []
    y_pred_indices = []

    for images, labels in test_ds:
        preds = model.predict(images, verbose=0)
        y_true_indices.extend(np.argmax(labels.numpy(), axis=1))
        y_pred_indices.extend(np.argmax(preds, axis=1))

    y_true = np.array(y_true_indices)
    y_pred = np.array(y_pred_indices)

    test_accuracy = float(np.mean(y_true == y_pred))
    print("\n==========================================", flush=True)
    print(f" TEST SET ACCURACY: {test_accuracy * 100:.2f}%", flush=True)
    print("==========================================", flush=True)

    report_str = classification_report(
        y_true,
        y_pred,
        target_names=class_names,
        labels=range(len(class_names)),
        zero_division=0,
    )
    print("\nClassification Report (Per-Class Precision, Recall, F1-Score):", flush=True)
    print(report_str, flush=True)

    cm = confusion_matrix(
        y_true,
        y_pred,
        labels=range(len(class_names)),
    )
    print("Confusion Matrix:", flush=True)
    print(cm, flush=True)

    # Plot & save confusion matrix
    plt.figure(figsize=(8, 6))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=class_names,
        yticklabels=class_names,
    )
    plt.title(f"Confusion Matrix (Test Accuracy: {test_accuracy*100:.2f}%)", fontsize=12, fontweight="bold")
    plt.xlabel("Predicted Class", fontsize=11)
    plt.ylabel("Ground Truth Class", fontsize=11)
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    cm_path = os.path.join(output_dir, "confusion_matrix.png")
    plt.savefig(cm_path, dpi=300)
    plt.close()
    print(f"  -> Saved Confusion Matrix Plot: {cm_path}", flush=True)

    return test_accuracy, report_str, cm


def plot_training_history(history: dict, output_dir: str):
    """
    Saves a combined plot of training/validation loss and accuracy across both stages.
    """
    os.makedirs(output_dir, exist_ok=True)
    stage1_epochs = history["stage1_epochs"]
    total_epochs = len(history["loss"])
    epochs_range = range(1, total_epochs + 1)

    plt.figure(figsize=(14, 5))

    # Loss plot
    plt.subplot(1, 2, 1)
    plt.plot(epochs_range, history["loss"], label="Training Loss", color="#1f77b4", linewidth=2)
    plt.plot(epochs_range, history["val_loss"], label="Validation Loss", color="#ff7f0e", linewidth=2)
    if stage1_epochs < total_epochs:
        plt.axvline(x=stage1_epochs, color="gray", linestyle="--", label="Fine-Tuning Start")
    plt.title("Training & Validation Loss", fontsize=12, fontweight="bold")
    plt.xlabel("Epoch", fontsize=11)
    plt.ylabel("Categorical Crossentropy", fontsize=11)
    plt.legend()
    plt.grid(True, alpha=0.3)

    # Accuracy plot
    plt.subplot(1, 2, 2)
    plt.plot(epochs_range, history["accuracy"], label="Training Accuracy", color="#2ca02c", linewidth=2)
    plt.plot(epochs_range, history["val_accuracy"], label="Validation Accuracy", color="#d62728", linewidth=2)
    if stage1_epochs < total_epochs:
        plt.axvline(x=stage1_epochs, color="gray", linestyle="--", label="Fine-Tuning Start")
    plt.title("Training & Validation Accuracy", fontsize=12, fontweight="bold")
    plt.xlabel("Epoch", fontsize=11)
    plt.ylabel("Accuracy", fontsize=11)
    plt.legend()
    plt.grid(True, alpha=0.3)

    plt.tight_layout()
    history_path = os.path.join(output_dir, "training_history.png")
    plt.savefig(history_path, dpi=300)
    plt.close()
    print(f"\n[5/7] Saved Training History Graph: {history_path}", flush=True)


# ==============================================================================
# 6. TFLITE EXPORT WITH DYNAMIC-RANGE QUANTIZATION
# ==============================================================================
def export_tflite_and_labels(model, class_names: list, output_dir: str):
    """
    Exports:
    1. output/crop_disease.tflite (Dynamic-range quantized)
       - Quantizes float32 weights into 8-bit integers.
       - Reduces model size from ~14 MB to ~3.5 MB (~4x reduction).
       - Significantly accelerates CPU inference on mobile devices (Android/iOS).
    2. output/labels.txt (one class per line, exact softmax index order).
    3. output/labels.json (metadata and index mappings).
    """
    print("\n[6/7] Exporting Quantized TFLite Model & Labels...", flush=True)
    os.makedirs(output_dir, exist_ok=True)

    # Convert to TFLite with Dynamic-Range Quantization
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()

    tflite_path = os.path.join(output_dir, "crop_disease.tflite")
    with open(tflite_path, "wb") as f:
        f.write(tflite_model)

    file_size_bytes = os.path.getsize(tflite_path)
    file_size_kb = file_size_bytes / 1024
    file_size_mb = file_size_bytes / (1024 * 1024)

    print(f"  -> Exported TFLite file: {os.path.abspath(tflite_path)}", flush=True)
    print(f"  -> Quantized Model Size: {file_size_kb:.2f} KB ({file_size_mb:.2f} MB)", flush=True)

    # Save labels.txt (one class per line, matching softmax index order)
    labels_txt_path = os.path.join(output_dir, "labels.txt")
    with open(labels_txt_path, "w", encoding="utf-8") as f:
        for name in class_names:
            f.write(f"{name}\n")
    print(f"  -> Exported Labels TXT: {os.path.abspath(labels_txt_path)}", flush=True)

    # Save labels.json (detailed metadata for mobile app and backend)
    labels_json_path = os.path.join(output_dir, "labels.json")
    labels_data = {
        "model_name": "crop_disease_mobilenetv2_dynamic_quant",
        "num_classes": len(class_names),
        "input_shape": [1, 224, 224, 3],
        "input_dtype": "float32",
        "input_range": "0-255 (Rescaling layer inside model normalizes to [-1, 1])",
        "classes": class_names,
        "class_indices": {name: idx for idx, name in enumerate(class_names)},
    }
    with open(labels_json_path, "w", encoding="utf-8") as f:
        json.dump(labels_data, f, indent=2)
    print(f"  -> Exported Labels JSON: {os.path.abspath(labels_json_path)}", flush=True)

    return tflite_path, labels_txt_path, labels_json_path


# ==============================================================================
# 7. INFERENCE TESTER FOR TFLITE MODEL (--test path/to/image.jpg)
# ==============================================================================
def run_tflite_test(image_path: str, tflite_path: str = "output/crop_disease.tflite", labels_path: str = "output/labels.txt"):
    """
    Tests a single image with the exported TFLite model and prints top 3 predictions.

    CONTRACT VERIFICATION:
    - Input tensor: float32, shape [1, 224, 224, 3], raw pixel values [0, 255].
    - Output tensor: softmax probabilities matching labels.txt order.
    """
    if not os.path.exists(tflite_path):
        raise FileNotFoundError(f"TFLite model not found at '{tflite_path}'. Please train the model first.")
    if not os.path.exists(labels_path):
        raise FileNotFoundError(f"Labels file not found at '{labels_path}'.")
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Test image not found at '{image_path}'.")

    # Load labels
    with open(labels_path, "r", encoding="utf-8") as f:
        labels = [line.strip() for line in f if line.strip()]

    # Load TFLite Interpreter
    interpreter = tf.lite.Interpreter(model_path=tflite_path)
    interpreter.allocate_tensors()

    input_details = interpreter.get_input_details()[0]
    output_details = interpreter.get_output_details()[0]

    # Load image, convert to RGB, and resize to 224x224
    img = Image.open(image_path).convert("RGB")
    img_resized = img.resize((224, 224), Image.Resampling.BILINEAR)

    # Convert to float32 [1, 224, 224, 3] with RAW pixel values [0, 255]
    img_array = np.array(img_resized, dtype=np.float32)
    input_data = np.expand_dims(img_array, axis=0)

    # Set tensor and invoke interpreter
    interpreter.set_tensor(input_details["index"], input_data)
    interpreter.invoke()

    # Retrieve output probabilities
    output_data = interpreter.get_tensor(output_details["index"])[0]

    # Sort classes by descending probability
    top_indices = np.argsort(output_data)[::-1]
    top_k = min(3, len(labels))

    print("\n" + "=" * 65, flush=True)
    print(" [TFLITE INFERENCE RESULT]", flush=True)
    print(f" Test Image : {os.path.abspath(image_path)}", flush=True)
    print(f" TFLite File: {os.path.abspath(tflite_path)}", flush=True)
    print(f" Model Input: {input_details['shape']} ({input_details['dtype'].__name__})", flush=True)
    print("-" * 65, flush=True)
    print(" Top Predictions:", flush=True)

    total_top_k_confidence = 0.0
    for rank in range(top_k):
        idx = top_indices[rank]
        prob = float(output_data[idx])
        conf_pct = prob * 100.0
        total_top_k_confidence += conf_pct
        label_name = labels[idx] if idx < len(labels) else f"Unknown_class_{idx}"
        print(f"  {rank + 1}. {label_name:<30} : {conf_pct:6.2f}% (prob: {prob:.4f})", flush=True)

    all_prob_sum = float(np.sum(output_data)) * 100.0
    print("-" * 65, flush=True)
    print(f" Top-{top_k} Confidence Sum : {total_top_k_confidence:6.2f}%", flush=True)
    print(f" All Classes Probability Sum: {all_prob_sum:6.2f}% (~100% Softmax)", flush=True)
    print("=" * 65 + "\n", flush=True)


# ==============================================================================
# MAIN ENTRYPOINT
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="Smart Crop Disease Detector - Stage 1 ML Training & TFLite Export Pipeline"
    )
    parser.add_argument(
        "--dataset_dir",
        type=str,
        default="dataset",
        help="Path to dataset root folder containing class subdirectories",
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default="output",
        help="Output folder where .tflite, labels, and plots are stored",
    )
    parser.add_argument(
        "--epochs_stage1",
        type=int,
        default=10,
        help="Number of epochs for Stage 1 training (frozen base)",
    )
    parser.add_argument(
        "--epochs_stage2",
        type=int,
        default=10,
        help="Number of epochs for Stage 2 fine-tuning (top 30 layers unfrozen)",
    )
    parser.add_argument(
        "--batch_size",
        type=int,
        default=32,
        help="Mini-batch size for training and evaluation",
    )
    parser.add_argument(
        "--test",
        type=str,
        default=None,
        help="Run inference on a single leaf image using the exported TFLite model",
    )

    args = parser.parse_args()

    # If --test is provided, perform inference directly and exit
    if args.test:
        tflite_path = os.path.join(args.output_dir, "crop_disease.tflite")
        labels_path = os.path.join(args.output_dir, "labels.txt")
        run_tflite_test(args.test, tflite_path=tflite_path, labels_path=labels_path)
        return

    print("=" * 75, flush=True)
    print("  SMART CROP DISEASE DETECTOR - STAGE 1: ML TRAINING PIPELINE", flush=True)
    print("=" * 75, flush=True)
    print(f"TensorFlow Version: {tf.__version__}", flush=True)
    gpus = tf.config.list_physical_devices("GPU")
    if gpus:
        print(f"Accelerators Found: {[gpu.name for gpu in gpus]}", flush=True)
    else:
        print("Accelerators Found: None (Running on CPU)", flush=True)

    # 1. Load data & perform deterministic 70/15/15 split
    train_raw, val_raw, test_raw, class_names, split_sizes = load_and_split_data(
        dataset_dir=args.dataset_dir,
        image_size=(224, 224),
        seed=42,
    )

    # 2. Prepare batches and augmentations
    train_ds, val_ds, test_ds = prepare_datasets(
        train_raw,
        val_raw,
        test_raw,
        batch_size=args.batch_size,
    )

    # 3. Build Model
    model, base_model = build_crop_disease_model(num_classes=len(class_names))

    # 4. Two-stage training
    model, history = train_two_stages(
        model=model,
        base_model=base_model,
        train_ds=train_ds,
        val_ds=val_ds,
        epochs_stage1=args.epochs_stage1,
        epochs_stage2=args.epochs_stage2,
    )

    # 5. Evaluate on test set & save graphs
    evaluate_model(model, test_ds, class_names, output_dir=args.output_dir)
    plot_training_history(history, output_dir=args.output_dir)

    # 6. Export Quantized TFLite model and labels
    tflite_path, labels_path, _ = export_tflite_and_labels(
        model=model,
        class_names=class_names,
        output_dir=args.output_dir,
    )

    # 7. Smoke test on a sample image from the dataset if available
    print("\n[7/7] Running Sample Verification Test with Exported TFLite Model...", flush=True)
    sample_img_path = None
    for root, _, files in os.walk(args.dataset_dir):
        for f in files:
            if f.lower().endswith((".jpg", ".jpeg", ".png")):
                sample_img_path = os.path.join(root, f)
                break
        if sample_img_path:
            break

    if sample_img_path:
        run_tflite_test(sample_img_path, tflite_path=tflite_path, labels_path=labels_path)

    print("\n[COMPLETE] Stage 1 ML pipeline successfully finished!", flush=True)
    print(f"Generated outputs are ready in '{os.path.abspath(args.output_dir)}'.\n", flush=True)


if __name__ == "__main__":
    main()
