from pathlib import Path
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = (
    BASE_DIR
    / "runs"
    / "detect"
    / "runs"
    / "detect"
    / "tags_v2_yolo11_v3"
    / "weights"
    / "best.pt"
)

print("Loading custom YOLO model:")
print(MODEL_PATH)

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Custom YOLO model not found: {MODEL_PATH}"
    )

model = YOLO(str(MODEL_PATH))

print("Custom YOLO model loaded successfully.")
print("Classes:", model.names)


def detect_objects(image_path):

    print("=================================")
    print("YOLO OBJECT DETECTION")
    print("Image:", image_path)
    print("=================================")

    results = model(
        image_path,
        conf=0.25,
        verbose=False
    )

    objects = []

    for result in results:

        if result.boxes is None or len(result.boxes) == 0:
            print("YOLO returned NO boxes.")
            continue

        print(
            f"YOLO returned {len(result.boxes)} boxes."
        )

        for box in result.boxes:

            class_id = int(box.cls[0])
            confidence = float(box.conf[0])

            object_name = model.names[class_id]

            print(
                f"RAW DETECTION: "
                f"{object_name} "
                f"(class={class_id}, "
                f"confidence={confidence:.4f})"
            )

            objects.append({
                "name": object_name,
                "confidence": round(confidence, 4)
            })

    print("FINAL OBJECTS:", objects)
    print("=================================")

    return objects