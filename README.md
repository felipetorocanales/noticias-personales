# Pulso Independiente — Noticias de Chile y el Mundo (Sin Farándula)

Aplicación web de agregación periodística que recopila tanto las noticias **más relevantes** (investigación, poder, economía estructural, geopolítica, derechos humanos) como las **no tan relevantes / bajo el radar** (prensa regional, hallazgos científicos, biodiversidad, memoria local y crónicas ciudadanas) de **Chile 🇨🇱 y el Mundo 🌍**, priorizando **fuentes independientes** y omitiendo de raíz todo contenido de espectáculo, farándula, realities o celebridades.

## 🌐 Despliegue en Vivo (Firebase Hosting)
- **URL Pública:** [https://noticias-personales-cl.web.app](https://noticias-personales-cl.web.app)
- **Proyecto Firebase:** `noticias-personales-cl`

## ✨ Características Principales
1. **Contraste Dual de Relevancia ("Más Relevantes" vs "No Tan Relevantes / Bajo el Radar"):**
   - **🔥 Más Relevantes (Alto Impacto):** Reportajes de investigación, decisiones de Estado, economía estructural y conflictos globales.
   - **📡 No Tan Relevantes (Bajo el Radar / Nicho y Local):** Noticias regionales (Antofagasta, Biobío, Valdivia/Sur), ciencia, medioambiente y crónicas comunitarias fuera de la agenda de los grandes consorcios.
2. **🛡️ Escudo Cero Espectáculo / Anti-Farándula:**
   - Filtro léxico automático con más de 38 patrones de exclusión (*farándula, espectáculo, realities, gran hermano, celebridades, alfombra roja, horóscopo, influencers, festival de viña, etc.*).
   - Permite al usuario agregar palabras bloqueadas personalizadas en tiempo real.
3. **📡 Red de Medios Independientes (23 Fuentes Activas):**
   - **Chile 🇨🇱:** CIPER Chile, Interferencia, Fast Check CL, Radio Universidad de Chile, Resumen.cl (Biobío), Ladera Sur, Timeline Antofagasta, Diario UACh (Valdivia), El Mostrador, El Desconcierto, El Ciudadano, Radio Cooperativa.
   - **Mundo 🌍:** Bellingcat, ProPublica, The Intercept, Global Voices en Español, El Salto Diario, elDiario.es, Jacobin América Latina, Semanario Brecha (LatAm), Sin Permiso, DW Español, France 24 Español.
   - Permite añadir feeds RSS personalizados desde la interfaz.
4. **Arquitectura Híbrida Instantánea + RSS en Vivo:**
   - Carga instantánea desde snapshot pre-procesado (`public/data/initial-feeds.json`) combinada con actualización RSS en vivo desde el navegador mediante proxies multi-CORS (`allorigins` / `codetabs`).

## 🛠️ Comandos Útiles

```powershell
# Actualizar el snapshot de feeds RSS manualmente
python scripts/fetch_feeds.py

# Desplegar en Firebase Hosting
firebase deploy --only hosting
```
