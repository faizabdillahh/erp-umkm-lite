/* ============================================================
   MARKETING.JS — Modul Marketing: Kampanye, Leads, Metrik
   ============================================================ */
'use strict';

const MarketingModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container   = null;
  let _currentTab  = 'campaigns'; // 'campaigns' | 'leads' | 'metrics'
  let _campaigns   = [];
  let _leads       = [];
  let _customers   = []; // untuk menghitung CAC, conversion
  let _sales       = [];

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
      const [campaigns, leads, customers, sales] = await Promise.all([
        DB.getAll('marketing_campaigns'),
        DB.getAll('leads'),
        DB.getAll('customers'),
        DB.getAll('sales'),
      ]);
      _campaigns = campaigns;
      _leads     = leads;
      _customers = customers;
      _sales     = sales.filter(s => s.status !== 'void');
    } catch (error) {
      console.error('[MarketingModule] Gagal memuat data:', error);
      _campaigns = [];
      _leads     = [];
      _customers = [];
      _sales     = [];
    }
  }

  // ─── Render ──────────────────────────────────────────────────
  function _render() {
    if (!_container) return;

    _container.innerHTML = `
      <div class="master-data">
        <div class="master-data__header">
          <h1 class="dashboard__title">Marketing</h1>
          <div class="master-data__tabs">
            <button class="btn ${_currentTab === 'campaigns' ? 'btn--primary' : 'btn--ghost'}" data-tab="campaigns">📢 Kampanye</button>
            <button class="btn ${_currentTab === 'leads' ? 'btn--primary' : 'btn--ghost'}" data-tab="leads">👥 Leads</button>
            <button class="btn ${_currentTab === 'metrics' ? 'btn--primary' : 'btn--ghost'}" data-tab="metrics">📊 Metrik</button>
          </div>
        </div>
        <div id="marketing-content"></div>
      </div>
    `;

    _renderContent();
  }

  function _renderContent() {
    const contentEl = document.getElementById('marketing-content');
    if (!contentEl) return;

    if (_currentTab === 'campaigns') _renderCampaignView(contentEl);
    else if (_currentTab === 'leads') _renderLeadView(contentEl);
    else _renderMetricsView(contentEl);
  }

  // ─── Kampanye ────────────────────────────────────────────────
  function _renderCampaignView(container) {
    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__header"><h3 class="card__title">Tambah Kampanye</h3></div>
        <div class="card__body">
          <form id="campaign-form" autocomplete="off">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
              <div class="form-group">
                <label for="camp-name">Nama Kampanye <span class="required">*</span></label>
                <input type="text" id="camp-name" name="name" required maxlength="200" placeholder="Contoh: Promo Lebaran">
              </div>
              <div class="form-group">
                <label for="camp-channel">Channel</label>
                <select id="camp-channel" name="channel">
                  <option value="instagram">Instagram</option>
                  <option value="tiktok">TikTok</option>
                  <option value="shopee">Shopee</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="flyer">Flyer</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              <div class="form-group">
                <label for="camp-start">Mulai</label>
                <input type="date" id="camp-start" name="startDate" value="${new Date().toISOString().slice(0,10)}">
              </div>
              <div class="form-group">
                <label for="camp-end">Selesai</label>
                <input type="date" id="camp-end" name="endDate">
              </div>
              <div class="form-group">
                <label for="camp-budget">Anggaran (Rp)</label>
                <input type="number" id="camp-budget" name="budget" min="0" step="10000" placeholder="0">
              </div>
              <div class="form-group">
                <label for="camp-actual">Realisasi Biaya (Rp)</label>
                <input type="number" id="camp-actual" name="actualSpend" min="0" step="10000" placeholder="0">
              </div>
            </div>
            <button type="submit" class="btn btn--primary mt-4">💾 Simpan Kampanye</button>
          </form>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Daftar Kampanye — ${_campaigns.length}</caption>
          <thead>
            <tr><th>Nama</th><th>Channel</th><th>Periode</th><th style="text-align:right;">Budget</th><th style="text-align:right;">Realisasi</th><th>Status</th><th style="width:80px;">Aksi</th></tr>
          </thead>
          <tbody id="campaign-tbody">
            ${_campaigns.length === 0 ? `<tr><td colspan="7" class="text-muted text-center">Belum ada kampanye.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (_campaigns.length > 0) _renderCampaignRows();
  }

  function _renderCampaignRows() {
    const tbody = document.getElementById('campaign-tbody');
    if (!tbody) return;
    const fragment = document.createDocumentFragment();
    _campaigns.sort((a,b) => new Date(b.startDate) - new Date(a.startDate)).forEach(c => {
      const tr = document.createElement('tr');
      tr.dataset.id = c.id;
      tr.innerHTML = `
        <td><strong>${Utils.escapeHtml(c.name)}</strong></td>
        <td>${Utils.escapeHtml(c.channel)}</td>
        <td>${Utils.formatDate(c.startDate)} - ${c.endDate ? Utils.formatDate(c.endDate) : '...'}</td>
        <td class="text-right font-mono">${Utils.formatIDR(c.budget)}</td>
        <td class="text-right font-mono">${Utils.formatIDR(c.actualSpend)}</td>
        <td><span class="badge badge--${c.status==='active'?'success':c.status==='ended'?'neutral':'info'}">${c.status}</span></td>
        <td><button class="btn btn--sm btn--ghost" data-action="delete-campaign">🗑️</button></td>
      `;
      fragment.appendChild(tr);
    });
    tbody.replaceChildren(fragment);
  }

  // ─── Leads ───────────────────────────────────────────────────
  function _renderLeadView(container) {
    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__header"><h3 class="card__title">Tambah Lead</h3></div>
        <div class="card__body">
          <form id="lead-form" autocomplete="off">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
              <div class="form-group">
                <label for="lead-name">Nama <span class="required">*</span></label>
                <input type="text" id="lead-name" name="name" required maxlength="200" placeholder="Nama calon pelanggan">
              </div>
              <div class="form-group">
                <label for="lead-campaign">Kampanye</label>
                <select id="lead-campaign" name="campaignId">
                  <option value="">-- Pilih --</option>
                  ${_campaigns.map(c => `<option value="${c.id}">${Utils.escapeHtml(c.name)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="lead-phone">Telepon</label>
                <input type="tel" id="lead-phone" name="phone" maxlength="20" placeholder="0812xxxx">
              </div>
              <div class="form-group">
                <label for="lead-status">Status</label>
                <select id="lead-status" name="status">
                  <option value="new">Baru</option>
                  <option value="contacted">Dihubungi</option>
                  <option value="qualified">Tertarik</option>
                  <option value="converted">Konversi</option>
                  <option value="lost">Hilang</option>
                </select>
              </div>
            </div>
            <button type="submit" class="btn btn--primary mt-4">💾 Simpan Lead</button>
          </form>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Daftar Leads — ${_leads.length}</caption>
          <thead>
            <tr><th>Nama</th><th>Kampanye</th><th>Telepon</th><th>Status</th><th style="width:80px;">Aksi</th></tr>
          </thead>
          <tbody id="lead-tbody">
            ${_leads.length === 0 ? `<tr><td colspan="5" class="text-muted text-center">Belum ada lead.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (_leads.length > 0) _renderLeadRows();
  }

  function _renderLeadRows() {
    const tbody = document.getElementById('lead-tbody');
    if (!tbody) return;
    const fragment = document.createDocumentFragment();
    _leads.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).forEach(l => {
      const camp = _campaigns.find(c => c.id === l.campaignId);
      const tr = document.createElement('tr');
      tr.dataset.id = l.id;
      tr.innerHTML = `
        <td><strong>${Utils.escapeHtml(l.name)}</strong></td>
        <td>${camp ? Utils.escapeHtml(camp.name) : '-'}</td>
        <td>${Utils.escapeHtml(l.phone || '-')}</td>
        <td><span class="badge badge--${l.status==='converted'?'success':l.status==='lost'?'danger':'info'}">${l.status}</span></td>
        <td><button class="btn btn--sm btn--ghost" data-action="delete-lead">🗑️</button></td>
      `;
      fragment.appendChild(tr);
    });
    tbody.replaceChildren(fragment);
  }

  // ─── Metrik Marketing ───────────────────────────────────────
  function _renderMetricsView(container) {
    // Periode bulan ini
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const campaignSpend = _campaigns
      .filter(c => c.startDate >= startDate && c.startDate <= endDate)
      .reduce((sum, c) => sum + (c.actualSpend ?? 0), 0);

    const newLeads = _leads.filter(l => l.createdAt >= startDate && l.createdAt <= endDate).length;
    const conversions = _leads.filter(l => l.status === 'converted' && l.createdAt >= startDate && l.createdAt <= endDate).length;

    // Pelanggan baru bulan ini
    const newCust = _customers.filter(c => c.createdAt >= startDate && c.createdAt <= endDate).length;

    const cac = newCust > 0 ? campaignSpend / newCust : 0;
    const conversionRate = newLeads > 0 ? (conversions / newLeads) * 100 : 0;

    // ROAS: revenue dari pelanggan baru? disederhanakan dari semua sales
    const revenue = _sales.filter(s => s.date >= startDate && s.date <= endDate)
      .reduce((sum, s) => sum + s.total, 0);
    const roas = campaignSpend > 0 ? revenue / campaignSpend : 0;

    container.innerHTML = `
      <div class="kpi-grid">
        ${_metricCard('Total Biaya Marketing', Utils.formatIDR(campaignSpend), 'orange')}
        ${_metricCard('Leads Baru', newLeads, 'info')}
        ${_metricCard('Konversi', conversions, 'green')}
        ${_metricCard('CAC (Biaya per Pelanggan)', Utils.formatIDR(cac), 'red')}
        ${_metricCard('Conversion Rate', conversionRate.toFixed(1)+'%', 'blue')}
        ${_metricCard('ROAS', roas.toFixed(2)+'x', 'purple')}
      </div>
      <p class="text-muted" style="margin-top:var(--space-4);">Periode: Bulan ini. Data berdasarkan kampanye, leads, dan penjualan.</p>
    `;
  }

  function _metricCard(label, value, color) {
    const icons = { green:'✅', blue:'📊', orange:'💰', red:'📉', purple:'💎', info:'👥' };
    return `
      <div class="kpi-card">
        <div class="kpi-card__icon kpi-card__icon--${color}">${icons[color]||'📌'}</div>
        <div class="kpi-card__body">
          <div class="kpi-card__label">${label}</div>
          <div class="kpi-card__value">${value}</div>
        </div>
      </div>
    `;
  }

  // ─── Events ──────────────────────────────────────────────────
  function _bindEvents() {
    if (!_container) return;

    _container.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) { _currentTab = tabBtn.dataset.tab; _render(); return; }

      const delCamp = e.target.closest('[data-action="delete-campaign"]');
      if (delCamp) {
        const tr = delCamp.closest('tr');
        const id = Number(tr?.dataset.id);
        if (id && confirm('Hapus kampanye ini?')) _deleteCampaign(id);
        return;
      }

      const delLead = e.target.closest('[data-action="delete-lead"]');
      if (delLead) {
        const tr = delLead.closest('tr');
        const id = Number(tr?.dataset.id);
        if (id && confirm('Hapus lead ini?')) _deleteLead(id);
        return;
      }
    });

    _container.addEventListener('submit', (e) => {
      if (e.target.id === 'campaign-form') {
        e.preventDefault();
        _saveCampaign(new FormData(e.target));
      }
      if (e.target.id === 'lead-form') {
        e.preventDefault();
        _saveLead(new FormData(e.target));
      }
    });
  }

  // ─── Actions ─────────────────────────────────────────────────
  async function _saveCampaign(formData) {
    const data = {
      name        : formData.get('name').trim(),
      channel     : formData.get('channel'),
      startDate   : formData.get('startDate') ? new Date(formData.get('startDate')).toISOString() : new Date().toISOString(),
      endDate     : formData.get('endDate') ? new Date(formData.get('endDate')).toISOString() : null,
      budget      : Utils.sanitizeNumber(formData.get('budget')),
      actualSpend : Utils.sanitizeNumber(formData.get('actualSpend')),
      impressions : 0,
      clicks      : 0,
      leads       : 0,
      conversions : 0,
      revenue     : 0,
      status      : 'active',
    };
    if (!data.name) { alert('Nama kampanye wajib diisi.'); return; }
    try {
      await DB.add('marketing_campaigns', data);
      await _loadData();
      _renderContent();
      EventBus.emit('marketing:changed');
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan kampanye.');
    }
  }

  async function _saveLead(formData) {
    const data = {
      name       : formData.get('name').trim(),
      campaignId : formData.get('campaignId') ? Number(formData.get('campaignId')) : null,
      phone      : formData.get('phone').trim(),
      status     : formData.get('status'),
      createdAt  : new Date().toISOString(),
    };
    if (!data.name) { alert('Nama lead wajib diisi.'); return; }
    try {
      await DB.add('leads', data);
      await _loadData();
      _renderContent();
      EventBus.emit('marketing:changed');
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan lead.');
    }
  }

  async function _deleteCampaign(id) {
    try {
      await DB.delete('marketing_campaigns', id);
      _campaigns = _campaigns.filter(c => c.id !== id);
      _renderCampaignRows();
      EventBus.emit('marketing:changed');
    } catch (error) {
      alert('Gagal menghapus kampanye.');
    }
  }

  async function _deleteLead(id) {
    try {
      await DB.delete('leads', id);
      _leads = _leads.filter(l => l.id !== id);
      _renderLeadRows();
      EventBus.emit('marketing:changed');
    } catch (error) {
      alert('Gagal menghapus lead.');
    }
  }

  // ─── Destroy ─────────────────────────────────────────────────
  function destroy() {
    _container?.replaceChildren();
    _container = null;
  }

  return { init, destroy };
})();