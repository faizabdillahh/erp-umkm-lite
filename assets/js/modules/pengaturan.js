/* ============================================================
   PENGATURAN.JS — Modul Pengaturan Aplikasi
   ============================================================ */
'use strict';

const PengaturanModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container = null;
  let _settings  = {};

  // ─── Init ────────────────────────────────────────────────────
  async function init(container) {
    _container = container;
    await _loadSettings();
    _render();
    _bindEvents();
  }

  async function _loadSettings() {
    try {
      const rows = await DB.getAll('settings');
      _settings = {};
      rows.forEach(row => { _settings[row.key] = row.value; });
    } catch (error) {
      console.error('[Pengaturan] Gagal memuat settings:', error);
    }
  }

  // ─── Render ──────────────────────────────────────────────────
  function _render() {
    if (!_container) return;

    _container.innerHTML = `
      <div class="master-data">
        <div class="master-data__header">
          <h1 class="dashboard__title">Pengaturan</h1>
        </div>

        <!-- Profil Usaha -->
        <div class="card" style="margin-bottom: var(--space-4);">
          <div class="card__header"><h3 class="card__title">🏢 Profil Usaha</h3></div>
          <div class="card__body">
            <form id="profile-form" autocomplete="off">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
                <div class="form-group">
                  <label for="set-business-name">Nama Usaha</label>
                  <input type="text" id="set-business-name" name="businessName" maxlength="200" value="${Utils.escapeHtml(_settings.businessName || '')}" placeholder="Nama usaha">
                </div>
                <div class="form-group">
                  <label for="set-owner-name">Nama Pemilik</label>
                  <input type="text" id="set-owner-name" name="ownerName" maxlength="200" value="${Utils.escapeHtml(_settings.ownerName || '')}" placeholder="Nama pemilik">
                </div>
                <div class="form-group">
                  <label for="set-phone">Telepon</label>
                  <input type="tel" id="set-phone" name="phone" maxlength="20" value="${Utils.escapeHtml(_settings.phone || '')}" placeholder="0812xxxx">
                </div>
                <div class="form-group">
                  <label for="set-email">Email</label>
                  <input type="email" id="set-email" name="email" maxlength="100" value="${Utils.escapeHtml(_settings.email || '')}" placeholder="email@usaha.com">
                </div>
                <div class="form-group" style="grid-column:span 2;">
                  <label for="set-address">Alamat</label>
                  <textarea id="set-address" name="address" maxlength="300" rows="2" placeholder="Alamat usaha">${Utils.escapeHtml(_settings.address || '')}</textarea>
                </div>
              </div>
              <button type="submit" class="btn btn--primary mt-4">💾 Simpan Profil</button>
            </form>
          </div>
        </div>

        <!-- Konfigurasi Keuangan -->
        <div class="card" style="margin-bottom: var(--space-4);">
          <div class="card__header"><h3 class="card__title">💰 Konfigurasi Keuangan</h3></div>
          <div class="card__body">
            <form id="finance-config-form" autocomplete="off">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
                <div class="form-group">
                  <label for="set-tax-rate">PPN / Pajak Default (%)</label>
                  <input type="number" id="set-tax-rate" name="taxRate" min="0" max="100" step="0.1" value="${_settings.taxRate ?? 0}">
                </div>
                <div class="form-group">
                  <label for="set-default-payment">Metode Bayar Default</label>
                  <select id="set-default-payment" name="defaultPaymentMethod">
                    <option value="cash" ${(_settings.defaultPaymentMethod === 'cash') ? 'selected' : ''}>Tunai</option>
                    <option value="transfer" ${(_settings.defaultPaymentMethod === 'transfer') ? 'selected' : ''}>Transfer</option>
                    <option value="qris" ${(_settings.defaultPaymentMethod === 'qris') ? 'selected' : ''}>QRIS</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="set-fiscal-year">Awal Tahun Fiskal (MM-DD)</label>
                  <input type="text" id="set-fiscal-year" name="fiscalYearStart" maxlength="5" value="${Utils.escapeHtml(_settings.fiscalYearStart || '01-01')}" placeholder="01-01">
                </div>
                <div class="form-group">
                  <label for="set-dead-stock">Dead Stock (hari)</label>
                  <input type="number" id="set-dead-stock" name="deadStockDays" min="1" value="${_settings.deadStockDays ?? 30}">
                </div>
                <div class="form-group" style="grid-column:span 2;">
                  <label>
                    <input type="checkbox" name="lowStockAlert" ${_settings.lowStockAlert !== false ? 'checked' : ''}> 
                    Aktifkan notifikasi stok menipis
                  </label>
                </div>
              </div>
              <button type="submit" class="btn btn--primary mt-4">💾 Simpan Konfigurasi</button>
            </form>
          </div>
        </div>

        <!-- Tampilan -->
        <div class="card" style="margin-bottom: var(--space-4);">
          <div class="card__header"><h3 class="card__title">🎨 Tampilan</h3></div>
          <div class="card__body">
            <form id="theme-form" autocomplete="off">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
                <div class="form-group">
                  <label for="set-theme">Tema</label>
                  <select id="set-theme" name="theme">
                    <option value="light" ${(_settings.theme === 'light') ? 'selected' : ''}>Terang</option>
                    <option value="dark" ${(_settings.theme === 'dark') ? 'selected' : ''}>Gelap</option>
                    <option value="auto" ${(!_settings.theme || _settings.theme === 'auto') ? 'selected' : ''}>Otomatis</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="set-primary-color">Warna Utama</label>
                  <input type="color" id="set-primary-color" name="primaryColor" value="${_settings.primaryColor || '#1a6b3c'}">
                </div>
              </div>
              <button type="submit" class="btn btn--primary mt-4">💾 Simpan Tema</button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Events ──────────────────────────────────────────────────
  function _bindEvents() {
    if (!_container) return;

    _container.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (e.target.id === 'profile-form') {
        const formData = new FormData(e.target);
        const data = {
          businessName: String(formData.get('businessName') ?? '').trim(),
          ownerName   : String(formData.get('ownerName') ?? '').trim(),
          phone       : String(formData.get('phone') ?? '').trim(),
          email       : String(formData.get('email') ?? '').trim(),
          address     : String(formData.get('address') ?? '').trim(),
        };
        await _saveMultipleSettings(data);
      }

      if (e.target.id === 'finance-config-form') {
        const formData = new FormData(e.target);
        const data = {
          taxRate              : parseFloat(formData.get('taxRate')) || 0,
          defaultPaymentMethod : formData.get('defaultPaymentMethod'),
          fiscalYearStart      : formData.get('fiscalYearStart') || '01-01',
          deadStockDays        : parseInt(formData.get('deadStockDays')) || 30,
          lowStockAlert        : formData.get('lowStockAlert') === 'on',
        };
        await _saveMultipleSettings(data);
      }

      if (e.target.id === 'theme-form') {
        const formData = new FormData(e.target);
        const theme = formData.get('theme');
        const primaryColor = formData.get('primaryColor');

        await _saveMultipleSettings({ theme, primaryColor });
        _applyTheme(theme, primaryColor);
      }
    });
  }

  async function _saveMultipleSettings(data) {
    try {
      for (const [key, value] of Object.entries(data)) {
        await AppState.saveSetting(key, value);
      }
      await _loadSettings();
      alert('Pengaturan berhasil disimpan.');
    } catch (error) {
      console.error('[Pengaturan] Gagal menyimpan:', error);
      alert('Gagal menyimpan pengaturan.');
    }
  }

  function _applyTheme(theme, primaryColor) {
    // Tema
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // Warna utama
    if (primaryColor) {
      document.documentElement.style.setProperty('--color-primary', primaryColor);
      // Simpan juga ke localStorage untuk diterapkan saat load ulang
      localStorage.setItem('umkm_primary_color', primaryColor);
    }
    localStorage.setItem('umkm_theme', theme);
  }

  // ─── Destroy ─────────────────────────────────────────────────
  function destroy() {
    _container?.replaceChildren();
    _container = null;
  }

  return { init, destroy };
})();