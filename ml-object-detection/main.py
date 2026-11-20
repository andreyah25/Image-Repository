
from pathlib import Path
from io import BytesIO
import logging
import time
import threading
import requests
from PIL import Image, ImageOps
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from ultralytics import YOLO
import torch

torch.set_num_threads(1)
# --------------------------------------------------
# LOGGING
# --------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("captured-ml")

# --------------------------------------------------
# APP CONFIGURATION
# --------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent

MODEL_PATH = (
    BASE_DIR
    / "runs"
    / "detect"
    / "runs"
    / "detect"
    / "captured_yolo26n_clean_v2"
    / "weights"
    / "best.pt"
)

logger.info("Loading YOLO model: %s", MODEL_PATH)

if not MODEL_PATH.is_file():
    raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

model = YOLO(str(MODEL_PATH))

logger.info("YOLO model loaded. Classes: %s", model.names)

inference_lock = threading.Lock()

app = FastAPI(title="Captured Object Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://captured-ml-api.onrender.com",
        "https://captured-admin-studio.onrender.com",
        "https://captured-photo-studio.onrender.com",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


class AnalyzeRequest(BaseModel):
    image_url: HttpUrl


@app.get("/")
def health_check():
    return {
        "success": True,
        "message": "Captured Object Detection API is running",
        "model_loaded": True,
        "classes": model.names,
    }


@app.get("/health")
def health():
    return {"success": True}


@app.post("/analyze")
def analyze_image(request: AnalyzeRequest):
    started = time.perf_counter()

    try:
        image_url = str(request.image_url)

        # Only accept HTTPS image URLs.
        if not image_url.startswith("https://"):
            raise HTTPException(
                status_code=400,
                detail="A valid HTTPS image URL is required.",
            )

        logger.info("ANALYZE STARTED")

        download_started = time.perf_counter()

        try:
            with requests.get(
                image_url,
                timeout=(15, 90),
                stream=True,
                allow_redirects=True,
            ) as response:
                response.raise_for_status()

                content_type = response.headers.get(
                    "Content-Type", ""
                )

                if not content_type.lower().startswith("image/"):
                    raise HTTPException(
                        status_code=400,
                        detail="The URL did not return an image.",
                    )

                max_bytes = 15 * 1024 * 1024
                image_bytes = bytearray()

                for chunk in response.iter_content(
                    chunk_size=65536
                ):
                    if not chunk:
                        continue

                    image_bytes.extend(chunk)

                    if len(image_bytes) > max_bytes:
                        raise HTTPException(
                            status_code=413,
                            detail="Image exceeds the 15 MB limit.",
                        )

        except requests.RequestException as exc:
            logger.exception("IMAGE DOWNLOAD FAILED")
            raise HTTPException(
                status_code=502,
                detail=f"Could not download image: {exc}",
            ) from exc

        logger.info(
            "IMAGE DOWNLOADED in %.2f seconds; bytes=%d",
            time.perf_counter() - download_started,
            len(image_bytes),
        )

        image_started = time.perf_counter()

        try:
           with Image.open(BytesIO(image_bytes)) as source:
            logger.info(
                "ORIGINAL IMAGE DIMENSIONS: %s",
                source.size
            )

            # Reject extremely large images.
            if source.width * source.height > 50000000:
                raise HTTPException(
                    status_code=413,
                    detail="Image dimensions exceed the supported limit."
                )

            # Reduce JPEG decoding resolution before loading.
            if source.format == "JPEG":
                source.draft("RGB", (1280, 1280))

            source.load()

            image = ImageOps.exif_transpose(source)
            image.thumbnail((1280, 1280))
            image = image.convert("RGB")

            logger.info(
                "IMAGE PREPARATION COMPLETE: %s",
                image.size
            )

        except Exception as exc:
            logger.exception("IMAGE DECODE FAILED")
            raise HTTPException(
                status_code=400,
                detail="The downloaded file is not a valid supported image.",
            ) from exc

        logger.info(
            "IMAGE PREPARED in %.2f seconds; dimensions=%s",
            time.perf_counter() - image_started,
            image.size,
        )

       
        inference_started = time.perf_counter()

        logger.info(
            "YOLO INFERENCE QUEUED; image_size=%s; imgsz=416",
            image.size,
        )

        try:
            with inference_lock:
                logger.info("YOLO INFERENCE STARTED")

                prediction = model.predict(
                    source=image,
                    conf=0.20,
                    imgsz=416,
                    verbose=False,
                    device="cpu",
                )[0]

                logger.info(
                    "YOLO INFERENCE FINISHED in %.2f seconds",
                    time.perf_counter() - inference_started,
                )

        except Exception:
            logger.exception("YOLO INFERENCE FAILED")
            raise
        objects = []

        if prediction.boxes is not None:
            for box in prediction.boxes:
                class_id = int(box.cls[0])

                objects.append({
                    "name": model.names[class_id],
                    "confidence": round(
                        float(box.conf[0]), 4
                    ),
                    "box": [
                        round(float(value), 2)
                        for value in box.xyxy[0].tolist()
                    ],
                })

        total_time = time.perf_counter() - started

        logger.info(
            "ANALYZE COMPLETED in %.2f seconds; objects=%d",
            total_time,
            len(objects),
        ) 

        return {
            "success": True,
            "objects": objects,
            "object_count": len(objects),
            "processing_seconds": round(total_time, 2),
        }

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception("UNEXPECTED ML ANALYSIS ERROR")

        raise HTTPException(
            status_code=500,
            detail=f"Image analysis failed: {type(exc).__name__}: {exc}",
        ) from exc
  