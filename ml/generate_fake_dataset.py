"""
Smart Crop Disease Detector - Synthetic Dataset Generator
==========================================================
IMPORTANT NOTICE:
This script generates TINY, FAKE / SYNTHETIC leaf images with random colors
and patterns across 3 classes. It is meant SOLELY to test that the entire
training and TFLite export pipeline runs end-to-end on your computer or Colab
without needing to download gigabytes of PlantVillage data first.

DO NOT use models trained on this synthetic data for real crop diagnosis!
"""

import os
import argparse
import numpy as np
from PIL import Image, ImageDraw


def generate_fake_dataset(output_dir: str = "dataset", samples_per_class: int = 30):
    """
    Generates synthetic 224x224 RGB images across Potato and Tomato crop disease classes.

    Classes:
      1. Tomato___Early_blight   (Brown/dark spots on greenish background)
      2. Tomato___healthy        (Vibrant green leaf patterns)
      3. Potato___Late_blight    (Dark irregular lesions on leaves)
      4. Potato___healthy        (Clear healthy potato foliage)
    """
    classes = {
        "Tomato___Early_blight": {
            "base_color": (34, 139, 34),     # Forest Green
            "spot_color": (101, 67, 33),     # Dark Brown
            "spot_count": 8,
        },
        "Tomato___healthy": {
            "base_color": (46, 204, 113),    # Healthy Emerald Green
            "spot_color": (39, 174, 96),     # Subtle green vein shade
            "spot_count": 3,
        },
        "Potato___Late_blight": {
            "base_color": (30, 110, 30),     # Dark Olive Green
            "spot_color": (50, 30, 20),      # Purplish/brown lesion
            "spot_count": 7,
        },
        "Potato___healthy": {
            "base_color": (50, 180, 80),     # Leaf Green
            "spot_color": (40, 150, 70),     # Healthy vein shade
            "spot_count": 2,
        },
    }

    os.makedirs(output_dir, exist_ok=True)
    rng = np.random.default_rng(seed=42)

    print("=" * 65)
    print(" [SYNTHETIC TEST DATASET GENERATOR]")
    print(" Target directory:", os.path.abspath(output_dir))
    print(" Samples per class:", samples_per_class)
    print("=" * 65)

    for class_name, styling in classes.items():
        class_folder = os.path.join(output_dir, class_name)
        os.makedirs(class_folder, exist_ok=True)

        for i in range(samples_per_class):
            # Create a 224x224 image with slight color jitter
            base_rgb = np.array(styling["base_color"], dtype=np.int16)
            jitter = rng.integers(-20, 21, size=3)
            bg = np.clip(base_rgb + jitter, 0, 255).astype(np.uint8)

            img_array = np.full((224, 224, 3), bg, dtype=np.uint8)
            # Add subtle texture noise
            noise = rng.integers(-15, 16, size=(224, 224, 3))
            img_array = np.clip(img_array.astype(np.int16) + noise, 0, 255).astype(np.uint8)

            img = Image.fromarray(img_array)
            draw = ImageDraw.Draw(img)

            # Draw random synthetic leaf "veins" or "spots"
            for _ in range(styling["spot_count"]):
                x = int(rng.integers(20, 204))
                y = int(rng.integers(20, 204))
                r = int(rng.integers(5, 25))
                draw.ellipse(
                    [(x - r, y - r), (x + r, y + r)],
                    fill=styling["spot_color"],
                )

            # Draw a central leaf-vein line
            draw.line([(112, 10), (112, 214)], fill=(20, 80, 20), width=2)

            file_path = os.path.join(class_folder, f"fake_sample_{i+1:03d}.jpg")
            img.save(file_path, "JPEG", quality=90)

        print(f"  --> Created {samples_per_class} fake images in: {class_name}/")

    print("=" * 65)
    print(" [DONE] Synthetic dataset created successfully.")
    print(" REMINDER: This is strictly for pipeline verification, NOT real results.")
    print("=" * 65)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic dataset for testing ML pipeline.")
    parser.add_argument("--output_dir", type=str, default="dataset", help="Output directory for dataset")
    parser.add_argument("--samples_per_class", type=int, default=30, help="Number of fake images per class")
    args = parser.parse_args()

    generate_fake_dataset(output_dir=args.output_dir, samples_per_class=args.samples_per_class)
