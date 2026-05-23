/* ============================================================
   PERSEDIAAN.JS — Modul Manajemen Persediaan & Mutasi Stok
   ============================================================ */
'use strict';

const PersediaanModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container    = null;
  let _products     = [];
  let _inventory    = [];
  let _currentView  = 'stock';  // 'stock' | 'mutations' | 'adjustment'
  let _filterDate   = 'all';    // 'all' | 'today' | '7days' | 'this_month'
  let _filterType   = 'all';
  let _selectedProduct = null;

  // ─── Init ────────────────────────────────────────────────────
  async function init(container) {
    _container = container;
    await _loadData();
    _render();
    _bindEvents();
  }

  // ─── Data ────────────────────────────────────────────────────
  async function _loadData() {
    try {
      const [products, inventory] = await Promise.all([
        DB.getAll('products', { isActive: true }),
        DB.getAll('inventory'),
      ]);
      _products  = products;
      _inventory = inventory;
    } catch (error) {
      console.error('[PersediaanModule] Gagal memuat data:', error);
      _products  = [];
      _inventory = [];
    }
  }

  // ─── Render ──────────────────────────────────────────────────
  function _render() {
    if (!_container) return;

    _container.innerHTML = `
      <div class="master-data">
        <div class="master-data__header">
          <h1 class="dashboard__title">Persediaan</h1>
          <div class="master-data__tabs">
            <button class="btn ${_currentView === 'stock' ? 'btn--primary' : 'btn--ghost'}" data-view="stock">
              📦 Stok Saat Ini
            </button>
            <button class="btn ${_currentView === 'mutations' ? 'btn--primary' : 'btn--ghost'}" data-view="mutations">
              📋 Mutasi Stok
            </button>
            <button class="btn ${_currentView === 'adjustment' ? 'btn--primary' : 'btn--ghost'}" data-view="adjustment">
              ✏️ Penyesuaian Stok
            </button>
          </div>
        </div>
        <div id="persediaan-content"></div>
      </div>
    `;

    _renderContent();
  }

  function _renderContent() {
    const contentEl = document.getElementById('persediaan-content');
    if (!contentEl) return;

    if (_currentView === 'stock') {
      _renderStockView(contentEl);
    } else if (_currentView === 'mutations') {
      _renderMutationsView(contentEl);
    } else {
      _renderAdjustmentView(contentEl);
    }
  }

  // ─── View: Stok Saat Ini ────────────────────────────────────
  function _renderStockView(container) {
    const totalValue = _products.reduce((sum, p) => sum + ((p.currentStock ?? 0) * (p.costPrice ?? 0)), 0);
    const lowStock   = _products.filter(p => (p.currentStock ?? 0) <= (p.minStock ?? 0) && p.isActive);
    const outOfStock = _products.filter(p => (p.currentStock ?? 0) <= 0 && p.isActive);

    container.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:var(--space-4);">
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--green">📦</div>
          <div class="kpi-card__body">
            <div class="kpi-card__label">Total Produk Aktif</div>
            <div class="kpi-card__value">${_products.length}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--blue">💰</div>
          <div class="kpi-card__body">
            <div class="kpi-card__label">Nilai Persediaan</div>
            <div class="kpi-card__value">${Utils.formatIDR(totalValue)}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--warning">⚠️</div>
          <div class="kpi-card__body">
            <div class="kpi-card__label">Stok Menipis</div>
            <div class="kpi-card__value">${lowStock.length}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--red">❌</div>
          <div class="kpi-card__body">
            <div class="kpi-card__label">Stok Habis</div>
            <div class="kpi-card__value">${outOfStock.length}</div>
          </div>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Daftar Stok Produk — ${_products.length} produk</caption>
          <thead>
            <tr>
              <th scope="col">Produk</th>
              <th scope="col">SKU</th>
              <th scope="col" style="text-align:right;">Stok</th>
              <th scope="col" style="text-align:right;">Min</th>
              <th scope="col" style="text-align:right;">HPP</th>
              <th scope="col" style="text-align:right;">Nilai Stok</th>
              <th scope="col" style="text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody id="stock-tbody">
            ${_products.length === 0 ? `<tr><td colspan="7" class="text-muted text-center">Belum ada produk.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (_products.length > 0) _renderStockRows();
  }

  function _renderStockRows() {
    const tbody = document.getElementById('stock-tbody');
    if (!tbody) return;

    const fragment = document.createDocumentFragment();
    _products.forEach(p => {
      const stock = p.currentStock ?? 0;
      const min   = p.minStock ?? 0;
      const low   = stock <= min && stock > 0;
      const out   = stock <= 0;
      const value = stock * (p.costPrice ?? 0);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${Utils.escapeHtml(p.name)}</strong></td>
        <td><code>${Utils.escapeHtml(p.sku)}</code></td>
        <td class="text-right font-mono">${stock}</td>
        <td class="text-right">${min}</td>
        <td class="text-right font-mono">${Utils.formatIDR(p.costPrice)}</td>
        <td class="text-right font-mono">${Utils.formatIDR(value)}</td>
        <td class="text-center">
          <span class="badge ${out ? 'badge--danger' : low ? 'badge--warning' : 'badge--success'}">
            ${out ? 'Habis' : low ? 'Menipis' : 'Aman'}
          </span>
        </td>
      `;
      fragment.appendChild(tr);
    });
    tbody.replaceChildren(fragment);
  }

  // ─── View: Mutasi Stok ──────────────────────────────────────
  function _renderMutationsView(container) {
    const typeLabels = {
      'in_purchase': 'Pembelian',
      'in_production': 'Produksi Masuk',
      'in_return': 'Retur Masuk',
      'out_sale': 'Penjualan',
      'out_production': 'Produksi Keluar',
      'out_return': 'Retur Keluar',
      'adjustment_plus': 'Penyesuaian (+)',
      'adjustment_minus': 'Penyesuaian (-)',
    };

    // Filter
    let filtered = [..._inventory];
    if (_filterDate !== 'all') {
      const now = new Date();
      let startDate;
      switch (_filterDate) {
        case 'today': startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(); break;
        case '7days': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); break;
        case 'this_month': startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString(); break;
      }
      if (startDate) filtered = filtered.filter(i => i.date >= startDate);
    }
    if (_filterType !== 'all') {
      filtered = filtered.filter(i => i.type === _filterType);
    }
    if (_selectedProduct) {
      filtered = filtered.filter(i => i.productId === _selectedProduct);
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    const mutationTypes = ['all', 'in_purchase', 'out_sale', 'adjustment_plus', 'adjustment_minus'];

    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__body">
          <div style="display:flex; gap:var(--space-3); flex-wrap:wrap; align-items:end;">
            <div class="form-group" style="min-width:150px;">
              <label>Periode</label>
              <select id="filter-date">
                <option value="all">Semua</option>
                <option value="today" ${_filterDate==='today'?'selected':''}>Hari Ini</option>
                <option value="7days" ${_filterDate==='7days'?'selected':''}>7 Hari</option>
                <option value="this_month" ${_filterDate==='this_month'?'selected':''}>Bulan Ini</option>
              </select>
            </div>
            <div class="form-group" style="min-width:150px;">
              <label>Tipe Mutasi</label>
              <select id="filter-type">
                <option value="all">Semua Tipe</option>
                ${mutationTypes.filter(t=>t!=='all').map(t => `<option value="${t}" ${_filterType===t?'selected':''}>${typeLabels[t] || t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="min-width:200px;">
              <label>Produk</label>
              <select id="filter-product">
                <option value="">Semua Produk</option>
                ${_products.map(p => `<option value="${p.id}" ${_selectedProduct===p.id?'selected':''}>${Utils.escapeHtml(p.name)}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Mutasi Stok — ${filtered.length} catatan</caption>
          <thead>
            <tr>
              <th scope="col">Tanggal</th>
              <th scope="col">Produk</th>
              <th scope="col">Tipe</th>
              <th scope="col" style="text-align:right;">Qty</th>
              <th scope="col" style="text-align:right;">Stok Sebelum</th>
              <th scope="col" style="text-align:right;">Stok Sesudah</th>
              <th scope="col">Ref</th>
            </tr>
          </thead>
          <tbody id="mutation-tbody">
            ${filtered.length === 0 ? `<tr><td colspan="7" class="text-muted text-center">Tidak ada mutasi.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (filtered.length > 0) _renderMutationRows(filtered);
  }

  function _renderMutationRows(mutations) {
    const tbody = document.getElementById('mutation-tbody');
    if (!tbody) return;

    const typeLabels = {
      'in_purchase': 'Pembelian',
      'in_production': 'Produksi Masuk',
      'in_return': 'Retur Masuk',
      'out_sale': 'Penjualan',
      'out_production': 'Produksi Keluar',
      'out_return': 'Retur Keluar',
      'adjustment_plus': 'Penyesuaian (+)',
      'adjustment_minus': 'Penyesuaian (-)',
    };

    const fragment = document.createDocumentFragment();
    mutations.forEach(mut => {
      const product = _products.find(p => p.id === mut.productId);
      const isIn = mut.qty > 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${Utils.formatDate(mut.date, 'DD/MM/YYYY hh:mm')}</td>
        <td>${product ? Utils.escapeHtml(product.name) : `ID:${mut.productId}`}</td>
        <td><span class="badge ${isIn ? 'badge--success' : 'badge--danger'}">${typeLabels[mut.type] || mut.type}</span></td>
        <td class="text-right font-mono" style="color:${isIn ? 'var(--color-success)' : 'var(--color-danger)'}">
          ${isIn ? '+' : ''}${mut.qty}
        </td>
        <td class="text-right">${mut.stockBefore ?? '-'}</td>
        <td class="text-right">${mut.stockAfter ?? '-'}</td>
        <td><small>${Utils.escapeHtml(mut.refType || '')} #${mut.refId || '-'}</small></td>
      `;
      fragment.appendChild(tr);
    });
    tbody.replaceChildren(fragment);
  }

  // ─── View: Penyesuaian Stok ─────────────────────────────────
  function _renderAdjustmentView(container) {
    container.innerHTML = `
      <div class="card">
        <div class="card__header">
          <h3 class="card__title">Penyesuaian Stok Manual</h3>
        </div>
        <div class="card__body">
          <p class="text-muted" style="margin-bottom:var(--space-4);">Gunakan form ini untuk menyesuaikan stok karena stock opname, barang rusak, atau kehilangan.</p>
          <form id="adjustment-form" autocomplete="off">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
              <div class="form-group">
                <label for="adj-product">Produk <span class="required">*</span></label>
                <select id="adj-product" required>
                  <option value="">-- Pilih Produk --</option>
                  ${_products.map(p => `<option value="${p.id}">${Utils.escapeHtml(p.name)} (Stok: ${p.currentStock ?? 0})</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="adj-type">Tipe Penyesuaian <span class="required">*</span></label>
                <select id="adj-type" required>
                  <option value="adjustment_plus">Penyesuaian (+) Tambah Stok</option>
                  <option value="adjustment_minus">Penyesuaian (-) Kurangi Stok</option>
                </select>
              </div>
              <div class="form-group">
                <label for="adj-qty">Jumlah <span class="required">*</span></label>
                <input type="number" id="adj-qty" min="1" step="1" required placeholder="Masukkan jumlah">
              </div>
              <div class="form-group">
                <label for="adj-notes">Alasan / Catatan <span class="required">*</span></label>
                <input type="text" id="adj-notes" required maxlength="300" placeholder="Contoh: Hasil stock opname, barang rusak">
              </div>
            </div>
            <button type="submit" class="btn btn--primary mt-4">💾 Simpan Penyesuaian</button>
          </form>
        </div>
      </div>
    `;
  }

  // ─── Events ──────────────────────────────────────────────────
  function _bindEvents() {
    if (!_container) return;

    _container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-view]');
      if (btn) {
        _currentView = btn.dataset.view;
        _render();
        return;
      }
    });

    _container.addEventListener('change', (e) => {
      if (e.target.id === 'filter-date') {
        _filterDate = e.target.value;
        _renderContent();
      }
      if (e.target.id === 'filter-type') {
        _filterType = e.target.value;
        _renderContent();
      }
      if (e.target.id === 'filter-product') {
        _selectedProduct = e.target.value ? Number(e.target.value) : null;
        _renderContent();
      }
    });

    _container.addEventListener('submit', (e) => {
      if (e.target.id === 'adjustment-form') {
        e.preventDefault();
        _saveAdjustment(new FormData(e.target));
      }
    });
  }

  // ─── Actions ─────────────────────────────────────────────────

  async function _saveAdjustment(formData) {
    const productId = Number(formData.get('adj-product'));
    const type      = formData.get('adj-type');
    const qty       = Math.abs(Utils.sanitizeNumber(formData.get('adj-qty')));
    const notes     = String(formData.get('adj-notes') ?? '').trim();

    if (!productId) { alert('Produk wajib dipilih.'); return; }
    if (!qty || qty <= 0) { alert('Jumlah harus lebih dari 0.'); return; }
    if (!notes) { alert('Alasan penyesuaian wajib diisi.'); return; }

    const actualQty = type === 'adjustment_minus' ? -qty : qty;

    try {
      const db = await DB.open();
      const tx = db.transaction(['products', 'inventory'], 'readwrite');

      await new Promise((resolve, reject) => {
        const productsStore  = tx.objectStore('products');
        const inventoryStore = tx.objectStore('inventory');

        const prodReq = productsStore.get(productId);
        prodReq.onsuccess = () => {
          const prod = prodReq.result;
          if (!prod) {
            reject(new Error('Produk tidak ditemukan'));
            return;
          }

          const oldStock = prod.currentStock ?? 0;
          const newStock = oldStock + actualQty;
          if (newStock < 0) {
            reject(new Error('Stok tidak bisa negatif'));
            return;
          }

          prod.currentStock = newStock;
          prod.updatedAt = new Date().toISOString();
          productsStore.put(prod);

          inventoryStore.add({
            productId,
            date        : new Date().toISOString(),
            type,
            qty         : actualQty,
            refType     : 'manual',
            refId       : null,
            stockBefore : oldStock,
            stockAfter  : newStock,
            notes,
            createdAt   : new Date().toISOString(),
          });
        };

        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
      });

      alert('Penyesuaian stok berhasil disimpan.');
      await _loadData();
      _render();
      EventBus.emit('stock:adjusted');
    } catch (error) {
      console.error('[PersediaanModule] Gagal simpan penyesuaian:', error);
      alert(`Gagal menyimpan penyesuaian: ${error.message}`);
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