# 📱 Pantalla Digital Interactiva — UNA Puno (Official Facebook Wall)

[![Sincronización Facebook](https://github.com/ilusionist21/pantalla-interactiva-unapuno/actions/workflows/sync_facebook.yml/badge.svg)](https://github.com/ilusionist21/pantalla-interactiva-unapuno/actions/workflows/sync_facebook.yml)
[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-00C8FF?logo=github&logoColor=white)](https://ilusionist21.github.io/pantalla-interactiva-unapuno/)
[![Estética](https://img.shields.io/badge/Design-Apple%20Minimalist-002855)](https://ilusionist21.github.io/pantalla-interactiva-unapuno/)
[![Licencia](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Sistema de señalética digital interactiva y tótem táctil para la **Universidad Nacional del Altiplano Puno** ([@unapunooficial](https://www.facebook.com/unapunooficial)). Diseñado con estética **Apple Minimalist** (iPadOS / macOS Tahoe), paleta institucional (Celeste y Azul), y sincronización automática en la nube cada 15 minutos sin almacenar imágenes pesadas en Git.

La interfaz incluye un modo específico para **Android en orientación horizontal**: mantiene la fotografía y la ficha en dos columnas, adapta el contenido a la altura disponible y convierte las publicaciones inferiores en un carrusel táctil.

🔗 **Sitio en Producción (Live Demo):**  
👉 **[https://ilusionist21.github.io/pantalla-interactiva-unapuno/](https://ilusionist21.github.io/pantalla-interactiva-unapuno/)**

---

## 🧭 Preguntas Frecuentes: ¿Es Gratis? ¿Hasta Cuándo Dura?

### 1. ¿Es 100% Gratis?
**Sí, absolutamente gratuito.**
- **GitHub Pages:** Alojamiento estático ilimitado y gratuito de por vida para repositorios públicos.
- **GitHub Actions:** Los flujos de automatización programados (`cron`) son **100% gratuitos e ilimitados** en repositorios públicos de GitHub (no consumen la cuota de minutos de cuentas privadas).
- **Cero servidores de pago:** No requiere VPS, ni base de datos SQL, ni pagar APIs de Facebook Graph (usa extracción inteligente de feeds públicos).

### 2. ¿Hasta cuándo dura?
**Dura de forma indefinida y permanente.**
- **Caducidad de URLs de Facebook:** Facebook CDN incluye tokens de expiración temporal (`oe=...`). Gracias al bot de [`.github/workflows/sync_facebook.yml`](.github/workflows/sync_facebook.yml), el scraper se ejecuta **cada 15 minutos**, refrescando automáticamente las URLs directas antes de que expiren.
- **Tolerancia a fallos:** Si Facebook cambia temporalmente su estructura HTML, el sistema retiene las publicaciones previas mediante fusión inteligente (`fallback merge`), asegurando que la pantalla nunca se quede en blanco.

---

## 🤖 Guía Técnica para Agentes de Inteligencia Artificial (AI Agent Prompt & Guidelines)

> [!IMPORTANT]
> **Instrucciones para cualquier IA (Codex, Claude, Antigravity, GPT, Cursor, etc.) que continúe o mejore este proyecto:**

### 1. Principios de Arquitectura y Restricciones
- **REGLA DE ORO DE ALMACENAMIENTO:** **NO subir archivos de imágenes pesadas (`.jpg`, `.png`, etc.) a Git.** Todo el almacenamiento de multimedia debe limitarse a URLs directas de la CDN de Facebook dentro de [`data/posts.json`](data/posts.json).
- **ENCABEZADO ANTI-BLOQUEO REFERRER:** Siempre conservar `<meta name="referrer" content="no-referrer">` en [`index.html`](index.html). Esto permite cargar imágenes de `scontent.*.fbcdn.net` en el navegador del usuario eludiendo bloqueos `HTTP 403 Forbidden`.
- **PALETA DE IDENTIDAD UNA PUNO:**
  - Primario / Acentos: **Celeste Institucional** (`#00C8FF`)
  - Secundario / Sombras: **Azul Institucional** (`#002855`)
  - Fondos / Superficies: Dark Apple Glassmorphism (`#030712`, `#0a1224`, `rgba(255, 255, 255, 0.05)`)
- **COMPORTAMIENTO DE ROTACIÓN:**
  - Tiempo de exposición: `7000ms` (7 segundos) por publicación con barra de progreso lineal continua.
  - Pausa inteligente: Pausa automática cuando el usuario pasa el cursor (`mouseenter`), toca la pantalla táctil (`touchstart`), o abre los modales de Zoom o QR.
  - Sincronización en vivo: Consulta periódica silenciosa (`fetch('data/posts.json?t=' + Date.now())`) cada 15 minutos sin recargar la página.

### 2. Estructura de Datos ([`data/posts.json`](data/posts.json))
Cualquier modificación al generador de datos debe respetar el siguiente esquema:
```json
{
  "university": {
    "name": "Universidad Nacional del Altiplano",
    "short_name": "UNA PUNO",
    "location": "Puno, Perú (3,827 m.s.n.m.)",
    "facebook_page": "https://www.facebook.com/unapunooficial",
    "facebook_handle": "@unapunooficial",
    "last_sync": "ISO-8601 Timestamp",
    "sync_status": "OK",
    "auto_refresh_minutes": 15
  },
  "posts": [
    {
      "id": "fb-official-01",
      "title": "TÍTULO EN MAYÚSCULAS DE LA NOTICIA",
      "subtitle": "Publicado en facebook.com/unapunooficial",
      "category": "comunicados | deportes | cultura | investigacion | institucional",
      "category_label": "Etiqueta Legible",
      "badge": "Insignia Destacada",
      "date": "12 Oct 2026, 06:53 UTC",
      "image": "https://scontent... (URL directa CDN)",
      "thumbnail": "https://scontent... (URL directa CDN)",
      "description": "Texto completo o resumen de la publicación...",
      "facebook_url": "https://www.facebook.com/unapunooficial",
      "likes": 1400,
      "shares": 260,
      "featured": true,
      "is_real_facebook": true
    }
  ]
}
```

---

## 📂 Mapa del Código Fuente

| Archivo / Directorio | Función Principal |
| :--- | :--- |
| [`index.html`](index.html) | Vista principal Apple Cinema con dock flotante de 5 tarjetas, modales y reloj dinámico. |
| [`css/styles.css`](css/styles.css) | Sistema de diseño Apple Minimalist, tipografía *Plus Jakarta Sans*, blur backdrop y responsividad táctil. |
| [`js/app.js`](js/app.js) | Controlador cliente: ciclo de rotación, polling cada 15m, control de pantalla completa y modal QR. |
| [`data/posts.json`](data/posts.json) | Base de datos JSON liviana (~3 KB) con las 5 últimas publicaciones oficiales y enlaces CDN. |
| [`data/posts.js`](data/posts.js) | Copia de respaldo para Android cuando `fetch` está bloqueado al abrir el HTML desde `file://`. |
| [`scripts/sync_facebook.py`](scripts/sync_facebook.py) | Scraper en Python con Chromium headless (Pyppeteer), reintentos, imágenes diferidas, enlaces de publicación y deduplicación. |
| [`scripts/requirements.txt`](scripts/requirements.txt) | Dependencia fijada del scraper para GitHub Actions y ejecución local. |
| [`.github/workflows/sync_facebook.yml`](.github/workflows/sync_facebook.yml) | Automatización CI/CD que ejecuta el scraper cada 15 minutos en los servidores de GitHub. |
| [`sync_facebook.php`](sync_facebook.php) | Scraper nativo en PHP + cURL + GraphQL (para instalaciones en cPanel sin Node ni Chrome). |
| [`PantallaInteractiva.exe`](PantallaInteractiva.exe) | Lanzador nativo Windows C# para modo kiosco fullscreen. |
| [`Abrir_Pantalla.bat`](Abrir_Pantalla.bat) | Acceso directo de un clic para pantallas táctiles de la universidad. |

---

## 🚀 Despliegue e Instalación

### Opción A: GitHub Pages (Recomendada - 100% Automática)
1. Haz un fork o clona este repositorio:
   ```bash
   git clone https://github.com/ilusionist21/pantalla-interactiva-unapuno.git
   ```
2. En GitHub ve a **Settings** > **Pages** y selecciona la rama `main` en la carpeta `/ (root)`.
3. El flujo de GitHub Actions ya está configurado para actualizar los datos cada 15 minutos de forma automática.

Para probar el scraper manualmente en Windows o Linux:

```bash
python -m pip install -r scripts/requirements.txt
python scripts/sync_facebook.py
```

Si Facebook bloquea una solicitud puntual, el scraper reintenta tres veces y conserva las publicaciones anteriores cuando la respuesta no es válida. También genera `data/posts.js` para que la vista móvil pueda mostrar los últimos datos disponibles aunque el HTML se abra desde el administrador de archivos del teléfono.

El feed excluye automáticamente publicaciones de condolencias, fallecimientos, duelo, luto y avisos similares, tanto durante la extracción como al cargar datos antiguos en el navegador.

### Opción B: Servidor cPanel / Hosting Universitario (PHP Puro)
1. Sube todos los archivos a la carpeta `public_html/` de tu hosting.
2. Da permisos de escritura (`755`) a la carpeta `data/`.
3. Configura un **Cron Job** en cPanel cada 15 minutos:
   ```bash
   */15 * * * * /usr/bin/php /home/TU_USUARIO/public_html/sync_facebook.php >/dev/null 2>&1
   ```

### Opción C: Kiosco o Tótem Físico (Windows)
1. Conecta la pantalla táctil o Smart TV.
2. Haz doble clic en [`Abrir_Pantalla.bat`](Abrir_Pantalla.bat) o [`PantallaInteractiva.exe`](PantallaInteractiva.exe).
3. La pantalla entrará en modo Kiosco a pantalla completa con navegación táctil habilitada.

---

## 💡 Ideas de Mejoras Futuras para la Siguiente IA

Si eres un desarrollador o una IA buscando expandir este sistema, aquí tienes ideas de alto valor listas para implementar:

1. **Clima en Tiempo Real con OpenWeatherMap API:** Conectar las coordenadas de Puno (`-15.8402, -70.0219`) a la API de OpenWeather para mostrar pronóstico con íconos dinámicos (sol, lluvia, granizo, temperatura real y sensación térmica).
2. **Generación de QR individual por publicación:** En lugar de abrir la página general, permitir que cada tarjeta genere un QR específico que lleve a esa publicación particular en Facebook.
3. **Modo Día / Modo Noche automático:** Alternar sutilmente la temperatura de color de la interfaz según la hora solar de Puno (amanecer en el Lago Titicaca vs. noche fría del Altiplano).
4. **Soporte para Videos y Reels:** Detectar si la publicación contiene video y embeber un reproductor nativo silencioso con subtítulos generados.
5. **Panel de Anuncios de Emergencia (Ticker Marquee):** Añadir una cinta inferior desplegable para avisos urgentes (suspensión de labores, matrículas extraordinarias, feriados).

---

## 🏛️ Créditos y Reconocimientos
- **Institución:** [Universidad Nacional del Altiplano Puno (UNA PUNO)](https://www.unap.edu.pe)
- **Fanpage Oficial:** [facebook.com/unapunooficial](https://www.facebook.com/unapunooficial)
- **Desarrollador / Mantenedor:** [@ilusionist21](https://github.com/ilusionist21)
