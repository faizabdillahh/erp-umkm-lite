/* ============================================================
   PENJUALAN.JS — Modul Transaksi Penjualan (Point of Sale)
   ============================================================ */
'use strict';

const PenjualanModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container      = null;
  let _products       = [];
  let _customers      = [];
  let _cart           = [];   // { productId, name, sku, qty, sellPrice, costPrice, discountPct, discountAmt }
  let _selectedCust   = null; // null = walk-in, object = pelanggan terpilih
  let _discountTotal  = 0;
  let _taxPct         = 0;
  let _paymentMethod  = 'cash';
  let _paidAmount     = 0;
  let _searchQuery    = '';

  // ─── Init ────────────────────────────────────────────────────
  async function init(container) {
    _container = container;
    await _loadData();
    _render();
    _bindEvents();
    _resetForm();
  }

  // ─── Data ────────────────────────────────────────────────────
  async function _loadData() {
    try {
      const [products, customers] = await Promise.all([
        DB.getAll('products', { isActive: true }),
        DB.getAll('customers'),
      ]);
      _products  = products;
      _customers = customers;
    } catch (error) {
      console.error('[PenjualanModule] Gagal memuat data:', error);
      _products  = [];
      _customers = [];
    }
  }

  // ─── Render Utama ────────────────────────────────────────────
  function _render() {
    if (!_container) return;

    const taxRateSetting = AppState.getSetting('taxRate', 0);
    _taxPct = taxRateSetting;

    _container.innerHTML = `
      <div class="penjualan-layout">
        <!-- Panel Kiri: Produk & Pencarian -->
        <div class="penjualan-panel penjualan-panel--left">
          <div class="penjualan-panel__header">
            <h2 class="penjualan-panel__title">Produk</h2>
            <div class="input-wrapper" style="width:100%; margin-top:var(--space-3);">
              <input type="search" id="product-search" placeholder="Cari produk..." value="${Utils.escapeHtml(_searchQuery)}">
            </div>
          </div>
          <div id="product-list" class="product-grid">
            ${_renderProductCards()}
          </div>
        </div>

        <!-- Panel Kanan: Keranjang & Pembayaran -->
        <div class="penjualan-panel penjualan-panel--right">
          <div class="penjualan-panel__header">
            <h2 class="penjualan-panel__title">Keranjang</h2>
            <button class="btn btn--ghost btn--sm" id="btn-clear-cart">🗑️ Kosongkan</button>
          </div>

          <!-- Pilih Pelanggan -->
          <div class="form-group" style="margin-bottom:var(--space-3);">
            <label for="select-customer">Pelanggan</label>
            <select id="select-customer">
              <option value="">-- Walk-in --</option>
              ${_customers.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.name)} (${Utils.escapeHtml(c.phone || '')})</option>`).join('')}
            </select>
          </div>

          <!-- Item Keranjang -->
          <div id="cart-items" class="cart-items">
            ${_renderCartItems()}
          </div>

          <!-- Ringkasan -->
          <div class="cart-summary">
            <div class="cart-summary__row">
              <span>Subtotal</span>
              <span id="cart-subtotal" class="font-mono">${Utils.formatIDR(_calcSubtotal())}</span>
            </div>
            <div class="cart-summary__row">
              <span>Diskon Total</span>
              <span class="font-mono">
                <input type="number" id="discount-total" class="input-inline" min="0" value="${_discountTotal}" style="width:100px; text-align:right;">
              </span>
            </div>
            <div class="cart-summary__row">
              <span>Pajak (${_taxPct}%)</span>
              <span id="cart-tax" class="font-mono">${Utils.formatIDR(_calcTax())}</span>
            </div>
            <div class="cart-summary__row cart-summary__row--total">
              <span>Total</span>
              <span id="cart-total" class="font-mono" style="font-size:var(--font-size-xl);">${Utils.formatIDR(_calcTotal())}</span>
            </div>
          </div>

          <!-- Pembayaran -->
          <div class="cart-payment">
            <div class="form-group">
              <label>Metode Bayar</label>
              <div class="payment-methods" id="payment-methods">
                ${['cash','transfer','qris','credit'].map(m => `
                  <label class="payment-option ${_paymentMethod === m ? 'payment-option--active' : ''}">
                    <input type="radio" name="paymentMethod" value="${m}" ${_paymentMethod === m ? 'checked' : ''}>
                    ${m === 'cash' ? '💵 Tunai' : m === 'transfer' ? '🏦 Transfer' : m === 'qris' ? '📱 QRIS' : '📋 Kredit'}
                  </label>
                `).join('')}
              </div>
            </div>
            ${_paymentMethod === 'cash' ? `
            <div class="form-group">
              <label for="paid-amount">Jumlah Bayar</label>
              <input type="number" id="paid-amount" min="0" step="1000" value="${_paidAmount}" placeholder="0">
            </div>
            <div class="cart-summary__row">
              <span>Kembalian</span>
              <span id="change-amount" class="font-mono">${Utils.formatIDR(Math.max(0, _paidAmount - _calcTotal()))}</span>
            </div>
            ` : ''}
            <button class="btn btn--primary btn--lg" id="btn-process-sale" style="width:100%;" ${_cart.length === 0 ? 'disabled' : ''}>
              💰 Proses Penjualan
            </button>
          </div>
        </div>
      </div>
    `;

    // Set select customer ke yang sudah dipilih
    if (_selectedCust) {
      const sel = document.getElementById('select-customer');
      if (sel) sel.value = _selectedCust.id;
    }
  }

  // ─── Render Produk ──────────────────────────────────────────
  function _renderProductCards() {
    const query = _searchQuery.toLowerCase();
    const filtered = query
      ? _products.filter(p => p.name.toLowerCase().includes(query) || (p.sku && p.sku.toLowerCase().includes(query)))
      : _products;

    if (filtered.length === 0) {
      return `<div class="empty-state" style="min-height:200px;">
        <div class="empty-state__icon">📦</div>
        <p style="color:var(--color-text-muted);">Produk tidak ditemukan.</p>
      </div>`;
    }

    return filtered.map(p => {
      const outOfStock = (p.currentStock ?? 0) <= 0;
      return `
        <div class="product-item ${outOfStock ? 'product-item--disabled' : ''}" data-product-id="${p.id}">
          <div class="product-item__info">
            <strong>${Utils.escapeHtml(p.name)}</strong>
            <small class="text-muted">${Utils.escapeHtml(p.sku)}</small>
          </div>
          <div class="product-item__price">${Utils.formatIDR(p.sellPrice)}</div>
          <div class="product-item__stock ${outOfStock ? 'text-danger' : 'text-muted'}">
            Stok: ${p.currentStock ?? 0}
          </div>
          ${!outOfStock ? `<button class="btn btn--sm btn--primary product-item__btn" data-action="add-to-cart">+ Keranjang</button>` : ''}
        </div>
      `;
    }).join('');
  }

  // ─── Render Keranjang ───────────────────────────────────────
  function _renderCartItems() {
    if (_cart.length === 0) {
      return `<div class="empty-state" style="min-height:150px; padding:var(--space-6);">
        <div class="empty-state__icon">🛒</div>
        <p style="color:var(--color-text-muted);">Keranjang kosong.</p>
      </div>`;
    }

    return _cart.map((item, idx) => `
      <div class="cart-item" data-index="${idx}">
        <div class="cart-item__info">
          <strong>${Utils.escapeHtml(item.name)}</strong>
          <small class="text-muted">${Utils.formatIDR(item.sellPrice)} / item</small>
        </div>
        <div class="cart-item__qty">
          <button class="btn btn--sm btn--ghost" data-action="qty-dec">−</button>
          <span class="cart-item__qty-val">${item.qty}</span>
          <button class="btn btn--sm btn--ghost" data-action="qty-inc">+</button>
        </div>
        <div class="cart-item__subtotal font-mono">${Utils.formatIDR(item.sellPrice * item.qty)}</div>
        <button class="btn btn--sm btn--ghost text-danger" data-action="remove-item">✕</button>
      </div>
    `).join('');
  }

  // ─── Kalkulasi ──────────────────────────────────────────────
  function _calcSubtotal() {
    return _cart.reduce((sum, i) => sum + (i.sellPrice * i.qty), 0);
  }

  function _calcTax() {
    return Math.round((_calcSubtotal() - _discountTotal) * (_taxPct / 100));
  }

  function _calcTotal() {
    const subtotal = _calcSubtotal();
    const afterDiscount = Math.max(0, subtotal - _discountTotal);
    const tax = Math.round(afterDiscount * (_taxPct / 100));
    return afterDiscount + tax;
  }

  // ─── Events ──────────────────────────────────────────────────
  function _bindEvents() {
    if (!_container) return;

    // Pencarian produk (debounced)
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
      const debouncedSearch = Utils.debounce((val) => {
        _searchQuery = val;
        _render();
      }, 300);
      searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
    }

    _container.addEventListener('click', (e) => {
      // Tambah ke keranjang
      const addBtn = e.target.closest('[data-action="add-to-cart"]');
      if (addBtn) {
        const productEl = addBtn.closest('[data-product-id]');
        const productId = Number(productEl?.dataset.productId);
        if (productId) _addToCart(productId);
        return;
      }

      // Qty kurang
      const decBtn = e.target.closest('[data-action="qty-dec"]');
      if (decBtn) {
        const itemEl = decBtn.closest('.cart-item');
        const idx = Number(itemEl?.dataset.index);
        if (!isNaN(idx)) _changeQty(idx, -1);
        return;
      }

      // Qty tambah
      const incBtn = e.target.closest('[data-action="qty-inc"]');
      if (incBtn) {
        const itemEl = incBtn.closest('.cart-item');
        const idx = Number(itemEl?.dataset.index);
        if (!isNaN(idx)) _changeQty(idx, 1);
        return;
      }

      // Hapus item
      const rmBtn = e.target.closest('[data-action="remove-item"]');
      if (rmBtn) {
        const itemEl = rmBtn.closest('.cart-item');
        const idx = Number(itemEl?.dataset.index);
        if (!isNaN(idx)) _removeItem(idx);
        return;
      }

      // Kosongkan keranjang
      if (e.target.id === 'btn-clear-cart') {
        if (confirm('Kosongkan keranjang?')) {
          _cart = [];
          _discountTotal = 0;
          _paidAmount = 0;
          _render();
        }
        return;
      }

      // Proses penjualan
      if (e.target.id === 'btn-process-sale') {
        _processSale();
        return;
      }
    });

    _container.addEventListener('change', (e) => {
      // Pilih pelanggan
      if (e.target.id === 'select-customer') {
        const custId = Number(e.target.value) || null;
        _selectedCust = custId ? _customers.find(c => c.id === custId) : null;
        return;
      }

      // Metode pembayaran
      if (e.target.name === 'paymentMethod') {
        _paymentMethod = e.target.value;
        _paidAmount = 0;
        _render();
        return;
      }
    });

    _container.addEventListener('input', (e) => {
      // Diskon total
      if (e.target.id === 'discount-total') {
        _discountTotal = Utils.sanitizeNumber(e.target.value);
        _updateSummaryDisplay();
        return;
      }

      // Jumlah bayar
      if (e.target.id === 'paid-amount') {
        _paidAmount = Utils.sanitizeNumber(e.target.value);
        const changeEl = document.getElementById('change-amount');
        if (changeEl) changeEl.textContent = Utils.formatIDR(Math.max(0, _paidAmount - _calcTotal()));
        return;
      }
    });
  }

  // ─── Update Ringkasan (tanpa re-render penuh) ────────────────
  function _updateSummaryDisplay() {
    const subtotalEl = document.getElementById('cart-subtotal');
    const taxEl = document.getElementById('cart-tax');
    const totalEl = document.getElementById('cart-total');
    const changeEl = document.getElementById('change-amount');
    if (subtotalEl) subtotalEl.textContent = Utils.formatIDR(_calcSubtotal());
    if (taxEl) taxEl.textContent = Utils.formatIDR(_calcTax());
    if (totalEl) totalEl.textContent = Utils.formatIDR(_calcTotal());
    if (changeEl) changeEl.textContent = Utils.formatIDR(Math.max(0, _paidAmount - _calcTotal()));
  }

  // ─── Cart Actions ────────────────────────────────────────────
  function _addToCart(productId) {
    const product = _products.find(p => p.id === productId);
    if (!product) return;
    if ((product.currentStock ?? 0) <= 0) {
      alert('Stok produk ini habis.');
      return;
    }

    const existing = _cart.find(i => i.productId === productId);
    if (existing) {
      // Cek stok mencukupi
      if (existing.qty + 1 > (product.currentStock ?? 0)) {
        alert(`Stok tidak mencukupi. Tersedia: ${product.currentStock}`);
        return;
      }
      existing.qty += 1;
    } else {
      _cart.push({
        productId  : product.id,
        name       : product.name,
        sku        : product.sku,
        qty        : 1,
        sellPrice  : product.sellPrice,
        costPrice  : product.costPrice,
        discountPct: 0,
        discountAmt: 0,
      });
    }
    _render();
  }

  function _changeQty(index, delta) {
    if (index < 0 || index >= _cart.length) return;
    const item = _cart[index];
    const product = _products.find(p => p.id === item.productId);
    const newQty = item.qty + delta;

    if (newQty <= 0) {
      _cart.splice(index, 1);
      _render();
      return;
    }

    if (product && newQty > (product.currentStock ?? 0)) {
      alert(`Stok tidak mencukupi. Tersedia: ${product.currentStock}`);
      return;
    }

    item.qty = newQty;
    _render();
  }

  function _removeItem(index) {
    _cart.splice(index, 1);
    _render();
  }

  function _resetForm() {
    _cart = [];
    _selectedCust = null;
    _discountTotal = 0;
    _paidAmount = 0;
    _paymentMethod = 'cash';
    _searchQuery = '';
  }

  // ─── Proses Penjualan ───────────────────────────────────────
  async function _processSale() {
    if (_cart.length === 0) {
      alert('Keranjang masih kosong.');
      return;
    }

    const total = _calcTotal();
    if (_paymentMethod === 'cash' && _paidAmount < total) {
      alert(`Pembayaran kurang. Total: ${Utils.formatIDR(total)}`);
      return;
    }

    // Konfirmasi
    if (!confirm(`Proses penjualan sebesar ${Utils.formatIDR(total)}?`)) {
      return;
    }

    const saleData = {
      invoiceNo    : Utils.generateDocumentNumber('INV'),
      date         : new Date().toISOString(),
      customerId   : _selectedCust?.id ?? null,
      items        : structuredClone(_cart),
      subtotal     : _calcSubtotal(),
      discountAmt  : _discountTotal,
      taxPct       : _taxPct,
      taxAmt       : _calcTax(),
      total        : total,
      paymentMethod: _paymentMethod,
      paidAmount   : _paymentMethod === 'cash' ? _paidAmount : total,
      changeAmount : _paymentMethod === 'cash' ? Math.max(0, _paidAmount - total) : 0,
      status       : _paymentMethod === 'credit' ? 'partial' : 'completed',
      notes        : '',
      createdBy    : 'kasir',
      createdAt    : new Date().toISOString(),
    };

    try {
      // Simpan sale & mutasi stok dalam satu transaksi
      await _completeSale(saleData);

      // Reset & refresh
      _resetForm();
      await _loadData();
      _render();

      // Notifikasi & cetak opsi
      alert(`Penjualan berhasil!\nInvoice: ${saleData.invoiceNo}\nTotal: ${Utils.formatIDR(total)}`);
      if (confirm('Cetak nota sekarang?')) {
        _printInvoice(saleData);
      }

      EventBus.emit('sale:created', { id: saleData.invoiceNo, total, items: saleData.items });
    } catch (error) {
      console.error('[PenjualanModule] Gagal proses penjualan:', error);
      alert('Gagal memproses penjualan. Silakan coba lagi.');
    }
  }

  async function _completeSale(saleData) {
    const db = await DB.open();
    const tx = db.transaction(['sales', 'inventory', 'products', 'customers'], 'readwrite');

    return new Promise((resolve, reject) => {
      // 1. Simpan sale
      const salesStore = tx.objectStore('sales');
      const saleReq = salesStore.add(saleData);

      saleReq.onsuccess = (e) => {
        const saleId = e.target.result;

        // 2. Kurangi stok & catat mutasi
        const inventoryStore = tx.objectStore('inventory');
        const productsStore  = tx.objectStore('products');

        saleData.items.forEach(async (item) => {
          // Mutasi stok
          inventoryStore.add({
            productId   : item.productId,
            date        : new Date().toISOString(),
            type        : 'out_sale',
            qty         : -item.qty,
            refType     : 'sale',
            refId       : saleId,
            stockBefore : 0, // akan diupdate
            stockAfter  : 0,
            notes       : `Penjualan #${saleData.invoiceNo}`,
            createdAt   : new Date().toISOString(),
          });

          // Kurangi stok produk
          const productReq = productsStore.get(item.productId);
          productReq.onsuccess = () => {
            const prod = productReq.result;
            if (prod) {
              prod.currentStock = Math.max(0, (prod.currentStock ?? 0) - item.qty);
              prod.updatedAt = new Date().toISOString();
              productsStore.put(prod);
            }
          };
        });

        // 3. Update pelanggan (jika bukan walk-in)
        if (saleData.customerId) {
          const customersStore = tx.objectStore('customers');
          const custReq = customersStore.get(saleData.customerId);
          custReq.onsuccess = () => {
            const cust = custReq.result;
            if (cust) {
              cust.totalPurchase = (cust.totalPurchase ?? 0) + saleData.total;
              cust.lastPurchaseDate = saleData.date;
              customersStore.put(cust);
            }
          };
        }
      };

      tx.oncomplete = () => resolve(saleData);
      tx.onerror    = (e) => reject(new DB.DBError('Gagal simpan penjualan', e.target.error));
    });
  }

  // ─── Cetak Invoice ──────────────────────────────────────────
  function _printInvoice(saleData) {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const custName = saleData.customerId
      ? (_customers.find(c => c.id === saleData.customerId)?.name || 'Umum')
      : 'Walk-in';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>Nota ${saleData.invoiceNo}</title>
      <style>
        body { font-family: monospace; font-size: 11px; padding: 10px; max-width: 300px; margin: 0 auto; }
        h2 { text-align: center; margin: 0 0 5px; }
        .line { border-top: 1px dashed #000; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 2px 0; }
        .right { text-align: right; }
        .total { font-size: 14px; font-weight: bold; }
      </style></head>
      <body>
        <h2>${Utils.escapeHtml(AppState.getSetting('businessName', 'Toko'))}</h2>
        <p style="text-align:center;">${Utils.escapeHtml(saleData.invoiceNo)}<br>${Utils.formatDate(saleData.date, 'DD/MM/YYYY hh:mm')}</p>
        <p>Pelanggan: ${Utils.escapeHtml(custName)}</p>
        <div class="line"></div>
        <table>
          ${saleData.items.map(i => `
            <tr>
              <td>${Utils.escapeHtml(i.name)}<br><small>${i.qty} x ${Utils.formatIDR(i.sellPrice)}</small></td>
              <td class="right">${Utils.formatIDR(i.sellPrice * i.qty)}</td>
            </tr>
          `).join('')}
        </table>
        <div class="line"></div>
        <table>
          <tr><td>Subtotal</td><td class="right">${Utils.formatIDR(saleData.subtotal)}</td></tr>
          ${saleData.discountAmt > 0 ? `<tr><td>Diskon</td><td class="right">-${Utils.formatIDR(saleData.discountAmt)}</td></tr>` : ''}
          ${saleData.taxAmt > 0 ? `<tr><td>Pajak</td><td class="right">${Utils.formatIDR(saleData.taxAmt)}</td></tr>` : ''}
          <tr class="total"><td>TOTAL</td><td class="right">${Utils.formatIDR(saleData.total)}</td></tr>
          <tr><td>Bayar (${saleData.paymentMethod})</td><td class="right">${Utils.formatIDR(saleData.paidAmount)}</td></tr>
          <tr><td>Kembali</td><td class="right">${Utils.formatIDR(saleData.changeAmount)}</td></tr>
        </table>
        <div class="line"></div>
        <p style="text-align:center;">Terima kasih!</p>
        <script>window.print();window.close();<\/script>
      </body></html>
    `);
    printWindow.document.close();
  }

  // ─── Destroy ─────────────────────────────────────────────────
  function destroy() {
    _container?.replaceChildren();
    _container = null;
  }

  // ─── Public API ─────────────────────────────────────────────
  return { init, destroy };
})();