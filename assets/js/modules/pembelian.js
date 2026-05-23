/* ============================================================
   PEMBELIAN.JS — Modul Transaksi Pembelian (Purchase Order)
   ============================================================ */
'use strict';

const PembelianModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container    = null;
  let _products     = [];
  let _suppliers    = [];
  let _cart         = [];   // { productId, name, qty, buyPrice }
  let _selectedSupp = null;
  let _poStatus     = 'ordered'; // 'ordered' | 'received'
  let _receivedDate = new Date().toISOString().slice(0, 10);
  let _paymentDue   = 30;
  let _notes        = '';

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
      const [products, suppliers] = await Promise.all([
        DB.getAll('products', { isActive: true }),
        DB.getAll('suppliers'),
      ]);
      _products  = products;
      _suppliers = suppliers;
    } catch (error) {
      console.error('[PembelianModule] Gagal memuat data:', error);
      _products  = [];
      _suppliers = [];
    }
  }

  // ─── Render ──────────────────────────────────────────────────
  function _render() {
    if (!_container) return;

    _container.innerHTML = `
      <div class="pembelian-layout">
        <!-- Panel Kiri: Daftar Produk -->
        <div class="pembelian-panel pembelian-panel--left">
          <div class="pembelian-panel__header">
            <h2 class="pembelian-panel__title">Produk</h2>
            <div class="input-wrapper" style="width:100%; margin-top:var(--space-3);">
              <input type="search" id="purchase-product-search" placeholder="Cari produk...">
            </div>
          </div>
          <div id="purchase-product-list" class="product-grid">
            ${_renderProductCards()}
          </div>
        </div>

        <!-- Panel Kanan: Form PO -->
        <div class="pembelian-panel pembelian-panel--right">
          <div class="pembelian-panel__header">
            <h2 class="pembelian-panel__title">Purchase Order</h2>
            <button class="btn btn--ghost btn--sm" id="btn-clear-po">🗑️ Kosongkan</button>
          </div>

          <div class="form-group">
            <label for="select-supplier">Supplier <span class="required">*</span></label>
            <select id="select-supplier" required>
              <option value="">-- Pilih Supplier --</option>
              ${_suppliers.map(s => `<option value="${s.id}">${Utils.escapeHtml(s.name)} (${Utils.escapeHtml(s.phone || '')})</option>`).join('')}
            </select>
          </div>

          <div id="po-items" class="cart-items">
            ${_renderCartItems()}
          </div>

          <div class="cart-summary">
            <div class="cart-summary__row">
              <span>Total Item</span>
              <span id="po-total-items">${_cart.reduce((sum, i) => sum + i.qty, 0)}</span>
            </div>
            <div class="cart-summary__row">
              <span>Total Harga</span>
              <span id="po-total-amount" class="font-mono">${Utils.formatIDR(_calcTotalAmount())}</span>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4); margin-top:var(--space-4);">
            <div class="form-group">
              <label for="po-status">Status</label>
              <select id="po-status">
                <option value="ordered" ${_poStatus === 'ordered' ? 'selected' : ''}>Dipesan (Belum Diterima)</option>
                <option value="received" ${_poStatus === 'received' ? 'selected' : ''}>Sudah Diterima</option>
              </select>
            </div>
            <div class="form-group">
              <label for="received-date">Tanggal Terima</label>
              <input type="date" id="received-date" value="${_receivedDate}" ${_poStatus === 'ordered' ? 'disabled' : ''}>
            </div>
            <div class="form-group">
              <label for="payment-due">Jatuh Tempo (hari)</label>
              <input type="number" id="payment-due" min="0" value="${_paymentDue}">
            </div>
            <div class="form-group">
              <label for="po-notes">Catatan</label>
              <input type="text" id="po-notes" maxlength="300" placeholder="Opsional" value="${Utils.escapeHtml(_notes)}">
            </div>
          </div>

          <button class="btn btn--primary btn--lg" id="btn-save-po" style="width:100%; margin-top:var(--space-4);" ${_cart.length === 0 ? 'disabled' : ''}>
            📋 Simpan Purchase Order
          </button>
        </div>
      </div>
    `;

    if (_selectedSupp) {
      const sel = document.getElementById('select-supplier');
      if (sel) sel.value = _selectedSupp.id;
    }
  }

  function _renderProductCards() {
    return _products.map(p => `
      <div class="product-item" data-product-id="${p.id}">
        <div class="product-item__info">
          <strong>${Utils.escapeHtml(p.name)}</strong>
          <small class="text-muted">${Utils.escapeHtml(p.sku)} | Stok: ${p.currentStock ?? 0}</small>
        </div>
        <div class="product-item__price">${Utils.formatIDR(p.costPrice)}</div>
        <button class="btn btn--sm btn--primary product-item__btn" data-action="add-to-po">+ Beli</button>
      </div>
    `).join('');
  }

  function _renderCartItems() {
    if (_cart.length === 0) {
      return `<div class="empty-state" style="min-height:150px; padding:var(--space-6);">
        <div class="empty-state__icon">📦</div>
        <p style="color:var(--color-text-muted);">Belum ada item.</p>
      </div>`;
    }

    return _cart.map((item, idx) => `
      <div class="cart-item" data-index="${idx}">
        <div class="cart-item__info">
          <strong>${Utils.escapeHtml(item.name)}</strong>
          <div class="input-wrapper" style="margin-top:var(--space-1);">
            <span class="input-prefix">Rp</span>
            <input type="number" class="cart-item-price" data-index="${idx}" value="${item.buyPrice}" min="0" step="100" style="width:100px;">
          </div>
        </div>
        <div class="cart-item__qty">
          <button class="btn btn--sm btn--ghost" data-action="po-qty-dec">−</button>
          <span>${item.qty}</span>
          <button class="btn btn--sm btn--ghost" data-action="po-qty-inc">+</button>
        </div>
        <div class="cart-item__subtotal font-mono">${Utils.formatIDR(item.buyPrice * item.qty)}</div>
        <button class="btn btn--sm btn--ghost text-danger" data-action="po-remove-item">✕</button>
      </div>
    `).join('');
  }

  function _calcTotalAmount() {
    return _cart.reduce((sum, i) => sum + (i.buyPrice * i.qty), 0);
  }

  // ─── Events ──────────────────────────────────────────────────
  function _bindEvents() {
    if (!_container) return;

    _container.addEventListener('click', (e) => {
      const addBtn = e.target.closest('[data-action="add-to-po"]');
      if (addBtn) {
        const productEl = addBtn.closest('[data-product-id]');
        const productId = Number(productEl?.dataset.productId);
        if (productId) _addToCart(productId);
        return;
      }

      const decBtn = e.target.closest('[data-action="po-qty-dec"]');
      if (decBtn) {
        const itemEl = decBtn.closest('.cart-item');
        const idx = Number(itemEl?.dataset.index);
        if (!isNaN(idx)) _changeQty(idx, -1);
        return;
      }

      const incBtn = e.target.closest('[data-action="po-qty-inc"]');
      if (incBtn) {
        const itemEl = incBtn.closest('.cart-item');
        const idx = Number(itemEl?.dataset.index);
        if (!isNaN(idx)) _changeQty(idx, 1);
        return;
      }

      const rmBtn = e.target.closest('[data-action="po-remove-item"]');
      if (rmBtn) {
        const itemEl = rmBtn.closest('.cart-item');
        const idx = Number(itemEl?.dataset.index);
        if (!isNaN(idx)) _removeItem(idx);
        return;
      }

      if (e.target.id === 'btn-clear-po') {
        if (confirm('Kosongkan daftar belanja?')) _resetCart();
        return;
      }

      if (e.target.id === 'btn-save-po') {
        _savePurchaseOrder();
        return;
      }
    });

    _container.addEventListener('input', (e) => {
      if (e.target.classList.contains('cart-item-price')) {
        const idx = Number(e.target.dataset.index);
        if (!isNaN(idx) && idx >= 0 && idx < _cart.length) {
          _cart[idx].buyPrice = Utils.sanitizeNumber(e.target.value);
          _updateSummary();
        }
      }
    });

    _container.addEventListener('change', (e) => {
      if (e.target.id === 'select-supplier') {
        const suppId = Number(e.target.value) || null;
        _selectedSupp = suppId ? _suppliers.find(s => s.id === suppId) : null;
      }
      if (e.target.id === 'po-status') {
        _poStatus = e.target.value;
        const dateInput = document.getElementById('received-date');
        if (dateInput) dateInput.disabled = (_poStatus === 'ordered');
      }
      if (e.target.id === 'received-date') {
        _receivedDate = e.target.value;
      }
      if (e.target.id === 'payment-due') {
        _paymentDue = parseInt(e.target.value) || 0;
      }
      if (e.target.id === 'po-notes') {
        _notes = e.target.value;
      }
    });
  }

  // ─── Cart Actions ────────────────────────────────────────────
  function _addToCart(productId) {
    const product = _products.find(p => p.id === productId);
    if (!product) return;

    const existing = _cart.find(i => i.productId === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      _cart.push({
        productId : product.id,
        name      : product.name,
        qty       : 1,
        buyPrice  : product.costPrice ?? 0,
      });
    }
    _render();
  }

  function _changeQty(index, delta) {
    if (index < 0 || index >= _cart.length) return;
    const newQty = _cart[index].qty + delta;
    if (newQty <= 0) {
      _cart.splice(index, 1);
    } else {
      _cart[index].qty = newQty;
    }
    _render();
  }

  function _removeItem(index) {
    _cart.splice(index, 1);
    _render();
  }

  function _resetCart() {
    _cart = [];
    _selectedSupp = null;
    _poStatus = 'ordered';
    _receivedDate = new Date().toISOString().slice(0, 10);
    _paymentDue = 30;
    _notes = '';
    _render();
  }

  function _updateSummary() {
    const totalEl = document.getElementById('po-total-amount');
    const itemsEl = document.getElementById('po-total-items');
    if (totalEl) totalEl.textContent = Utils.formatIDR(_calcTotalAmount());
    if (itemsEl) itemsEl.textContent = _cart.reduce((sum, i) => sum + i.qty, 0);
  }

  // ─── Simpan Purchase Order ──────────────────────────────────
  async function _savePurchaseOrder() {
    if (_cart.length === 0) {
      alert('Daftar belanja kosong.');
      return;
    }
    if (!_selectedSupp) {
      alert('Supplier wajib dipilih.');
      return;
    }

    const totalAmount = _calcTotalAmount();
    if (!confirm(`Simpan PO sebesar ${Utils.formatIDR(totalAmount)}?`)) return;

    const poData = {
      poNo           : Utils.generateDocumentNumber('PO'),
      date           : new Date().toISOString(),
      supplierId     : _selectedSupp.id,
      items          : structuredClone(_cart),
      receivedDate   : _poStatus === 'received' ? new Date(_receivedDate).toISOString() : null,
      status         : _poStatus,
      paymentDueDate : _poStatus === 'ordered'
        ? new Date(Date.now() + _paymentDue * 24 * 60 * 60 * 1000).toISOString()
        : null,
      paymentStatus  : 'unpaid',
      totalAmount,
      notes          : _notes,
      createdAt      : new Date().toISOString(),
    };

    try {
      await _completePurchase(poData);
      alert(`PO ${poData.poNo} berhasil disimpan.`);
      _resetCart();
      EventBus.emit('purchase:created', poData);
    } catch (error) {
      console.error('[PembelianModule] Gagal simpan PO:', error);
      alert('Gagal menyimpan Purchase Order.');
    }
  }

  async function _completePurchase(poData) {
    const db = await DB.open();
    const tx = db.transaction(['purchases', 'purchase_items', 'products', 'inventory'], 'readwrite');

    return new Promise((resolve, reject) => {
      const purchaseStore = tx.objectStore('purchases');
      const purchaseReq   = purchaseStore.add(poData);

      purchaseReq.onsuccess = (e) => {
        const purchaseId = e.target.result;
        const itemsStore = tx.objectStore('purchase_items');

        poData.items.forEach(item => {
          itemsStore.add({
            purchaseId : purchaseId,
            productId  : item.productId,
            qty        : item.qty,
            buyPrice   : item.buyPrice,
          });
        });

        if (poData.status === 'received') {
          const productsStore  = tx.objectStore('products');
          const inventoryStore = tx.objectStore('inventory');

          poData.items.forEach(item => {
            const prodReq = productsStore.get(item.productId);
            prodReq.onsuccess = () => {
              const prod = prodReq.result;
              if (prod) {
                const oldStock = prod.currentStock ?? 0;
                prod.currentStock = oldStock + item.qty;
                prod.updatedAt    = new Date().toISOString();
                productsStore.put(prod);

                inventoryStore.add({
                  productId   : item.productId,
                  date        : new Date().toISOString(),
                  type        : 'in_purchase',
                  qty         : item.qty,
                  refType     : 'purchase',
                  refId       : purchaseId,
                  stockBefore : oldStock,
                  stockAfter  : prod.currentStock,
                  notes       : `PO #${poData.poNo}`,
                  createdAt   : new Date().toISOString(),
                });
              }
            };
          });
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror    = (e) => reject(new DB.DBError('Gagal menyimpan PO', e.target.error));
    });
  }

  // ─── Destroy ─────────────────────────────────────────────────
  function destroy() {
    _container?.replaceChildren();
    _container = null;
  }

  // ─── Public API ─────────────────────────────────────────────
  return { init, destroy };
})();