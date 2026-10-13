import cv2
from insightface.app import FaceAnalysis


face_app = FaceAnalysis(
    name="buffalo_l",
    providers=["CPUExecutionProvider"]
)

face_app.prepare(
    ctx_id=0,
    det_size=(640, 640)
)


def detect_faces(image_path):

    image = cv2.imread(image_path)

    if image is None:
        raise ValueError("Could not read image.")

    faces = face_app.get(image)

    detected_faces = []

    for index, face in enumerate(faces):

        x1, y1, x2, y2 = face.bbox

        detected_faces.append({
            "face_index": index,
            "x": int(x1),
            "y": int(y1),
            "width": int(x2 - x1),
            "height": int(y2 - y1)
        })

    return detected_faces