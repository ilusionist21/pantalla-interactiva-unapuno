/**
 * PANTALLA DIGITAL INTERACTIVA UNA PUNO
 * Controlador Apple Minimalista: 5 Últimas Publicaciones Oficiales
 * Sincronización Automática cada 15 Minutos (Compatible con cPanel y Local)
 */

class AppleKioskApp {
  constructor() {
    this.posts = [];
    this.currentIdx = 0;
    
    // Configuración de Rotación Automática
    this.slideDuration = 7000; // 7 segundos por publicación
    this.slideElapsed = 0;
    this.slideTimer = null;
    this.isPaused = false;
    this.pauseTimeout = null;

    // Sincronización Automática de Facebook (15 minutos)
    this.fbSyncIntervalMs = 15 * 60 * 1000;
    this.weatherRefreshIntervalMs = 30 * 60 * 1000;
    this.lastSyncTime = 0;
    this.fallbackImage = 'assets/portal_unap.jpg';
    this.lastForegroundRefresh = 0;
    this.publicShareUrl = window.location.protocol === 'file:'
      ? 'https://ilusionist21.github.io/pantalla-interactiva-unapuno/'
      : new URL('./', window.location.href).href;

    this.init();
  }

  async init() {
    this.startClock();
    this.startWeather();
    this.setupEvents();
    await this.loadPosts();
    this.renderDockCards();
    this.showPost(0);
    this.startAutoRotation();
    this.start15MinAutoSync();
  }

  /* ==========================================================================
     1. RELOJ DIGITAL Y ESTADO APPLE
     ========================================================================== */
  startClock() {
    const update = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      
      const clockEl = document.getElementById('clock');
      const clockSecEl = document.getElementById('clockSec');
      if (clockEl) clockEl.textContent = `${h}:${m}`;
      if (clockSecEl) clockSecEl.textContent = `:${s}`;

      this.updateSyncBadge();
    };

    update();
    setInterval(update, 1000);
  }

  updateSyncBadge() {
    const syncEl = document.getElementById('syncText');
    if (!syncEl) return;

    if (!this.lastSyncTime) {
      syncEl.textContent = 'Comprobando datos';
      return;
    }

    const elapsedM = Math.max(0, Math.floor((Date.now() - this.lastSyncTime) / 60000));
    const elapsed = elapsedM < 60 ? `${elapsedM} min` : `${Math.floor(elapsedM / 60)} h`;
    syncEl.textContent = `Actualizado • hace ${elapsed}`;
  }

  startWeather() {
    this.loadWeather();
    setInterval(() => this.loadWeather(), this.weatherRefreshIntervalMs);
  }

  async loadWeather() {
    const weatherEl = document.getElementById('weatherTemp');
    if (!weatherEl) return;

    try {
      const resp = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-15.8402&longitude=-70.0219&current=temperature_2m&timezone=America%2FLima', { cache: 'no-store' });
      if (!resp.ok) return;
      const data = await resp.json();
      const temperature = Number(data.current?.temperature_2m);
      if (Number.isFinite(temperature)) weatherEl.textContent = `${Math.round(temperature)} °C`;
    } catch (error) {
      console.warn('Error al consultar el clima:', error);
    }
  }

  /* ==========================================================================
     2. RECARGA AUTOMÁTICA DE FACEBOOK CADA 15 MINUTOS (CPANEL / LOCAL)
     ========================================================================== */
  start15MinAutoSync() {
    setInterval(() => {
      this.refreshFacebookData();
    }, this.fbSyncIntervalMs);

    // Android puede pausar los timers cuando la pestaña queda en segundo
    // plano. Al volver a la página se solicita el JSON sin esperar 15 minutos.
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && Date.now() - this.lastForegroundRefresh > 60000) {
        this.lastForegroundRefresh = Date.now();
        this.refreshFacebookData();
      }
    });

    window.addEventListener('pageshow', () => {
      if (Date.now() - this.lastForegroundRefresh > 60000) {
        this.lastForegroundRefresh = Date.now();
        this.loadPosts().then(() => {
          this.renderDockCards();
          this.showPost(this.currentIdx);
        });
      }
    });
  }

  refreshFacebookData() {
    // El cron actualiza los datos; la pantalla solo los consulta.
    const previousLatest = `${this.posts[0]?.published_at || this.posts[0]?.date || ''}|${this.posts[0]?.title || ''}`;
    this.loadPosts().then(() => {
      const currentLatest = `${this.posts[0]?.published_at || this.posts[0]?.date || ''}|${this.posts[0]?.title || ''}`;
      this.renderDockCards();
      this.showPost(previousLatest && currentLatest !== previousLatest ? 0 : this.currentIdx);
    });
  }

  /* ==========================================================================
     3. CARGA DE LAS 5 PUBLICACIONES OFICIALES
     ========================================================================== */
  async loadPosts() {
    const embeddedPosts = this.normalizePosts(window.UNAP_POSTS_DATA?.posts);
    if (embeddedPosts.length) {
      this.posts = embeddedPosts;
      this.lastSyncTime = Date.parse(window.UNAP_POSTS_DATA?.university?.last_sync) || 0;
    }

    try {
      const resp = await fetch('data/posts.json?t=' + Date.now(), { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        const remotePosts = this.normalizePosts(data.posts);
        if (remotePosts.length) {
          this.posts = remotePosts;
          this.lastSyncTime = Date.parse(data.university?.last_sync) || 0;
        }
      }
    } catch (e) {
      console.warn('Error al leer posts.json:', e);
    }

    if (!this.posts.length) {
      this.posts = [
        {
          id: "fb-official-01",
          title: "INFORMACIÓN OFICIAL UNA PUNO",
          badge: "UNA Puno",
          date: "Publicación Oficial",
          image: "assets/portal_unap.jpg",
          thumbnail: "assets/portal_unap.jpg",
          description: "Noticias, actividades académicas, investigación, cultura y logros de la Universidad Nacional del Altiplano.",
          facebook_url: "https://www.facebook.com/unapunooficial",
          likes: 1400,
          shares: 260
        }
      ];
    }
  }

  normalizePosts(posts) {
    return (Array.isArray(posts) ? posts : [])
      .filter(post => post && (post.image || post.thumbnail) && post.title && !this.isExcludedPost(post))
      .slice(0, 5);
  }

  isExcludedPost(post) {
    const searchable = [post.title, post.description, post.badge, post.category_label]
      .filter(Boolean)
      .join(' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ');

    return [
      'condolencia', 'fallecimiento', 'fallecido', 'sensible deceso',
      'nota de pesar', 'duelo', 'luto', 'pesame', 'sepelio',
      'qepd', 'q e p d', 'que en paz descanse', 'in memoriam',
      'misa de honras'
    ].some(term => searchable.includes(term));
  }

  /* ==========================================================================
     4. RENDERIZADO DEL POST ACTIVO
     ========================================================================== */
  showPost(idx) {
    if (!this.posts.length) return;
    this.currentIdx = (idx + this.posts.length) % this.posts.length;
    const post = this.posts[this.currentIdx];

    const heroImg = document.getElementById('heroImage');
    const ambientGlow = document.getElementById('ambientGlow');
    const catBadge = document.getElementById('categoryBadge');
    const postDate = document.getElementById('postDate');
    const currIdx = document.getElementById('currIdx');
    const totalPosts = document.getElementById('totalPosts');
    const postTitle = document.getElementById('postTitle');
    const postDesc = document.getElementById('postDescription');
    const likesEl = document.getElementById('metricLikes');
    const sharesEl = document.getElementById('metricShares');
    const fbBtn = document.getElementById('btnFb');

    // Fotografía nítida
    if (heroImg) {
      this.setImageSource(heroImg, this.getPostImage(post), post.title);
      heroImg.alt = post.title;
    }

    if (ambientGlow) {
      ambientGlow.style.backgroundImage = `url('${post.image}')`;
    }

    if (catBadge) catBadge.textContent = post.badge || post.category_label || 'OFICIAL';
    if (postDate) postDate.textContent = post.date || 'Publicación Oficial';
    if (currIdx) currIdx.textContent = this.currentIdx + 1;
    if (totalPosts) totalPosts.textContent = this.posts.length;
    if (postTitle) postTitle.textContent = post.title;
    if (postDesc) postDesc.textContent = post.description;

    if (likesEl) likesEl.textContent = (post.likes || 1400).toLocaleString();
    if (sharesEl) sharesEl.textContent = (post.shares || 350).toLocaleString();
    if (fbBtn) fbBtn.href = post.facebook_url || 'https://www.facebook.com/unapunooficial';

    // Resaltar tarjeta activa en el Dock
    document.querySelectorAll('.dock-card').forEach((card, i) => {
      card.classList.toggle('active', i === this.currentIdx);
    });

    this.resetProgressBar();
  }

  /* ==========================================================================
     5. DOCK DE NAVEGACIÓN FLOTANTE (5 TARJETAS)
     ========================================================================== */
  renderDockCards() {
    const dock = document.getElementById('dockCards');
    if (!dock) return;
    dock.innerHTML = '';

    this.posts.forEach((post, i) => {
      const card = document.createElement('div');
      card.className = `dock-card ${i === this.currentIdx ? 'active' : ''}`;
      card.onclick = () => {
        this.showPost(i);
        this.pauseTemporarily();
      };

      const thumb = document.createElement('img');
      thumb.className = 'dock-thumb';
      thumb.loading = 'lazy';
      thumb.alt = post.title;
      this.setImageSource(thumb, this.getPostThumbnail(post), post.title);

      const info = document.createElement('div');
      info.className = 'dock-info';

      const meta = document.createElement('div');
      meta.className = 'dock-meta-tag';

      const number = document.createElement('span');
      number.className = 'dock-num';
      number.textContent = `0${i + 1}`;

      const badge = document.createElement('span');
      badge.className = 'dock-badge';
      badge.textContent = post.badge || 'UNA';

      const title = document.createElement('span');
      title.className = 'dock-title';
      title.textContent = post.title;

      meta.append(number, badge);
      info.append(meta, title);
      card.append(thumb, info);
      dock.appendChild(card);
    });
  }

  getPostImage(post) {
    return post && (post.image || post.thumbnail) || this.fallbackImage;
  }

  getPostThumbnail(post) {
    return post && (post.thumbnail || post.image) || this.fallbackImage;
  }

  setImageSource(img, source, alt = '') {
    if (!img) return;
    img.alt = alt;
    img.dataset.fallbackApplied = 'false';
    img.onerror = () => {
      if (img.dataset.fallbackApplied === 'true') return;
      img.dataset.fallbackApplied = 'true';
      img.src = this.fallbackImage;
    };
    img.src = source || this.fallbackImage;
  }

  /* ==========================================================================
     6. ROTACIÓN AUTOMÁTICA Y PAUSA INTELIGENTE
     ========================================================================== */
  startAutoRotation() {
    this.stopAutoRotation();
    this.slideElapsed = 0;
    const step = 50;
    const bar = document.getElementById('progressFill');

    this.slideTimer = setInterval(() => {
      if (this.isPaused) return;

      this.slideElapsed += step;
      const pct = (this.slideElapsed / this.slideDuration) * 100;
      if (bar) bar.style.width = `${pct}%`;

      if (this.slideElapsed >= this.slideDuration) {
        this.next();
      }
    }, step);
  }

  stopAutoRotation() {
    if (this.slideTimer) {
      clearInterval(this.slideTimer);
      this.slideTimer = null;
    }
  }

  resetProgressBar() {
    this.slideElapsed = 0;
    const bar = document.getElementById('progressFill');
    if (bar) bar.style.width = '0%';
  }

  next() {
    this.showPost(this.currentIdx + 1);
  }

  prev() {
    this.showPost(this.currentIdx - 1);
  }

  pauseTemporarily() {
    this.isPaused = true;
    if (this.pauseTimeout) clearTimeout(this.pauseTimeout);
    // Reanudar automáticamente tras 12 segundos de inactividad
    this.pauseTimeout = setTimeout(() => {
      this.isPaused = false;
    }, 12000);
  }

  /* ==========================================================================
     7. MODAL ZOOM HD APPLE
     ========================================================================== */
  openZoom() {
    const modal = document.getElementById('zoomModal');
    const zoomImg = document.getElementById('zoomImage');
    const post = this.posts[this.currentIdx];

    if (modal && zoomImg && post) {
      this.setImageSource(zoomImg, this.getPostImage(post), post.title);
      modal.classList.add('active');
      this.pauseTemporarily();
    }
  }

  closeZoom() {
    const modal = document.getElementById('zoomModal');
    if (modal) modal.classList.remove('active');
  }

  /* ==========================================================================
     8. PANTALLA COMPLETA Y QR
     ========================================================================== */
  toggleFS() {
    const label = document.getElementById('fsLabel');
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        if (label) label.textContent = 'Salir';
      }).catch(() => {});
    } else {
      document.exitFullscreen().then(() => {
        if (label) label.textContent = 'Pantalla Completa';
      });
    }
  }

  openQR() {
    const modal = document.getElementById('qrModal');
    const canvas = document.getElementById('qrCanvas');
    const urlLabel = document.getElementById('qrUrl');
    if (!modal || !canvas) return;

    canvas.innerHTML = '';
    const shareUrl = this.getShareUrl();
    if (urlLabel) urlLabel.textContent = shareUrl;

    if (typeof QRCode !== 'undefined') {
      new QRCode(canvas, {
        text: shareUrl,
        width: 168,
        height: 168,
        colorDark: "#030712",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    }

    modal.classList.add('active');
    this.pauseTemporarily();
  }

  getShareUrl() {
    const localHosts = ['localhost', '127.0.0.1', '[::1]'];
    if (window.location.protocol === 'file:' || localHosts.includes(window.location.hostname)) {
      return this.publicShareUrl;
    }
    return window.location.href;
  }

  closeQR() {
    const modal = document.getElementById('qrModal');
    if (modal) modal.classList.remove('active');
  }

  setupEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { this.next(); this.pauseTemporarily(); }
      else if (e.key === 'ArrowLeft') { this.prev(); this.pauseTemporarily(); }
      else if (e.key === 'Escape') { this.closeQR(); this.closeZoom(); }
    });

    const card = document.querySelector('.cinema-card');
    if (card) {
      card.addEventListener('touchstart', () => { this.pauseTemporarily(); }, { passive: true });
    }

    document.addEventListener('fullscreenchange', () => {
      const label = document.getElementById('fsLabel');
      if (label) {
        label.textContent = document.fullscreenElement ? 'Salir' : 'Pantalla Completa';
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppleKioskApp();
});
