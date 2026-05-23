/* ============================================================
   DASHBOARD.JS — Modul Dashboard dengan KPI Cards Dinamis
   ============================================================ */
'use strict';

const DashboardModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container = null;
  let _period    = 'this_month'; // 'today' | '7days' | 'this_month' | 'last_month'

  // ─── Init ────────────────────────────────────────────────────
  async function init(container) {
    _container = container;
    await _render();
    _bindEvents();
  }

  // ─── Render ──────────────────────────────────────────────────
  async function _render() {
    if (!_container) return;

    // Tampilkan skeleton loading
    _container.innerHTML = _renderSkeleton();

    try {
      const kpi = await _calculateKPIs();
      _container.innerHTML = _renderDashboard(kpi);
      // Gambar grafik setelah DOM tersedia
      requestAnimationFrame(() => _drawCharts(kpi));
    } catch (error) {
      console.error('[Dashboard] Gagal menghitung KPI:', error);
      _container.innerHTML = `
        <div class="empty-state" style="min-height:60vh;">
          <div class="empty-state__icon">⚠️</div>
          <h2 class="empty-state__title">Gagal Memuat Dashboard</h2>
          <p style="color:var(--color-text-muted);">${Utils.escapeHtml(error.message)}</p>
          <button class="btn btn--primary mt-4" onclick="Router.navigate('#/')">Coba Lagi</button>
        </div>
      `;
    }
  }

  // ─── Skeleton Loading ────────────────────────────────────────
  function _renderSkeleton() {
    return `
      <div class="dashboard">
        <div class="dashboard__header">
          <h1 class="dashboard__title">Dashboard</h1>
          <div class="dashboard__period-selector">
            <span class="skeleton skeleton--button"></span>
          </div>
        </div>
        <div class="kpi-grid">
          ${Array(8).fill('<div class="card"><div class="skeleton skeleton--card"></div></div>').join('')}
        </div>
        <div class="dashboard__charts">
          <div class="card"><div class="skeleton" style="height:240px;"></div></div>
          <div class="card"><div class="skeleton" style="height:240px;"></div></div>
        </div>
      </div>
    `;
  }

  // ─── Render Dashboard dengan Data ────────────────────────────
  function _renderDashboard(kpi) {
    return `
      <div class="dashboard">
        <!-- Header -->
        <div class="dashboard__header">
          <h1 class="dashboard__title">Dashboard</h1>
          <div class="dashboard__period-selector">
            <select id="period-selector" class="input-wrapper" style="padding:var(--space-2);">
              <option value="today" ${_period === 'today' ? 'selected' : ''}>Hari Ini</option>
              <option value="7days" ${_period === '7days' ? 'selected' : ''}>7 Hari Terakhir</option>
              <option value="this_month" ${_period === 'this_month' ? 'selected' : ''}>Bulan Ini</option>
              <option value="last_month" ${_period === 'last_month' ? 'selected' : ''}>Bulan Lalu</option>
            </select>
          </div>
        </div>

        <!-- KPI Cards: Keuangan -->
        <div class="kpi-grid">
          ${_kpiCard('Omzet', kpi.revenue, 'IDR', 'green', kpi.revenueChange)}
          ${_kpiCard('Laba Bersih', kpi.netProfit, 'IDR', 'blue', kpi.netProfitChange)}
          ${_kpiCard('Kas Tersedia', kpi.cashAvailable, 'IDR', 'green')}
          ${_kpiCard('HPP Total', kpi.totalCOGS, 'IDR', 'orange')}
          ${_kpiCard('Margin Kotor', kpi.grossMarginPct, '%', 'purple')}
          ${_kpiCard('Piutang', kpi.receivables, 'IDR', 'red')}
          ${_kpiCard('Utang', kpi.payables, 'IDR', 'red')}
          ${_kpiCard('Stok Menipis', kpi.lowStockCount, 'item', 'warning')}
        </div>

        <!-- KPI Cards: Pelanggan & Bisnis -->
        <div class="kpi-grid" style="margin-top:var(--space-4);">
          ${_kpiCard('Pelanggan Baru', kpi.newCustomers, 'org', 'info')}
          ${_kpiCard('Rata-rata Order', kpi.aov, 'IDR', 'blue')}
          ${_kpiCard('BEP (Rupiah)', kpi.bepRevenue, 'IDR', 'purple')}
          ${_kpiCard('ROI', kpi.roi, '%', 'green')}
        </div>

        <!-- Grafik & Top Produk -->
        <div class="dashboard__charts" style="margin-top:var(--space-4);">
          <div class="chart-card">
            <div class="chart-card__header">
              <h3 class="chart-card__title">Tren Omzet 6 Bulan</h3>
            </div>
            <div class="chart-card__body">
              <canvas id="chart-omzet" width="400" height="240" aria-label="Grafik omzet 6 bulan terakhir"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-card__header">
              <h3 class="chart-card__title">Top 5 Produk Terlaris</h3>
            </div>
            <div class="chart-card__body">
              <canvas id="chart-top-produk" width="400" height="240" aria-label="Grafik top 5 produk terlaris"></canvas>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions" style="margin-top:var(--space-4);">
          <button class="quick-action-btn" data-nav="#/penjualan">💰 Kasir / Penjualan</button>
          <button class="quick-action-btn" data-nav="#/pembelian">📦 Pembelian Baru</button>
          <button class="quick-action-btn" data-nav="#/produk">🏷️ Kelola Produk</button>
          <button class="quick-action-btn" data-nav="#/pelanggan">👥 Tambah Pelanggan</button>
        </div>
      </div>
    `;
  }

  // ─── KPI Card HTML ──────────────────────────────────────────
  function _kpiCard(label, value, suffix, color, change = null) {
    const icons = {
      green: '💰', blue: '📊', orange: '📉', red: '⚠️', purple: '💎', warning: '🔔', info: '👥',
    };
    const formattedValue = suffix === 'IDR' ? Utils.formatIDR(value) :
                           suffix === '%' ? `${value.toFixed(1)}%` :
                           suffix === 'item' ? value :
                           `${value} ${suffix}`;

    let changeHtml = '';
    if (change !== null && change !== undefined) {
      const isUp = change >= 0;
      changeHtml = `
        <div class="kpi-card__change ${isUp ? 'kpi-card__change--up' : 'kpi-card__change--down'}">
          <span>${isUp ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%</span>
        </div>
      `;
    }

    return `
      <div class="kpi-card">
        <div class="kpi-card__icon kpi-card__icon--${color}">${icons[color] || '📌'}</div>
        <div class="kpi-card__body">
          <div class="kpi-card__label">${Utils.escapeHtml(label)}</div>
          <div class="kpi-card__value">${formattedValue}</div>
          ${changeHtml}
        </div>
      </div>
    `;
  }

  // ─── Grafik Canvas ──────────────────────────────────────────

  function _drawCharts(kpi) {
    _drawOmzetChart(kpi.monthlyRevenue);
    _drawTopProductsChart(kpi.topProducts);
  }

  function _drawOmzetChart(monthlyData) {
    const canvas = document.getElementById('chart-omzet');
    if (!canvas || !monthlyData || monthlyData.length === 0) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1);
    const barCount   = monthlyData.length;
    const barWidth   = (w - 60) / barCount - 8;
    const startX     = 40;

    // Garis dasar
    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(30, h - 25);
    ctx.lineTo(w - 10, h - 25);
    ctx.stroke();

    monthlyData.forEach((item, i) => {
      const barHeight = (item.revenue / maxRevenue) * (h - 50);
      const x = startX + i * (barWidth + 8);
      const y = h - 25 - barHeight;

      // Bar
      ctx.fillStyle = '#1a6b3c';
      ctx.fillRect(x, y, barWidth, barHeight);

      // Label nilai di atas bar (disingkat)
      ctx.fillStyle = '#212529';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'center';
      const label = item.revenue >= 1000000
        ? (item.revenue / 1000000).toFixed(1) + 'M'
        : item.revenue >= 1000
          ? (item.revenue / 1000).toFixed(0) + 'K'
          : item.revenue;
      ctx.fillText(label, x + barWidth / 2, y - 4);

      // Label bulan
      ctx.fillText(item.month, x + barWidth / 2, h - 8);
    });
  }

  function _drawTopProductsChart(topProducts) {
    const canvas = document.getElementById('chart-top-produk');
    if (!canvas || !topProducts || topProducts.length === 0) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const maxQty    = Math.max(...topProducts.map(p => p.qty), 1);
    const barHeight = (h - 40) / topProducts.length - 8;
    const startY    = 10;

    topProducts.forEach((product, i) => {
      const barWidth = (product.qty / maxQty) * (w - 130);
      const y = startY + i * (barHeight + 8);

      // Nama produk
      ctx.fillStyle = '#212529';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText(Utils.truncate(product.name, 15), 100, y + barHeight / 2 + 4);

      // Bar
      ctx.fillStyle = '#2d9455';
      ctx.fillRect(110, y, barWidth, barHeight);

      // Nilai qty
      ctx.fillStyle = '#212529';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`${product.qty} unit`, 115 + barWidth, y + barHeight / 2 + 4);
    });
  }

  // ─── Kalkulasi KPI ─────────────────────────────────────────
  async function _calculateKPIs() {
    const { startDate, endDate, prevStartDate, prevEndDate } = _getPeriodDates();

    // Ambil semua data yang diperlukan
    const [sales, saleItems, products, customers, expenses, incomes] = await Promise.all([
      DB.getAll('sales'),
      DB.getAll('sale_items'),
      DB.getAll('products'),
      DB.getAll('customers'),
      DB.getAll('expenses'),
      DB.getAll('incomes'),
    ]);

    // Filter penjualan sesuai periode
    const salesInPeriod = sales.filter(s => s.date >= startDate && s.date <= endDate && s.status !== 'void');
    const salesInPrevPeriod = sales.filter(s => s.date >= prevStartDate && s.date <= prevEndDate && s.status !== 'void');

    // Omzet
    const revenue = salesInPeriod.reduce((sum, s) => sum + (s.total ?? 0), 0);
    const prevRevenue = salesInPrevPeriod.reduce((sum, s) => sum + (s.total ?? 0), 0);

    // HPP dari sale_items yang terjual
    const allSaleItems = saleItems.filter(si => {
      const sale = sales.find(s => s.id === si.saleId);
      return sale && sale.date >= startDate && sale.date <= endDate && sale.status !== 'void';
    });
    const totalCOGS = allSaleItems.reduce((sum, si) => sum + ((si.costPrice ?? 0) * (si.qty ?? 0)), 0);

    // Laba Kotor
    const grossProfit = revenue - totalCOGS;
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    // OPEX (expenses kategori OPEX dalam periode)
    const opexInPeriod = expenses.filter(e => e.date >= startDate && e.date <= endDate && e.category === 'OPEX');
    const totalOPEX = opexInPeriod.reduce((sum, e) => sum + (e.amount ?? 0), 0);

    // Laba Bersih
    const netProfit = grossProfit - totalOPEX;
    const prevNetProfit = prevRevenue - (salesInPrevPeriod.reduce((sum, s) => {
      const items = saleItems.filter(si => si.saleId === s.id);
      return sum + items.reduce((siSum, si) => siSum + ((si.costPrice ?? 0) * (si.qty ?? 0)), 0);
    }, 0));

    // Kas Tersedia (saldo awal + pemasukan - pengeluaran)
    const totalIncome = incomes.reduce((sum, inc) => sum + (inc.amount ?? 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
    const cashFromSales = sales.filter(s => s.paymentMethod !== 'credit').reduce((sum, s) => sum + (s.total ?? 0), 0);
    const cashAvailable = totalIncome + cashFromSales - totalExpenses;

    // Piutang (sales credit yang belum lunas)
    const receivables = sales.filter(s => s.paymentMethod === 'credit' && s.status === 'partial')
      .reduce((sum, s) => sum + (s.total - (s.paidAmount ?? 0)), 0);

    // Utang (purchases dengan paymentStatus unpaid/partial)
    const purchases = await DB.getAll('purchases').catch(() => []);
    const payables = purchases.filter(p => p.paymentStatus === 'unpaid' || p.paymentStatus === 'partial')
      .reduce((sum, p) => sum + (p.totalAmount - (p.paidAmount ?? 0)), 0);

    // Stok Menipis
    const lowStockCount = products.filter(p => (p.currentStock ?? 0) <= (p.minStock ?? 0) && p.isActive).length;

    // Pelanggan Baru
    const newCustomers = customers.filter(c => c.createdAt >= startDate && c.createdAt <= endDate).length;

    // AOV
    const completedSales = salesInPeriod.filter(s => s.status === 'completed');
    const aov = completedSales.length > 0 ? revenue / completedSales.length : 0;

    // BEP (Biaya Tetap dianggap OPEX, HPP rata-rata)
    const totalQty = allSaleItems.reduce((sum, si) => sum + si.qty, 0);
    const avgSellPrice = totalQty > 0
      ? allSaleItems.reduce((sum, si) => sum + (si.sellPrice * si.qty), 0) / totalQty
      : 0;
    const avgCostPrice = totalQty > 0 ? totalCOGS / totalQty : 0;
    const bepUnit = Calc.bepUnit(totalOPEX, avgSellPrice, avgCostPrice);
    const bepRevenue = grossMarginPct > 0 ? Calc.bepRevenue(totalOPEX, grossMarginPct) : 0;

    // ROI (laba bersih / total aset)
    const inventoryValue = products.reduce((sum, p) => sum + ((p.currentStock ?? 0) * (p.costPrice ?? 0)), 0);
    const totalAssets = cashAvailable + inventoryValue;
    const roi = totalAssets > 0 ? Calc.roi(netProfit, totalAssets) : 0;

    // Growth rate
    const revenueChange = prevRevenue > 0 ? Calc.growthRate(revenue, prevRevenue) : null;
    const netProfitChange = prevNetProfit !== 0 ? Calc.growthRate(netProfit, prevNetProfit) : null;

    // Top 5 Produk
    const productSalesMap = {};
    allSaleItems.forEach(si => {
      if (!productSalesMap[si.productId]) {
        productSalesMap[si.productId] = { qty: 0, revenue: 0 };
      }
      productSalesMap[si.productId].qty += si.qty;
      productSalesMap[si.productId].revenue += (si.sellPrice * si.qty);
    });
    const topProducts = Object.entries(productSalesMap)
      .map(([id, data]) => {
        const prod = products.find(p => p.id === Number(id));
        return { name: prod?.name || 'Unknown', ...data };
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Monthly Revenue (6 bulan terakhir)
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const monthSales = sales.filter(s => s.date >= monthStart && s.date <= monthEnd && s.status !== 'void');
      monthlyRevenue.push({
        month: d.toLocaleString('id-ID', { month: 'short', year: 'numeric' }),
        revenue: monthSales.reduce((sum, s) => sum + (s.total ?? 0), 0),
      });
    }

    return {
      revenue,
      revenueChange,
      totalCOGS,
      grossProfit,
      grossMarginPct,
      totalOPEX,
      netProfit,
      netProfitChange,
      cashAvailable,
      receivables,
      payables,
      lowStockCount,
      newCustomers,
      aov,
      bepRevenue,
      roi,
      topProducts,
      monthlyRevenue,
    };
  }

  // ─── Periode ─────────────────────────────────────────────────
  function _getPeriodDates() {
    const now = new Date();
    let startDate, endDate, prevStartDate, prevEndDate;

    switch (_period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        endDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
        prevStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
        prevEndDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59).toISOString();
        break;
      case '7days':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        endDate   = now.toISOString();
        prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
        prevEndDate   = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        endDate   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
        prevStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
        prevEndDate   = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59).toISOString();
        break;
      case 'this_month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        endDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        prevEndDate   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
        break;
    }

    return { startDate, endDate, prevStartDate, prevEndDate };
  }

  // ─── Events ──────────────────────────────────────────────────
  function _bindEvents() {
    if (!_container) return;

    _container.addEventListener('change', (e) => {
      if (e.target.id === 'period-selector') {
        _period = e.target.value;
        _render();
      }
    });

    _container.addEventListener('click', (e) => {
      const navBtn = e.target.closest('[data-nav]');
      if (navBtn) {
        Router.navigate(navBtn.dataset.nav);
      }
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