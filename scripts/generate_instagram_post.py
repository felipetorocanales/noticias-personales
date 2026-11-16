import os
import json
import urllib.request
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

FONTS_DIR = os.path.join(os.path.dirname(__file__), "fonts")

def get_font(font_name, size, fallback_name="DejaVuSans.ttf"):
    # 1. Prioridad: fuentes empaquetadas en fonts/ con soporte UTF-8 completo (á, é, í, ó, ú, ñ)
    is_bold = "bold" in (font_name + (fallback_name or "")).lower() or "b.ttf" in font_name
    search_names = [font_name]
    if fallback_name:
        search_names.append(fallback_name)
    if is_bold:
        search_names.extend(["RobotoCondensed-Bold.ttf", "DejaVuSans-Bold.ttf", "DejaVuSerif-Bold.ttf"])
    else:
        search_names.extend(["DejaVuSans.ttf", "DejaVuSerif.ttf"])

    for candidate in search_names:
        p = os.path.join(FONTS_DIR, candidate)
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                pass

    # 2. Directorios del sistema (Windows / Linux)
    possible_dirs = [
        "C:\\Windows\\Fonts",
        "/usr/share/fonts/truetype/roboto/unhinted",
        "/usr/share/fonts/truetype/dejavu",
        "/usr/share/fonts/truetype/freefont",
        "/usr/share/fonts/truetype",
        "/usr/share/fonts"
    ]
    for d in possible_dirs:
        if os.path.exists(d):
            for candidate in search_names:
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


def _wrap_words_by_pixels(draw, words, font, max_width):
    """Agrupa lista de (palabra, color) en líneas que no superen max_width."""
    lines = []
    current_line = []
    space_w = draw.textlength(" ", font=font)

    for word, color in words:
        test_line = current_line + [(word, color)]
        line_w = sum(draw.textlength(w, font=font) for w, _ in test_line) + space_w * (len(test_line) - 1)
        if line_w <= max_width or not current_line:
            current_line = test_line
        else:
            lines.append(current_line)
            current_line = [(word, color)]
    if current_line:
        lines.append(current_line)
    return lines


def _build_colored_words(headline, highlight_color, primary_color):
    """Colorea en amarillo/ámbar el tramo central o cláusula clave del titular."""
    raw_words = headline.strip().split()
    n = len(raw_words)
    if n <= 4:
        return [(w, primary_color) for w in raw_words]

    # Si hay dos puntos (:), resaltar la segunda parte o primera según longitud
    full_text = " ".join(raw_words)
    if ":" in full_text:
        parts = full_text.split(":", 1)
        left_words = (parts[0] + ":").split()
        right_words = parts[1].strip().split()
        if 3 <= len(right_words) <= 12:
            return [(w, primary_color) for w in left_words] + [(w, highlight_color) for w in right_words]
        elif 2 <= len(left_words) <= 8:
            return [(w, highlight_color) for w in left_words] + [(w, primary_color) for w in right_words]

    # Por defecto: resaltar el bloque central (~40% de las palabras) como en el estilo viral
    start_hl = max(2, int(n * 0.30))
    end_hl = min(n - 2, max(start_hl + 3, int(n * 0.72)))

    colored = []
    for i, w in enumerate(raw_words):
        c = highlight_color if (start_hl <= i < end_hl) else primary_color
        colored.append((w, c))
    return colored


def create_instagram_card(article, output_path="public/instagram_posts/preview.jpg"):
    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    # Dimensiones estándar de Instagram Portrait (4:5)
    WIDTH = 1080
    HEIGHT = 1350

    # Paleta de alto contraste tipo prensa digital viral (Fondo negro puro + blanco + amarillo)
    BG_COLOR = (6, 8, 12)            # Negro profundo
    CARD_BG = (16, 20, 28)
    HIGHLIGHT_YELLOW = (244, 211, 94) # Amarillo editorial de alto impacto
    ACCENT_GOLD = (245, 158, 11)
    TEXT_PRIMARY = (255, 255, 255)   # Blanco puro
    TEXT_MUTED = (165, 175, 195)
    BORDER_COLOR = (32, 38, 50)

    img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # 1. IMAGEN PRINCIPAL SUPERIOR (Ocupa la mitad superior completa: 0 a 640 px)
    image_url = article.get("image")
    img_y_start = 0
    img_h = 640
    img_w = WIDTH

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
    else:
        draw.rectangle([0, img_y_start, WIDTH, img_y_start + img_h], fill=CARD_BG)
        font_fallback = get_font("RobotoCondensed-Bold.ttf", 32)
        draw.text((WIDTH // 2 - 170, img_y_start + 295), "PULSO INDEPENDIENTE", fill=TEXT_MUTED, font=font_fallback)

    # Pequeña píldora flotante en la esquina superior izquierda sobre la foto con el logo "Pulso." y la fuente
    font_badge = get_font("DejaVuSans-Bold.ttf", 22)
    source_name = article.get("sourceName", "Pulso")
    badge_text = f"Pulso. · {source_name}"
    badge_w = draw.textlength(badge_text, font=font_badge)
    draw.rounded_rectangle([32, 28, 32 + badge_w + 36, 74], radius=23, fill=(8, 10, 15))
    draw.text((50, 39), badge_text, fill=HIGHLIGHT_YELLOW, font=font_badge)

    # Línea sutil separadora entre la foto y el bloque tipográfico
    draw.line([(0, img_h), (WIDTH, img_h)], fill=(40, 45, 55), width=2)

    # 2. BLOQUE CENTRAL: SOLO TITULAR GIGANTE CENTRADO (Sin párrafo pequeño de resumen)
    # Todo el detalle y contexto se entrega en el comentario/descripción del post
    raw_title = (article.get("title") or "").strip()
    # Limpiar posibles colas redundantes de nombre del medio al final del título (" - BioBioChile")
    if " - " in raw_title and len(raw_title.split(" - ")[-1]) < 25:
        raw_title = " - ".join(raw_title.split(" - ")[:-1]).strip()

    # Si el titular es muy corto (<95 caracteres) y hay una primera frase concisa en el resumen, sumarla para dar contexto potente
    raw_summary = (article.get("summary") or "").strip()
    if len(raw_title) < 95 and raw_summary:
        first_sentence = raw_summary.split(". ")[0].strip()
        if 20 < len(first_sentence) <= 95 and first_sentence.lower()[:25] not in raw_title.lower():
            if not raw_title.endswith((".", "!", "?", '"', "”")):
                raw_title += "."
            raw_title = f"{raw_title} {first_sentence}."

    # Si el texto supera 185 caracteres, resumirlo limpiamente
    if len(raw_title) > 185:
        cut = raw_title[:182].rsplit(" ", 1)[0]
        raw_title = cut.rstrip(",;:") + "."

    colored_words = _build_colored_words(raw_title, HIGHLIGHT_YELLOW, TEXT_PRIMARY)

    # Ajustar dinámicamente el tamaño de la fuente condensada para que llene el bloque con gran impacto
    text_area_top = img_h + 25
    text_area_bottom = HEIGHT - 65
    available_h = text_area_bottom - text_area_top
    max_text_w = WIDTH - 84  # 42px de margen a cada lado

    chosen_font = None
    chosen_lines = []
    line_spacing = 12

    for font_size in [82, 76, 72, 68, 64, 60, 56, 52, 48]:
        font_candidate = get_font("RobotoCondensed-Bold.ttf", font_size, "DejaVuSans-Bold.ttf")
        lines = _wrap_words_by_pixels(draw, colored_words, font_candidate, max_text_w)
        line_h = int(font_size * 1.13)
        total_h = len(lines) * line_h
        if total_h <= available_h and 3 <= len(lines) <= 7:
            chosen_font = font_candidate
            chosen_lines = lines
            line_spacing = line_h
            break

    if not chosen_font:
        for font_size in [68, 60, 54, 48, 44]:
            font_candidate = get_font("RobotoCondensed-Bold.ttf", font_size, "DejaVuSans-Bold.ttf")
            lines = _wrap_words_by_pixels(draw, colored_words, font_candidate, max_text_w)
            line_h = int(font_size * 1.13)
            if len(lines) * line_h <= available_h:
                chosen_font = font_candidate
                chosen_lines = lines
                line_spacing = line_h
                break
        if not chosen_font:
            chosen_font = get_font("RobotoCondensed-Bold.ttf", 44, "DejaVuSans-Bold.ttf")
            chosen_lines = _wrap_words_by_pixels(draw, colored_words, chosen_font, max_text_w)[:7]
            line_spacing = int(44 * 1.13)

    # Centrar verticalmente el bloque del titular dentro del espacio negro inferior
    total_block_h = len(chosen_lines) * line_spacing
    current_y = text_area_top + max(0, (available_h - total_block_h) // 2)

    space_w = draw.textlength(" ", font=chosen_font)
    for line in chosen_lines:
        line_w = sum(draw.textlength(w, font=chosen_font) for w, _ in line) + space_w * (len(line) - 1)
        current_x = (WIDTH - line_w) / 2.0
        for idx, (word, color) in enumerate(line):
            draw.text((current_x, current_y), word, fill=color, font=chosen_font)
            current_x += draw.textlength(word, font=chosen_font) + space_w
        current_y += line_spacing

    # 3. PIE DE PÁGINA MINIMALISTA (Discreto abajo)
    font_footer = get_font("DejaVuSans.ttf", 21)
    footer_msg = "Detalle completo en la descripción · pulso-independiente.web.app"
    fw = draw.textlength(footer_msg, font=font_footer)
    draw.text(((WIDTH - fw) / 2, HEIGHT - 48), footer_msg, fill=(120, 130, 150), font=font_footer)

    img.save(output_path, "JPEG", quality=95)
    print(f"[OK] Tarjeta Instagram generada exitosamente en: {output_path}")
    return output_path
