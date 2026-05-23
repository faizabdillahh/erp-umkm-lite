/* ============================================================
   BACKUP.JS — Modul Backup & Restore Data
   ============================================================ */
'use strict';

const BackupModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container = null;

  // Daftar semua object store yang akan dibackup/restore
  const ALL_STORES = [
    'products', 'categories', 'units', 'customers', 'suppliers',
    'sales', 'sale_items', 'purchases', 'purchase_items',
    'inventory', 'raw_materials', 'bom', 'production_orders',
    'expenses', 'incomes', 'cash_flow', 'assets',
    'employees', 'attendance', 'payroll',
    'marketing_campaigns', 'leads', 'tasks', 'documents',
    'settings', 'audit_log'
  ];

  // ─── Init ────────────────────────────────────────────────────
  async function init(container) {
    _container = container;
    _render();
    _bindEvents();
    _checkAutoBackupReminder();
  }

  // ─── Render ──────────────────────────────────────────────────
  function _render() {
    if (!_container) return;

    _container.innerHTML = `
      <div class="master-data">
        <div class="master-data__header">
          <h1 class="dashboard__title">Backup & Restore</h1>
        </div>

        <!-- Export Section -->
        <div class="card" style="margin-bottom: var(--space-4);">
          <div class="card__header">
            <h3 class="card__title">📤 Export Data</h3>
          </div>
          <div class="card__body">
            <p class="text-muted" style="margin-bottom: var(--space-3);">
              Simpan semua data ke file untuk cadangan. File dapat digunakan untuk restore atau analisis lebih lanjut.
            </p>
            <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
              <button class="btn btn--primary" id="btn-export-json">
                📥 Export JSON (Backup Lengkap)
              </button>
              <button class="btn btn--secondary" id="btn-export-csv">
                📊 Export CSV (Per Tabel)
              </button>
              <button class="btn btn--secondary" id="btn-export-xlsx">
                📊 Export Excel (XLSX)
              </button>
              <button class="btn btn--ghost" id="btn-copy-clipboard">
                📋 Salin ke Clipboard
              </button>
            </div>
            <div id="export-status" class="text-muted" style="margin-top: var(--space-2); font-size: var(--font-size-xs);"></div>
          </div>
        </div>

        <!-- Import Section -->
        <div class="card" style="margin-bottom: var(--space-4);">
          <div class="card__header">
            <h3 class="card__title">📥 Import / Restore Data</h3>
          </div>
          <div class="card__body">
            <p class="text-muted" style="margin-bottom: var(--space-3);">
              Pilih file backup JSON (.json) yang sebelumnya diexport. 
              <strong>Hati-hati:</strong> Import akan menimpa data yang ada.
            </p>
            <div class="form-group">
              <label for="import-file">File Backup JSON</label>
              <input type="file" id="import-file" accept=".json">
            </div>
            <div id="import-preview" style="margin: var(--space-3) 0;" hidden>
              <h4>Preview Data:</h4>
              <div id="import-preview-table"></div>
              <div style="margin-top: var(--space-3);">
                <button class="btn btn--primary" id="btn-import-confirm">✅ Konfirmasi Import</button>
                <button class="btn btn--ghost" id="btn-import-cancel">Batal</button>
              </div>
            </div>
            <div id="import-status" class="text-muted" style="margin-top: var(--space-2); font-size: var(--font-size-xs);"></div>
          </div>
        </div>

        <!-- Maintenance -->
        <div class="card">
          <div class="card__header">
            <h3 class="card__title">🧹 Maintenance</h3>
          </div>
          <div class="card__body">
            <p class="text-muted" style="margin-bottom: var(--space-3);">
              Hapus semua data dan mulai dari awal. Tindakan ini tidak dapat dibatalkan.
            </p>
            <button class="btn btn--danger" id="btn-reset-db">
              ⚠️ Reset Seluruh Database
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Events ──────────────────────────────────────────────────
  function _bindEvents() {
    if (!_container) return;

    _container.addEventListener('click', async (e) => {
      if (e.target.id === 'btn-export-json') {
        await _exportJSON();
      }
      if (e.target.id === 'btn-export-csv') {
        await _exportCSV();
      }
      if (e.target.id === 'btn-export-xlsx') {
        await _exportXLSX();
      }
      if (e.target.id === 'btn-copy-clipboard') {
        await _copyToClipboard();
      }
      if (e.target.id === 'btn-import-confirm') {
        await _confirmImport();
      }
      if (e.target.id === 'btn-import-cancel') {
        _cancelImport();
      }
      if (e.target.id === 'btn-reset-db') {
        _resetDatabase();
      }
    });

    _container.addEventListener('change', (e) => {
      if (e.target.id === 'import-file') {
        _handleFileSelect(e.target.files[0]);
      }
    });
  }

  // ─── Export JSON ─────────────────────────────────────────────
  async function _exportJSON() {
    const statusEl = document.getElementById('export-status');
    if (statusEl) statusEl.textContent = 'Mengumpulkan data...';

    try {
      const backup = {
        version: '1.0',
        appVersion: '1.0.0',
        exportDate: new Date().toISOString(),
        businessName: AppState.getSetting('businessName', 'UMKM'),
        data: {}
      };

      for (const storeName of ALL_STORES) {
        try {
          backup.data[storeName] = await DB.getAll(storeName);
        } catch (err) {
          // Store mungkin belum ada isinya
          backup.data[storeName] = [];
        }
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-umkm-erp-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      if (statusEl) {
        statusEl.textContent = `✅ Backup berhasil! (${Utils.formatDate(new Date(), 'DD/MM/YYYY hh:mm')})`;
        statusEl.style.color = 'var(--color-success)';
      }

      // Simpan timestamp backup terakhir
      localStorage.setItem('umkm_last_backup', new Date().toISOString());
      EventBus.emit('backup:completed');
    } catch (error) {
      console.error('[Backup] Gagal export:', error);
      if (statusEl) {
        statusEl.textContent = '❌ Gagal membuat backup.';
        statusEl.style.color = 'var(--color-danger)';
      }
    }
  }

  // ─── Export CSV ─────────────────────────────────────────────
  async function _exportCSV() {
    const statusEl = document.getElementById('export-status');
    if (statusEl) statusEl.textContent = 'Menyiapkan CSV...';

    try {
      // Export CSV untuk beberapa tabel utama saja
      const stores = ['products', 'customers', 'suppliers', 'sales', 'expenses'];
      let csvContent = '';

      for (const storeName of stores) {
        const data = await DB.getAll(storeName);
        if (data.length === 0) continue;

        csvContent += `\n=== ${storeName.toUpperCase()} ===\n`;
        const headers = Object.keys(data[0]).filter(k => !k.startsWith('_'));
        csvContent += headers.join(',') + '\n';

        data.forEach(row => {
          const values = headers.map(h => {
            const val = row[h];
            if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
            if (val === null || val === undefined) return '';
            return val;
          });
          csvContent += values.join(',') + '\n';
        });
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-umkm-erp-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      if (statusEl) statusEl.textContent = '✅ CSV berhasil diexport.';
    } catch (error) {
      console.error('[Backup] Gagal export CSV:', error);
      if (statusEl) statusEl.textContent = '❌ Gagal export CSV.';
    }
  }

  // ─── Export XLSX (Excel) ─────────────────────────────────────
  async function _exportXLSX() {
    const statusEl = document.getElementById('export-status');
    if (statusEl) statusEl.textContent = 'Menyiapkan Excel...';

    try {
      // Cek apakah SheetJS (XLSX) tersedia dari CDN
      if (typeof XLSX === 'undefined') {
        throw new Error('Library SheetJS belum dimuat. Pastikan koneksi internet dan CDN tersedia.');
      }

      const wb = XLSX.utils.book_new();
      // Export tabel-tabel utama ke sheet terpisah
      const stores = [
        'products', 'categories', 'units', 'customers', 'suppliers',
        'sales', 'sale_items', 'purchases', 'purchase_items',
        'expenses', 'incomes', 'employees', 'attendance', 'payroll'
      ];

      for (const storeName of stores) {
        const data = await DB.getAll(storeName);
        if (data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(data);
          // Nama sheet maksimal 31 karakter
          XLSX.utils.book_append_sheet(wb, ws, storeName.substring(0, 31));
        }
      }

      XLSX.writeFile(wb, `laporan-umkm-${new Date().toISOString().slice(0,10)}.xlsx`);

      if (statusEl) {
        statusEl.textContent = '✅ Excel berhasil diexport.';
        statusEl.style.color = 'var(--color-success)';
      }
    } catch (error) {
      console.error('[Backup] Gagal export XLSX:', error);
      if (statusEl) {
        statusEl.textContent = '❌ ' + Utils.escapeHtml(error.message);
        statusEl.style.color = 'var(--color-danger)';
      }
    }
  }

  // ─── Copy to Clipboard ──────────────────────────────────────
  async function _copyToClipboard() {
    const statusEl = document.getElementById('export-status');
    try {
      const backup = { data: {} };
      for (const storeName of ALL_STORES) {
        backup.data[storeName] = await DB.getAll(storeName);
      }
      await navigator.clipboard.writeText(JSON.stringify(backup, null, 2));
      if (statusEl) statusEl.textContent = '✅ Data disalin ke clipboard.';
    } catch (error) {
      if (statusEl) statusEl.textContent = '❌ Gagal menyalin ke clipboard.';
    }
  }

  // ─── Import JSON ────────────────────────────────────────────
  let _importData = null; // simpan sementara sebelum konfirmasi

  async function _handleFileSelect(file) {
    if (!file) return;
    const statusEl = document.getElementById('import-status');
    const previewEl = document.getElementById('import-preview');
    const previewTable = document.getElementById('import-preview-table');

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      // Validasi struktur
      if (!parsed.data || typeof parsed.data !== 'object') {
        throw new Error('Format file backup tidak valid.');
      }

      // Preview
      const storeNames = Object.keys(parsed.data).filter(k => Array.isArray(parsed.data[k]));
      previewTable.innerHTML = `
        <table class="table-container" style="width:100%;">
          <thead><tr><th>Tabel</th><th style="text-align:right;">Jumlah Record</th></tr></thead>
          <tbody>
            ${storeNames.map(s => `<tr><td>${Utils.escapeHtml(s)}</td><td class="text-right">${parsed.data[s].length}</td></tr>`).join('')}
          </tbody>
        </table>
      `;
      previewEl.hidden = false;
      _importData = parsed;
      if (statusEl) statusEl.textContent = `Siap import. ${storeNames.length} tabel ditemukan.`;
    } catch (error) {
      console.error('[Backup] Gagal baca file:', error);
      if (statusEl) statusEl.textContent = '❌ File tidak valid atau rusak.';
      _cancelImport();
    }
  }

  async function _confirmImport() {
    if (!_importData) return;
    const statusEl = document.getElementById('import-status');
    if (!confirm(`Import akan MENIMPA data yang ada. Lanjutkan?`)) return;

    try {
      if (statusEl) statusEl.textContent = 'Mengimpor data...';
      const db = await DB.open();

      for (const [storeName, records] of Object.entries(_importData.data)) {
        if (!Array.isArray(records) || records.length === 0) continue;
        if (!ALL_STORES.includes(storeName)) continue;

        await new Promise((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);

          // Clear existing
          store.clear();

          // Bulk add
          records.forEach(record => {
            // Hapus properti yang mungkin tidak sesuai schema
            const cleanRecord = { ...record };
            delete cleanRecord._id;
            store.add(cleanRecord);
          });

          tx.oncomplete = () => resolve();
          tx.onerror = (e) => reject(e.target.error);
        });
      }

      if (statusEl) {
        statusEl.textContent = '✅ Import berhasil! Halaman akan dimuat ulang...';
        statusEl.style.color = 'var(--color-success)';
      }
      _importData = null;
      document.getElementById('import-preview').hidden = true;

      // Reload untuk refresh semua data
      setTimeout(() => location.reload(), 1500);
    } catch (error) {
      console.error('[Backup] Gagal import:', error);
      if (statusEl) {
        statusEl.textContent = '❌ Gagal import data.';
        statusEl.style.color = 'var(--color-danger)';
      }
    }
  }

  function _cancelImport() {
    _importData = null;
    document.getElementById('import-file').value = '';
    document.getElementById('import-preview').hidden = true;
    document.getElementById('import-status').textContent = '';
  }

  // ─── Reset Database ────────────────────────────────────────
  async function _resetDatabase() {
    if (!confirm('⚠️ PERINGATAN: Ini akan menghapus SEMUA data secara permanen. Lanjutkan?')) return;
    if (!confirm('Ketik YA untuk konfirmasi final.')) return;

    try {
      const db = await DB.open();
      const tx = db.transaction(ALL_STORES, 'readwrite');
      ALL_STORES.forEach(storeName => {
        tx.objectStore(storeName).clear();
      });
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
      });
      alert('Database berhasil direset. Halaman akan dimuat ulang.');
      location.reload();
    } catch (error) {
      console.error('[Backup] Gagal reset:', error);
      alert('Gagal mereset database.');
    }
  }

  // ─── Auto Backup Reminder ──────────────────────────────────
  function _checkAutoBackupReminder() {
    const lastBackup = localStorage.getItem('umkm_last_backup');
    if (!lastBackup) {
      // Belum pernah backup
      setTimeout(() => {
        if (confirm('💡 Anda belum pernah melakukan backup data. Backup sekarang?')) {
          _exportJSON();
        }
      }, 2000);
      return;
    }

    const daysSinceBackup = (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceBackup > 7) {
      setTimeout(() => {
        if (confirm(`⚠️ Backup terakhir ${Math.floor(daysSinceBackup)} hari yang lalu. Backup sekarang?`)) {
          _exportJSON();
        }
      }, 2000);
    }
  }

  // ─── Destroy ─────────────────────────────────────────────────
  function destroy() {
    _container?.replaceChildren();
    _container = null;
  }

  // ─── Public API ─────────────────────────────────────────────
  return { init, destroy };
})();