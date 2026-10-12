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
    this.lastSyncTime = Date.now();

    this.init();
  }

  async init() {
    this.startClock();
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

    const elapsedSec = Math.floor((Date.now() - this.lastSyncTime) / 1000);
    const remainingSec = Math.max(0, (15 * 60) - elapsedSec);

    const remM = Math.floor(remainingSec / 60);
    const remS = String(remainingSec % 60).padStart(2, '0');

    if (elapsedSec < 60) {
      syncEl.textContent = `En Vivo • ${remM}:${remS}`;
    } else {
      const elapsedM = Math.floor(elapsedSec / 60);
      syncEl.textContent = `${elapsedM}m • Próx ${remM}:${remS}`;
    }
  }

  /* ==========================================================================
     2. RECARGA AUTOMÁTICA DE FACEBOOK CADA 15 MINUTOS (CPANEL / LOCAL)
     ========================================================================== */
  start15MinAutoSync() {
    setInterval(() => {
      this.refreshFacebookData();
    }, this.fbSyncIntervalMs);
  }

  refreshFacebookData() {
    this.lastSyncTime = Date.now();

    // En GitHub Pages o servidor estático, recargar posts.json directamente sin caché
    if (window.location.hostname.includes('github.io') || window.location.protocol === 'file:') {
      this.loadPosts().then(() => {
        this.renderDockCards();
        this.showPost(this.currentIdx);
      });
      return;
    }

    // En cPanel, disparar el script nativo sync_facebook.php y luego recargar posts.json
    fetch('sync_facebook.php', { cache: 'no-store' })
      .then(r => r.json())
      .then(res => {
        console.log('[Apple Sync OK]:', res);
        this.loadPosts().then(() => {
          this.renderDockCards();
          this.showPost(this.currentIdx);
        });
      })
      .catch(() => {
        this.loadPosts().then(() => {
          this.renderDockCards();
          this.showPost(this.currentIdx);
        });
      });
  }

  /* ==========================================================================
     3. CARGA DE LAS 5 PUBLICACIONES OFICIALES
     ========================================================================== */
  async loadPosts() {
    try {
      const resp = await fetch('data/posts.json?t=' + Date.now(), { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        this.posts = (data.posts || []).slice(0, 5);
      }
    } catch (e) {
      console.warn('Error al leer posts.json:', e);
    }

    if (!this.posts.length) {
      this.posts = [
        {
          id: "fb-official-01",
          title: "CONDOLENCIAS: DR. LUIS ALBERTO MAMANI HUANCA",
          badge: "Condolencias",
          date: "Hoy",
          image: "assets/fb_real_post_1.jpg",
          thumbnail: "assets/fb_real_post_1.jpg",
          description: "El Rector, Vicerrector Académico, Vicerrector de Investigación y la Facultad de Ciencias Agrarias tienen el inmenso dolor de hacer conocer el sensible fallecimiento del Dr. Luis Alberto Mamani Huanca.",
          facebook_url: "https://www.facebook.com/unapunooficial",
          likes: 3420,
          shares: 890
        }
      ];
    }
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
    const postTitle = document.getElementById('postTitle');
    const postDesc = document.getElementById('postDescription');
    const likesEl = document.getElementById('metricLikes');
    const sharesEl = document.getElementById('metricShares');
    const fbBtn = document.getElementById('btnFb');

    // Fotografía nítida
    if (heroImg) {
      heroImg.src = post.image;
      heroImg.alt = post.title;
    }

    if (ambientGlow) {
      ambientGlow.style.backgroundImage = `url('${post.image}')`;
    }

    if (catBadge) catBadge.textContent = post.badge || post.category_label || 'OFICIAL';
    if (postDate) postDate.textContent = post.date || 'Publicación Oficial';
    if (currIdx) currIdx.textContent = this.currentIdx + 1;
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

      card.innerHTML = `
        <img src="${post.thumbnail || post.image}" alt="${post.title}" class="dock-thumb" loading="lazy">
        <div class="dock-info">
          <div class="dock-meta-tag">
            <span class="dock-num">0${i + 1}</span>
            <span class="dock-badge">${post.badge || 'UNA'}</span>
          </div>
          <span class="dock-title">${post.title}</span>
        </div>
      `;
      dock.appendChild(card);
    });
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
      zoomImg.src = post.image;
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
    const shareUrl = window.location.href;
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
      card.addEventListener('mouseenter', () => { this.isPaused = true; });
      card.addEventListener('mouseleave', () => { this.isPaused = false; });
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
