from pathlib import Path
from io import BytesIO
from datetime import datetime, timezone
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor

import logging
import os
import threading
import time
import requests

from PIL import Image, ImageOps
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from ultralytics import YOLO
import torch


# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("captured-ml")


# PyTorch CPU settings
TORCH_THREADS = max(
    1,
    int(os.getenv("ML_TORCH_THREADS", "2"))
)

torch.set_num_threads(TORCH_THREADS)
torch.set_num_interop_threads(1)

logger.info("PyTorch threads: %s", TORCH_THREADS)
BASE_DIR = Path(__file__).resolve().parent

# Preserve your current model path.
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

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

BATCH_SIZE = max(1, min(int(os.getenv("ML_BATCH_SIZE", "4")), 8))
QUEUE_POLL_SECONDS = 2
MAX_ATTEMPTS = 3
MAX_IMAGE_BYTES = 15 * 1024 * 1024

inference_lock = threading.Lock()
stop_worker = threading.Event()
worker_started = threading.Event()

app = FastAPI(title="Captured Object Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://captured-admin-studio.onrender.com",
        "https://captured-photo-studio.onrender.com",
        "https://capturedstudios.store",
        "https://www.capturedstudios.store",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "apikey"],
)


class AnalyzeRequest(BaseModel):
    image_url: HttpUrl


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def supabase_headers(prefer=None):
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }

    if prefer:
        headers["Prefer"] = prefer

    return headers


def update_queue_job(job_id, values):
    response = requests.patch(
        f"{SUPABASE_URL}/rest/v1/ml_detection_jobs",
        params={"id": f"eq.{job_id}"},
        json=values,
        headers=supabase_headers("return=minimal"),
        timeout=20,
    )
    response.raise_for_status()


def update_photo(photo_id, values):
    response = requests.patch(
        f"{SUPABASE_URL}/rest/v1/repository_photos",
        params={"id": f"eq.{photo_id}"},
        json=values,
        headers=supabase_headers("return=minimal"),
        timeout=20,
    )
    response.raise_for_status()


def claim_jobs():
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/claim_ml_detection_jobs",
        json={"p_limit": BATCH_SIZE},
        headers=supabase_headers(),
        timeout=30,
    )
    response.raise_for_status()
    return response.json() or []


def download_storage_image(storage_path):
    encoded_path = quote(storage_path, safe="/")

    response = requests.get(
        f"{SUPABASE_URL}/storage/v1/object/authenticated/"
        f"client-photos/{encoded_path}",
        headers={
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        },
        timeout=(15, 90),
        stream=True,
    )
    response.raise_for_status()

    image_bytes = bytearray()

    for chunk in response.iter_content(chunk_size=65536):
        if not chunk:
            continue

        image_bytes.extend(chunk)

        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise ValueError("Image exceeds the 15 MB limit.")

    with Image.open(BytesIO(image_bytes)) as source:
        if source.width * source.height > 50_000_000:
            raise ValueError("Image dimensions exceed the supported limit.")

        if source.format == "JPEG":
            source.draft("RGB", (1280, 1280))

        source.load()

        image = ImageOps.exif_transpose(source)
        image.thumbnail((1280, 1280))

        return image.convert("RGB").copy()


def extract_objects(prediction):
    objects = []

    if prediction.boxes is None:
        return objects

    for box in prediction.boxes:
        class_id = int(box.cls[0])

        objects.append({
            "name": model.names[class_id],
            "confidence": round(float(box.conf[0]), 4),
            "box": [
                round(float(value), 2)
                for value in box.xyxy[0].tolist()
            ],
        })

    return objects


def handle_job_failure(job, error):
    attempts = int(job.get("attempts") or 1)
    message = str(error)[:1000]

    if attempts < MAX_ATTEMPTS:
        update_queue_job(
            job["id"],
            {
                "status": "queued",
                "error_message": message,
                "started_at": None,
            },
        )

        logger.warning(
            "Job requeued: %s, attempt %s/%s",
            job["id"],
            attempts,
            MAX_ATTEMPTS,
        )

    else:
        update_queue_job(
            job["id"],
            {
                "status": "failed",
                "error_message": message,
                "completed_at": utc_now(),
            },
        )

        update_photo(
            job["photo_id"],
            {"processing_status": "failed"},
        )

        logger.error(
            "Job permanently failed: %s - %s",
            job["id"],
            message,
        )

def process_job_batch(jobs):
    if not jobs:
        return

    logger.info("Processing detection batch: %s jobs", len(jobs))

    # Mark jobs as actively processing
    for job in jobs:
        try:
            update_photo(
                job["photo_id"],
                {
                    "processing_status": "processing"
                },
            )
        except Exception:
            logger.exception(
                "Could not mark photo as processing: %s",
                job["photo_id"],
            )

    download_started = time.perf_counter()
    valid_jobs = []
    images = []
    # Download and prepare photos concurrently.
    with ThreadPoolExecutor(
        max_workers=min(len(jobs), BATCH_SIZE)
    ) as executor:

        futures = [
            executor.submit(
                download_storage_image,
                job["storage_path"],
            )
            for job in jobs
        ]

        for job, future in zip(jobs, futures):
            try:
                image = future.result()
                valid_jobs.append(job)
                images.append(image)

            except Exception as exc:
                logger.exception(
                    "Image preparation failed: %s",
                    job["photo_id"],
                )

                try:
                    handle_job_failure(job, exc)
                except Exception:
                    logger.exception("Could not update failed job.")

    logger.info(
        "Image preparation completed: %s images in %.2f seconds",
        len(images),
        time.perf_counter() - download_started,
    )

    if not valid_jobs:
        return
    # Run one YOLO prediction call for the batch.
    try:
        inference_started = time.perf_counter()

        with inference_lock:
            predictions = model.predict(
                source=images,
                batch=len(images),
                conf=0.20,
                imgsz=416,
                verbose=False,
                device="cpu",
            )

        if len(predictions) != len(valid_jobs):
            raise RuntimeError(
                "YOLO result count does not match the image count."
            )

        logger.info(
            "YOLO batch completed: %s images in %.2f seconds",
            len(images),
            time.perf_counter() - inference_started,
        )

    except Exception as exc:
        logger.exception("YOLO batch inference failed.")

        for job in valid_jobs:
            try:
                handle_job_failure(job, exc)
            except Exception:
                logger.exception("Could not update failed job.")

        return

    # Save each image's result separately.
    for job, prediction in zip(valid_jobs, predictions):
        try:
            objects = extract_objects(prediction)

            update_photo(
                job["photo_id"],
                {
                    "processing_status": "completed",
                    "detected_objects": objects,
                    "ml_processed_at": utc_now(),
                },
            )

            update_queue_job(
                job["id"],
                {
                    "status": "completed",
                    "error_message": None,
                    "completed_at": utc_now(),
                },
            )

            logger.info(
                "Photo completed: %s, detected objects: %s",
                job["photo_id"],
                len(objects),
            )

        except Exception as exc:
            logger.exception(
                "Could not save result for photo: %s",
                job["photo_id"],
            )

            try:
                handle_job_failure(job, exc)
            except Exception:
                logger.exception("Could not update failed job.")


def queue_worker():
    logger.info(
        "Detection queue worker started. Batch size: %s",
        BATCH_SIZE,
    )

    worker_started.set()

    while not stop_worker.is_set():
        try:
            jobs = claim_jobs()

            if jobs:
                process_job_batch(jobs)
            else:
                stop_worker.wait(QUEUE_POLL_SECONDS)

        except Exception:
            logger.exception("Queue worker error.")
            stop_worker.wait(5)


@app.on_event("startup")
def start_worker():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        logger.warning(
            "Queue worker disabled. Configure SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY in Render."
        )
        return

    # Warm up YOLO before processing the first job.
    try:
        model.predict(
            source=Image.new("RGB", (416, 416)),
            imgsz=416,
            conf=0.20,
            verbose=False,
            device="cpu",
        )
        logger.info("YOLO warm-up completed.")

    except Exception:
        logger.exception("YOLO warm-up failed.")

    thread = threading.Thread(
        target=queue_worker,
        daemon=True,
        name="captured-detection-worker",
    )
    thread.start()


@app.on_event("shutdown")
def stop_worker_on_shutdown():
    stop_worker.set()


@app.get("/")
def health_check():
    return {
        "success": True,
        "message": "Captured Object Detection API is running",
        "model_loaded": True,
        "queue_worker_enabled": bool(
            SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
        ),
        "queue_worker_started": worker_started.is_set(),
        "batch_size": BATCH_SIZE,
        "classes": model.names,
    }


@app.get("/health")
def health():
    return {"success": True}


# Keep this endpoint for existing callers.
@app.post("/analyze")
def analyze_image(request: AnalyzeRequest):
    started = time.perf_counter()

    try:
        image_url = str(request.image_url)

        if not image_url.startswith("https://"):
            raise HTTPException(
                status_code=400,
                detail="A valid HTTPS image URL is required.",
            )

        with requests.get(
            image_url,
            timeout=(15, 90),
            stream=True,
            allow_redirects=True,
        ) as response:

            response.raise_for_status()

            content_type = response.headers.get("Content-Type", "")

            if not content_type.lower().startswith("image/"):
                raise HTTPException(
                    status_code=400,
                    detail="The URL did not return an image.",
                )

            image_bytes = bytearray()

            for chunk in response.iter_content(chunk_size=65536):
                if chunk:
                    image_bytes.extend(chunk)

                    if len(image_bytes) > MAX_IMAGE_BYTES:
                        raise HTTPException(
                            status_code=413,
                            detail="Image exceeds the 15 MB limit.",
                        )

        with Image.open(BytesIO(image_bytes)) as source:
            if source.width * source.height > 50_000_000:
                raise HTTPException(
                    status_code=413,
                    detail="Image dimensions exceed the supported limit.",
                )

            if source.format == "JPEG":
                source.draft("RGB", (1280, 1280))

            source.load()

            image = ImageOps.exif_transpose(source)
            image.thumbnail((1280, 1280))
            image = image.convert("RGB")

        with inference_lock:
            prediction = model.predict(
                source=image,
                conf=0.20,
                imgsz=416,
                verbose=False,
                device="cpu",
            )[0]

        objects = extract_objects(prediction)

        return {
            "success": True,
            "objects": objects,
            "object_count": len(objects),
            "processing_seconds": round(
                time.perf_counter() - started,
                2,
            ),
        }

    except HTTPException:
        raise

    except requests.RequestException as exc:
        logger.exception("Image download failed.")

        raise HTTPException(
            status_code=502,
            detail=f"Could not download image: {exc}",
        ) from exc

    except Exception as exc:
        logger.exception("Unexpected ML analysis error.")

        raise HTTPException(
            status_code=500,
            detail=f"Image analysis failed: {type(exc).__name__}: {exc}",
        ) from exc
