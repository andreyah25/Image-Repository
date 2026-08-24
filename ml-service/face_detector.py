import cv2


# Load OpenCV's built-in face detector
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades +
    "haarcascade_frontalface_default.xml"
)


def detect_faces(image_path):
    image = cv2.imread(image_path)

    if image is None:
        raise ValueError("Could not read image.")

    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY
    )

    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(30, 30)
    )

    detected_faces = []

    for index, (x, y, width, height) in enumerate(faces):

        detected_faces.append({
            "face_index": index,
            "x": int(x),
            "y": int(y),
            "width": int(width),
            "height": int(height)
        })

    return detected_faces