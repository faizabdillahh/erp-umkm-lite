/* ============================================================
   DOKUMEN.JS — Modul Dokumen: Riwayat & Cetak Ulang
   ============================================================ */
'use strict';

const DokumenModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container   = null;
  let _currentTab  = 'invoices'; // 'invoices' | 'po' | 'wo'
  let _sales       = [];
  let _purchases   = [];
  let _workOrders  = [];
  let _customers   = [];
  let _suppliers   = [];
  let _products    = [];

  // ─── Init ────────────────────────────────────────────────────
  async function init(container) {
    _container = container;
    await _loadData();
    _render();
    _bindEvents();
  }

  async function _loadData() {
    try {
      const [sales, purchases, workOrders, customers, suppliers, products] = await Promise.all([
        DB.getAll('sales'),
        DB.getAll('purchases'),
        DB.getAll('production_orders'),
        DB.getAll('customers'),
        DB.getAll('suppliers'),
        DB.getAll('products'),
      ]);
      _sales      = sales.filter(s => s.status !== 'void');
      _purchases  = purchases;
      _workOrders = workOrders;
      _customers  = customers;
      _suppliers  = suppliers;
      _products   = products;
    } catch (error) {
      console.error('[DokumenModule] Gagal memuat data:', error);
    }
  }

  // ─── Render ──────────────────────────────────────────────────
  function _render() {
    if (!_container) return;
    _container.innerHTML = `
      <div class="master-data">
        <div class="master-data__header">
          <h1 class="dashboard__title">Dokumen</h1>
          <div class="master-data__tabs">
            <button class="btn ${_currentTab==='invoices'?'btn--primary':'btn--ghost'}" data-tab="invoices">🧾 Invoice</button>
            <button class="btn ${_currentTab==='po'?'btn--primary':'btn--ghost'}" data-tab="po">📋 Purchase Order</button>
            <button class="btn ${_currentTab==='wo'?'btn--primary':'btn--ghost'}" data-tab="wo">⚙️ Work Order</button>
          </div>
        </div>
        <div id="dokumen-content"></div>
      </div>
    `;
    _renderContent();
  }

  function _renderContent() {
    const el = document.getElementById('dokumen-content');
    if (!el) return;
    if (_currentTab === 'invoices') _renderInvoices(el);
    else if (_currentTab === 'po') _renderPO(el);
    else _renderWO(el);
  }

  // ─── INVOICE ─────────────────────────────────────────────────
  function _renderInvoices(container) {
    const data = [..._sales].sort((a,b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = `
      <div class="table-container">
        <table>
          <caption>Riwayat Invoice — ${data.length}</caption>
          <thead><tr><th>Invoice No</th><th>Tanggal</th><th>Pelanggan</th><th style="text-align:right;">Total</th><th>Status</th><th style="width:100px;">Cetak</th></tr></thead>
          <tbody>
            ${data.length === 0 ? `<tr><td colspan="6" class="text-muted text-center">Belum ada invoice.</td></tr>` : ''}
            ${data.map(s => {
              const cust = s.customerId ? _customers.find(c => c.id === s.customerId) : null;
              return `
                <tr data-id="${s.id}">
                  <td><code>${Utils.escapeHtml(s.invoiceNo)}</code></td>
                  <td>${Utils.formatDate(s.date)}</td>
                  <td>${cust ? Utils.escapeHtml(cust.name) : 'Walk-in'}</td>
                  <td class="text-right font-mono">${Utils.formatIDR(s.total)}</td>
                  <td><span class="badge badge--${s.status==='completed'?'success':'warning'}">${s.status}</span></td>
                  <td><button class="btn btn--sm btn--primary" data-action="print-invoice">🖨️ Cetak</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ─── PURCHASE ORDER ──────────────────────────────────────────
  function _renderPO(container) {
    const data = [..._purchases].sort((a,b) => new Date(b.date) - new Date(a.date));
    container.innerHTML = `
      <div class="table-container">
        <table>
          <caption>Riwayat Purchase Order — ${data.length}</caption>
          <thead><tr><th>PO No</th><th>Tanggal</th><th>Supplier</th><th style="text-align:right;">Total</th><th>Status</th><th style="width:100px;">Cetak</th></tr></thead>
          <tbody>
            ${data.length === 0 ? `<tr><td colspan="6" class="text-muted text-center">Belum ada PO.</td></tr>` : ''}
            ${data.map(p => {
              const supp = p.supplierId ? _suppliers.find(s => s.id === p.supplierId) : null;
              return `
                <tr data-id="${p.id}">
                  <td><code>${Utils.escapeHtml(p.poNo)}</code></td>
                  <td>${Utils.formatDate(p.date)}</td>
                  <td>${supp ? Utils.escapeHtml(supp.name) : '-'}</td>
                  <td class="text-right font-mono">${Utils.formatIDR(p.totalAmount)}</td>
                  <td><span class="badge badge--info">${p.status}</span></td>
                  <td><button class="btn btn--sm btn--primary" data-action="print-po">🖨️ Cetak</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ─── WORK ORDER ──────────────────────────────────────────────
  function _renderWO(container) {
    const data = [..._workOrders].sort((a,b) => new Date(b.startDate) - new Date(a.startDate));
    container.innerHTML = `
      <div class="table-container">
        <table>
          <caption>Riwayat Work Order — ${data.length}</caption>
          <thead><tr><th>WO No</th><th>Tanggal</th><th>Produk</th><th style="text-align:right;">Target</th><th style="text-align:right;">Aktual</th><th>Status</th><th style="width:100px;">Cetak</th></tr></thead>
          <tbody>
            ${data.length === 0 ? `<tr><td colspan="7" class="text-muted text-center">Belum ada WO.</td></tr>` : ''}
            ${data.map(w => {
              const prod = _products.find(p => p.id === w.productId);
              return `
                <tr data-id="${w.id}">
                  <td><code>${Utils.escapeHtml(w.woNo)}</code></td>
                  <td>${Utils.formatDate(w.startDate)}</td>
                  <td>${prod ? Utils.escapeHtml(prod.name) : '-'}</td>
                  <td class="text-right">${w.plannedQty}</td>
                  <td class="text-right">${w.actualQty ?? '-'}</td>
                  <td><span class="badge badge--${w.status==='completed'?'success':'warning'}">${w.status}</span></td>
                  <td><button class="btn btn--sm btn--primary" data-action="print-wo">🖨️ Cetak</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ─── Events ──────────────────────────────────────────────────
  function _bindEvents() {
    if (!_container) return;

    _container.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) { _currentTab = tabBtn.dataset.tab; _render(); return; }

      // Cetak invoice
      const printInv = e.target.closest('[data-action="print-invoice"]');
      if (printInv) {
        const tr = printInv.closest('tr');
        const id = Number(tr?.dataset.id);
        const sale = _sales.find(s => s.id === id);
        if (sale) _printInvoice(sale);
        return;
      }

      // Cetak PO
      const printPO = e.target.closest('[data-action="print-po"]');
      if (printPO) {
        const tr = printPO.closest('tr');
        const id = Number(tr?.dataset.id);
        const po = _purchases.find(p => p.id === id);
        if (po) _printPO(po);
        return;
      }

      // Cetak WO
      const printWO = e.target.closest('[data-action="print-wo"]');
      if (printWO) {
        const tr = printWO.closest('tr');
        const id = Number(tr?.dataset.id);
        const wo = _workOrders.find(w => w.id === id);
        if (wo) _printWO(wo);
        return;
      }
    });
  }

  // ─── Print Invoice ───────────────────────────────────────────
  function _printInvoice(sale) {
    const cust = sale.customerId ? _customers.find(c => c.id === sale.customerId) : null;
    const custName = cust ? cust.name : 'Walk-in';
    const businessName = AppState.getSetting('businessName', 'Toko');

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Invoice ${sale.invoiceNo}</title>
      <style>
        body { font-family: monospace; font-size: 11px; padding: 10px; max-width: 300px; margin: 0 auto; }
        h2 { text-align: center; margin: 0; }
        .line { border-top: 1px dashed #000; margin: 5px 0; }
        table { width: 100%; }
        td { padding: 2px 0; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
      </style></head><body>
        <h2>${Utils.escapeHtml(businessName)}</h2>
        <p style="text-align:center;">Invoice #${Utils.escapeHtml(sale.invoiceNo)}<br>${Utils.formatDate(sale.date, 'DD/MM/YYYY hh:mm')}</p>
        <p>Pelanggan: ${Utils.escapeHtml(custName)}</p>
        <div class="line"></div>
        <table>${sale.items.map(i => `
          <tr><td>${Utils.escapeHtml(i.name)} x${i.qty}</td><td class="right">${Utils.formatIDR(i.sellPrice * i.qty)}</td></tr>
        `).join('')}</table>
        <div class="line"></div>
        <table>
          <tr><td>Subtotal</td><td class="right">${Utils.formatIDR(sale.subtotal)}</td></tr>
          ${sale.discountAmt > 0 ? `<tr><td>Diskon</td><td class="right">-${Utils.formatIDR(sale.discountAmt)}</td></tr>` : ''}
          ${sale.taxAmt > 0 ? `<tr><td>Pajak</td><td class="right">${Utils.formatIDR(sale.taxAmt)}</td></tr>` : ''}
          <tr class="bold"><td>TOTAL</td><td class="right">${Utils.formatIDR(sale.total)}</td></tr>
          <tr><td>Bayar</td><td class="right">${Utils.formatIDR(sale.paidAmount)}</td></tr>
          <tr><td>Kembali</td><td class="right">${Utils.formatIDR(sale.changeAmount)}</td></tr>
        </table>
        <div class="line"></div>
        <p style="text-align:center;">Terima kasih!</p>
        <script>window.print();window.close();<\/script>
      </body></html>
    `);
    printWindow.document.close();
  }

  // ─── Print PO ────────────────────────────────────────────────
  function _printPO(po) {
    const supp = po.supplierId ? _suppliers.find(s => s.id === po.supplierId) : null;
    const businessName = AppState.getSetting('businessName', 'Toko');

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>PO ${po.poNo}</title>
      <style>
        body { font-family: sans-serif; font-size: 12px; padding: 20px; }
        h2 { text-align: center; }
        .line { border-top: 1px solid #000; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 4px 8px; text-align: left; }
        .right { text-align: right; }
      </style></head><body>
        <h2>Purchase Order</h2>
        <p><strong>${Utils.escapeHtml(businessName)}</strong></p>
        <p>PO No: ${Utils.escapeHtml(po.poNo)}<br>Tanggal: ${Utils.formatDate(po.date)}</p>
        <p>Supplier: ${supp ? Utils.escapeHtml(supp.name) : '-'}<br>Status: ${po.status} | Jatuh Tempo: ${po.paymentDueDate ? Utils.formatDate(po.paymentDueDate) : '-'}</p>
        <table><thead><tr><th>Item</th><th style="text-align:right;">Qty</th><th style="text-align:right;">Harga</th><th style="text-align:right;">Subtotal</th></tr></thead>
        <tbody>${(po.items || []).map(i => `
          <tr><td>${Utils.escapeHtml(i.name)}</td><td class="right">${i.qty}</td><td class="right">${Utils.formatIDR(i.buyPrice)}</td><td class="right">${Utils.formatIDR(i.buyPrice * i.qty)}</td></tr>
        `).join('')}</tbody></table>
        <p style="text-align:right;"><strong>Total: ${Utils.formatIDR(po.totalAmount)}</strong></p>
        ${po.notes ? `<p>Catatan: ${Utils.escapeHtml(po.notes)}</p>` : ''}
        <script>window.print();window.close();<\/script>
      </body></html>
    `);
    printWindow.document.close();
  }

  // ─── Print WO ────────────────────────────────────────────────
  function _printWO(wo) {
    const prod = _products.find(p => p.id === wo.productId);
    const businessName = AppState.getSetting('businessName', 'Toko');

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>WO ${wo.woNo}</title>
      <style>
        body { font-family: sans-serif; font-size: 12px; padding: 20px; }
        h2 { text-align: center; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 4px 8px; }
        .right { text-align: right; }
      </style></head><body>
        <h2>Work Order</h2>
        <p><strong>${Utils.escapeHtml(businessName)}</strong></p>
        <p>WO No: ${Utils.escapeHtml(wo.woNo)}<br>Tanggal: ${Utils.formatDate(wo.startDate)}</p>
        <p>Produk: ${prod ? Utils.escapeHtml(prod.name) : '-'}</p>
        <table>
          <tr><td>Target Produksi</td><td class="right">${wo.plannedQty}</td></tr>
          <tr><td>Hasil Aktual</td><td class="right">${wo.actualQty ?? '-'}</td></tr>
          <tr><td>Reject</td><td class="right">${wo.defectQty ?? '-'}</td></tr>
          <tr><td>Status</td><td>${wo.status}</td></tr>
          <tr><td>Selesai</td><td>${wo.endDate ? Utils.formatDate(wo.endDate) : '-'}</td></tr>
        </table>
        ${wo.notes ? `<p>Catatan: ${Utils.escapeHtml(wo.notes)}</p>` : ''}
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

  return { init, destroy };
})();