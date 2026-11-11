import os
import json
import urllib.request
import textwrap
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def get_font(font_name, size, fallback_name="arial.ttf"):
    possible_dirs = [
        "C:\\Windows\\Fonts",
        "/usr/share/fonts/truetype/dejavu",
        "/usr/share/fonts/truetype/freefont",
        "/usr/share/fonts/truetype",
        "/usr/share/fonts"
    ]
    for d in possible_dirs:
        if os.path.exists(d):
            for candidate in [font_name, fallback_name, "DejaVuSerif-Bold.ttf", "DejaVuSans-Bold.ttf", "DejaVuSans.ttf"]:
                p = os.path.join(d, candidate)
                if os.path.exists(p):
                    try:
                        return ImageFont.truetype(p, size)
                    except Exception:
                        pass
    try:
        return ImageFont.load_default(size=size)
    except Exception:
        return ImageFont.load_default()

def create_instagram_card(article, output_path="public/instagram_posts/preview.jpg"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Dimensiones estándar de Instagram Portrait (4:5)
    WIDTH = 1080
    HEIGHT = 1350
    
    # Paleta de colores editorial Pulso
    BG_COLOR = (11, 14, 20)        # #0b0e14 pizarra oscura
    CARD_BG = (18, 23, 34)         # #121722
    ACCENT_CYAN = (56, 189, 248)   # #38bdf8
    ACCENT_GOLD = (245, 158, 11)   # #f59e0b
    TEXT_PRIMARY = (243, 246, 252) # #f3f6fc
    TEXT_MUTED = (168, 179, 207)   # #a8b3cf
    BORDER_COLOR = (35, 43, 58)    # borde sutil
    
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # Tipografías limpias y cross-platform
    font_logo = get_font("georgiab.ttf", 52, "arialbd.ttf")
    font_category = get_font("segoeuib.ttf", 24, "arialbd.ttf")
    font_source = get_font("segoeui.ttf", 26, "arial.ttf")
    font_title = get_font("georgiab.ttf", 46, "arialbd.ttf")
    font_summary = get_font("segoeui.ttf", 29, "arial.ttf")
    font_footer_left = get_font("segoeui.ttf", 23, "arial.ttf")
    font_footer_url = get_font("segoeuib.ttf", 25, "arialbd.ttf")
    
    # 1. Cabecera Superior (0 a 115 px): Logo "Pulso." y Categoría
    draw.text((55, 42), "Pulso", fill=TEXT_PRIMARY, font=font_logo)
    logo_w = draw.textlength("Pulso", font=font_logo)
    draw.text((55 + logo_w, 42), ".", fill=ACCENT_GOLD, font=font_logo)
    
    # Badge de Categoría (usando bullet ● para evitar emojis rotos [] en Linux)
    category_text = article.get("category", "Actualidad").upper()
    is_cycling = "ciclismo" in category_text.lower()
    cat_badge = f"● {category_text}"
    cat_color = ACCENT_CYAN if is_cycling else ACCENT_GOLD
    
    cat_w = draw.textlength(cat_badge, font=font_category)
    badge_pad_x = 18
    badge_box_w = cat_w + (badge_pad_x * 2)
    badge_x = WIDTH - 55 - badge_box_w
    draw.rounded_rectangle([badge_x, 44, WIDTH - 55, 94], radius=25, fill=CARD_BG, outline=BORDER_COLOR, width=1)
    draw.text((badge_x + badge_pad_x, 56), cat_badge, fill=cat_color, font=font_category)
    
    # 2. Imagen Principal FULL-BLEED HORIZONTAL (Ocupa el 100% del ancho, de 0 a 1080 px)
    image_url = article.get("image")
    img_y_start = 115
    img_h = 590
    img_w = WIDTH  # Ancho total sin marcos negros a los lados
    
    loaded_photo = None
    if image_url:
        try:
            req = urllib.request.Request(image_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, timeout=10) as r:
                raw_img = Image.open(BytesIO(r.read())).convert("RGB")
                w, h = raw_img.size
                target_ratio = img_w / img_h
                current_ratio = w / h
                if current_ratio > target_ratio:
                    new_w = int(h * target_ratio)
                    offset = (w - new_w) // 2
                    raw_img = raw_img.crop((offset, 0, offset + new_w, h))
                else:
                    new_h = int(w / target_ratio)
                    offset = (h - new_h) // 2
                    raw_img = raw_img.crop((0, offset, w, offset + new_h))
                loaded_photo = raw_img.resize((img_w, img_h), Image.Resampling.LANCZOS)
        except Exception as e:
            print("[IMAGEN] Error descargando foto original:", e)
            
    if loaded_photo:
        img.paste(loaded_photo, (0, img_y_start))
        # Línea divisoria sutil arriba y abajo de la foto
        draw.line([(0, img_y_start), (WIDTH, img_y_start)], fill=BORDER_COLOR, width=1)
        draw.line([(0, img_y_start + img_h), (WIDTH, img_y_start + img_h)], fill=BORDER_COLOR, width=1)
    else:
        # Fallback si la imagen no carga
        draw.rectangle([0, img_y_start, WIDTH, img_y_start + img_h], fill=CARD_BG)
        draw.text((WIDTH // 2 - 140, img_y_start + 270), "COBERTURA PERIODÍSTICA", fill=TEXT_MUTED, font=font_category)
        draw.line([(0, img_y_start), (WIDTH, img_y_start)], fill=BORDER_COLOR, width=1)
        draw.line([(0, img_y_start + img_h), (WIDTH, img_y_start + img_h)], fill=BORDER_COLOR, width=1)

    # 3. Metadatos de la Fuente
    meta_y = img_y_start + img_h + 30
    country = article.get("country")
    source_name = article.get('sourceName', 'Prensa Independiente')
    if country and country != "Chile":
        src_label = f"{source_name} ({country})"
    else:
        src_label = source_name
    src_text = f"Fuente: {src_label} · {article.get('publishedAt', '')[:10]}"
    draw.text((55, meta_y), src_text, fill=ACCENT_CYAN, font=font_source)
    
    # 4. Titular Principal
    title_y = meta_y + 42
    raw_title = article.get("title", "")
    wrapped_title = textwrap.fill(raw_title, width=37)
    lines_title = wrapped_title.split("\n")[:4]
    
    for line in lines_title:
        draw.text((55, title_y), line, fill=TEXT_PRIMARY, font=font_title)
        title_y += 56
        
    # 5. Bajada / Resumen (Garantizando texto completo sin letras cortadas)
    summary_y = title_y + 18
    raw_summary = (article.get("summary") or "").strip()
    if raw_summary:
        raw_summary = raw_summary[0].upper() + raw_summary[1:]
    wrapped_summary = textwrap.fill(raw_summary, width=53)
    lines_summary = wrapped_summary.split("\n")[:3]
    
    for line in lines_summary:
        draw.text((55, summary_y), line, fill=TEXT_MUTED, font=font_summary)
        summary_y += 39
        
    # 6. Pie de Publicación (CTA) - Diseño amplio con separación garantizada
    footer_y = HEIGHT - 80
    draw.line([(55, footer_y - 25), (WIDTH - 55, footer_y - 25)], fill=BORDER_COLOR, width=1)
    
    # Texto de la izquierda (sin emojis para compatibilidad total)
    cta_text = "Reportaje completo en la bio"
    draw.text((55, footer_y), cta_text, fill=TEXT_PRIMARY, font=font_footer_left)
    
    # Dominio a la derecha (en píldora o texto ámbar asegurando margen)
    url_text = "pulso-independiente.web.app"
    url_w = draw.textlength(url_text, font=font_footer_url)
    url_x = WIDTH - 55 - url_w
    draw.text((url_x, footer_y), url_text, fill=ACCENT_GOLD, font=font_footer_url)
    
    img.save(output_path, "JPEG", quality=95)
    print(f"[OK] Tarjeta Instagram generada exitosamente en: {output_path}")
    return output_path

if __name__ == "__main__":
    with open("public/data/initial-feeds.json", encoding="utf-8") as f:
        data = json.load(f)
    
    # Buscar el artículo de Pogacar o Ciclismo para probar el resultado
    sample = None
    for a in data["articles"]:
        if "Pogacar" in a.get("title", "") or a.get("category") == "Ciclismo y Deporte":
            sample = a
            break
            
    if not sample:
        for a in data["articles"]:
            if a.get("image"):
                sample = a
                break

    if sample:
        create_instagram_card(sample, "public/instagram_posts/preview.jpg")
