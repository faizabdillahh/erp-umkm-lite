/* ============================================================
   PELANGGAN.JS — Modul Manajemen Pelanggan (CRUD)
   ============================================================ */
'use strict';

const PelangganModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container  = null;
  let _customers  = [];
  let _editingId  = null;

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
      _customers = await DB.getAll('customers');
    } catch (error) {
      console.error('[PelangganModule] Gagal memuat data:', error);
      _customers = [];
    }
  }

  // ─── Render Utama ────────────────────────────────────────────
  function _render() {
    if (!_container) return;

    const segmentOptions = [
      { value: 'retail', label: 'Retail' },
      { value: 'reseller', label: 'Reseller' },
      { value: 'b2b', label: 'B2B' },
      { value: 'vip', label: 'VIP' },
    ];

    const sourceOptions = [
      { value: 'walk_in', label: 'Walk-in' },
      { value: 'referral', label: 'Referral' },
      { value: 'online', label: 'Online' },
      { value: 'campaign', label: 'Kampanye' },
    ];

    _container.innerHTML = `
      <div class="master-data">
        <div class="master-data__header">
          <h1 class="dashboard__title">Pelanggan</h1>
          <button class="btn btn--primary" id="btn-add-customer">+ Pelanggan Baru</button>
        </div>

        <!-- Form (tersembunyi default) -->
        <div class="card" id="customer-form-card" style="margin-bottom: var(--space-4);" hidden>
          <div class="card__header">
            <h3 class="card__title" id="form-title">Tambah Pelanggan</h3>
            <button class="btn btn--ghost btn--sm" id="btn-cancel-customer-form">✕ Batal</button>
          </div>
          <div class="card__body">
            <form id="customer-form" autocomplete="off">
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                <div class="form-group">
                  <label for="cust-name">Nama Lengkap <span class="required">*</span></label>
                  <input type="text" id="cust-name" name="name" required maxlength="200" placeholder="Nama pelanggan">
                </div>
                <div class="form-group">
                  <label for="cust-phone">Nomor HP / WhatsApp <span class="required">*</span></label>
                  <input type="tel" id="cust-phone" name="phone" required maxlength="20" placeholder="0812xxxx">
                </div>
                <div class="form-group">
                  <label for="cust-email">Email</label>
                  <input type="email" id="cust-email" name="email" maxlength="100" placeholder="email@example.com">
                </div>
                <div class="form-group">
                  <label for="cust-birth">Tanggal Lahir</label>
                  <input type="date" id="cust-birth" name="birthDate">
                </div>
                <div class="form-group">
                  <label for="cust-segment">Segment <span class="required">*</span></label>
                  <select id="cust-segment" name="segment" required>
                    <option value="">-- Pilih Segment --</option>
                    ${segmentOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label for="cust-source">Sumber</label>
                  <select id="cust-source" name="source">
                    <option value="">-- Pilih Sumber --</option>
                    ${sourceOptions.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="grid-column: span 2;">
                  <label for="cust-address">Alamat</label>
                  <textarea id="cust-address" name="address" maxlength="300" rows="2" placeholder="Alamat lengkap"></textarea>
                </div>
                <div class="form-group" style="grid-column: span 2;">
                  <label for="cust-notes">Catatan</label>
                  <textarea id="cust-notes" name="notes" maxlength="300" rows="2" placeholder="Catatan khusus"></textarea>
                </div>
              </div>
              <div style="display:flex; gap: var(--space-4); margin-top: var(--space-4);">
                <button type="submit" class="btn btn--primary" id="btn-submit-customer-form">💾 Simpan</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Tabel Pelanggan -->
        <div class="table-container">
          <table>
            <caption>Daftar Pelanggan — ${_customers.length} orang</caption>
            <thead>
              <tr>
                <th scope="col">Nama</th>
                <th scope="col">Telepon</th>
                <th scope="col">Segment</th>
                <th scope="col" style="text-align:right;">Total Pembelian</th>
                <th scope="col">Terakhir Beli</th>
                <th scope="col" style="width:100px;">Aksi</th>
              </tr>
            </thead>
            <tbody id="customer-tbody">
              ${_customers.length === 0 ? `
                <tr><td colspan="6" class="text-muted text-center">Belum ada pelanggan.</td></tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (_customers.length > 0) _renderCustomerRows();
  }

  function _renderCustomerRows() {
    const tbody = document.getElementById('customer-tbody');
    if (!tbody) return;

    const segmentLabels = {
      retail: 'Retail',
      reseller: 'Reseller',
      b2b: 'B2B',
      vip: 'VIP',
    };

    const fragment = document.createDocumentFragment();
    _customers.forEach(cust => {
      const lastPurchase = cust.lastPurchaseDate ? Utils.formatDate(cust.lastPurchaseDate) : '-';
      const tr = document.createElement('tr');
      tr.dataset.id = cust.id;
      tr.innerHTML = `
        <td>
          <strong>${Utils.escapeHtml(cust.name)}</strong>
          ${cust.phone ? `<br><small class="text-muted">${Utils.escapeHtml(cust.phone)}</small>` : ''}
        </td>
        <td>${cust.phone ? Utils.escapeHtml(cust.phone) : '-'}</td>
        <td><span class="badge badge--info">${segmentLabels[cust.segment] || cust.segment}</span></td>
        <td class="text-right font-mono">${Utils.formatIDR(cust.totalPurchase ?? 0)}</td>
        <td>${lastPurchase}</td>
        <td>
          <button class="btn btn--sm btn--ghost" data-action="edit-customer" aria-label="Edit ${Utils.escapeHtml(cust.name)}">✏️</button>
          <button class="btn btn--sm btn--ghost" data-action="delete-customer" aria-label="Hapus ${Utils.escapeHtml(cust.name)}">🗑️</button>
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

      if (btn.id === 'btn-add-customer') {
        _showForm();
        return;
      }

      if (btn.id === 'btn-cancel-customer-form') {
        _hideForm();
        return;
      }

      if (btn.dataset.action === 'edit-customer') {
        const tr = btn.closest('tr');
        const id = Number(tr?.dataset.id);
        if (id) _editCustomer(id);
        return;
      }

      if (btn.dataset.action === 'delete-customer') {
        const tr = btn.closest('tr');
        const id = Number(tr?.dataset.id);
        const name = tr?.querySelector('strong')?.textContent || 'pelanggan ini';
        if (id && confirm(`Hapus ${name}?`)) {
          _deleteCustomer(id);
        }
        return;
      }
    });

    _container.addEventListener('submit', (e) => {
      if (e.target.id === 'customer-form') {
        e.preventDefault();
        _saveCustomer(new FormData(e.target));
      }
    });
  }

  // ─── Form Handlers ───────────────────────────────────────────
  function _showForm(customer = null) {
    const card  = document.getElementById('customer-form-card');
    const title = document.getElementById('form-title');
    const form  = document.getElementById('customer-form');

    if (!card || !form) return;
    card.hidden = false;
    form.reset();

    if (customer) {
      _editingId = customer.id;
      title.textContent = 'Edit Pelanggan';
      document.getElementById('cust-name').value     = customer.name || '';
      document.getElementById('cust-phone').value    = customer.phone || '';
      document.getElementById('cust-email').value    = customer.email || '';
      document.getElementById('cust-birth').value    = customer.birthDate ? customer.birthDate.slice(0,10) : '';
      document.getElementById('cust-segment').value  = customer.segment || '';
      document.getElementById('cust-source').value   = customer.source || '';
      document.getElementById('cust-address').value  = customer.address || '';
      document.getElementById('cust-notes').value    = customer.notes || '';
    } else {
      _editingId = null;
      title.textContent = 'Tambah Pelanggan';
    }

    card.scrollIntoView({ behavior: 'smooth' });
  }

  function _hideForm() {
    const card = document.getElementById('customer-form-card');
    if (card) card.hidden = true;
    _editingId = null;
  }

  // ─── Actions ─────────────────────────────────────────────────

  async function _saveCustomer(formData) {
    const raw = {
      name      : String(formData.get('name') ?? '').trim(),
      phone     : String(formData.get('phone') ?? '').trim(),
      email     : String(formData.get('email') ?? '').trim(),
      address   : String(formData.get('address') ?? '').trim(),
      segment   : String(formData.get('segment') ?? '').trim(),
      source    : String(formData.get('source') ?? '').trim(),
      birthDate : formData.get('birthDate') ? new Date(formData.get('birthDate')).toISOString() : null,
      notes     : String(formData.get('notes') ?? '').trim(),
    };

    // Validasi
    if (!raw.name) {
      alert('Nama pelanggan wajib diisi.');
      return;
    }
    if (!raw.phone) {
      alert('Nomor HP wajib diisi.');
      return;
    }
    if (!raw.segment) {
      alert('Segment wajib dipilih.');
      return;
    }

    try {
      if (_editingId) {
        const existing = await DB.get('customers', _editingId);
        if (!existing) throw new Error('Pelanggan tidak ditemukan');
        await DB.put('customers', {
          ...existing,
          ...raw,
          id: _editingId,
        });
      } else {
        await DB.add('customers', {
          ...raw,
          totalPurchase: 0,
          lastPurchaseDate: null,
          createdAt: new Date().toISOString(),
        });
      }

      _hideForm();
      await _loadData();
      _render();
      EventBus.emit('customer:changed');
    } catch (error) {
      console.error('[PelangganModule] Gagal simpan pelanggan:', error);
      alert('Gagal menyimpan pelanggan.');
    }
  }

  function _editCustomer(id) {
    const cust = _customers.find(c => c.id === id);
    if (!cust) return;
    _showForm(cust);
  }

  async function _deleteCustomer(id) {
    try {
      await DB.delete('customers', id);
      _customers = _customers.filter(c => c.id !== id);
      _renderCustomerRows();
      EventBus.emit('customer:changed');
    } catch (error) {
      console.error('[PelangganModule] Gagal hapus pelanggan:', error);
      alert('Gagal menghapus pelanggan.');
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