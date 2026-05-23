/* ============================================================
   PRODUK.JS — Modul Manajemen Produk (CRUD)
   ============================================================ */
'use strict';

const ProdukModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container   = null;
  let _products    = [];
  let _categories  = [];
  let _units       = [];
  let _editingId   = null;  // null = mode tambah, number = mode edit

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
      const [products, categories, units] = await Promise.all([
        DB.getAll('products'),
        DB.getAll('categories', { type: 'product' }),
        DB.getAll('units'),
      ]);
      _products   = products;
      _categories = categories;
      _units      = units;
    } catch (error) {
      console.error('[ProdukModule] Gagal memuat data:', error);
      _products   = [];
      _categories = [];
      _units      = [];
    }
  }

  // ─── Render Utama ────────────────────────────────────────────
  function _render() {
    if (!_container) return;

    _container.innerHTML = `
      <div class="master-data">
        <div class="master-data__header">
          <h1 class="dashboard__title">Produk</h1>
          <button class="btn btn--primary" id="btn-add-product">+ Produk Baru</button>
        </div>

        <!-- Form (tersembunyi default) -->
        <div class="card" id="product-form-card" style="margin-bottom: var(--space-4);" hidden>
          <div class="card__header">
            <h3 class="card__title" id="form-title">Tambah Produk</h3>
            <button class="btn btn--ghost btn--sm" id="btn-cancel-form">✕ Batal</button>
          </div>
          <div class="card__body">
            <form id="product-form" autocomplete="off">
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                <div class="form-group">
                  <label for="prod-name">Nama Produk <span class="required">*</span></label>
                  <input type="text" id="prod-name" name="name" required maxlength="200" placeholder="Nama produk">
                </div>
                <div class="form-group">
                  <label for="prod-sku">SKU</label>
                  <input type="text" id="prod-sku" name="sku" maxlength="50" placeholder="Auto-generate jika kosong">
                </div>
                <div class="form-group">
                  <label for="prod-category">Kategori <span class="required">*</span></label>
                  <select id="prod-category" name="categoryId" required>
                    <option value="">-- Pilih Kategori --</option>
                    ${_categories.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.name)}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label for="prod-unit">Satuan <span class="required">*</span></label>
                  <select id="prod-unit" name="unitId" required>
                    <option value="">-- Pilih Satuan --</option>
                    ${_units.map(u => `<option value="${u.id}">${Utils.escapeHtml(u.name)} (${Utils.escapeHtml(u.abbreviation)})</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label for="prod-sell-price">Harga Jual (Rp) <span class="required">*</span></label>
                  <input type="number" id="prod-sell-price" name="sellPrice" min="0" step="100" required placeholder="0">
                </div>
                <div class="form-group">
                  <label for="prod-cost-price">HPP (Rp) <span class="required">*</span></label>
                  <input type="number" id="prod-cost-price" name="costPrice" min="0" step="100" required placeholder="0">
                </div>
                <div class="form-group">
                  <label for="prod-min-stock">Stok Minimum</label>
                  <input type="number" id="prod-min-stock" name="minStock" min="0" step="1" value="0" placeholder="0">
                </div>
                <div class="form-group">
                  <label for="prod-description">Deskripsi</label>
                  <textarea id="prod-description" name="description" maxlength="500" rows="2" placeholder="Deskripsi singkat"></textarea>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap: var(--space-4); margin-top: var(--space-4);">
                <label style="display:flex; align-items:center; gap: var(--space-2);">
                  <input type="checkbox" name="isActive" checked> Aktif
                </label>
                <button type="submit" class="btn btn--primary" id="btn-submit-form">💾 Simpan</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Tabel Produk -->
        <div class="table-container">
          <table>
            <caption>Daftar Produk — ${_products.length} item</caption>
            <thead>
              <tr>
                <th scope="col">Nama</th>
                <th scope="col">SKU</th>
                <th scope="col">Kategori</th>
                <th scope="col" style="text-align:right;">Harga Jual</th>
                <th scope="col" style="text-align:right;">HPP</th>
                <th scope="col" style="text-align:center;">Stok</th>
                <th scope="col" style="text-align:center;">Status</th>
                <th scope="col" style="width:100px;">Aksi</th>
              </tr>
            </thead>
            <tbody id="product-tbody">
              ${_products.length === 0 ? `
                <tr><td colspan="8" class="text-muted text-center">Belum ada produk.</td></tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (_products.length > 0) _renderProductRows();
  }

  function _renderProductRows() {
    const tbody = document.getElementById('product-tbody');
    if (!tbody) return;

    const fragment = document.createDocumentFragment();
    _products.forEach(product => {
      const cat   = _categories.find(c => c.id === product.categoryId);
      const unit  = _units.find(u => u.id === product.unitId);
      const stock = product.currentStock ?? 0;
      const low   = stock <= (product.minStock ?? 0);
      const out   = stock <= 0;

      const tr = document.createElement('tr');
      tr.dataset.id = product.id;
      if (!product.isActive) tr.style.opacity = '0.5';

      tr.innerHTML = `
        <td>
          <strong>${Utils.escapeHtml(product.name)}</strong>
          ${product.description ? `<br><small class="text-muted">${Utils.escapeHtml(Utils.truncate(product.description, 40))}</small>` : ''}
        </td>
        <td><code>${Utils.escapeHtml(product.sku)}</code></td>
        <td>${cat ? Utils.escapeHtml(cat.name) : '-'}</td>
        <td class="text-right font-mono">${Utils.formatIDR(product.sellPrice)}</td>
        <td class="text-right font-mono">${Utils.formatIDR(product.costPrice)}</td>
        <td class="text-center">
          <span class="badge ${out ? 'badge--danger' : low ? 'badge--warning' : 'badge--success'}">
            ${stock}
          </span>
        </td>
        <td class="text-center">
          ${product.isActive
            ? '<span class="badge badge--success">Aktif</span>'
            : '<span class="badge badge--neutral">Nonaktif</span>'}
        </td>
        <td>
          <button class="btn btn--sm btn--ghost" data-action="edit-product" aria-label="Edit ${Utils.escapeHtml(product.name)}">✏️</button>
          <button class="btn btn--sm btn--ghost" data-action="delete-product" aria-label="Hapus ${Utils.escapeHtml(product.name)}">🗑️</button>
        </td>
      `;
      fragment.appendChild(tr);
    });
    tbody.replaceChildren(fragment);
  }

  // ─── Events ──────────────────────────────────────────────────
  function _bindEvents() {
    if (!_container) return;

    _container.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      // Tambah produk
      if (btn.id === 'btn-add-product') {
        _showForm();
        return;
      }

      // Batal form
      if (btn.id === 'btn-cancel-form') {
        _hideForm();
        return;
      }

      // Edit produk
      if (btn.dataset.action === 'edit-product') {
        const tr = btn.closest('tr');
        const id = Number(tr?.dataset.id);
        if (id) _editProduct(id);
        return;
      }

      // Hapus produk
      if (btn.dataset.action === 'delete-product') {
        const tr = btn.closest('tr');
        const id = Number(tr?.dataset.id);
        const name = tr?.querySelector('strong')?.textContent || 'produk ini';
        if (id && confirm(`Hapus ${name}?`)) {
          _deleteProduct(id);
        }
        return;
      }
    });

    _container.addEventListener('submit', (e) => {
      if (e.target.id === 'product-form') {
        e.preventDefault();
        _saveProduct(new FormData(e.target));
      }
    });
  }

  // ─── Form Handlers ───────────────────────────────────────────
  function _showForm(product = null) {
    const card  = document.getElementById('product-form-card');
    const title = document.getElementById('form-title');
    const form  = document.getElementById('product-form');

    if (!card || !form) return;
    card.hidden = false;
    form.reset();

    if (product) {
      _editingId = product.id;
      title.textContent = 'Edit Produk';
      document.getElementById('prod-name').value        = product.name || '';
      document.getElementById('prod-sku').value          = product.sku || '';
      document.getElementById('prod-category').value     = product.categoryId ?? '';
      document.getElementById('prod-unit').value         = product.unitId ?? '';
      document.getElementById('prod-sell-price').value   = product.sellPrice ?? 0;
      document.getElementById('prod-cost-price').value   = product.costPrice ?? 0;
      document.getElementById('prod-min-stock').value    = product.minStock ?? 0;
      document.getElementById('prod-description').value  = product.description || '';
      form.querySelector('[name="isActive"]').checked    = product.isActive !== false;
    } else {
      _editingId = null;
      title.textContent = 'Tambah Produk';
    }

    card.scrollIntoView({ behavior: 'smooth' });
  }

  function _hideForm() {
    const card = document.getElementById('product-form-card');
    if (card) card.hidden = true;
    _editingId = null;
  }

  // ─── Actions ─────────────────────────────────────────────────

  async function _saveProduct(formData) {
    const raw = {
      name        : String(formData.get('name') ?? '').trim(),
      sku         : String(formData.get('sku') ?? '').trim().toUpperCase(),
      categoryId  : Number(formData.get('categoryId')) || null,
      unitId      : Number(formData.get('unitId')) || null,
      sellPrice   : Utils.sanitizeNumber(formData.get('sellPrice')),
      costPrice   : Utils.sanitizeNumber(formData.get('costPrice')),
      minStock    : Math.max(0, Math.floor(Utils.sanitizeNumber(formData.get('minStock')))),
      description : String(formData.get('description') ?? '').trim(),
      isActive    : formData.get('isActive') === 'on',
    };

    // Validasi
    if (!raw.name) {
      alert('Nama produk wajib diisi.');
      return;
    }
    if (!raw.categoryId) {
      alert('Kategori wajib dipilih.');
      return;
    }
    if (!raw.unitId) {
      alert('Satuan wajib dipilih.');
      return;
    }
    if (raw.sellPrice <= 0) {
      alert('Harga jual harus lebih dari 0.');
      return;
    }

    // Auto-generate SKU jika kosong
    if (!raw.sku) {
      const cat = _categories.find(c => c.id === raw.categoryId);
      const prefix = cat ? cat.name.slice(0, 3).toUpperCase() : 'PRD';
      raw.sku = Utils.generateID(prefix);
    }

    try {
      if (_editingId) {
        // Update
        const existing = await DB.get('products', _editingId);
        if (!existing) throw new Error('Produk tidak ditemukan');
        await DB.put('products', {
          ...existing,
          ...raw,
          id: _editingId,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // Create
        await DB.add('products', {
          ...raw,
          currentStock: 0,
          hasVariant: false,
          isBundling: false,
          imageBase64: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      _hideForm();
      await _loadData();
      _render();
      EventBus.emit('product:changed');
    } catch (error) {
      console.error('[ProdukModule] Gagal simpan produk:', error);
      alert('Gagal menyimpan produk. Pastikan SKU unik.');
    }
  }

  function _editProduct(id) {
    const product = _products.find(p => p.id === id);
    if (!product) return;
    _showForm(product);
  }

  async function _deleteProduct(id) {
    try {
      await DB.delete('products', id);
      _products = _products.filter(p => p.id !== id);
      _renderProductRows();
      EventBus.emit('product:changed');
    } catch (error) {
      console.error('[ProdukModule] Gagal hapus produk:', error);
      alert('Gagal menghapus produk.');
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