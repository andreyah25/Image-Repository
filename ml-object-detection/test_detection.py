
from pathlib import Path
from ultralytics import YOLO

# Project directories
BASE_DIR = Path(__file__).resolve().parent
IMAGE_DIR = BASE_DIR / "test-images"
RESULTS_DIR = BASE_DIR / "results"
MODEL_DIR = BASE_DIR / "models"

RESULTS_DIR.mkdir(exist_ok=True)
MODEL_DIR.mkdir(exist_ok=True)

# Pretrained YOLO model; no training required
MODEL_NAME = "yolo26s.pt"

def main():
    print("Loading pretrained YOLO model...")

    model = YOLO(MODEL_NAME)

    # Move a downloaded model copy into the project's models folder
    local_model = MODEL_DIR / MODEL_NAME

    if not local_model.exists():
        import shutil
        shutil.copy2(model.ckpt_path, local_model)

    print("Model loaded successfully!")
    print(f"Searching for images in: {IMAGE_DIR}")

    image_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    images = [
        p for p in IMAGE_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in image_extensions
    ]

    if not images:
        print("No images found. Add JPG, PNG, or WEBP photos to test-images.")
        return

    for image_path in images:
        print(f"\nAnalyzing: {image_path.name}")

        results = model.predict(
            source=str(image_path),
            conf=0.35,
            imgsz=640,
            save=True,
            project=str(RESULTS_DIR),
            name="detections",
            exist_ok=True,
            verbose=False
        )

        for result in results:
            if result.boxes is None or len(result.boxes) == 0:
                print("  No objects detected.")
                continue

            for box in result.boxes:
                class_id = int(box.cls[0])
                label = model.names[class_id]
                confidence = float(box.conf[0])

                print(f"  {label}: {confidence:.1%} confidence")

    print(f"\nFinished! Check annotated photos in: {RESULTS_DIR / 'detections'}")

if __name__ == "__main__":
    main()

