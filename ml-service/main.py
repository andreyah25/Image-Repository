from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pathlib import Path
import requests
import uuid
import os
import traceback
from object_detector import detect_objects
from face_detector import detect_faces


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "https://captured-photo-studio.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    image_url: str

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Captured Studio ML Service"
    }


@app.post("/analyze")
def analyze_image(request: AnalyzeRequest):

    image_path = None

    try:

        print("=================================")
        print("ML ANALYSIS STARTED")
        print("Image URL:", request.image_url)
        print("=================================")

        print("Downloading image from Supabase...")

        response = requests.get(
            request.image_url,
            timeout=30
        )

        print(
            "Supabase image response:",
            response.status_code
        )

        if response.status_code != 200:
            raise Exception(
                f"Could not download image. HTTP {response.status_code}"
            )

        print("Image downloaded successfully.")

        temp_dir = Path("temp_images")
        temp_dir.mkdir(exist_ok=True)

        filename = f"{uuid.uuid4()}.jpg"
        image_path = temp_dir / filename

        with open(image_path, "wb") as file:
            file.write(response.content)

        print("Image saved:", image_path)

        print("Starting object detection...")

        objects = detect_objects(
            str(image_path)
        )

        print("Objects:", objects)

        print("Starting face detection...")

        faces = detect_faces(
            str(image_path)
        )

        print("Faces:", faces)
        print("Face count:", len(faces))

        print("=================================")
        print("ML ANALYSIS COMPLETE")
        print("=================================")

        return {
            "success": True,
            "objects": objects,
            "faces": faces,
            "face_count": len(faces)
        }

    except Exception as error:

        print("=================================")
        print("ML ANALYSIS FAILED")
        print("ERROR:", repr(error))
        print("=================================")

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    finally:

        if image_path and image_path.exists():

            try:
                image_path.unlink()
                print("Temporary image deleted.")
            except Exception as cleanup_error:
                print(
                    "Could not delete temporary image:",
                    cleanup_error
                )