/* ============================================================
   APP.JS — Bootstrap Aplikasi, Inisialisasi DB & Router
   ============================================================ */
'use strict';

(async function initApp() {
  // ─── Error State UI ──────────────────────────────────────────
  function showFatalError(message) {
    const main = document.getElementById('main-content');
    if (main) {
      main.innerHTML = `
        <div class="empty-state" style="min-height: 80vh;">
          <div class="empty-state__icon">⚠️</div>
          <h2 class="empty-state__title">Gagal Memulai Aplikasi</h2>
          <p style="color: var(--color-text-muted); margin-bottom: var(--space-4);">
            ${Utils.escapeHtml(message)}
          </p>
          <button class="btn btn--primary" onclick="location.reload()">
            Muat Ulang Halaman
          </button>
        </div>
      `;
    }
  }

  try {
    // ─── 1. Inisialisasi Database ──────────────────────────────
    console.log('[App] Membuka database...');
    await DB.open();
    console.log('[App] Database siap.');

    // ─── 2. Muat Settings ──────────────────────────────────────
    console.log('[App] Memuat settings...');
    await AppState.loadSettings();
    console.log('[App] Settings dimuat.');

    // ─── 3. Inisialisasi Router ────────────────────────────────
    console.log('[App] Inisialisasi router...');
    Router.init();
    console.log('[App] Router siap.');

    // ─── 4. Global Error Handlers ──────────────────────────────
    window.addEventListener('error', (event) => {
      console.error('[Unhandled Error]', event.error);
      // Hindari spam notifikasi untuk resource load error
      if (event.target === window) {
        Notify.error?.('Terjadi kesalahan tidak terduga. Silakan muat ulang.');
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('[Unhandled Promise Rejection]', event.reason);
      event.preventDefault(); // Cegah console error tambahan
      if (event.reason instanceof DB.DBError) {
        Notify.error?.('Gangguan penyimpanan. Coba muat ulang halaman.');
      } else {
        Notify.error?.('Kesalahan sistem. Data Anda tetap aman.');
      }
    });

    // ─── 5. Siap ───────────────────────────────────────────────
    console.log('[App] UMKM ERP Lite siap digunakan.');
  } catch (error) {
    console.error('[App] Gagal inisialisasi:', error);
    showFatalError(error.message || 'Tidak dapat memulai aplikasi.');
  }
})();