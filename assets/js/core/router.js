/* ============================================================
   ROUTER.JS — Hash-Based SPA Router (Updated)
   ============================================================ */
'use strict';

const Router = (() => {
  // ─── Constants ───────────────────────────────────────────────
  const MAIN_CONTENT_ID = 'main-content';

  const ROUTE_MAP = {
    '#/'             : 'dashboard',
    '#/dashboard'    : 'dashboard',
    '#/master-data'  : 'master-data',
    '#/penjualan'    : 'penjualan',
    '#/pembelian'    : 'pembelian',
    '#/produk'       : 'produk',
    '#/produksi'     : 'produksi',
    '#/persediaan'   : 'persediaan',
    '#/pelanggan'    : 'pelanggan',
    '#/supplier'     : 'supplier',
    '#/keuangan'     : 'keuangan',
    '#/marketing'    : 'marketing',
    '#/sdm'          : 'sdm',
    '#/operasional'  : 'operasional',
    '#/analitik'     : 'analitik',
    '#/dokumen'      : 'dokumen',
    '#/pengaturan'   : 'pengaturan',
    '#/backup'       : 'backup',
  };

  // Modul yang sudah diimplementasi (sisanya placeholder)
  const MODULE_LOADERS = {
    'dashboard'    : () => DashboardModule,
    'master-data'  : () => MasterDataModule,
    'penjualan'    : () => PenjualanModule,
    'pembelian'    : () => PembelianModule,
    'produk'       : () => ProdukModule,
    'pelanggan'    : () => PelangganModule,
    'supplier'     : () => SupplierModule,
    'persediaan' : () => PersediaanModule,
    'keuangan' : () => KeuanganModule,
    'marketing' : () => MarketingModule,
    'sdm' : () => SDMModule,
    'backup' : () => BackupModule,
    'pengaturan' : () => PengaturanModule,
    'produksi' : () => ProduksiModule,
    'operasional' : () => OperasionalModule,
    'analitik' : () => AnalitikModule,
    'dokumen' : () => DokumenModule,
  };

  // ─── Private State ───────────────────────────────────────────
  let _currentModuleName = null;
  let _currentCleanup    = null;

  // ─── Init ────────────────────────────────────────────────────
  function init() {
    window.addEventListener('hashchange', _handleRouteChange);
    _handleRouteChange();
  }

  // ─── Handle Route Change ─────────────────────────────────────
  async function _handleRouteChange() {
    const hash = location.hash || '#/';
    const moduleName = ROUTE_MAP[hash];

    if (!moduleName) {
      location.hash = '#/';
      return;
    }

    try {
      await _navigateTo(moduleName);
      _highlightActiveNav(hash);
      AppState.set('currentModule', moduleName);
    } catch (error) {
      console.error('[Router] Gagal navigasi ke', moduleName, error);
      _renderError(moduleName);
    }
  }

  // ─── Navigasi ke Modul ──────────────────────────────────────
  async function _navigateTo(moduleName) {
    const container = document.getElementById(MAIN_CONTENT_ID);
    if (!container) throw new Error('Container tidak ditemukan');

    // Cleanup modul sebelumnya
    if (typeof _currentCleanup === 'function') {
      _currentCleanup();
      _currentCleanup = null;
    }

    container.scrollTop = 0;
    _currentModuleName = moduleName;

    // Muat modul
    const loader = MODULE_LOADERS[moduleName];
    if (loader) {
      const module = await loader();
      await module.init(container);
      _currentCleanup = module.destroy;
    } else {
      // Placeholder untuk modul yang belum dibuat
      _renderPlaceholder(container, moduleName);
      _currentCleanup = null;
    }
  }

  // ─── Render Placeholder ──────────────────────────────────────
  function _renderPlaceholder(container, moduleName) {
    const title = moduleName.charAt(0).toUpperCase() + moduleName.slice(1).replace('-', ' ');
    container.innerHTML = `
      <div class="empty-state" style="min-height: 60vh;">
        <div class="empty-state__icon">🚧</div>
        <h2 class="empty-state__title">${Utils.escapeHtml(title)}</h2>
        <p style="color: var(--color-text-muted);">
          Modul <strong>${Utils.escapeHtml(moduleName)}</strong> sedang dalam pengembangan.
        </p>
      </div>
    `;
  }

  // ─── Render Error ────────────────────────────────────────────
  function _renderError(moduleName) {
    const container = document.getElementById(MAIN_CONTENT_ID);
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <h2 class="empty-state__title">Gagal Memuat Modul</h2>
        <p style="color: var(--color-text-muted);">
          Terjadi kesalahan saat membuka <strong>${Utils.escapeHtml(moduleName)}</strong>.
        </p>
        <button class="btn btn--primary mt-4" onclick="location.reload()">Muat Ulang</button>
      </div>
    `;
  }

  // ─── Highlight Navigasi Aktif ────────────────────────────────
  function _highlightActiveNav(hash) {
    document.querySelectorAll('.sidebar__link').forEach(link => {
      const linkHash = link.getAttribute('href');
      const isActive = (linkHash === hash) || (hash === '#/' && linkHash === '#/');
      link.classList.toggle('active', isActive);
    });
  }

  function navigate(hash) {
    location.hash = hash;
  }

  // ─── Public API ─────────────────────────────────────────────
  return { init, navigate };
})();