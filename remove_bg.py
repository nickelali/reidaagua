import rembg
import os
from PIL import Image

input_path = "assets/hero_jugs.jpg"
output_path = "assets/jugs_requinte_v3.png"

print(f"Reading {input_path}...")
try:
    with open(input_path, 'rb') as i:
        input_data = i.read()

    print("Removing background with alpha matting for better precision (islands)...")
    # alpha_matting=True helps with fine details like the inside of a handle
    output_data = rembg.remove(
        input_data, 
        alpha_matting=True,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=10
    )

    print(f"Saving to {output_path}...")
    with open(output_path, 'wb') as o:
        o.write(output_data)

    print("Done!")
except Exception as e:
    print(f"Error: {e}")
