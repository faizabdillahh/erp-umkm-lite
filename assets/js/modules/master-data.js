/* ============================================================
   MASTER-DATA.JS — Modul Kategori & Satuan
   ============================================================ */
'use strict';

const MasterDataModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container = null;
  let _currentTab = 'categories'; // 'categories' | 'units'
  let _categories = [];
  let _units = [];

  // ─── Init ────────────────────────────────────────────────────
  async function init(container) {
    _container = container;
    await _loadData();
    _render();
    _bindEvents();
  }

  // ─── Data Loading ────────────────────────────────────────────
  async function _loadData() {
    try {
      const [categories, units] = await Promise.all([
        DB.getAll('categories'),
        DB.getAll('units'),
      ]);
      _categories = categories;
      _units = units;
    } catch (error) {
      console.error('[MasterData] Gagal memuat data:', error);
      Notify.error?.('Gagal memuat data master.');
      _categories = [];
      _units = [];
    }
  }

  // ─── Render ──────────────────────────────────────────────────
  function _render() {
    if (!_container) return;

    _container.innerHTML = `
      <div class="master-data">
        <div class="master-data__header">
          <h1 class="dashboard__title">Master Data</h1>
          <div class="master-data__tabs">
            <button class="btn ${_currentTab === 'categories' ? 'btn--primary' : 'btn--ghost'}"
                    data-tab="categories">
              Kategori
            </button>
            <button class="btn ${_currentTab === 'units' ? 'btn--primary' : 'btn--ghost'}"
                    data-tab="units">
              Satuan
            </button>
          </div>
        </div>
        <div id="master-data-content" class="master-data__content"></div>
      </div>
    `;

    _renderContent();
  }

  function _renderContent() {
    const contentEl = document.getElementById('master-data-content');
    if (!contentEl) return;

    if (_currentTab === 'categories') {
      _renderCategoryList(contentEl);
    } else {
      _renderUnitList(contentEl);
    }
  }

  // ─── Render Kategori ─────────────────────────────────────────
  function _renderCategoryList(container) {
    const typeLabels = {
      product: 'Produk',
      expense: 'Pengeluaran',
      income: 'Pemasukan',
    };

    container.innerHTML = `
      <div class="card" style="margin-bottom: var(--space-4);">
        <div class="card__header">
          <h3 class="card__title">Tambah Kategori</h3>
        </div>
        <div class="card__body">
          <form id="category-form" class="form-inline" autocomplete="off">
            <div class="form-group" style="flex:2;">
              <label for="cat-name">Nama Kategori <span class="required">*</span></label>
              <input type="text" id="cat-name" name="name" required maxlength="100" placeholder="Contoh: Makanan">
            </div>
            <div class="form-group" style="flex:1;">
              <label for="cat-type">Tipe <span class="required">*</span></label>
              <select id="cat-type" name="type" required>
                <option value="product">Produk</option>
                <option value="expense">Pengeluaran</option>
                <option value="income">Pemasukan</option>
              </select>
            </div>
            <div class="form-group" style="flex:1;">
              <label for="cat-desc">Deskripsi</label>
              <input type="text" id="cat-desc" name="description" maxlength="200" placeholder="Opsional">
            </div>
            <button type="submit" class="btn btn--primary" style="align-self: flex-end;">
              + Tambah
            </button>
          </form>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Daftar Kategori — ${_categories.length} item</caption>
          <thead>
            <tr>
              <th scope="col">Nama</th>
              <th scope="col">Tipe</th>
              <th scope="col">Deskripsi</th>
              <th scope="col" style="width:100px;">Aksi</th>
            </tr>
          </thead>
          <tbody id="category-tbody">
            ${_categories.length === 0 ? `
              <tr><td colspan="4" class="text-muted text-center">Belum ada kategori.</td></tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (_categories.length > 0) {
      _renderCategoryRows();
    }
  }

  function _renderCategoryRows() {
    const tbody = document.getElementById('category-tbody');
    if (!tbody) return;

    const fragment = document.createDocumentFragment();
    _categories.forEach(cat => {
      const tr = document.createElement('tr');
      tr.dataset.id = cat.id;
      tr.innerHTML = `
        <td>${Utils.escapeHtml(cat.name)}</td>
        <td><span class="badge badge--info">${Utils.escapeHtml(cat.type)}</span></td>
        <td>${Utils.escapeHtml(cat.description || '-')}</td>
        <td>
          <button class="btn btn--sm btn--ghost" data-action="delete-category" aria-label="Hapus ${Utils.escapeHtml(cat.name)}">
            🗑️
          </button>
        </td>
      `;
      fragment.appendChild(tr);
    });
    tbody.replaceChildren(fragment);
  }

  // ─── Render Satuan ───────────────────────────────────────────
  function _renderUnitList(container) {
    container.innerHTML = `
      <div class="card" style="margin-bottom: var(--space-4);">
        <div class="card__header">
          <h3 class="card__title">Tambah Satuan</h3>
        </div>
        <div class="card__body">
          <form id="unit-form" class="form-inline" autocomplete="off">
            <div class="form-group" style="flex:2;">
              <label for="unit-name">Nama Satuan <span class="required">*</span></label>
              <input type="text" id="unit-name" name="name" required maxlength="50" placeholder="Contoh: Kilogram">
            </div>
            <div class="form-group" style="flex:1;">
              <label for="unit-abbr">Singkatan <span class="required">*</span></label>
              <input type="text" id="unit-abbr" name="abbreviation" required maxlength="10" placeholder="kg">
            </div>
            <div class="form-group" style="flex:1;">
              <label for="unit-conv">Faktor Konversi</label>
              <input type="number" id="unit-conv" name="conversionFactor" min="0" step="any" value="1" placeholder="1">
            </div>
            <button type="submit" class="btn btn--primary" style="align-self: flex-end;">
              + Tambah
            </button>
          </form>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Daftar Satuan — ${_units.length} item</caption>
          <thead>
            <tr>
              <th scope="col">Nama</th>
              <th scope="col">Singkatan</th>
              <th scope="col">Faktor Konversi</th>
              <th scope="col" style="width:100px;">Aksi</th>
            </tr>
          </thead>
          <tbody id="unit-tbody">
            ${_units.length === 0 ? `
              <tr><td colspan="4" class="text-muted text-center">Belum ada satuan.</td></tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (_units.length > 0) {
      _renderUnitRows();
    }
  }

  function _renderUnitRows() {
    const tbody = document.getElementById('unit-tbody');
    if (!tbody) return;

    const fragment = document.createDocumentFragment();
    _units.forEach(unit => {
      const tr = document.createElement('tr');
      tr.dataset.id = unit.id;
      tr.innerHTML = `
        <td>${Utils.escapeHtml(unit.name)}</td>
        <td><code>${Utils.escapeHtml(unit.abbreviation)}</code></td>
        <td>${unit.conversionFactor ?? 1}</td>
        <td>
          <button class="btn btn--sm btn--ghost" data-action="delete-unit" aria-label="Hapus ${Utils.escapeHtml(unit.name)}">
            🗑️
          </button>
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
      // Tab switching
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) {
        _currentTab = tabBtn.dataset.tab;
        _render();
        return;
      }

      // Delete kategori
      const delCatBtn = e.target.closest('[data-action="delete-category"]');
      if (delCatBtn) {
        const tr = delCatBtn.closest('tr');
        const id = Number(tr?.dataset.id);
        if (id && confirm('Hapus kategori ini? Produk yang terkait tidak akan terpengaruh.')) {
          _deleteCategory(id);
        }
        return;
      }

      // Delete satuan
      const delUnitBtn = e.target.closest('[data-action="delete-unit"]');
      if (delUnitBtn) {
        const tr = delUnitBtn.closest('tr');
        const id = Number(tr?.dataset.id);
        if (id && confirm('Hapus satuan ini?')) {
          _deleteUnit(id);
        }
        return;
      }
    });

    _container.addEventListener('submit', (e) => {
      e.preventDefault();

      if (e.target.id === 'category-form') {
        _saveCategory(new FormData(e.target));
      } else if (e.target.id === 'unit-form') {
        _saveUnit(new FormData(e.target));
      }
    });
  }

  // ─── Actions ─────────────────────────────────────────────────

  async function _saveCategory(formData) {
    const data = {
      name: String(formData.get('name') ?? '').trim(),
      type: String(formData.get('type') ?? 'product').trim(),
      description: String(formData.get('description') ?? '').trim(),
    };

    if (!data.name) {
      alert('Nama kategori wajib diisi.');
      return;
    }

    try {
      await DB.add('categories', data);
      await _loadData();
      _renderContent();
      EventBus.emit('category:changed');
      Notify.success?.('Kategori berhasil ditambahkan.');
    } catch (error) {
      console.error('[MasterData] Gagal simpan kategori:', error);
      Notify.error?.('Gagal menyimpan kategori.');
    }
  }

  async function _deleteCategory(id) {
    try {
      await DB.delete('categories', id);
      _categories = _categories.filter(c => c.id !== id);
      _renderCategoryRows();
      EventBus.emit('category:changed');
      Notify.success?.('Kategori dihapus.');
    } catch (error) {
      console.error('[MasterData] Gagal hapus kategori:', error);
      Notify.error?.('Gagal menghapus kategori.');
    }
  }

  async function _saveUnit(formData) {
    const data = {
      name: String(formData.get('name') ?? '').trim(),
      abbreviation: String(formData.get('abbreviation') ?? '').trim(),
      conversionFactor: Utils.sanitizeNumber(formData.get('conversionFactor')) || 1,
    };

    if (!data.name || !data.abbreviation) {
      alert('Nama dan singkatan satuan wajib diisi.');
      return;
    }

    try {
      await DB.add('units', data);
      await _loadData();
      _renderContent();
      EventBus.emit('unit:changed');
      Notify.success?.('Satuan berhasil ditambahkan.');
    } catch (error) {
      console.error('[MasterData] Gagal simpan satuan:', error);
      Notify.error?.('Gagal menyimpan satuan.');
    }
  }

  async function _deleteUnit(id) {
    try {
      await DB.delete('units', id);
      _units = _units.filter(u => u.id !== id);
      _renderUnitRows();
      EventBus.emit('unit:changed');
      Notify.success?.('Satuan dihapus.');
    } catch (error) {
      console.error('[MasterData] Gagal hapus satuan:', error);
      Notify.error?.('Gagal menghapus satuan.');
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