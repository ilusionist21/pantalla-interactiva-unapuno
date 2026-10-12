# 📱 Pantalla Digital Interactiva UNA Puno - Muro Facebook en Vivo

Sistema de señalética digital y pantalla interactiva para la **Universidad Nacional del Altiplano Puno** ([@unapunooficial](https://www.facebook.com/unapunooficial)), diseñado específicamente para funcionar tanto en **cPanel básico (PHP puro + cURL sin Chrome)** como en **GitHub Pages**.

---

## ⚡ Instalación en cPanel Básico (Hosting Compartido)

No requiere Chrome, ni Node.js, ni Puppeteer. Utiliza la técnica del repositorio **`cbh-scraped-content`** (PHP nativo + cURL + GraphQL de Facebook).

### Paso 1: Subir archivos
1. Ingresa a tu **cPanel** y abre el **Administrador de Archivos** (*File Manager*).
2. Ve a la carpeta `public_html/` (o la subcarpeta donde quieras la pantalla).
3. Sube todos los archivos del proyecto.
4. Asegúrate de que la carpeta `data/` tenga permisos de escritura (`755` o `777`).

### Paso 2: Configurar Cron Job cada 15 minutos en cPanel
1. En cPanel, busca la sección **Trabajos de Cron** (*Cron Jobs*).
2. En **Configuración común**, selecciona: `Cada 15 minutos (*/15 * * * *)`.
3. En el campo **Comando**, ingresa:
   ```bash
   /usr/local/bin/php /home/TU_USUARIO/public_html/sync_facebook.php >/dev/null 2>&1
   ```
   *(Reemplaza `TU_USUARIO` por tu usuario de cPanel)*.

   O alternativamente usando cURL:
   ```bash
   curl -s "https://tudominio.com/sync_facebook.php" >/dev/null 2>&1
   ```

4. Haz clic en **Añadir nuevo trabajo de cron**. ¡Listo! El servidor extraerá automáticamente las fotos y publicaciones nuevas de Facebook cada 15 minutos.

---

## 🚀 Instalación en GitHub Pages (Alternativa 100% Gratis)

1. Sube el proyecto a tu repositorio de GitHub.
2. Ve a **Settings** > **Pages** y selecciona la rama `main`.
3. El flujo `.github/workflows/sync_facebook.yml` se ejecutará automáticamente cada 15 minutos para actualizar los datos.

---

## 🖥️ Uso en Tótem o Pantalla Táctil Local

- Haz doble clic en [`Abrir_Pantalla.bat`](file:///z:/A2%20como%20codex/pantallas%20interactivas/Abrir_Pantalla.bat) o [`PantallaInteractiva.exe`](file:///z:/A2%20como%20codex/pantallas%20interactivas/PantallaInteractiva.exe).
- Se abrirá en pantalla completa con rotación automática, reloj en vivo y código QR para celular.

---

## 📁 Archivos Clave del Proyecto

- `index.html`: Estructura en Celeste y Azul Institucional con el escudo oficial de la UNA Puno.
- `css/styles.css`: Estilos nítidos para totems, pantalla completa y teléfonos.
- `js/app.js`: Controlador que rota diapositivas y recarga Facebook cada 15 minutos.
- `sync_facebook.php`: **Scraper para cPanel (PHP + cURL)** basado en `cbh-scraped-content`.
- `data/posts.json`: Publicaciones y fotos en alta resolución.
- `assets/logo_unap.png`: Escudo oficial de la Universidad Nacional del Altiplano Puno.
