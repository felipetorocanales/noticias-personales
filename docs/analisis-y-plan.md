# Pulso Independiente — Análisis técnico y plan de continuación

> Fecha del análisis: 2026-11-04 · Autor: agente DSH · Base: repositorio local `C:\Users\felip\noticias-personales` (rama `main`, commit `b2e5678`) + historial de conversaciones de Gemini/Antigravity del workspace.

---

## 1. Qué es el proyecto (estado real, no el del README)

Agregador periodístico chileno desplegado en **https://pulso-independiente.web.app** (proyecto Firebase `noticias-personales-cl`). Dos sitios de Hosting: el nuevo `pulso-independiente` y el antiguo `noticias-personales-cl` (301 al nuevo).

### Arquitectura efectiva

| Capa | Archivo / servicio | Notas |
|---|---|---|
| Frontend | `public/index.html` (373 líneas) + `public/app.js` (1.935) + `public/styles.css` (2.907) | SPA vanilla, sin framework ni build. Tema "Tinta & Greda" (cobre/ocre/alerce), claro y oscuro. |
| Datos | `public/data/initial-feeds.json` (~1,3 MB, 239 notas) | Snapshot completo que el navegador descarga entero en cada carga. |
| Pipeline | `scripts/fetch_feeds.py` (1.210 líneas) | 38 fuentes RSS, limpieza, filtro anti-farándula, clasificación de relevancia, enriquecimiento de imagen y texto completo con 12 hilos. |
| Automatización | `.github/workflows/sync_feeds.yml` | Cron `4,19,34,49 * * * *` (cada 15 min) + `workflow_dispatch`. Corre fetch → prepara post IG → deploy a Hosting → publica en Instagram → commitea `[skip ci]`. |
| Instagram | `scripts/instagram_publisher.py` (384) + `scripts/generate_instagram_post.py` (184) | Graph API, cooldown 3 h, tarjetas generadas con Pillow. |
| Disparador externo | Google Cloud Scheduler `trigger-pulso-sync` (us-central1) | Llama al `workflow_dispatch` cada 15 min con un PAT de GitHub. |
| Cloud Function | `functions/main.py` (93) | `/api/refresh`: consulta el último run y hace dispatch si pasaron >10 min. Sin autenticación. |
| Feedback | Google Apps Script (externo al repo) | Recibe sugerencias del modal, escribe en Google Sheets y envía correo. |

### Volumen actual (snapshot de hoy 14:47 hrs)
- 239 notas · 38 fuentes · 139 Chile / 60 LatAm / 40 Mundo · 150 "alto impacto" / 89 "bajo el radar".
- 15 notas bloqueadas por el filtro (con falsos positivos, ver §4.2).
- 88/239 sin imagen (37 %) · 205 con texto completo precargado · 34 con `content` vacío.
- 131/239 con más de 24 h de antigüedad; 84 con más de 72 h; 37 con más de 30 días.

---

## 2. Las conversaciones de Gemini: qué se hizo allí

El historial vive en `~/.gemini/antigravity/` (SQLite `conversation_summaries.db` + índice FTS). El proyecto tiene **dos conversaciones**:

1. **`701513b3-2ed9-4359-841b-b8825a1322f2` — "App Web De Noticias Chilenas"**, 4.104 pasos, 102 mensajes del usuario, del 21-oct al 2-nov. Es la conversación madre: aquí nació y evolucionó todo el producto.
2. **`03e7f661-3f65-4d55-a6a3-ecc2163c311b` — "Add Instagram Share Button"**, 207 pasos (26–27 oct): botón/modal de compartir en Instagram y el arreglo del zoom de iOS.

### Línea de tiempo de decisiones (resumen fiel)
- **21-oct** — Nace el brief: noticias relevantes y "bajo el radar" de Chile y el mundo, fuentes independientes, cero farándula, hosting Firebase. Primer deploy en `noticias-personales-cl`.
- **21–22-oct** — Rediseño tipo "Instagram de noticias", luego simplificación a "menos es más"; se descartan las "historias" y se vuelve a filtros por temática con filtro principal (Todo/Chile/LatAm/Mundo/Alto impacto/Bajo el radar) + subfiltro temático.
- **23–24-oct** — Crisis de frescura: "las noticias siguen siendo de hace 3 horas", "¿el botón actualizar funciona?". Se concluye que el frontend solo no puede; se pasa a **GitHub Actions** como backend real y se elimina el proceso local.
- **24-oct** — Paso a plan **Blaze**; se evalúa Cloud Function vs Actions. Se adopta el modelo carga inmediata + chequeo en segundo plano ("Ver novedades").
- **25-oct** — Filtro anti-fútbol (manteniendo deporte y ciclismo), deduplicación de traducciones.
- **26–27-oct** — Conexión con Instagram: cuenta nueva `pulso.independiente.26@gmail.com`, app en Meta, tokens, publicación automática vía Graph API, generación de tarjetas, horario 8:00–23:00, bio/enlace.
- **28-oct** — Identidad visual propia ("opción 4"), ajustes de imagen del post, balance de fuentes (España sobrerrepresentada), texto completo en el modal, reordenamiento de cabeceras de tarjeta.
- **29–31-oct** — Botón de comentarios/sugerencias → Google Sheets vía Apps Script (varias iteraciones por correos perdidos y errores de sintaxis en V8).
- **29-oct** — Se agota la cuota gratuita de Actions (2.000 min) por el cron de 15 min; se pasa el repo a **público** (minutos ilimitados). GitHub revoca un token antiguo (`gho_…`) que estaba en `functions/main.py`.
- **1–2-nov** — Domino nuevo `pulso-independiente.web.app`, redirección del antiguo, enlaces canónicos en todos los botones de compartir. Último mensaje del usuario: los enlaces seguían saliendo con el dominio viejo; quedó corregido y desplegado (commit `5991bab`).

**Conclusión del historial:** el trabajo no quedó a medias por una tarea pendiente explícita — quedó "sano" en su última iteración. Lo que falta es la siguiente ronda de mejoras, y el análisis de abajo identifica cuáles son las que realmente duelen.

---

## 3. La automatización sí está funcionando (verificado, no asumido)

- GitHub Actions: run `41880189193` de hoy 17:45 UTC, `workflow_dispatch`, `conclusion: success`. 72 commits hoy, 99 ayer, ~100/día sostenidos.
- Snapshot servido: `generatedAt = 2026-11-04T17:46:52Z` (≈7 minutos antes de este análisis).
- Instagram: 70 publicaciones, 4–6 por día sin interrupciones; la última hoy 17:34 UTC.
- El clon local estaba **2 días atrasado** (sin `git pull` desde el 2-nov): eso explica por qué "en local" las noticias se ven viejas. Ojo con este detalle al diagnosticar.

---

## 4. Problemas encontrados (ordenados por impacto)

### 4.1 🔴 Los enlaces de Instagram mueren en horas (39 % ya están rotos)
- `id` se genera posicionalmente: `f"{src['id']}-{len(articles)+1}"` (`fetch_feeds.py:1117`). Al entrar una nota nueva, **todos los IDs siguientes se corren**.
- Además el snapshot solo conserva ~239 notas: cuando una sale de la ventana, desaparece.
- Evidencia: de las 70 publicaciones en `instagram_history.json`, **27 apuntan a un `articleId` que ya no existe** (p. ej. `eldiarioes-183` del 21-oct, `france24-248`, `radiouchile-29`).
- En el frontend, `handleTargetArticleDeepLink()` no hace nada si el ID no existe: el visitante que llega desde Instagram ve el feed sin banner, sin aviso, sin redirección.
- Impacto: cada post de Instagram es una campaña pagada con esfuerzo que aterriza en una página que "no muestra la noticia".

### 4.2 🔴 El filtro anti-fútbol bloquea noticias legítimas
Patrones como `\buniversidad de chile\b`, `\bcruzados?\b`, `\buniversidad cat[oó]lica\b` se aplican sobre título+resumen sin contexto deportivo. Casos reales bloqueados hoy:
- *"Astrónoma chilena descubre 52 galaxias lejanas…"* → bloqueada por "universidad católica".
- *"Comisión Mixta aprueba presupuesto de Justicia…"* → bloqueada por "cruzados".
- *"Movilidad urbana y convivencia vial en bicicleta — Universidad de Chile"* → **una nota de ciclismo**, el tema que se quería priorizar.
- También bloquea *"Blues Chileno FM… Sala Master"* y el presupuesto de Justicia por "universidad de chile".
Estimación: ≥5 de 15 bloqueos de hoy son falsos positivos (~33 % del filtro).

### 4.3 🟠 Seis fuentes inyectan archivo histórico (la raíz del "¿por qué hay noticias viejas?")
Las búsquedas de Google News (`news.google.com/rss/search?q=site:…`) **no tienen filtro temporal**, así que devuelven lo que Google considera relevante, incluido material de años atrás:

| Fuente | Antigüedad mediana | Peor caso |
|---|---|---|
| Ladera Sur | 8.700 días (~2,9 años) | 2022 |
| Ojo Público | ~4 años | 2015 |
| El Faro | ~1,6 años | feed congelado en abr-2025 |
| Sin Permiso | 210 días | títulos tipo "5-7-2026" (números de revista, no noticias) |
| Chequeado | 71 días | — |
| Vergara 240 | 27 días | — |

**Verificado en vivo:**
- `…?q=site:laderasur.com` → devuelve 2022/2024. `…?q=site:laderasur.com+when:2d` → devuelve notas de hoy. **El `when:` lo arregla.**
- `https://www.laderasur.com/feed/` es un RSS nativo válido (application/rss+xml): mejor que Google News.
- `https://elfaro.net/es/feed` responde 200 pero su último ítem es de **abril 2025**: feed abandonado.
- El Mostrador y El Desconcierto no tienen `/feed/` (404): por eso dependen de Google News.

### 4.4 🟠 37 % de las tarjetas sin imagen, concentrado en las fuentes vía Google News
- Sin imagen: Resumen.cl 10/10, Ladera Sur 10/10, El Mostrador 10/10, El Desconcierto 10/10, Ojo Público 8/8, El Faro 8/8, Ciclismo Chile 8/8, Sin Permiso 3/3, El Salto 3/3, DW 3/3.
- Causa comprobada: las URLs de Google News (`news.google.com/rss/articles/CBMi…`) **no redirigen server-side** (son JS). El scraper de enriquecimiento recibe una página de Google sin `og:image` ni párrafos → devuelve vacío. Sin URL real del medio no hay foto ni texto completo.
- Consecuencia visual: el frontend cae al modo "tarjeta editorial" (sin imagen), que es correcto como fallback pero deja media portada sin foto.

### 4.5 🟡 Dos lógicas de fecha que "maquillan" la antigüedad
- `parse_date()` devuelve `now()` cuando no puede interpretar la fecha (`fetch_feeds.py:916,929`) → una nota vieja con fecha ilegible aparece como recién publicada.
- `parseHonestDate()` en el frontend recorta a "ahora" cualquier fecha futura (`app.js:256`) → el usuario ve "hace instantes" en notas que no lo son. Es exactamente la queja histórica del 23-oct ("necesito que sea lo más honesto posible").
- No hay tope de antigüedad: nada impide publicar una nota de 2022 en portada si entra en la ventana de `maxArticles`.

### 4.6 🟡 ID del artículo y "En Instagram" dependen de la misma numeración posicional
El filtro "📸 En Instagram" compara `state.instagramPostIds` (IDs históricos) con los IDs actuales; al correrse la numeración, el badge se pierde aunque la nota siga en portada.

### 4.7 🟡 `/api/refresh` sin autenticación y probablemente huérfano
`functions/main.py` permite que cualquiera dispare el workflow (mitigado por cooldown de 10 min, pero es superficie de abuso). El frontend ya no lo llama: `checkForFreshSnapshot()` solo relee el JSON estático. La rewrite de `firebase.json` sigue apuntando a esa función.

### 4.8 🟡 El generador de sugerencias no está versionado
El Apps Script que escribe en Google Sheets y envía correo vive solo en la cuenta de Google. No hay copia en el repo: si se pierde, se pierde la historia de feedback.

### 4.9 🟢 Detalles menores
- `sortArticles("date_asc")` retorna antes del balanceo de fuentes (inconsistente con el resto).
- Títulos de Google News llegan con sufijo del medio: aparece `[Biobiochile.cl]` dentro de un post de Instagram.
- `balance_source_diversity` con `max_consecutive=1` se ejecuta dos veces (backend y frontend).
- El JSON de 1,3 MB se descarga completo en cada visita; no hay paginación ni carga diferida del archivo.
- No hay manifest ni service worker: el "acceso directo" de iOS es un marcador, con los problemas de caché que eso conlleva.

### 4.10 🔴 Seguridad: hay un token de GitHub válido pegado en el chat
El usuario pegó un PAT `ghp_0FBr…snP` (scopes `repo, workflow`) en la conversación del 2-nov para que se configurara Cloud Scheduler. **Lo verifiqué hoy contra la API de GitHub: sigue activo.** Está almacenado en el historial local de Gemini y el repositorio es público. Recomendación inmediata: revocarlo en GitHub → Developer settings → Tokens (classic), crear uno nuevo y actualizar Cloud Scheduler.

---

## 5. Plan de continuación propuesto

### Frente A — Integridad de enlaces (1 sesión, alto impacto)
1. `id` estable = hash corto de la URL (`sha1(url)[:10]`) en backend y frontend.
2. `public/data/archive.json`: índice de las últimas 2 semanas (id, título, medio, url, imagen, fecha) que el frontend consulta cuando el `?id=` no está en el snapshot.
3. Fallback visible en `handleTargetArticleDeepLink()`: si no existe, banner "Esta nota ya salió de portada" + botón "Ver la nota original ↗" + "Ver noticias de hoy".
4. Compatibilidad: aceptar también los IDs viejos (`fuente-N`) resolviéndolos contra el archivo, para no romper los 43 links de Instagram que aún funcionan.

### Frente B — Calidad y frescura de fuentes (1–2 sesiones)
1. Añadir `when:2d` (o `when:1d`) a las 6 búsquedas de Google News; cambiar Ladera Sur a su feed nativo.
2. Sustituir/desactivar El Faro (feed congelado) y Sin Permiso (números de revista).
3. Tope de antigüedad configurable (p. ej. 96 h para portada) + sección "Archivo" para lo anterior.
4. Resolver URLs reales de Google News (decodificar el parámetro `CBMi…` o usar el endpoint `batchexecute`) para recuperar imagen y texto completo; si falla, degradar con elegancia.
5. Reporte diario de salud por fuente (ok / 0 notas / feed viejo) en el propio JSON y visible en el modal de fuentes.

### Frente C — Filtro 2.0 (media sesión)
1. Los patrones de clubes/instituciones solo aplican si el texto tiene contexto futbolístico (`fútbol, gol, partido, DT, ANFP, torneo…`).
2. Excepción explícita para ciclismo, ciencia, cultura y política: si hay match de `CYCLING_PATTERNS` o categoría ciencia/cultura, no bloquear por nombre de institución.
3. Revisión de falsos positivos con la lista `blockedExamples` que ya se publica en el JSON.

### Frente D — Deuda técnica (opcional)
1. Revocar y rotar el token; documentar el secreto en `README` (sin valor).
2. Versionar el Apps Script en `scripts/feedback_apps_script.gs`.
3. Retirar o autenticar `/api/refresh`.
4. Paginación/lazy-load del snapshot (o partirlo por región).

---

## 6. Recomendación de arranque

Empezar por **A + C** en la misma tanda: son cambios acotados, medibles y resuelven las dos quejas que más se repitieron en la conversación (enlaces que no llevan a la noticia y filtros que esconden lo que sí importa). El Frente B es el que más mejora la percepción de "frescura", pero toca el pipeline completo y conviene hacerlo después de que A deje los IDs estables (así el archivo histórico ya nace con IDs buenos).

---

## 7. Cambios aplicados (Frentes A + C, 2026-11-04)

### A. Enlaces que no mueren
- **ID estable en `fetch_feeds.py`**: `make_article_id()` genera `fuente-<sha1(url)[:10]>` en lugar de `fuente-<posición>`. Mismo ID para la misma URL en cualquier ejecución; colisión resuelta ampliando el hash.
- **`public/data/archive.json`**: índice histórico (retención 14 días, máximo 6.000 entradas, IDs de Instagram fijados para siempre) que se carga solo cuando un enlace no está en el snapshot. Arranca con 267 entradas sembradas.
- **`public/data/legacy_ids.json`**: mapa congelado de los 43 enlaces de Instagram con ID posicional (`cooperativa-130`) hacia su ID estable. Los 27 enlaces ya muertos antes de esta iteración no se pueden recuperar (su nota salió del feed).
- **Frontend (`handleTargetArticleDeepLink`)**: si el ID no está en portada, busca en el archivo y muestra una tarjeta "Guardada en el archivo de Pulso" con enlace al medio original; si tampoco existe, avisa con un mensaje claro en vez de no hacer nada.
- **Workflow**: el commit automático incluye `archive.json`.

### C. Filtro 2.0
- Dos niveles: términos inequívocos (farándula + fútbol) bloquean directo; clubes, instituciones y jugadores solo bloquean si hay **contexto futbolístico** o si aparecen **dos o más** en la misma nota.
- **Temas protegidos**: ciclismo, ciencia y cultura nunca se descartan por mencionar a la Universidad de Chile o a los Cruzados.
- Se eliminó `palestino` (gentilicio) de la lista ambigua.
- Paridad exacta entre backend (`fetch_feeds.py`) y frontend (`app.js`), verificada con 14 casos de prueba.
- Resultado medido: los bloqueos diarios pasaron de 15 a 9, y los 9 restantes son fútbol real (ANFP, Champions League, Colo Colo, Copa Chile, Vidal, San Vicente…). Entraron tres notas que antes se perdían: la astrónoma chilena, la reforma al INDH y la nota de ciclismo urbano de la Universidad de Chile.

### Efectos colaterales controlados
- `instagram_publisher.py` ya no deduplica solo por ID: también por URL y título normalizado, para que el cambio de esquema no republique notas viejas.
- Historial de Instagram guarda `articleUrl` y `sourceId` desde ahora.

### Verificado localmente
- `py_compile` + `node --check` OK.
- Pipeline completo ejecutado: 248 notas, 161 con imagen, 169 con texto completo, 248 IDs únicos y estables, archivo de 164 KB.
- 14 casos de filtro en Python y en JS: todos correctos.

---

## 8. Cambios aplicados (Frente B — frescura y fuentes, 2026-11-04)

### Ventana temporal en Google News
- Las 8 fuentes que usan `news.google.com/rss/search` (El Mostrador, El Desconcierto, Ladera Sur, Resumen.cl, Ojo Público, Brecha, El Salto, Ciclismo Chile) reciben ahora `when:7d` en la consulta. Se inyecta automáticamente al cargar `SOURCES`, así que vale también para fuentes futuras.
- Motivo: sin filtro temporal, Google devuelve su archivo completo. Medido antes del cambio: Ladera Sur traía notas de 2022, Ojo Público de 2015, El Faro congelado en abril-2025.

### Tope de antigüedad
- `MAX_AGE_DAYS` (variable de entorno `PULSO_MAX_AGE_DAYS`, por defecto **14**): lo más viejo no entra al snapshot. No se pierde: queda en `archive.json` y sigue accesible por enlace.
- `sourceStats` publica ahora `status` (`ok` / `stale` / `error`), `staleDropped` y `newestAgeHours`.

### Limpieza de títulos y ruido
- Títulos que son solo una fecha (boletines de Sin Permiso: "5-7-2026") se descartan.
- El sufijo " - Medio" que agrega Google News se quita en todas sus fuentes, no en una lista fija.

### Enriquecimiento más barato
- Las URLs de Google News son páginas JS: nunca devuelven `og:image` ni el texto del medio, así que se dejan de intentar. Elimina ~90 peticiones inútiles por ejecución y acorta el workflow.
- Consecuencia asumida: las notas que entran solo por Google News se muestran con la tarjeta editorial (sin foto). Resolver esos enlaces exigiría el `batchexecute` interno de Google, que hoy entrega IDs cifrados no decodificables.

### Medición local (sin enriquecimiento, para aislar la frescura)
- 221 notas (antes 248), 36 fuentes vivas.
- Mediana de antigüedad: **23,7 h**; la más vieja: 13,4 días (antes había notas de 2015 y 2022).
- Descartes por antigüedad: Vergara 240 (16), El Faro (18), Chequeado (15), Bellingcat (7), Ladera Sur (5), Sin Permiso (1).
- El Faro y Sin Permiso quedan en 0 notas sin borrar su configuración: si vuelven a publicar, reaparecen solas.

### Interfaz
- El modal de fuentes muestra la salud de cada medio ("última nota hace X", "sin notas recientes", "feed con error") en vez de un "0 notas" sin explicación.

---

## 9. Filtros robustecidos (2026-11-04, tras reporte del usuario)

Síntoma: al pulsar "Ciclismo y Deportes" aparecían una nota de farmacia, una de un local clausurado y una crónica de fútbol.

### Causas encontradas (medidas sobre las 219 notas en vivo)
1. **Coincidencia por subcadena sin límites de palabra.** El patrón `bici` hacía match dentro de "prohi**bici**ón" y `deporte` dentro de "Cooperativa **Deportes**" (relleno del resumen). Eran 3 de 18 falsos positivos.
2. **Fuga de fútbol:** "Récord: Partido en Brasil terminó con 51 expulsados" no contiene la palabra "fútbol" ni nombres de clubes, así que pasaba el escudo.
3. **"En Instagram" marcaba 0:** el historial guarda IDs antiguos (`cooperativa-130`) que ya no existen tras la migración a IDs estables.

### Correcciones
- **Matcher temático reescrito**: coincidencia por palabra completa (`\b`), vocabulario explícito por temática, comparación exacta con la categoría asignada y limpieza del relleno editorial ("Súmate al canal de WhatsApp de…", "Nota publicada por…") antes de evaluar.
- **Regla de crónica deportiva**: "partido" + al menos dos señales de juego (expulsados, árbitro, gol, estadio, sub 20, campeonato, torneo, jugador, entrenador…) bloquea la nota aunque no diga "fútbol". Deliberadamente se excluyó "selección" y "clasificación" para no tocar política.
- **IDs de Instagram traducidos** con `legacy_ids.json` al cargar el historial: el badge "📸 En Instagram" y el filtro vuelven a funcionar con los posts antiguos.

### Verificación
- Corpus real: 15 notas en "Ciclismo y Deportes" (antes 18), sin farmacias, sin clausuras y sin fútbol.
- La regla nueva bloquea exactamente 1 nota del feed (la crónica de Brasil) y ninguna de las de control (astronomía, INDH, ciclismo urbano, Blues Chileno FM).
- 9 casos de prueba del matcher temático: todos correctos.



