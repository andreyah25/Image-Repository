from object_detector import detect_objects

image_path = r"tags_v2\images\val\photo 41.jpg"

print("=================================")
print("TESTING tags_v2 MODEL")
print("IMAGE:", image_path)
print("=================================")

objects = detect_objects(image_path)

print()
print("FINAL RESULT:")
print(objects)