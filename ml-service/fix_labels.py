from pathlib import Path

ROOT = Path("tags_v2/labels")

removed_chair = 0
remapped_baby = 0
remapped_candle = 0

for file in ROOT.rglob("*.txt"):
    lines = file.read_text(encoding="utf-8").splitlines()
    new_lines = []

    for line in lines:
        parts = line.split()

        if not parts:
            continue

        class_id = int(parts[0])

        if class_id == 10:
            removed_chair += 1
            continue

        if class_id == 11:
            parts[0] = "10"
            remapped_baby += 1

        elif class_id == 12:
            parts[0] = "11"
            remapped_candle += 1

        new_lines.append(" ".join(parts))

    file.write_text(
        "\n".join(new_lines) + ("\n" if new_lines else ""),
        encoding="utf-8"
    )

print("Removed chair annotations:", removed_chair)
print("Remapped baby annotations:", remapped_baby)
print("Remapped candle annotations:", remapped_candle)
print("Done.")