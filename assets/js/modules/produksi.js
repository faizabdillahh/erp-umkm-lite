/* ============================================================
   PRODUKSI.JS — Modul Produksi: Bahan Baku, BOM, Work Order
   ============================================================ */
'use strict';

const ProduksiModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container     = null;
  let _currentTab    = 'materials'; // 'materials' | 'bom' | 'workorder'
  let _rawMaterials  = [];
  let _products      = [];  // produk jadi
  let _categories    = [];
  let _units         = [];
  let _bomItems      = [];  // semua BOM
  let _workOrders    = [];

  // ─── Init ────────────────────────────────────────────────────
  async function init(container) {
    _container = container;
    await _loadData();
    _render();
    _bindEvents();
  }

  async function _loadData() {
    try {
      const [materials, products, categories, units, bom, orders] = await Promise.all([
        DB.getAll('raw_materials'),
        DB.getAll('products', { isActive: true }),
        DB.getAll('categories'),
        DB.getAll('units'),
        DB.getAll('bom'),
        DB.getAll('production_orders'),
      ]);
      _rawMaterials = materials;
      _products     = products;
      _categories   = categories;
      _units        = units;
      _bomItems     = bom;
      _workOrders   = orders;
    } catch (error) {
      console.error('[ProduksiModule] Gagal memuat data:', error);
    }
  }

  // ─── Render ──────────────────────────────────────────────────
  function _render() {
    if (!_container) return;
    _container.innerHTML = `
      <div class="master-data">
        <div class="master-data__header">
          <h1 class="dashboard__title">Produksi</h1>
          <div class="master-data__tabs">
            <button class="btn ${_currentTab==='materials'?'btn--primary':'btn--ghost'}" data-tab="materials">🧱 Bahan Baku</button>
            <button class="btn ${_currentTab==='bom'?'btn--primary':'btn--ghost'}" data-tab="bom">📋 Bill of Materials</button>
            <button class="btn ${_currentTab==='workorder'?'btn--primary':'btn--ghost'}" data-tab="workorder">⚙️ Work Order</button>
          </div>
        </div>
        <div id="produksi-content"></div>
      </div>
    `;
    _renderContent();
  }

  function _renderContent() {
    const el = document.getElementById('produksi-content');
    if (!el) return;
    if (_currentTab === 'materials') _renderMaterialsView(el);
    else if (_currentTab === 'bom') _renderBOMView(el);
    else _renderWorkOrderView(el);
  }

  // ──────────────────────────────────────────────────────────────
  //  TAB 1: BAHAN BAKU
  // ──────────────────────────────────────────────────────────────
  function _renderMaterialsView(container) {
    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__header"><h3 class="card__title">Tambah Bahan Baku</h3></div>
        <div class="card__body">
          <form id="material-form" autocomplete="off">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
              <div class="form-group">
                <label for="mat-name">Nama Bahan <span class="required">*</span></label>
                <input type="text" id="mat-name" name="name" required maxlength="200" placeholder="Nama bahan baku">
              </div>
              <div class="form-group">
                <label for="mat-category">Kategori</label>
                <select id="mat-category" name="categoryId">
                  <option value="">-- Pilih --</option>
                  ${_categories.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.name)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="mat-unit">Satuan</label>
                <select id="mat-unit" name="unitId">
                  <option value="">-- Pilih --</option>
                  ${_units.map(u => `<option value="${u.id}">${Utils.escapeHtml(u.name)} (${Utils.escapeHtml(u.abbreviation)})</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="mat-price">Harga Beli (Rp)</label>
                <input type="number" id="mat-price" name="buyPrice" min="0" step="100" value="0">
              </div>
              <div class="form-group">
                <label for="mat-min">Stok Minimum</label>
                <input type="number" id="mat-min" name="minStock" min="0" step="1" value="0">
              </div>
              <div class="form-group">
                <label for="mat-supplier">Supplier Utama</label>
                <select id="mat-supplier" name="supplierId">
                  <option value="">-- Pilih --</option>
                </select>
              </div>
            </div>
            <button type="submit" class="btn btn--primary mt-4">💾 Simpan Bahan</button>
          </form>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Daftar Bahan Baku — ${_rawMaterials.length} item</caption>
          <thead><tr><th>Nama</th><th>Kategori</th><th>Satuan</th><th style="text-align:right;">Stok</th><th style="text-align:right;">Harga</th><th style="width:80px;">Aksi</th></tr></thead>
          <tbody id="material-tbody">
            ${_rawMaterials.length === 0 ? `<tr><td colspan="6" class="text-muted text-center">Belum ada bahan baku.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (_rawMaterials.length > 0) _renderMaterialRows();

    // Supplier dropdown (menggunakan DB supplier)
    DB.getAll('suppliers').then(suppliers => {
      const sel = document.getElementById('mat-supplier');
      if (sel) {
        suppliers.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = `${s.name} (${s.phone || ''})`;
          sel.appendChild(opt);
        });
      }
    });
  }

  function _renderMaterialRows() {
    const tbody = document.getElementById('material-tbody');
    if (!tbody) return;
    const fragment = document.createDocumentFragment();
    _rawMaterials.forEach(m => {
      const cat = _categories.find(c => c.id === m.categoryId);
      const unit = _units.find(u => u.id === m.unitId);
      const tr = document.createElement('tr');
      tr.dataset.id = m.id;
      tr.innerHTML = `
        <td><strong>${Utils.escapeHtml(m.name)}</strong></td>
        <td>${cat ? Utils.escapeHtml(cat.name) : '-'}</td>
        <td>${unit ? Utils.escapeHtml(unit.abbreviation) : '-'}</td>
        <td class="text-right ${(m.currentStock??0) <= (m.minStock??0) ? 'text-danger' : ''}">${m.currentStock ?? 0}</td>
        <td class="text-right font-mono">${Utils.formatIDR(m.buyPrice)}</td>
        <td><button class="btn btn--sm btn--ghost" data-action="delete-material">🗑️</button></td>
      `;
      fragment.appendChild(tr);
    });
    tbody.replaceChildren(fragment);
  }

  // ──────────────────────────────────────────────────────────────
  //  TAB 2: BILL OF MATERIALS
  // ──────────────────────────────────────────────────────────────
  function _renderBOMView(container) {
    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__header"><h3 class="card__title">Tambah BOM (Resep Produksi)</h3></div>
        <div class="card__body">
          <form id="bom-form" autocomplete="off">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
              <div class="form-group">
                <label for="bom-product">Produk Jadi <span class="required">*</span></label>
                <select id="bom-product" name="productId" required>
                  <option value="">-- Pilih --</option>
                  ${_products.map(p => `<option value="${p.id}">${Utils.escapeHtml(p.name)} (${Utils.escapeHtml(p.sku)})</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="bom-material">Bahan Baku <span class="required">*</span></label>
                <select id="bom-material" name="materialId" required>
                  <option value="">-- Pilih --</option>
                  ${_rawMaterials.map(m => `<option value="${m.id}">${Utils.escapeHtml(m.name)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="bom-qty">Qty per 1 Unit Produk <span class="required">*</span></label>
                <input type="number" id="bom-qty" name="qty" min="0.001" step="any" required placeholder="1">
              </div>
              <div class="form-group">
                <label for="bom-waste">Faktor Susut (%)</label>
                <input type="number" id="bom-waste" name="wasteFactor" min="0" max="100" step="0.1" value="0">
              </div>
            </div>
            <button type="submit" class="btn btn--primary mt-4">➕ Tambah BOM</button>
          </form>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Bill of Materials — ${_bomItems.length} item</caption>
          <thead><tr><th>Produk</th><th>Bahan Baku</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Susut</th><th style="width:80px;">Aksi</th></tr></thead>
          <tbody id="bom-tbody">
            ${_bomItems.length === 0 ? `<tr><td colspan="5" class="text-muted text-center">Belum ada BOM.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (_bomItems.length > 0) _renderBOMRows();
  }

  function _renderBOMRows() {
    const tbody = document.getElementById('bom-tbody');
    if (!tbody) return;
    const fragment = document.createDocumentFragment();
    _bomItems.forEach(b => {
      const product = _products.find(p => p.id === b.productId);
      const material = _rawMaterials.find(m => m.id === b.materialId);
      const tr = document.createElement('tr');
      tr.dataset.id = b.id;
      tr.innerHTML = `
        <td>${product ? Utils.escapeHtml(product.name) : 'ID:'+b.productId}</td>
        <td>${material ? Utils.escapeHtml(material.name) : 'ID:'+b.materialId}</td>
        <td class="text-right">${b.qty}</td>
        <td class="text-right">${((b.wasteFactor ?? 0)*100).toFixed(1)}%</td>
        <td><button class="btn btn--sm btn--ghost" data-action="delete-bom">🗑️</button></td>
      `;
      fragment.appendChild(tr);
    });
    tbody.replaceChildren(fragment);
  }

  // ──────────────────────────────────────────────────────────────
  //  TAB 3: WORK ORDER
  // ──────────────────────────────────────────────────────────────
  function _renderWorkOrderView(container) {
    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__header"><h3 class="card__title">Buat Work Order (Perintah Produksi)</h3></div>
        <div class="card__body">
          <form id="wo-form" autocomplete="off">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
              <div class="form-group">
                <label for="wo-product">Produk <span class="required">*</span></label>
                <select id="wo-product" name="productId" required>
                  <option value="">-- Pilih Produk Jadi --</option>
                  ${_products.filter(p => _bomItems.some(b => b.productId === p.id)).map(p => `<option value="${p.id}">${Utils.escapeHtml(p.name)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="wo-qty">Target Produksi (unit) <span class="required">*</span></label>
                <input type="number" id="wo-qty" name="plannedQty" min="1" step="1" required placeholder="10">
              </div>
              <div class="form-group">
                <label for="wo-start">Tanggal Mulai</label>
                <input type="date" id="wo-start" name="startDate" value="${new Date().toISOString().slice(0,10)}">
              </div>
              <div class="form-group">
                <label for="wo-notes">Catatan</label>
                <input type="text" id="wo-notes" name="notes" maxlength="300">
              </div>
            </div>
            <button type="submit" class="btn btn--primary mt-4">📋 Buat Work Order</button>
          </form>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Daftar Work Order — ${_workOrders.length}</caption>
          <thead><tr><th>WO No</th><th>Produk</th><th style="text-align:right;">Target</th><th style="text-align:right;">Aktual</th><th style="text-align:right;">Reject</th><th>Status</th><th style="width:80px;">Aksi</th></tr></thead>
          <tbody id="wo-tbody">
            ${_workOrders.length === 0 ? `<tr><td colspan="7" class="text-muted text-center">Belum ada Work Order.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (_workOrders.length > 0) _renderWORows();
  }

  function _renderWORows() {
    const tbody = document.getElementById('wo-tbody');
    if (!tbody) return;
    const fragment = document.createDocumentFragment();
    _workOrders.sort((a,b) => new Date(b.startDate) - new Date(a.startDate)).forEach(wo => {
      const product = _products.find(p => p.id === wo.productId);
      const tr = document.createElement('tr');
      tr.dataset.id = wo.id;
      tr.innerHTML = `
        <td><code>${Utils.escapeHtml(wo.woNo)}</code></td>
        <td>${product ? Utils.escapeHtml(product.name) : '-'}</td>
        <td class="text-right">${wo.plannedQty}</td>
        <td class="text-right">${wo.actualQty ?? '-'}</td>
        <td class="text-right">${wo.defectQty ?? '-'}</td>
        <td><span class="badge badge--${wo.status==='completed'?'success':wo.status==='in_progress'?'info':wo.status==='cancelled'?'neutral':'warning'}">${wo.status}</span></td>
        <td>${wo.status !== 'completed' && wo.status !== 'cancelled' ? `<button class="btn btn--sm btn--primary" data-action="complete-wo">✅ Selesai</button>` : ''}</td>
      `;
      fragment.appendChild(tr);
    });
    tbody.replaceChildren(fragment);
  }

  // ─── Events ──────────────────────────────────────────────────
  function _bindEvents() {
    if (!_container) return;

    _container.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) { _currentTab = tabBtn.dataset.tab; _render(); return; }

      const delMat = e.target.closest('[data-action="delete-material"]');
      if (delMat) { const id = Number(delMat.closest('tr')?.dataset.id); if (id && confirm('Hapus bahan baku ini?')) _deleteMaterial(id); return; }

      const delBOM = e.target.closest('[data-action="delete-bom"]');
      if (delBOM) { const id = Number(delBOM.closest('tr')?.dataset.id); if (id && confirm('Hapus BOM ini?')) _deleteBOM(id); return; }

      const completeWO = e.target.closest('[data-action="complete-wo"]');
      if (completeWO) { const id = Number(completeWO.closest('tr')?.dataset.id); if (id) _completeWorkOrder(id); return; }
    });

    _container.addEventListener('submit', (e) => {
      if (e.target.id === 'material-form') { e.preventDefault(); _saveMaterial(new FormData(e.target)); }
      if (e.target.id === 'bom-form') { e.preventDefault(); _saveBOM(new FormData(e.target)); }
      if (e.target.id === 'wo-form') { e.preventDefault(); _createWorkOrder(new FormData(e.target)); }
    });
  }

  // ─── Actions ─────────────────────────────────────────────────
  async function _saveMaterial(formData) {
    const data = {
      name: formData.get('name').trim(),
      categoryId: Number(formData.get('categoryId')) || null,
      unitId: Number(formData.get('unitId')) || null,
      buyPrice: Utils.sanitizeNumber(formData.get('buyPrice')),
      currentStock: 0,
      minStock: Math.floor(Utils.sanitizeNumber(formData.get('minStock'))) || 0,
      supplierId: Number(formData.get('supplierId')) || null,
    };
    if (!data.name) { alert('Nama bahan wajib diisi.'); return; }
    try {
      await DB.add('raw_materials', data);
      await _loadData();
      _renderContent();
      EventBus.emit('production:changed');
    } catch (error) { alert('Gagal menyimpan bahan baku.'); }
  }

  async function _saveBOM(formData) {
    const data = {
      productId: Number(formData.get('productId')),
      materialId: Number(formData.get('materialId')),
      qty: parseFloat(formData.get('qty')) || 1,
      unitId: null,
      wasteFactor: (parseFloat(formData.get('wasteFactor')) || 0) / 100,
    };
    if (!data.productId || !data.materialId) { alert('Produk dan bahan wajib dipilih.'); return; }
    try {
      await DB.add('bom', data);
      await _loadData();
      _renderContent();
      EventBus.emit('production:changed');
    } catch (error) { alert('Gagal menyimpan BOM.'); }
  }

  async function _createWorkOrder(formData) {
    const productId = Number(formData.get('productId'));
    const plannedQty = parseInt(formData.get('plannedQty')) || 1;
    if (!productId) { alert('Produk wajib dipilih.'); return; }

    const woNo = Utils.generateDocumentNumber('WO');
    const data = {
      woNo,
      productId,
      plannedQty,
      actualQty: null,
      defectQty: null,
      startDate: formData.get('startDate') ? new Date(formData.get('startDate')).toISOString() : new Date().toISOString(),
      endDate: null,
      status: 'planned',
      productionCost: 0,
      notes: formData.get('notes').trim(),
      createdAt: new Date().toISOString(),
    };
    try {
      await DB.add('production_orders', data);
      await _loadData();
      _renderContent();
      EventBus.emit('production:changed');
      alert(`Work Order ${woNo} dibuat.`);
    } catch (error) { alert('Gagal membuat Work Order.'); }
  }

  async function _completeWorkOrder(woId) {
    const wo = _workOrders.find(w => w.id === woId);
    if (!wo) return;
    const actualQty = parseInt(prompt('Hasil produksi aktual (unit):', wo.plannedQty)) || 0;
    const defectQty = parseInt(prompt('Produk cacat/reject:', '0')) || 0;
    const endDate = new Date().toISOString();

    // Ambil BOM produk
    const bomForProduct = _bomItems.filter(b => b.productId === wo.productId);
    if (bomForProduct.length === 0) {
      alert('Produk ini belum memiliki BOM. Tidak bisa menyelesaikan WO.');
      return;
    }

    try {
      const db = await DB.open();
      const tx = db.transaction(['production_orders', 'products', 'raw_materials', 'inventory'], 'readwrite');

      // Update WO
      const woStore = tx.objectStore('production_orders');
      const updatedWO = { ...wo, actualQty, defectQty, endDate, status: 'completed' };
      woStore.put(updatedWO);

      // Tambah stok produk jadi
      const productsStore = tx.objectStore('products');
      const prodReq = productsStore.get(wo.productId);
      prodReq.onsuccess = () => {
        const prod = prodReq.result;
        if (prod) {
          prod.currentStock = (prod.currentStock ?? 0) + actualQty;
          prod.updatedAt = endDate;
          productsStore.put(prod);
          // Inventory in_production
          const invStore = tx.objectStore('inventory');
          invStore.add({ productId: wo.productId, date: endDate, type: 'in_production', qty: actualQty, refType: 'production', refId: woId, stockBefore: prod.currentStock - actualQty, stockAfter: prod.currentStock, notes: `WO #${wo.woNo}`, createdAt: endDate });
        }
      };

      // Kurangi stok bahan baku
      const matStore = tx.objectStore('raw_materials');
      const invStore2 = tx.objectStore('inventory');
      bomForProduct.forEach(b => {
        const matReq = matStore.get(b.materialId);
        matReq.onsuccess = () => {
          const mat = matReq.result;
          if (mat) {
            const needed = b.qty * actualQty * (1 + (b.wasteFactor ?? 0));
            const newStock = (mat.currentStock ?? 0) - needed;
            if (newStock < 0) {
              console.warn(`Stok bahan ${mat.name} tidak mencukupi! Dibutuhkan ${needed}, tersedia ${mat.currentStock}. Stok menjadi 0.`);
              mat.currentStock = 0;
            } else {
              mat.currentStock = newStock;
            }
            mat.updatedAt = endDate;
            matStore.put(mat);
            invStore2.add({ productId: b.materialId, date: endDate, type: 'out_production', qty: -needed, refType: 'production', refId: woId, stockBefore: mat.currentStock + needed, stockAfter: mat.currentStock, notes: `WO #${wo.woNo}`, createdAt: endDate });
          }
        };
      });

      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
      });

      alert('Work Order selesai. Stok produk dan bahan baku telah diperbarui.');
      await _loadData();
      _render();
      EventBus.emit('production:changed');
    } catch (error) {
      console.error(error);
      alert('Gagal menyelesaikan Work Order.');
    }
  }

  async function _deleteMaterial(id) {
    try {
      await DB.delete('raw_materials', id);
      _rawMaterials = _rawMaterials.filter(m => m.id !== id);
      _renderMaterialRows();
      EventBus.emit('production:changed');
    } catch (error) { alert('Gagal menghapus bahan.'); }
  }

  async function _deleteBOM(id) {
    try {
      await DB.delete('bom', id);
      _bomItems = _bomItems.filter(b => b.id !== id);
      _renderBOMRows();
      EventBus.emit('production:changed');
    } catch (error) { alert('Gagal menghapus BOM.'); }
  }

  // ─── Destroy ─────────────────────────────────────────────────
  function destroy() {
    _container?.replaceChildren();
    _container = null;
  }

  return { init, destroy };
})();