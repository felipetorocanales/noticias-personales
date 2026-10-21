import os
import json
import urllib.request
import textwrap
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def get_font(font_name, size, fallback_name="arial.ttf"):
    fonts_dir = "C:\\Windows\\Fonts"
    path = os.path.join(fonts_dir, font_name)
    if os.path.exists(path):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    fallback_path = os.path.join(fonts_dir, fallback_name)
    if os.path.exists(fallback_path):
        try:
            return ImageFont.truetype(fallback_path, size)
        except Exception:
            pass
    return ImageFont.load_default()

def create_instagram_card(article, output_path="public/instagram_posts/preview.jpg"):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Dimensiones estándar de Instagram Portrait (4:5)
    WIDTH = 1080
    HEIGHT = 1350
    
    # Colores base
    BG_COLOR = (13, 17, 23)        # #0d1117 (Dark navy/charcoal)
    CARD_BG = (22, 27, 34)         # #161b22
    ACCENT_CYAN = (56, 189, 248)   # #38bdf8
    ACCENT_GOLD = (245, 158, 11)   # #f59e0b
    TEXT_PRIMARY = (243, 246, 252)
    TEXT_MUTED = (148, 163, 184)
    BORDER_COLOR = (48, 54, 61)
    
    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)
    
    # 1. Cabecera Superior: Logo "Pulso." y Categoría
    font_logo = get_font("georgiab.ttf", 52, "arialbd.ttf")
    font_category = get_font("segoeuib.ttf", 26, "arialbd.ttf")
    font_source = get_font("segoeui.ttf", 28, "arial.ttf")
    font_title = get_font("georgiab.ttf", 46, "arialbd.ttf")
    font_summary = get_font("segoeui.ttf", 30, "arial.ttf")
    font_footer = get_font("segoeuib.ttf", 24, "arialbd.ttf")
    
    # Logo
    draw.text((60, 50), "Pulso", fill=TEXT_PRIMARY, font=font_logo)
    # Punto dorado
    logo_width = draw.textlength("Pulso", font=font_logo)
    draw.text((60 + logo_width, 50), ".", fill=ACCENT_GOLD, font=font_logo)
    
    # Badge de Categoría
    category_text = article.get("category", "Actualidad").upper()
    is_cycling = "ciclismo" in category_text.lower()
    cat_badge = f"🚴 {category_text}" if is_cycling else f"🔥 {category_text}"
    cat_color = ACCENT_CYAN if is_cycling else ACCENT_GOLD
    
    cat_width = draw.textlength(cat_badge, font=font_category)
    badge_x = WIDTH - 60 - cat_width - 30
    draw.rounded_rectangle([badge_x, 52, WIDTH - 60, 102], radius=25, fill=CARD_BG, outline=BORDER_COLOR, width=2)
    draw.text((badge_x + 15, 62), cat_badge, fill=cat_color, font=font_category)
    
    # 2. Imagen Principal de la Noticia (Aspect ratio 16:9 o 4:3 con bordes redondeados)
    image_url = article.get("image")
    img_y_start = 130
    img_h = 580
    img_w = WIDTH - 120
    
    loaded_photo = None
    if image_url:
        try:
            req = urllib.request.Request(image_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=8) as r:
                raw_img = Image.open(BytesIO(r.read())).convert("RGB")
                # Crop and resize to fill img_w x img_h
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
            print("Error cargando foto para Instagram:", e)
            
    if loaded_photo:
        mask = Image.new("L", (img_w, img_h), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle([0, 0, img_w, img_h], radius=24, fill=255)
        img.paste(loaded_photo, (60, img_y_start), mask)
        draw.rounded_rectangle([60, img_y_start, 60 + img_w, img_y_start + img_h], radius=24, outline=BORDER_COLOR, width=2)
    else:
        draw.rounded_rectangle([60, img_y_start, 60 + img_w, img_y_start + img_h], radius=24, fill=CARD_BG, outline=BORDER_COLOR, width=2)
        draw.text((WIDTH // 2 - 140, img_y_start + 260), "COBERTURA PERIODÍSTICA", fill=TEXT_MUTED, font=font_category)

    # 3. Metadatos de la Fuente
    meta_y = img_y_start + img_h + 35
    src_text = f"Fuente: {article.get('sourceName', 'Prensa Independiente')} · {article.get('publishedAt', '')[:10]}"
    draw.text((60, meta_y), src_text, fill=ACCENT_CYAN, font=font_source)
    
    # 4. Titular Principal (Wrap automático)
    title_y = meta_y + 45
    raw_title = article.get("title", "")
    wrapped_title = textwrap.fill(raw_title, width=38)
    lines_title = wrapped_title.split("\n")[:4]
    
    for line in lines_title:
        draw.text((60, title_y), line, fill=TEXT_PRIMARY, font=font_title)
        title_y += 58
        
    # 5. Bajada / Resumen
    summary_y = title_y + 20
    raw_summary = article.get("summary", "")
    wrapped_summary = textwrap.fill(raw_summary, width=54)
    lines_summary = wrapped_summary.split("\n")[:3]
    
    for line in lines_summary:
        draw.text((60, summary_y), line, fill=TEXT_MUTED, font=font_summary)
        summary_y += 42
        
    # 6. Pie de Publicación (CTA)
    footer_box_y = HEIGHT - 110
    draw.line([(60, footer_box_y - 20), (WIDTH - 60, footer_box_y - 20)], fill=BORDER_COLOR, width=1)
    
    cta_text = "🔗 Lee el reportaje completo en el enlace de la bio"
    url_text = "noticias-personales-cl.web.app"
    draw.text((60, footer_box_y), cta_text, fill=TEXT_PRIMARY, font=font_footer)
    draw.text((WIDTH - 60 - draw.textlength(url_text, font=font_footer), footer_box_y), url_text, fill=ACCENT_GOLD, font=font_footer)
    
    img.save(output_path, "JPEG", quality=95)
    print(f"[OK] Tarjeta Instagram generada exitosamente en: {output_path}")
    return output_path

if __name__ == "__main__":
    with open("public/data/initial-feeds.json", encoding="utf-8") as f:
        data = json.load(f)
    
    # Buscar el mejor artículo con foto de Ciclismo o Alto Impacto
    sample = None
    for a in data["articles"]:
        if a.get("image") and a.get("category") == "Ciclismo y Deporte":
            sample = a
            break
            
    if not sample:
        for a in data["articles"]:
            if a.get("image"):
                sample = a
                break
                
    if sample:
        create_instagram_card(sample)
