from ultralytics import YOLO

model = YOLO("yolov8n.pt")


def detect_objects(image_path):
    results = model(image_path, conf=0.05)

    objects = []

    for result in results:
        if result.boxes is None:
            continue

        for box in result.boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])

            object_name = model.names[class_id]

            objects.append({
                "name": object_name,
                "confidence": round(confidence, 4)
            })

    return objects