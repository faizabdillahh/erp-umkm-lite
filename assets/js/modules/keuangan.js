/* ============================================================
   KEUANGAN.JS — Modul Keuangan Lengkap
   ============================================================ */
'use strict';

const KeuanganModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container   = null;
  let _currentTab  = 'expenses'; // expenses | incomes | report | cashflow | neraca | assets
  let _expenses    = [];
  let _incomes     = [];
  let _sales       = [];
  let _saleItems   = [];
  let _purchases   = [];
  let _products    = [];
  let _assets      = [];

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
      const [expenses, incomes, sales, saleItems, purchases, products, assets] = await Promise.all([
        DB.getAll('expenses'),
        DB.getAll('incomes'),
        DB.getAll('sales'),
        DB.getAll('sale_items'),
        DB.getAll('purchases'),
        DB.getAll('products'),
        DB.getAll('assets'),
      ]);
      _expenses  = expenses;
      _incomes   = incomes;
      _sales     = sales.filter(s => s.status !== 'void');
      _saleItems = saleItems;
      _purchases = purchases;
      _products  = products;
      _assets    = assets;
    } catch (error) {
      console.error('[KeuanganModule] Gagal memuat data:', error);
      _expenses  = [];
      _incomes   = [];
      _sales     = [];
      _saleItems = [];
      _purchases = [];
      _products  = [];
      _assets    = [];
    }
  }

  // ─── Render ──────────────────────────────────────────────────
  function _render() {
    if (!_container) return;

    _container.innerHTML = `
      <div class="master-data">
        <div class="master-data__header">
          <h1 class="dashboard__title">Keuangan</h1>
          <div class="master-data__tabs">
            <button class="btn ${_currentTab === 'expenses' ? 'btn--primary' : 'btn--ghost'}" data-tab="expenses">
              💸 Pengeluaran
            </button>
            <button class="btn ${_currentTab === 'incomes' ? 'btn--primary' : 'btn--ghost'}" data-tab="incomes">
              💰 Pemasukan
            </button>
            <button class="btn ${_currentTab === 'report' ? 'btn--primary' : 'btn--ghost'}" data-tab="report">
              📊 Laba Rugi
            </button>
            <button class="btn ${_currentTab === 'cashflow' ? 'btn--primary' : 'btn--ghost'}" data-tab="cashflow">
              📈 Arus Kas
            </button>
            <button class="btn ${_currentTab === 'neraca' ? 'btn--primary' : 'btn--ghost'}" data-tab="neraca">
              ⚖️ Neraca
            </button>
            <button class="btn ${_currentTab === 'assets' ? 'btn--primary' : 'btn--ghost'}" data-tab="assets">
              🏗️ Aset
            </button>
          </div>
        </div>
        <div id="keuangan-content"></div>
      </div>
    `;

    _renderContent();
  }

  function _renderContent() {
    const contentEl = document.getElementById('keuangan-content');
    if (!contentEl) return;

    if (_currentTab === 'expenses') {
      _renderExpenseView(contentEl);
    } else if (_currentTab === 'incomes') {
      _renderIncomeView(contentEl);
    } else if (_currentTab === 'report') {
      _renderReportView(contentEl);
    } else if (_currentTab === 'cashflow') {
      _renderCashFlowView(contentEl);
    } else if (_currentTab === 'neraca') {
      _renderNeracaView(contentEl);
    } else if (_currentTab === 'assets') {
      _renderAssetView(contentEl);
    }
  }

  // ─── View: Pengeluaran ──────────────────────────────────────
  function _renderExpenseView(container) {
    const categoryOptions = [
      { value: 'COGS', label: 'COGS (HPP)' },
      { value: 'OPEX', label: 'OPEX (Operasional)' },
      { value: 'CAPEX', label: 'CAPEX (Aset)' },
      { value: 'other', label: 'Lain-lain' },
    ];

    const subcategories = {
      COGS: ['bahan_baku', 'packaging', 'ongkir_beli'],
      OPEX: ['gaji', 'sewa', 'listrik', 'internet', 'maintenance', 'iklan', 'transport', 'lainnya'],
      CAPEX: ['peralatan', 'kendaraan', 'renovasi'],
      other: ['donasi', 'denda', 'bank', 'lainnya'],
    };

    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__header">
          <h3 class="card__title">Catat Pengeluaran</h3>
        </div>
        <div class="card__body">
          <form id="expense-form" autocomplete="off">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
              <div class="form-group">
                <label for="exp-date">Tanggal <span class="required">*</span></label>
                <input type="date" id="exp-date" name="date" required value="${new Date().toISOString().slice(0,10)}">
              </div>
              <div class="form-group">
                <label for="exp-amount">Jumlah (Rp) <span class="required">*</span></label>
                <input type="number" id="exp-amount" name="amount" min="0" step="1000" required placeholder="0">
              </div>
              <div class="form-group">
                <label for="exp-category">Kategori <span class="required">*</span></label>
                <select id="exp-category" name="category" required>
                  <option value="">-- Pilih --</option>
                  ${categoryOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="exp-subcategory">Sub Kategori</label>
                <select id="exp-subcategory" name="subcategory">
                  <option value="">-- Pilih --</option>
                </select>
              </div>
              <div class="form-group" style="grid-column: span 2;">
                <label for="exp-desc">Deskripsi</label>
                <input type="text" id="exp-desc" name="description" maxlength="300" placeholder="Keterangan pengeluaran">
              </div>
            </div>
            <button type="submit" class="btn btn--primary mt-4">💾 Simpan Pengeluaran</button>
          </form>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Riwayat Pengeluaran — ${_expenses.length} catatan</caption>
          <thead>
            <tr>
              <th scope="col">Tanggal</th>
              <th scope="col">Kategori</th>
              <th scope="col">Deskripsi</th>
              <th scope="col" style="text-align:right;">Jumlah</th>
              <th scope="col" style="width:80px;">Aksi</th>
            </tr>
          </thead>
          <tbody id="expense-tbody">
            ${_expenses.length === 0 ? `<tr><td colspan="5" class="text-muted text-center">Belum ada pengeluaran.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    // Simpan subkategori untuk digunakan event
    window._subcategories = subcategories;

    if (_expenses.length > 0) _renderExpenseRows();

    // Event untuk update subkategori saat kategori berubah
    const catSelect = document.getElementById('exp-category');
    const subSelect = document.getElementById('exp-subcategory');
    if (catSelect && subSelect) {
      catSelect.addEventListener('change', () => {
        const cat = catSelect.value;
        const subs = subcategories[cat] || [];
        subSelect.innerHTML = `<option value="">-- Pilih --</option>` + subs.map(s => `<option value="${s}">${s.replace(/_/g, ' ')}</option>`).join('');
      });
    }
  }

  function _renderExpenseRows() {
    const tbody = document.getElementById('expense-tbody');
    if (!tbody) return;

    const catLabels = { COGS: 'COGS', OPEX: 'OPEX', CAPEX: 'CAPEX', other: 'Lain' };
    const fragment = document.createDocumentFragment();
    _expenses
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach(exp => {
        const tr = document.createElement('tr');
        tr.dataset.id = exp.id;
        tr.innerHTML = `
          <td>${Utils.formatDate(exp.date)}</td>
          <td><span class="badge badge--info">${catLabels[exp.category] || exp.category}</span> ${exp.subcategory || ''}</td>
          <td>${Utils.escapeHtml(exp.description || '-')}</td>
          <td class="text-right font-mono">${Utils.formatIDR(exp.amount)}</td>
          <td>
            <button class="btn btn--sm btn--ghost" data-action="delete-expense" aria-label="Hapus">🗑️</button>
          </td>
        `;
        fragment.appendChild(tr);
      });
    tbody.replaceChildren(fragment);
  }

  // ─── View: Pemasukan Non-Penjualan ──────────────────────────
  function _renderIncomeView(container) {
    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__header">
          <h3 class="card__title">Catat Pemasukan Non-Penjualan</h3>
        </div>
        <div class="card__body">
          <form id="income-form" autocomplete="off">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
              <div class="form-group">
                <label for="inc-date">Tanggal <span class="required">*</span></label>
                <input type="date" id="inc-date" name="date" required value="${new Date().toISOString().slice(0,10)}">
              </div>
              <div class="form-group">
                <label for="inc-amount">Jumlah (Rp) <span class="required">*</span></label>
                <input type="number" id="inc-amount" name="amount" min="0" step="1000" required placeholder="0">
              </div>
              <div class="form-group">
                <label for="inc-source">Sumber</label>
                <select id="inc-source" name="source">
                  <option value="investasi">Investasi / Modal</option>
                  <option value="pinjaman">Pinjaman</option>
                  <option value="penjualan_aset">Penjualan Aset</option>
                  <option value="lainnya">Lain-lain</option>
                </select>
              </div>
              <div class="form-group">
                <label for="inc-desc">Deskripsi</label>
                <input type="text" id="inc-desc" name="description" maxlength="300" placeholder="Keterangan">
              </div>
            </div>
            <button type="submit" class="btn btn--primary mt-4">💾 Simpan Pemasukan</button>
          </form>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Riwayat Pemasukan — ${_incomes.length} catatan</caption>
          <thead>
            <tr>
              <th scope="col">Tanggal</th>
              <th scope="col">Sumber</th>
              <th scope="col">Deskripsi</th>
              <th scope="col" style="text-align:right;">Jumlah</th>
              <th scope="col" style="width:80px;">Aksi</th>
            </tr>
          </thead>
          <tbody id="income-tbody">
            ${_incomes.length === 0 ? `<tr><td colspan="5" class="text-muted text-center">Belum ada pemasukan.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (_incomes.length > 0) _renderIncomeRows();
  }

  function _renderIncomeRows() {
    const tbody = document.getElementById('income-tbody');
    if (!tbody) return;

    const fragment = document.createDocumentFragment();
    _incomes
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach(inc => {
        const tr = document.createElement('tr');
        tr.dataset.id = inc.id;
        tr.innerHTML = `
          <td>${Utils.formatDate(inc.date)}</td>
          <td>${Utils.escapeHtml(inc.source || '-')}</td>
          <td>${Utils.escapeHtml(inc.description || '-')}</td>
          <td class="text-right font-mono" style="color:var(--color-success);">${Utils.formatIDR(inc.amount)}</td>
          <td>
            <button class="btn btn--sm btn--ghost" data-action="delete-income" aria-label="Hapus">🗑️</button>
          </td>
        `;
        fragment.appendChild(tr);
      });
    tbody.replaceChildren(fragment);
  }

  // ─── View: Laporan Laba Rugi ────────────────────────────────
  function _renderReportView(container) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const salesInPeriod = _sales.filter(s => s.date >= startDate && s.date <= endDate);
    const omzet = salesInPeriod.reduce((sum, s) => sum + s.total, 0);

    const saleIds = salesInPeriod.map(s => s.id);
    const itemsInPeriod = _saleItems.filter(si => saleIds.includes(si.saleId));
    const hpp = itemsInPeriod.reduce((sum, si) => sum + ((si.costPrice ?? 0) * si.qty), 0);

    const labaKotor = omzet - hpp;

    const opexInPeriod = _expenses.filter(e => e.date >= startDate && e.date <= endDate && e.category === 'OPEX');
    const totalOPEX = opexInPeriod.reduce((sum, e) => sum + e.amount, 0);

    const otherExpenses = _expenses.filter(e => e.date >= startDate && e.date <= endDate && e.category !== 'OPEX');
    const totalOther = otherExpenses.reduce((sum, e) => sum + e.amount, 0);

    const pendapatanLain = _incomes.filter(inc => inc.date >= startDate && inc.date <= endDate)
      .reduce((sum, inc) => sum + inc.amount, 0);

    const labaBersih = labaKotor - totalOPEX - totalOther + pendapatanLain;

    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__header">
          <h3 class="card__title">Laporan Laba Rugi — Bulan Ini (${new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })})</h3>
        </div>
        <div class="card__body">
          <div class="detail-list" style="font-size:var(--font-size-base);">
            <dt>PENDAPATAN</dt><dd></dd>
            <dt>Omzet Penjualan</dt>
            <dd class="text-right font-mono">${Utils.formatIDR(omzet)}</dd>
            <dt>Pendapatan Lain-lain</dt>
            <dd class="text-right font-mono">${Utils.formatIDR(pendapatanLain)}</dd>
            <dt style="font-weight:700;">Total Pendapatan</dt>
            <dd class="text-right font-mono" style="font-weight:700;">${Utils.formatIDR(omzet + pendapatanLain)}</dd>
          </div>
          <hr style="margin:var(--space-4) 0; border-color:var(--color-border);">
          <div class="detail-list">
            <dt>HPP</dt><dd></dd>
            <dt>Total HPP</dt>
            <dd class="text-right font-mono">(${Utils.formatIDR(hpp)})</dd>
          </div>
          <div class="detail-list" style="margin-top:var(--space-2);">
            <dt style="font-weight:700;">LABA KOTOR</dt>
            <dd class="text-right font-mono" style="font-weight:700; font-size:var(--font-size-lg);">${Utils.formatIDR(labaKotor)}</dd>
            <dt>Margin Kotor</dt>
            <dd class="text-right">${omzet > 0 ? ((labaKotor / omzet) * 100).toFixed(1) : 0}%</dd>
          </div>
          <hr style="margin:var(--space-4) 0; border-color:var(--color-border);">
          <div class="detail-list">
            <dt>BEBAN OPERASIONAL (OPEX)</dt><dd></dd>
            ${opexInPeriod.length === 0 ? '<dt colspan="2" class="text-muted">Tidak ada beban</dt>' : ''}
            ${_groupedExpenses(opexInPeriod).map(([sub, amount]) => `
              <dt>${Utils.escapeHtml(sub.replace(/_/g, ' '))}</dt>
              <dd class="text-right font-mono">(${Utils.formatIDR(amount)})</dd>
            `).join('')}
            <dt style="font-weight:700;">Total OPEX</dt>
            <dd class="text-right font-mono" style="font-weight:700;">(${Utils.formatIDR(totalOPEX)})</dd>
          </div>
          <div class="detail-list" style="margin-top:var(--space-2);">
            <dt>BEBAN LAIN-LAIN</dt>
            <dd class="text-right font-mono">(${Utils.formatIDR(totalOther)})</dd>
          </div>
          <hr style="margin:var(--space-4) 0; border-color:var(--color-border);">
          <div class="detail-list">
            <dt style="font-weight:700; font-size:var(--font-size-xl);">LABA BERSIH</dt>
            <dd class="text-right font-mono" style="font-weight:700; font-size:var(--font-size-xl); color:${labaBersih >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">
              ${Utils.formatIDR(labaBersih)}
            </dd>
            <dt>Margin Bersih</dt>
            <dd class="text-right">${omzet > 0 ? ((labaBersih / omzet) * 100).toFixed(1) : 0}%</dd>
          </div>
        </div>
      </div>
    `;
  }

  // ─── View: Arus Kas ─────────────────────────────────────────
  function _renderCashFlowView(container) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const salesPeriod = _sales.filter(s => s.date >= start && s.date <= end);
    const penerimaan = salesPeriod.reduce((s, sale) => s + (sale.paidAmount ?? sale.total), 0);

    const pembayaranSupplier = _purchases
      .filter(p => p.date >= start && p.date <= end && p.paymentStatus === 'paid')
      .reduce((s, p) => s + p.totalAmount, 0);

    const opex = _expenses.filter(e => e.date >= start && e.date <= end && e.category === 'OPEX')
      .reduce((s, e) => s + e.amount, 0);

    const cogs = _expenses.filter(e => e.date >= start && e.date <= end && e.category === 'COGS')
      .reduce((s, e) => s + e.amount, 0);

    const investasiAset = _expenses.filter(e => e.date >= start && e.date <= end && e.category === 'CAPEX')
      .reduce((s, e) => s + e.amount, 0);

    const pendanaanMasuk = _incomes.filter(i => i.date >= start && i.date <= end && (i.source === 'investasi' || i.source === 'pinjaman'))
      .reduce((s, i) => s + i.amount, 0);

    const pendanaanKeluar = 0; // Pembayaran pinjaman belum dicatat terpisah

    const netOperasional = penerimaan - cogs - opex - pembayaranSupplier;
    const netInvestasi   = -investasiAset;
    const netPendanaan   = pendanaanMasuk - pendanaanKeluar;

    const saldoAwal = 0; // Dapat dihitung dari akumulasi kas masuk bersih sebelumnya
    const saldoAkhir = saldoAwal + netOperasional + netInvestasi + netPendanaan;

    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__header">
          <h3 class="card__title">Laporan Arus Kas — Bulan Ini</h3>
        </div>
        <div class="card__body">
          <div class="detail-list" style="font-size:var(--font-size-base);">
            <dt style="font-weight:700;">ARUS KAS OPERASIONAL</dt><dd></dd>
            <dt>Penerimaan dari Penjualan</dt>
            <dd class="text-right font-mono">${Utils.formatIDR(penerimaan)}</dd>
            <dt>Pembayaran ke Supplier</dt>
            <dd class="text-right font-mono">(${Utils.formatIDR(pembayaranSupplier)})</dd>
            <dt>Pembayaran Biaya COGS</dt>
            <dd class="text-right font-mono">(${Utils.formatIDR(cogs)})</dd>
            <dt>Pembayaran Biaya OPEX</dt>
            <dd class="text-right font-mono">(${Utils.formatIDR(opex)})</dd>
            <dt style="font-weight:700;">Net Kas Operasional</dt>
            <dd class="text-right font-mono" style="font-weight:700;">${Utils.formatIDR(netOperasional)}</dd>
          </div>
          <hr style="margin:var(--space-4) 0; border-color:var(--color-border);">
          <div class="detail-list">
            <dt style="font-weight:700;">ARUS KAS INVESTASI</dt><dd></dd>
            <dt>Pembelian Aset Tetap</dt>
            <dd class="text-right font-mono">(${Utils.formatIDR(investasiAset)})</dd>
            <dt style="font-weight:700;">Net Kas Investasi</dt>
            <dd class="text-right font-mono" style="font-weight:700;">${Utils.formatIDR(netInvestasi)}</dd>
          </div>
          <hr style="margin:var(--space-4) 0; border-color:var(--color-border);">
          <div class="detail-list">
            <dt style="font-weight:700;">ARUS KAS PENDANAAN</dt><dd></dd>
            <dt>Penerimaan Modal / Pinjaman</dt>
            <dd class="text-right font-mono">${Utils.formatIDR(pendanaanMasuk)}</dd>
            <dt>Pembayaran Pokok Pinjaman</dt>
            <dd class="text-right font-mono">(${Utils.formatIDR(pendanaanKeluar)})</dd>
            <dt style="font-weight:700;">Net Kas Pendanaan</dt>
            <dd class="text-right font-mono" style="font-weight:700;">${Utils.formatIDR(netPendanaan)}</dd>
          </div>
          <hr style="margin:var(--space-4) 0; border-color:var(--color-border);">
          <div class="detail-list">
            <dt>Kenaikan (Penurunan) Kas</dt>
            <dd class="text-right font-mono">${Utils.formatIDR(saldoAkhir - saldoAwal)}</dd>
            <dt>Saldo Awal</dt>
            <dd class="text-right font-mono">${Utils.formatIDR(saldoAwal)}</dd>
            <dt style="font-weight:700; font-size:var(--font-size-xl);">SALDO AKHIR KAS</dt>
            <dd class="text-right font-mono" style="font-weight:700; font-size:var(--font-size-xl); color:${saldoAkhir >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}">
              ${Utils.formatIDR(saldoAkhir)}
            </dd>
          </div>
        </div>
      </div>
    `;
  }

  // ─── View: Neraca ───────────────────────────────────────────
  function _renderNeracaView(container) {
    // Kas & Bank (sederhana: penerimaan total - pengeluaran total)
    const totalPenerimaan = _incomes.reduce((s, i) => s + i.amount, 0)
      + _sales.reduce((s, sale) => s + (sale.paidAmount ?? sale.total), 0);
    const totalPengeluaran = _expenses.reduce((s, e) => s + e.amount, 0)
      + _purchases.filter(p => p.paymentStatus === 'paid').reduce((s, p) => s + p.totalAmount, 0);
    const kas = totalPenerimaan - totalPengeluaran;

    // Piutang usaha (penjualan kredit yang belum lunas)
    const piutang = _sales
      .filter(s => s.paymentMethod === 'credit' && s.status === 'partial')
      .reduce((s, sale) => s + (sale.total - (sale.paidAmount ?? 0)), 0);

    // Persediaan (nilai stok saat ini)
    const persediaan = _products.reduce((sum, p) => sum + ((p.currentStock ?? 0) * (p.costPrice ?? 0)), 0);

    const totalAsetLancar = kas + piutang + persediaan;

    // Aset Tetap (nilai buku setelah penyusutan)
    const totalAsetTetap = _assets.reduce((sum, a) => {
      const monthsSincePurchase = a.purchaseDate
        ? Math.floor((Date.now() - new Date(a.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
        : 0;
      const maxMonths = (a.usefulLife ?? 5) * 12;
      const totalDep = (a.depreciation ?? 0) * Math.min(monthsSincePurchase, maxMonths);
      const bookValue = Math.max(a.residualValue ?? 0, (a.purchasePrice ?? 0) - totalDep);
      return sum + bookValue;
    }, 0);

    const totalAset = totalAsetLancar + totalAsetTetap;

    // Utang dagang
    const utang = _purchases
      .filter(p => p.paymentStatus === 'unpaid' || p.paymentStatus === 'partial')
      .reduce((s, p) => s + (p.totalAmount - (p.paidAmount ?? 0)), 0);

    const totalKewajiban = utang;

    // Ekuitas
    const modal = _incomes.filter(i => i.source === 'investasi').reduce((s, i) => s + i.amount, 0);
    // Laba ditahan dihitung akumulasi laba/rugi (disederhanakan = 0 untuk versi ini)
    const labaDitahan = 0;
    const totalEkuitas = modal + labaDitahan;

    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__header">
          <h3 class="card__title">Neraca — Posisi Saat Ini</h3>
        </div>
        <div class="card__body">
          <div class="detail-list" style="font-size:var(--font-size-base);">
            <dt style="font-weight:700;">ASET</dt><dd></dd>
            <dt style="font-weight:600;">Aset Lancar</dt><dd></dd>
            <dt>Kas & Bank</dt>
            <dd class="text-right font-mono">${Utils.formatIDR(kas)}</dd>
            <dt>Piutang Usaha</dt>
            <dd class="text-right font-mono">${Utils.formatIDR(piutang)}</dd>
            <dt>Persediaan</dt>
            <dd class="text-right font-mono">${Utils.formatIDR(persediaan)}</dd>
            <dt style="font-weight:600;">Total Aset Lancar</dt>
            <dd class="text-right font-mono" style="font-weight:600;">${Utils.formatIDR(totalAsetLancar)}</dd>
            <dt style="font-weight:600;">Aset Tetap (Neto)</dt>
            <dd class="text-right font-mono">${Utils.formatIDR(totalAsetTetap)}</dd>
            <dt style="font-weight:700; font-size:var(--font-size-lg);">TOTAL ASET</dt>
            <dd class="text-right font-mono" style="font-weight:700; font-size:var(--font-size-lg);">${Utils.formatIDR(totalAset)}</dd>
          </div>
          <hr style="margin:var(--space-4) 0; border-color:var(--color-border);">
          <div class="detail-list">
            <dt style="font-weight:700;">KEWAJIBAN & EKUITAS</dt><dd></dd>
            <dt style="font-weight:600;">Kewajiban Lancar</dt><dd></dd>
            <dt>Utang Dagang</dt>
            <dd class="text-right font-mono">${Utils.formatIDR(utang)}</dd>
            <dt style="font-weight:600;">Total Kewajiban</dt>
            <dd class="text-right font-mono" style="font-weight:600;">${Utils.formatIDR(totalKewajiban)}</dd>
            <dt style="font-weight:600;">Ekuitas</dt><dd></dd>
            <dt>Modal Pemilik</dt>
            <dd class="text-right font-mono">${Utils.formatIDR(modal)}</dd>
            <dt>Laba Ditahan</dt>
            <dd class="text-right font-mono">${Utils.formatIDR(labaDitahan)}</dd>
            <dt style="font-weight:600;">Total Ekuitas</dt>
            <dd class="text-right font-mono" style="font-weight:600;">${Utils.formatIDR(totalEkuitas)}</dd>
            <dt style="font-weight:700; font-size:var(--font-size-lg);">TOTAL KEWAJIBAN + EKUITAS</dt>
            <dd class="text-right font-mono" style="font-weight:700; font-size:var(--font-size-lg);">${Utils.formatIDR(totalKewajiban + totalEkuitas)}</dd>
          </div>
        </div>
      </div>
    `;
  }

  // ─── View: Aset & Penyusutan ────────────────────────────────
  function _renderAssetView(container) {
    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__header">
          <h3 class="card__title">Tambah Aset</h3>
        </div>
        <div class="card__body">
          <form id="asset-form" autocomplete="off">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
              <div class="form-group">
                <label for="ast-name">Nama Aset <span class="required">*</span></label>
                <input type="text" id="ast-name" name="name" required maxlength="200" placeholder="Nama aset">
              </div>
              <div class="form-group">
                <label for="ast-type">Tipe</label>
                <select id="ast-type" name="type">
                  <option value="tangible">Berwujud (Tangible)</option>
                  <option value="intangible">Tak Berwujud (Intangible)</option>
                </select>
              </div>
              <div class="form-group">
                <label for="ast-price">Harga Perolehan (Rp) <span class="required">*</span></label>
                <input type="number" id="ast-price" name="purchasePrice" min="0" step="1000" required placeholder="0">
              </div>
              <div class="form-group">
                <label for="ast-life">Masa Manfaat (tahun)</label>
                <input type="number" id="ast-life" name="usefulLife" min="1" step="1" value="5" placeholder="5">
              </div>
              <div class="form-group">
                <label for="ast-residual">Nilai Sisa (Rp)</label>
                <input type="number" id="ast-residual" name="residualValue" min="0" step="1000" value="0" placeholder="0">
              </div>
              <div class="form-group">
                <label for="ast-date">Tanggal Beli</label>
                <input type="date" id="ast-date" name="purchaseDate" value="${new Date().toISOString().slice(0,10)}">
              </div>
            </div>
            <button type="submit" class="btn btn--primary mt-4">💾 Simpan Aset</button>
          </form>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Daftar Aset — ${_assets.length} aset</caption>
          <thead>
            <tr>
              <th scope="col">Nama</th>
              <th scope="col">Tipe</th>
              <th scope="col" style="text-align:right;">Harga</th>
              <th scope="col" style="text-align:right;">Penyusutan/bln</th>
              <th scope="col" style="text-align:right;">Nilai Buku</th>
              <th scope="col" style="width:80px;">Aksi</th>
            </tr>
          </thead>
          <tbody id="asset-tbody">
            ${_assets.length === 0 ? `<tr><td colspan="6" class="text-muted text-center">Belum ada aset.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (_assets.length > 0) _renderAssetRows();
  }

  function _renderAssetRows() {
    const tbody = document.getElementById('asset-tbody');
    if (!tbody) return;

    const fragment = document.createDocumentFragment();
    _assets
      .sort((a, b) => new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0))
      .forEach(a => {
        const monthsSincePurchase = a.purchaseDate
          ? Math.floor((Date.now() - new Date(a.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
          : 0;
        const maxMonths = (a.usefulLife ?? 5) * 12;
        const totalDep = (a.depreciation ?? 0) * Math.min(monthsSincePurchase, maxMonths);
        const bookValue = Math.max(a.residualValue ?? 0, (a.purchasePrice ?? 0) - totalDep);

        const tr = document.createElement('tr');
        tr.dataset.id = a.id;
        tr.innerHTML = `
          <td><strong>${Utils.escapeHtml(a.name)}</strong></td>
          <td>${a.type === 'tangible' ? 'Berwujud' : 'Tak Berwujud'}</td>
          <td class="text-right font-mono">${Utils.formatIDR(a.purchasePrice)}</td>
          <td class="text-right font-mono">${Utils.formatIDR(a.depreciation)}</td>
          <td class="text-right font-mono" style="color:${bookValue >= 0 ? 'var(--color-text)' : 'var(--color-danger)'}">
            ${Utils.formatIDR(bookValue)}
          </td>
          <td>
            <button class="btn btn--sm btn--ghost" data-action="delete-asset" aria-label="Hapus aset">🗑️</button>
          </td>
        `;
        fragment.appendChild(tr);
      });
    tbody.replaceChildren(fragment);
  }

  // ─── Helper ──────────────────────────────────────────────────
  function _groupedExpenses(expenses) {
    const map = {};
    expenses.forEach(e => {
      const key = e.subcategory || 'lainnya';
      map[key] = (map[key] || 0) + e.amount;
    });
    return Object.entries(map);
  }

  // ─── Events ──────────────────────────────────────────────────
  function _bindEvents() {
    if (!_container) return;

    _container.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) {
        _currentTab = tabBtn.dataset.tab;
        _render();
        return;
      }

      // Delete expense
      const delExp = e.target.closest('[data-action="delete-expense"]');
      if (delExp) {
        const tr = delExp.closest('tr');
        const id = Number(tr?.dataset.id);
        if (id && confirm('Hapus pengeluaran ini?')) _deleteExpense(id);
        return;
      }

      // Delete income
      const delInc = e.target.closest('[data-action="delete-income"]');
      if (delInc) {
        const tr = delInc.closest('tr');
        const id = Number(tr?.dataset.id);
        if (id && confirm('Hapus pemasukan ini?')) _deleteIncome(id);
        return;
      }

      // Delete asset
      const delAst = e.target.closest('[data-action="delete-asset"]');
      if (delAst) {
        const tr = delAst.closest('tr');
        const id = Number(tr?.dataset.id);
        if (id && confirm('Hapus aset ini?')) _deleteAsset(id);
        return;
      }
    });

    _container.addEventListener('submit', (e) => {
      if (e.target.id === 'expense-form') {
        e.preventDefault();
        _saveExpense(new FormData(e.target));
      }
      if (e.target.id === 'income-form') {
        e.preventDefault();
        _saveIncome(new FormData(e.target));
      }
      if (e.target.id === 'asset-form') {
        e.preventDefault();
        _saveAsset(new FormData(e.target));
      }
    });
  }

  // ─── Actions ─────────────────────────────────────────────────
  async function _saveExpense(formData) {
    const data = {
      date        : new Date(formData.get('date') || Date.now()).toISOString(),
      category    : formData.get('category'),
      subcategory : formData.get('subcategory') || '',
      description : String(formData.get('description') ?? '').trim(),
      amount      : Utils.sanitizeNumber(formData.get('amount')),
      paymentMethod: 'cash',
      supplierId  : null,
      refId       : null,
      createdAt   : new Date().toISOString(),
    };

    if (!data.category) { alert('Kategori wajib dipilih.'); return; }
    if (data.amount <= 0) { alert('Jumlah harus lebih dari 0.'); return; }

    try {
      await DB.add('expenses', data);
      await _loadData();
      _renderContent();
      EventBus.emit('finance:changed');
    } catch (error) {
      console.error('[KeuanganModule] Gagal simpan pengeluaran:', error);
      alert('Gagal menyimpan pengeluaran.');
    }
  }

  async function _saveIncome(formData) {
    const data = {
      date        : new Date(formData.get('date') || Date.now()).toISOString(),
      source      : formData.get('source') || 'lainnya',
      description : String(formData.get('description') ?? '').trim(),
      amount      : Utils.sanitizeNumber(formData.get('amount')),
      createdAt   : new Date().toISOString(),
    };

    if (data.amount <= 0) { alert('Jumlah harus lebih dari 0.'); return; }

    try {
      await DB.add('incomes', data);
      await _loadData();
      _renderContent();
      EventBus.emit('finance:changed');
    } catch (error) {
      console.error('[KeuanganModule] Gagal simpan pemasukan:', error);
      alert('Gagal menyimpan pemasukan.');
    }
  }

  async function _saveAsset(formData) {
    const purchasePrice = Utils.sanitizeNumber(formData.get('purchasePrice'));
    const residualValue = Utils.sanitizeNumber(formData.get('residualValue'));
    const usefulLife = Math.max(1, parseInt(formData.get('usefulLife')) || 5);

    // Hitung penyusutan per bulan (metode garis lurus)
    const monthlyDep = (purchasePrice - residualValue) / (usefulLife * 12);

    const data = {
      name          : String(formData.get('name') ?? '').trim(),
      type          : formData.get('type') || 'tangible',
      purchaseDate  : formData.get('purchaseDate')
        ? new Date(formData.get('purchaseDate')).toISOString()
        : new Date().toISOString(),
      purchasePrice,
      usefulLife,
      residualValue,
      bookValue     : purchasePrice, // Nilai buku awal = harga perolehan
      depreciation  : monthlyDep,     // Penyusutan per bulan
      createdAt     : new Date().toISOString(),
    };

    if (!data.name) { alert('Nama aset wajib diisi.'); return; }
    if (data.purchasePrice <= 0) { alert('Harga perolehan harus lebih dari 0.'); return; }

    try {
      await DB.add('assets', data);
      await _loadData();
      _renderContent();
      EventBus.emit('finance:changed');
    } catch (error) {
      console.error('[KeuanganModule] Gagal simpan aset:', error);
      alert('Gagal menyimpan aset.');
    }
  }

  async function _deleteExpense(id) {
    try {
      await DB.delete('expenses', id);
      _expenses = _expenses.filter(e => e.id !== id);
      _renderExpenseRows();
      EventBus.emit('finance:changed');
    } catch (error) {
      console.error('[KeuanganModule] Gagal hapus pengeluaran:', error);
      alert('Gagal menghapus pengeluaran.');
    }
  }

  async function _deleteIncome(id) {
    try {
      await DB.delete('incomes', id);
      _incomes = _incomes.filter(i => i.id !== id);
      _renderIncomeRows();
      EventBus.emit('finance:changed');
    } catch (error) {
      console.error('[KeuanganModule] Gagal hapus pemasukan:', error);
      alert('Gagal menghapus pemasukan.');
    }
  }

  async function _deleteAsset(id) {
    try {
      await DB.delete('assets', id);
      _assets = _assets.filter(a => a.id !== id);
      _renderAssetRows();
      EventBus.emit('finance:changed');
    } catch (error) {
      console.error('[KeuanganModule] Gagal hapus aset:', error);
      alert('Gagal menghapus aset.');
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