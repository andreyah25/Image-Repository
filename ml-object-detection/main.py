
from pathlib import Path
from io import BytesIO

import requests
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "captured_yolo26s.pt"

app = FastAPI(title="Captured Object Detection API")

# Development configuration.
# Restrict these origins to your actual frontend domains in production.

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://captured-photo-studio.onrender.com",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)
# Load the pretrained model once when the service starts.
# Load the trained Captured custom model once at startup.
if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Trained model not found at: {MODEL_PATH}. "
        "Make sure best.pt was copied into the models folder."
    )

model = YOLO(str(MODEL_PATH))

print("Loaded trained model:", MODEL_PATH)
print("Custom classes:", model.names)

class AnalyzeRequest(BaseModel):
    image_url: str


@app.get("/")
def health_check():
    return {
        "success": True,
        "message": "Captured Object Detection API is running"
    }


@app.post("/analyze")
def analyze_image(request: AnalyzeRequest):
    try:
        if not request.image_url.startswith("https://"):
            raise HTTPException(
                status_code=400,
                detail="A valid HTTPS image URL is required."
            )

        # Download the image using its Supabase signed URL.
        response = requests.get(
            request.image_url,
            timeout=30,
            stream=True
        )
        response.raise_for_status()

        content_type = response.headers.get("Content-Type", "")
        if not content_type.lower().startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail="The supplied URL did not return an image."
            )

        # Limit the downloaded image size to 15 MB.
        max_bytes = 15 * 1024 * 1024
        image_bytes = bytearray()

        for chunk in response.iter_content(chunk_size=65536):
            if not chunk:
                continue

            image_bytes.extend(chunk)

            if len(image_bytes) > max_bytes:
                raise HTTPException(
                    status_code=413,
                    detail="Image exceeds the 15 MB limit."
                )

        with Image.open(BytesIO(image_bytes)) as source:
            image = source.convert("RGB")

        # Run pretrained YOLO; no training is required.
        prediction = model.predict(
            source=image,
            conf=0.20,
            imgsz=960,
            verbose=False
        )[0]

        objects = []

        if prediction.boxes is not None:
            for box in prediction.boxes:
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                coordinates = [
                    round(float(value), 2)
                    for value in box.xyxy[0].tolist()
                ]

                objects.append({
                    "name": model.names[class_id],
                    "confidence": round(confidence, 4),
                    "box": coordinates
                })

        return {
            "success": True,
            "objects": objects,
            "object_count": len(objects)
        }

    except HTTPException:
        raise

    except requests.RequestException as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not download the image: {exc}"
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Image analysis failed: {exc}"
        ) from exc