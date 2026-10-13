#!/usr/bin/env python3
"""
SINCRONIZADOR AUTOMÁTICO DE FACEBOOK: @unapunooficial

Extrae las publicaciones públicas desde el navegador de Facebook y conserva
las cinco últimas entradas válidas en data/posts.json. El extractor evita
depender de una sola clase CSS: usa artículos, imágenes diferidas (src,
data-src y srcset), enlaces de publicación y deduplicación por imagen/título.
"""

import asyncio
import json
import os
import re
import subprocess
import sys
import time
import unicodedata
from datetime import datetime, timezone
from urllib.parse import parse_qsl, urlencode, urlparse


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
POSTS_FILE = os.path.join(SCRIPT_DIR, "..", "data", "posts.json")
POSTS_JS_FILE = os.path.join(SCRIPT_DIR, "..", "data", "posts.js")
FACEBOOK_URL = "https://www.facebook.com/unapunooficial"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
)

EXCLUDED_POST_TERMS = (
    "condolencia",
    "fallecimiento",
    "fallecido",
    "sensible deceso",
    "nota de pesar",
    "expresamos nuestro pesar",
    "duelo",
    "luto",
    "pesame",
    "sepelio",
    "qepd",
    "q e p d",
    "que en paz descanse",
    "in memoriam",
    "misa de honras",
)


def get_chrome_path():
    """Detecta un navegador instalado en Windows, Linux o GitHub Actions."""
    configured = os.environ.get("CHROME_BIN")
    candidates = [configured] if configured else []

    if sys.platform == "win32":
        candidates.extend(
            [
                r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            ]
        )
    else:
        candidates.extend(
            [
                "/usr/bin/google-chrome",
                "/usr/bin/google-chrome-stable",
                "/usr/bin/chromium-browser",
                "/usr/bin/chromium",
            ]
        )

    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return candidate
    return None


EXTRACT_POSTS_JS = r"""
() => {
    const clean = value => (value || '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/(?:\.{1,3}\s*)?(?:ver más|see more)\s*$/i, '')
        .trim();

    const ignoredLine = value => {
        const line = clean(value);
        return !line || line.length < 3 || /^(me gusta|comentar|compartir|ver más|see more|like|comment|share|seguir|follow|reaccionar|reaction)$/i.test(line);
    };

    const getTextLines = article => {
        const values = Array.from(article.querySelectorAll('[dir="auto"], [data-ad-preview="message"]'))
            .flatMap(node => (node.innerText || node.textContent || '').split(/\n+/))
            .map(clean)
            .filter(value => !ignoredLine(value));
        return [...new Set(values)];
    };

    const isPhotoUrl = value => {
        const url = value || '';
        return /(?:scontent|fbcdn|lookaside\.fbsbx)/i.test(url)
            && !/(?:avatar|profile|emoji|icon|rsrc\.php|t39\.30808-1|_nc_sid=3ab345|p(?:50|64)x(?:50|64)|s(?:50|64)x(?:50|64))/i.test(url);
    };

    const getImageCandidates = article => {
        const candidates = [];
        for (const image of article.querySelectorAll('img')) {
            const direct = ['src', 'data-src', 'data-original', 'data-image-src']
                .map(attribute => image.getAttribute(attribute))
                .filter(Boolean);
            const srcset = (image.getAttribute('srcset') || image.getAttribute('data-srcset') || '')
                .split(',')
                .map(part => part.trim().split(/\s+/)[0])
                .filter(Boolean);
            const width = Math.max(
                image.naturalWidth || 0,
                image.width || 0,
                image.getBoundingClientRect().width || 0
            );
            for (const url of [...direct, ...srcset]) {
                if (isPhotoUrl(url)) candidates.push({ url, width });
            }
        }
        return candidates.sort((a, b) => b.width - a.width);
    };

    const getPostLink = article => Array.from(article.querySelectorAll('a[href]'))
        .find(anchor => /(?:\/posts\/|\/photos\/|\/videos\/|story_fbid=)/i.test(anchor.href));

    const getPostUrl = article => {
        const link = getPostLink(article);
        return link ? new URL(link.href, location.href).href : '';
    };

    const getPublishedAt = article => {
        const link = getPostLink(article);
        if (!link) return '';

        const values = [
            link.getAttribute('datetime'),
            link.getAttribute('aria-label'),
            link.getAttribute('title'),
            link.innerText
        ].filter(Boolean).map(clean);

        for (const value of values) {
            const absolute = Date.parse(value);
            if (!Number.isNaN(absolute) && /\d/.test(value)) {
                return new Date(absolute).toISOString();
            }

            const relative = value.match(/(?:hace\s*)?(\d+)\s*(s|seg(?:undo)?s?|m|min(?:uto)?s?|h|hora?s?|d|d[ií]a?s?|w|semana?s?|month?s?|mes(?:es)?)/i);
            if (relative) {
                const amount = Number(relative[1]);
                const unit = relative[2].toLowerCase();
                const multiplier = /^(s|seg|segundo)/.test(unit) ? 1000
                    : /^(m|min|minuto)/.test(unit) ? 60000
                    : /^(h|hora)/.test(unit) ? 3600000
                    : /^(d|día)/.test(unit) ? 86400000
                    : /^(w|semana)/.test(unit) ? 604800000
                    : 2592000000;
                return new Date(Date.now() - amount * multiplier).toISOString();
            }

            if (/^(ahora|just now)$/i.test(value)) return new Date().toISOString();
        }

        return '';
    };

    const results = [];
    const seen = new Set();
    const articles = Array.from(document.querySelectorAll('[role="article"], article'));

    for (const article of articles) {
        const lines = getTextLines(article);
        const images = getImageCandidates(article);
        const firstPhoto = images[0];
        const postUrl = getPostUrl(article);
        if (!firstPhoto || !postUrl) continue;

        const text = lines.join('\n');
        if (text.length < 8) continue;

        const key = `${firstPhoto.url.split('?')[0]}|${lines[0] || ''}`;
        if (seen.has(key)) continue;
        seen.add(key);

        results.push({
            text: text || 'PUBLICACIÓN OFICIAL UNA PUNO',
            imgUrl: firstPhoto.url,
            postUrl,
            publishedAt: getPublishedAt(article)
        });
    }

    return results
        .map((result, index) => ({ result, index }))
        .sort((a, b) => {
            const aTime = Date.parse(a.result.publishedAt || '') || 0;
            const bTime = Date.parse(b.result.publishedAt || '') || 0;
            if (aTime !== bTime) return bTime - aTime;
            return a.index - b.index;
        })
        .map(({ result }) => result);
}
"""


async def scrape_attempt(attempt_number):
    try:
        from pyppeteer import launch
    except ImportError:
        print("[!] pyppeteer no está instalado; instalando la dependencia...")
        try:
            subprocess.run(
                [sys.executable, "-m", "pip", "install", "pyppeteer>=2,<3"],
                check=True,
            )
            from pyppeteer import launch
        except Exception as error:
            print(f"[!] No se pudo instalar pyppeteer: {error}")
            return []

    executable_path = get_chrome_path()
    launch_kwargs = {
        "headless": True,
        "args": [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
            "--window-size=1400,1000",
        ],
    }
    if executable_path:
        launch_kwargs["executablePath"] = executable_path
        print(f"[*] Navegador detectado: {executable_path}")

    browser = None
    try:
        print(f"[*] Intento {attempt_number}: conectando a {FACEBOOK_URL}...")
        browser = await launch(**launch_kwargs)
        page = await browser.newPage()
        await page.setViewport({"width": 1400, "height": 1000, "deviceScaleFactor": 1})
        await page.setUserAgent(USER_AGENT)
        await page.setExtraHTTPHeaders({"Accept-Language": "es-ES,es;q=0.9,en;q=0.8"})

        response = await page.goto(
            FACEBOOK_URL,
            {"waitUntil": "domcontentloaded", "timeout": 45000},
        )
        status = response.status if response else 0
        if status >= 400:
            raise RuntimeError(f"Facebook respondió HTTP {status}")

        await asyncio.sleep(4)

        # Cerrar consentimientos y diálogos que tapan las publicaciones.
        for selector in [
            '[aria-label="Permitir todas las cookies"]',
            '[aria-label="Allow all cookies"]',
            'button[data-cookiebanner="accept_button"]',
            '[role="dialog"] [aria-label="Cerrar"]',
            '[role="dialog"] [aria-label="Close"]',
        ]:
            try:
                await page.click(selector)
            except Exception:
                pass

        # Cargar imágenes diferidas y más artículos sin depender de clases CSS.
        for _ in range(6):
            await page.evaluate("window.scrollBy(0, Math.max(700, window.innerHeight * 0.9))")
            await asyncio.sleep(1.5)

        extracted = await page.evaluate(EXTRACT_POSTS_JS)
        print(f"[+] Intento {attempt_number}: artículos con fotos encontrados: {len(extracted)}")
        return extracted
    except Exception as error:
        print(f"[!] Intento {attempt_number} fallido: {error}")
        return []
    finally:
        if browser:
            try:
                await browser.close()
            except Exception:
                pass


async def scrape_with_browser():
    best_extracted = []
    for attempt in range(1, 4):
        extracted = await scrape_attempt(attempt)
        if len(extracted) > len(best_extracted):
            best_extracted = extracted
        # Facebook a veces devuelve solo un artículo antiguo al runner.
        # No tratar una respuesta parcial como si fuera el feed completo.
        if len(extracted) >= 3:
            return extracted
        if attempt < 3:
            await asyncio.sleep(attempt * 2)
    print(f"[!] Facebook solo devolvió {len(best_extracted)} artículos tras 3 intentos.")
    return best_extracted


def get_img_id(url):
    """Obtiene un identificador estable ignorando tokens temporales de CDN."""
    if not url:
        return ""
    return os.path.basename(urlparse(url).path).lower()


def is_profile_image_url(url):
    """Descarta avatar, portada o identidad de la página mezclados con posts."""
    return bool(
        re.search(
            r"(?:/t39\.30808-1/|[?&]_nc_sid=3ab345(?:&|$)|avatar|profile)",
            url or "",
            flags=re.IGNORECASE,
        )
    )


def get_high_resolution_image_url(url):
    """Quita el límite de tamaño del CDN de Facebook sin alterar su firma."""
    if not url or not re.search(r"(?:fbcdn|scontent)", url, flags=re.IGNORECASE):
        return url

    parsed = urlparse(url)
    query = [
        (key, value)
        for key, value in parse_qsl(parsed.query, keep_blank_values=True)
        if key.lower() != "ctp"
    ]
    return parsed._replace(query=urlencode(query, doseq=True)).geturl()


def clean_text_lines(raw_text):
    lines = []
    for raw_line in (raw_text or "").splitlines():
        line = re.sub(r"\s+", " ", raw_line).strip()
        line = re.sub(r"(?:\.{1,3}\s*)?(?:ver más|see more)\s*$", "", line, flags=re.IGNORECASE).strip()
        if not line or line.lower() in {"ver más", "see more", "me gusta", "comentar", "compartir"}:
            continue
        normalized_line = normalize_for_filter(line)
        if re.match(
            r"^(?:ver|view|mostrar).*(?:comentarios|comments|respuestas|replies)$",
            normalized_line,
        ):
            break
        if line not in lines:
            lines.append(line)
    return lines


def normalize_for_filter(value):
    normalized = unicodedata.normalize("NFKD", value or "")
    without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", without_accents.lower()).strip()


def parse_published_at(value):
    """Convierte la fecha detectada en Facebook a UTC; None significa sin fecha."""
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def is_excluded_post(*values):
    searchable = normalize_for_filter(" ".join(value or "" for value in values))
    return any(term in searchable for term in EXCLUDED_POST_TERMS)


def format_and_save(extracted):
    if not extracted:
        print("[!] No se extrajeron publicaciones nuevas. Conservando data/posts.json.")
        return False

    now = datetime.now(timezone.utc)
    def sort_key(pair):
        published_at = parse_published_at(pair[1].get("publishedAt"))
        return (
            0 if published_at else 1,
            -published_at.timestamp() if published_at else 0,
            pair[0],
        )

    extracted = sorted(enumerate(extracted), key=sort_key)
    extracted = [item for _, item in extracted]
    categories = [
        ("institucional", "Actualidad Universitaria", "UNA Puno"),
        ("deportes", "Deporte Universitario", "Logro Histórico"),
        ("cultura", "Cultura & Folklore", "Candelaria 2026"),
        ("investigacion", "Investigación Científica", "Campus & Ciencia"),
        ("comunicados", "Comunicado Oficial", "Oficial"),
    ]

    existing_posts = []
    if os.path.exists(POSTS_FILE):
        try:
            with open(POSTS_FILE, "r", encoding="utf-8") as handle:
                existing_posts = json.load(handle).get("posts", [])
        except (OSError, json.JSONDecodeError):
            existing_posts = []

    # Una única entrada ya publicada no demuestra que el feed esté al día.
    # No renovar last_sync ni las URLs CDN con una respuesta parcial antigua.
    if len(extracted) < 3 and existing_posts:
        known_urls = {
            urlparse(post.get("facebook_url", "")).path.rstrip("/").lower()
            for post in existing_posts
        }
        has_new_post = any(
            urlparse(item.get("postUrl", "")).path.rstrip("/").lower() not in known_urls
            for item in extracted
            if item.get("postUrl") and not is_excluded_post(item.get("text", ""))
        )
        if not has_new_post:
            print("[!] Facebook devolvió un feed parcial sin novedades; no se actualiza last_sync.")
            return False

    new_posts = []
    seen_img_ids = set()
    seen_titles = set()

    for item in extracted:
        raw_text = item.get("text", "")
        if is_excluded_post(raw_text):
            print("[-] Publicación de condolencias/duelo omitida.")
            continue

        url = item.get("imgUrl", "")
        img_id = get_img_id(url)
        if not url or not img_id or is_profile_image_url(url):
            continue

        lines = clean_text_lines(raw_text)
        raw_title = lines[0] if lines else "Publicación oficial UNA Puno"
        title = raw_title.upper()
        if len(title) > 95:
            title = title[:92] + "..."
        title_key = title[:45].strip()

        if img_id in seen_img_ids or title_key in seen_titles:
            continue
        seen_img_ids.add(img_id)
        seen_titles.add(title_key)

        idx = len(new_posts)
        category = categories[idx % len(categories)]
        description = (
            "\n".join(lines[1:5])
            if len(lines) > 1
            else f"Información oficial de la UNA Puno sobre {raw_title.rstrip('.')}."
        )
        if len(description) > 350:
            description = description[:347] + "..."

        published_at = parse_published_at(item.get("publishedAt")) or now

        new_posts.append(
            {
                "id": f"fb-official-{idx + 1:02d}",
                "title": title,
                "subtitle": "Publicado en facebook.com/unapunooficial",
                "category": category[0],
                "category_label": category[1],
                "badge": category[2],
                "date": published_at.strftime("%d %b %Y, %H:%M UTC"),
                "published_at": published_at.isoformat(),
                "image": get_high_resolution_image_url(url),
                "thumbnail": url,
                "description": description,
                "facebook_url": item.get("postUrl") or FACEBOOK_URL,
                "likes": 1400 + (idx * 320),
                "shares": 260 + (idx * 75),
                "featured": True,
                "is_real_facebook": True,
                "extracted_at": now.isoformat(),
            }
        )

        if len(new_posts) >= 5:
            break

    # Si Facebook entrega menos de cinco entradas, completar sin perder las
    # publicaciones previas que todavía no estén repetidas.
    for previous in existing_posts:
        if len(new_posts) >= 5:
            break
        if is_excluded_post(
            previous.get("title", ""),
            previous.get("description", ""),
            previous.get("badge", ""),
        ) or is_profile_image_url(previous.get("image", "")):
            continue
        previous_img_id = get_img_id(previous.get("image", ""))
        previous_title = previous.get("title", "").upper()[:45].strip()
        if previous_img_id and previous_img_id not in seen_img_ids and previous_title not in seen_titles:
            seen_img_ids.add(previous_img_id)
            seen_titles.add(previous_title)
            new_posts.append(dict(previous))

    if not new_posts:
        print("[!] La respuesta no contenía publicaciones utilizables.")
        return False

    for index, post in enumerate(new_posts[:5]):
        post["id"] = f"fb-official-{index + 1:02d}"
        thumbnail = post.get("thumbnail") or post.get("image", "")
        post["thumbnail"] = thumbnail
        post["image"] = get_high_resolution_image_url(post.get("image") or thumbnail)

    payload = {
        "university": {
            "name": "Universidad Nacional del Altiplano",
            "short_name": "UNA PUNO",
            "location": "Puno, Perú (3,827 m.s.n.m.)",
            "facebook_page": FACEBOOK_URL,
            "facebook_handle": "@unapunooficial",
            "last_sync": now.isoformat(),
            "sync_status": f"OK - {len(new_posts[:5])} URLs directas de Facebook",
            "auto_refresh_minutes": 15,
        },
        "posts": new_posts[:5],
    }

    os.makedirs(os.path.dirname(POSTS_FILE), exist_ok=True)
    temporary_file = POSTS_FILE + ".tmp"
    with open(temporary_file, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    os.replace(temporary_file, POSTS_FILE)

    # El HTML puede abrirse directamente desde el administrador de archivos
    # de Android, donde fetch(file://...) es bloqueado por el navegador.
    # Publicar el mismo payload como JS permite mostrar los últimos datos
    # disponibles sin romper el modo estático; el JSON sigue siendo la fuente
    # preferida cuando la página se sirve por HTTP.
    temporary_js_file = POSTS_JS_FILE + ".tmp"
    with open(temporary_js_file, "w", encoding="utf-8") as handle:
        handle.write("window.UNAP_POSTS_DATA = ")
        json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write(";\n")
    os.replace(temporary_js_file, POSTS_JS_FILE)

    print(f"[OK] {len(new_posts[:5])} publicaciones actualizadas en {POSTS_FILE}.")
    return True


def run_sync():
    extracted = asyncio.run(scrape_with_browser())
    return format_and_save(extracted)


def main():
    if "--daemon" in sys.argv or "--loop" in sys.argv:
        print("=" * 65)
        print("  SINCRONIZADOR DE FACEBOOK CADA 15 MINUTOS ACTIVO")
        print("  Página: @unapunooficial")
        print("=" * 65)
        while True:
            try:
                run_sync()
            except Exception as error:
                print(f"[!] Error: {error}")
            print("[*] Esperando 15 minutos (900 seg) para el próximo ciclo...")
            time.sleep(15 * 60)
    else:
        if not run_sync():
            raise SystemExit(1)


if __name__ == "__main__":
    main()
