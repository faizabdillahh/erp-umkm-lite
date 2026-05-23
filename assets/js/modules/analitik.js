/* ============================================================
   ANALITIK.JS — Modul Analitik & Forecasting
   ============================================================ */
'use strict';

const AnalitikModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container   = null;
  let _currentTab  = 'profitability'; // 'profitability' | 'sales' | 'costs' | 'forecast'
  let _products    = [];
  let _sales       = [];
  let _saleItems   = [];
  let _expenses    = [];
  let _categories  = [];

  // ─── Init ────────────────────────────────────────────────────
  async function init(container) {
    _container = container;
    await _loadData();
    _render();
    _bindEvents();
  }

  async function _loadData() {
    try {
      const [products, sales, saleItems, expenses, categories] = await Promise.all([
        DB.getAll('products'),
        DB.getAll('sales'),
        DB.getAll('sale_items'),
        DB.getAll('expenses'),
        DB.getAll('categories'),
      ]);
      _products   = products;
      _sales      = sales.filter(s => s.status !== 'void');
      _saleItems  = saleItems;
      _expenses   = expenses;
      _categories = categories;
    } catch (error) {
      console.error('[AnalitikModule] Gagal memuat data:', error);
    }
  }

  // ─── Render ──────────────────────────────────────────────────
  function _render() {
    if (!_container) return;
    _container.innerHTML = `
      <div class="master-data">
        <div class="master-data__header">
          <h1 class="dashboard__title">Analitik</h1>
          <div class="master-data__tabs">
            <button class="btn ${_currentTab==='profitability'?'btn--primary':'btn--ghost'}" data-tab="profitability">💰 Profitabilitas</button>
            <button class="btn ${_currentTab==='sales'?'btn--primary':'btn--ghost'}" data-tab="sales">📈 Penjualan</button>
            <button class="btn ${_currentTab==='costs'?'btn--primary':'btn--ghost'}" data-tab="costs">📉 Biaya</button>
            <button class="btn ${_currentTab==='forecast'?'btn--primary':'btn--ghost'}" data-tab="forecast">🔮 Forecasting</button>
          </div>
        </div>
        <div id="analitik-content"></div>
      </div>
    `;
    _renderContent();
  }

  function _renderContent() {
    const el = document.getElementById('analitik-content');
    if (!el) return;
    if (_currentTab === 'profitability') _renderProfitability(el);
    else if (_currentTab === 'sales') _renderSalesAnalysis(el);
    else if (_currentTab === 'costs') _renderCostAnalysis(el);
    else _renderForecast(el);
  }

  // ──────────────────────────────────────────────────────────────
  //  TAB 1: PROFITABILITY PER PRODUK
  // ──────────────────────────────────────────────────────────────
  function _renderProfitability(container) {
    // Hitung revenue & profit per produk (semua waktu)
    const productMap = {};
    _products.forEach(p => { productMap[p.id] = { name: p.name, revenue: 0, cogs: 0, qty: 0 }; });
    _saleItems.forEach(si => {
      const prod = productMap[si.productId];
      if (prod) {
        prod.revenue += (si.sellPrice * si.qty);
        prod.cogs    += ((si.costPrice ?? 0) * si.qty);
        prod.qty     += si.qty;
      }
    });
    const data = Object.values(productMap).filter(p => p.qty > 0);
    data.sort((a,b) => b.revenue - a.revenue);
    const totalRevenue = data.reduce((s,p) => s + p.revenue, 0);

    container.innerHTML = `
      <div class="table-container">
        <table>
          <caption>Profitabilitas Per Produk — ${data.length} produk terjual</caption>
          <thead>
            <tr><th>Produk</th><th style="text-align:right;">Qty Terjual</th><th style="text-align:right;">Omzet</th><th style="text-align:right;">HPP</th><th style="text-align:right;">Laba</th><th style="text-align:right;">Margin</th></tr>
          </thead>
          <tbody>
            ${data.length === 0 ? `<tr><td colspan="6" class="text-muted text-center">Belum ada data penjualan.</td></tr>` : ''}
            ${data.map(p => {
              const profit = p.revenue - p.cogs;
              const margin = p.revenue > 0 ? (profit / p.revenue * 100) : 0;
              return `
                <tr>
                  <td><strong>${Utils.escapeHtml(p.name)}</strong></td>
                  <td class="text-right">${p.qty}</td>
                  <td class="text-right font-mono">${Utils.formatIDR(p.revenue)}</td>
                  <td class="text-right font-mono">${Utils.formatIDR(p.cogs)}</td>
                  <td class="text-right font-mono" style="color:${profit>=0?'var(--color-success)':'var(--color-danger)'}">${Utils.formatIDR(profit)}</td>
                  <td class="text-right">${margin.toFixed(1)}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <p class="text-muted" style="margin-top:var(--space-3);">Total Omzet Seluruh Produk: <strong>${Utils.formatIDR(totalRevenue)}</strong></p>
    `;
  }

  // ──────────────────────────────────────────────────────────────
  //  TAB 2: SALES ANALYSIS (Tren, Heatmap Sederhana)
  // ──────────────────────────────────────────────────────────────
  function _renderSalesAnalysis(container) {
    // Tren 12 bulan terakhir
    const monthly = [];
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const monthSales = _sales.filter(s => s.date >= start && s.date <= end);
      const revenue = monthSales.reduce((sum, s) => sum + s.total, 0);
      const count = monthSales.length;
      monthly.push({ month: d.toLocaleString('id-ID', { month: 'short', year: 'numeric' }), revenue, count });
    }

    // Heatmap hari & jam (disederhanakan)
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const heatmap = Array(7).fill(0);
    _sales.forEach(s => {
      const d = new Date(s.date);
      heatmap[d.getDay()]++;
    });
    const maxDay = Math.max(...heatmap, 1);

    container.innerHTML = `
      <div class="dashboard__charts" style="margin-bottom:var(--space-4);">
        <div class="chart-card">
          <div class="chart-card__header"><h3 class="chart-card__title">Tren Omzet Bulanan</h3></div>
          <div class="chart-card__body">
            <table style="width:100%;">
              <thead><tr><th>Bulan</th><th style="text-align:right;">Omzet</th><th style="text-align:right;">Transaksi</th></tr></thead>
              <tbody>
                ${monthly.map(m => `
                  <tr>
                    <td>${m.month}</td>
                    <td class="text-right font-mono">${Utils.formatIDR(m.revenue)}</td>
                    <td class="text-right">${m.count}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-card__header"><h3 class="chart-card__title">Distribusi Transaksi per Hari</h3></div>
          <div class="chart-card__body">
            <div style="display:flex; align-items:flex-end; gap:var(--space-2); height:180px;">
              ${heatmap.map((val, idx) => `
                <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:var(--space-1);">
                  <span style="font-size:var(--font-size-xs);">${val}</span>
                  <div style="width:100%; height:${(val/maxDay)*150}px; background:var(--color-primary); border-radius:var(--radius-sm) var(--radius-sm) 0 0; opacity:0.8;"></div>
                  <span style="font-size:var(--font-size-xs);">${dayNames[idx]}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ──────────────────────────────────────────────────────────────
  //  TAB 3: COST ANALYSIS
  // ──────────────────────────────────────────────────────────────
  function _renderCostAnalysis(container) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    const thisMonthExp = _expenses.filter(e => e.date >= start && e.date <= end);

    // Breakdown by category
    const catMap = {};
    thisMonthExp.forEach(e => {
      const cat = e.category || 'other';
      catMap[cat] = (catMap[cat] || 0) + e.amount;
    });
    const totalExp = thisMonthExp.reduce((s,e) => s + e.amount, 0);
    const sortedCats = Object.entries(catMap).sort((a,b) => b[1] - a[1]);

    container.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:var(--space-4);">
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--red">💸</div>
          <div class="kpi-card__body">
            <div class="kpi-card__label">Total Biaya Bulan Ini</div>
            <div class="kpi-card__value">${Utils.formatIDR(totalExp)}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--orange">📊</div>
          <div class="kpi-card__body">
            <div class="kpi-card__label">Jumlah Catatan</div>
            <div class="kpi-card__value">${thisMonthExp.length}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card__header"><h3 class="card__title">Breakdown Biaya Bulan Ini</h3></div>
        <div class="card__body">
          ${sortedCats.length === 0 ? '<p class="text-muted">Tidak ada biaya bulan ini.</p>' : ''}
          ${sortedCats.map(([cat, amount]) => `
            <div style="display:flex; align-items:center; gap:var(--space-3); margin-bottom:var(--space-2);">
              <span style="width:80px; font-weight:600;">${Utils.escapeHtml(cat)}</span>
              <div style="flex:1; height:20px; background:var(--color-bg); border-radius:var(--radius-sm); overflow:hidden;">
                <div style="width:${totalExp>0?(amount/totalExp*100):0}%; height:100%; background:var(--color-primary);"></div>
              </div>
              <span class="font-mono" style="width:120px; text-align:right;">${Utils.formatIDR(amount)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ──────────────────────────────────────────────────────────────
  //  TAB 4: FORECASTING SEDERHANA (Moving Average 3 bulan)
  // ──────────────────────────────────────────────────────────────
  function _renderForecast(container) {
    // Ambil data omzet 6 bulan terakhir
    const monthly = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const revenue = _sales.filter(s => s.date >= start && s.date <= end).reduce((s, sale) => s + sale.total, 0);
      monthly.push({ month: d.toLocaleString('id-ID', { month: 'short', year: 'numeric' }), revenue });
    }

    // Moving average 3 bulan terakhir
    const last3 = monthly.slice(-3);
    const avg3 = last3.reduce((s,m) => s + m.revenue, 0) / (last3.length || 1);
    const growth = monthly.length >= 2 ? ((monthly[monthly.length-1].revenue - monthly[monthly.length-2].revenue) / (monthly[monthly.length-2].revenue || 1)) * 100 : 0;
    const forecast = avg3 * (1 + growth/100);

    container.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:var(--space-4);">
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--blue">📈</div>
          <div class="kpi-card__body">
            <div class="kpi-card__label">Rata-rata 3 Bulan Terakhir</div>
            <div class="kpi-card__value">${Utils.formatIDR(avg3)}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--green">🚀</div>
          <div class="kpi-card__body">
            <div class="kpi-card__label">Prediksi Bulan Depan</div>
            <div class="kpi-card__value">${Utils.formatIDR(forecast)}</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-card__icon kpi-card__icon--orange">📊</div>
          <div class="kpi-card__body">
            <div class="kpi-card__label">Growth Rate (bln lalu)</div>
            <div class="kpi-card__value">${growth.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Data Historis 6 Bulan</caption>
          <thead><tr><th>Bulan</th><th style="text-align:right;">Omzet</th><th style="text-align:right;">Selisih</th></tr></thead>
          <tbody>
            ${monthly.map((m, i) => {
              const diff = i > 0 ? m.revenue - monthly[i-1].revenue : 0;
              const diffColor = diff >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
              return `
                <tr>
                  <td>${m.month}</td>
                  <td class="text-right font-mono">${Utils.formatIDR(m.revenue)}</td>
                  <td class="text-right" style="color:${diffColor};">${i>0 ? (diff>=0?'+':'') + Utils.formatIDR(diff) : '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <p class="text-muted" style="margin-top:var(--space-3);">
        * Forecasting menggunakan metode <strong>Moving Average 3 bulan</strong> disesuaikan dengan growth rate bulan terakhir.
      </p>
    `;
  }

  // ─── Events ──────────────────────────────────────────────────
  function _bindEvents() {
    if (!_container) return;
    _container.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) { _currentTab = tabBtn.dataset.tab; _render(); return; }
    });
  }

  // ─── Destroy ─────────────────────────────────────────────────
  function destroy() {
    _container?.replaceChildren();
    _container = null;
  }

  return { init, destroy };
})();