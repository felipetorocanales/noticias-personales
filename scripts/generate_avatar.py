import os
import math
from PIL import Image, ImageDraw, ImageFont

def generate_profile_avatar(output_path="public/pulso_avatar_editorial.png"):
    size = 1080
    img = Image.new("RGBA", (size, size), (11, 14, 20, 255)) # #0B0E14
    draw = ImageDraw.Draw(img)

    center = size // 2
    radius = size // 2 - 40

    # 1. Subtle Radial Glow in center
    for r in range(radius, 0, -8):
        alpha = int(35 * (1 - r / radius))
        draw.ellipse([center - r, center - r, center + r, center + r], fill=(245, 158, 11, alpha))

    # 2. Sleek Circular Border
    border_color = (255, 255, 255, 30)
    draw.ellipse([center - radius, center - radius, center + radius, center + radius], outline=border_color, width=4)

    # Accent ring arc (amber-gold glow)
    draw.arc([center - radius, center - radius, center + radius, center + radius], start=210, end=330, fill=(245, 158, 11, 200), width=6)
    draw.arc([center - radius, center - radius, center + radius, center + radius], start=30, end=120, fill=(16, 185, 129, 180), width=6)

    # 3. Dynamic Pulse Wave across the center
    wave_points = [
        (220, 580),
        (380, 580),
        (430, 580),
        (470, 530),
        (510, 650),
        (550, 470),
        (590, 630),
        (620, 580),
        (670, 580),
        (860, 580)
    ]
    # Draw soft pulse glow behind
    for offset in range(6, 0, -2):
        draw.line(wave_points, fill=(245, 158, 11, 40), width=14 + offset * 2, joint="curve")
    # Crisp pulse line
    draw.line(wave_points, fill=(245, 158, 11, 230), width=8, joint="curve")

    # 4. Serif Typography: "PULSO"
    font_large = ImageFont.truetype("C:/Windows/Fonts/georgiab.ttf", 160)
    font_sub = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 36)

    text_brand = "PULSO"
    bbox = draw.textbbox((0, 0), text_brand, font=font_large)
    w_brand = bbox[2] - bbox[0]
    h_brand = bbox[3] - bbox[1]
    
    brand_x = (size - w_brand) // 2
    brand_y = 330
    
    # Shadow
    draw.text((brand_x + 3, brand_y + 4), text_brand, fill=(0, 0, 0, 160), font=font_large)
    # Text Primary
    draw.text((brand_x, brand_y), text_brand, fill=(243, 246, 252, 255), font=font_large)

    # Accent Gold Dot next to PULSO
    dot_x = brand_x + w_brand + 8
    dot_y = brand_y + h_brand - 18
    draw.ellipse([dot_x, dot_y, dot_x + 24, dot_y + 24], fill=(245, 158, 11, 255))

    # 5. Subtitle "INDEPENDIENTE"
    sub_text = "PERIODISMO INDEPENDIENTE"
    s_bbox = draw.textbbox((0, 0), sub_text, font=font_sub)
    s_w = s_bbox[2] - s_bbox[0]
    s_x = (size - s_w) // 2
    s_y = 700
    draw.text((s_x, s_y), sub_text, fill=(168, 179, 207, 220), font=font_sub)

    # Convert to RGB and save
    final_img = Image.new("RGB", (size, size), (11, 14, 20))
    final_img.paste(img, (0, 0), img)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    final_img.save(output_path, "PNG", quality=95)
    print(f"[OK] Avatar generado en: {output_path}")

def generate_profile_avatar_monogram(output_path="public/pulso_avatar_monogram.png"):
    size = 1080
    img = Image.new("RGBA", (size, size), (11, 14, 20, 255))
    draw = ImageDraw.Draw(img)

    center = size // 2
    radius = size // 2 - 30

    # Gradient rings
    for r in range(radius, radius - 80, -2):
        progress = (radius - r) / 80.0
        alpha = int(40 * progress)
        draw.ellipse([center - r, center - r, center + r, center + r], fill=(245, 158, 11, alpha))

    # Clean outer circle ring
    draw.ellipse([center - radius, center - radius, center + radius, center + radius], outline=(245, 158, 11, 180), width=6)

    # Large Monogram 'P'
    font_mono = ImageFont.truetype("C:/Windows/Fonts/georgiab.ttf", 460)
    text = "P"
    bbox = draw.textbbox((0, 0), text, font=font_mono)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    px = (size - w) // 2 - 40
    py = (size - h) // 2 - 40

    # Monogram shadow & body
    draw.text((px + 6, py + 8), text, fill=(0, 0, 0, 180), font=font_mono)
    draw.text((px, py), text, fill=(243, 246, 252, 255), font=font_mono)

    # Glowing amber dot
    dot_radius = 42
    dot_center_x = px + w + 35
    dot_center_y = py + h - 15
    for dr in range(dot_radius + 25, 0, -3):
        d_alpha = int(35 * (1 - dr / (dot_radius + 25)))
        draw.ellipse([dot_center_x - dr, dot_center_y - dr, dot_center_x + dr, dot_center_y + dr], fill=(245, 158, 11, d_alpha))
    draw.ellipse([dot_center_x - dot_radius, dot_center_y - dot_radius, dot_center_x + dot_radius, dot_center_y + dot_radius], fill=(245, 158, 11, 255))

    # Save
    final_img = Image.new("RGB", (size, size), (11, 14, 20))
    final_img.paste(img, (0, 0), img)
    final_img.save(output_path, "PNG", quality=95)
    print(f"[OK] Monograma generado en: {output_path}")

if __name__ == "__main__":
    generate_profile_avatar()
    generate_profile_avatar_monogram()
