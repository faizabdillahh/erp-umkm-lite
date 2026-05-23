/* ============================================================
   SUPPLIER.JS — Modul Manajemen Supplier (CRUD)
   ============================================================ */
'use strict';

const SupplierModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container  = null;
  let _suppliers  = [];
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
      _suppliers = await DB.getAll('suppliers');
    } catch (error) {
      console.error('[SupplierModule] Gagal memuat data:', error);
      _suppliers = [];
    }
  }

  // ─── Render Utama ────────────────────────────────────────────
  function _render() {
    if (!_container) return;

    _container.innerHTML = `
      <div class="master-data">
        <div class="master-data__header">
          <h1 class="dashboard__title">Supplier</h1>
          <button class="btn btn--primary" id="btn-add-supplier">+ Supplier Baru</button>
        </div>

        <!-- Form (tersembunyi default) -->
        <div class="card" id="supplier-form-card" style="margin-bottom: var(--space-4);" hidden>
          <div class="card__header">
            <h3 class="card__title" id="form-title">Tambah Supplier</h3>
            <button class="btn btn--ghost btn--sm" id="btn-cancel-supplier-form">✕ Batal</button>
          </div>
          <div class="card__body">
            <form id="supplier-form" autocomplete="off">
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                <div class="form-group">
                  <label for="supp-name">Nama Supplier <span class="required">*</span></label>
                  <input type="text" id="supp-name" name="name" required maxlength="200" placeholder="Nama supplier">
                </div>
                <div class="form-group">
                  <label for="supp-company">Perusahaan</label>
                  <input type="text" id="supp-company" name="company" maxlength="200" placeholder="Nama perusahaan">
                </div>
                <div class="form-group">
                  <label for="supp-phone">Telepon <span class="required">*</span></label>
                  <input type="tel" id="supp-phone" name="phone" required maxlength="20" placeholder="0812xxxx">
                </div>
                <div class="form-group">
                  <label for="supp-email">Email</label>
                  <input type="email" id="supp-email" name="email" maxlength="100" placeholder="email@perusahaan.com">
                </div>
                <div class="form-group" style="grid-column: span 2;">
                  <label for="supp-address">Alamat</label>
                  <textarea id="supp-address" name="address" maxlength="300" rows="2" placeholder="Alamat lengkap"></textarea>
                </div>

                <!-- Info Bank -->
                <div class="form-group">
                  <label for="supp-bank-name">Nama Bank</label>
                  <input type="text" id="supp-bank-name" name="bankName" maxlength="100" placeholder="Contoh: BCA">
                </div>
                <div class="form-group">
                  <label for="supp-bank-account">Nomor Rekening</label>
                  <input type="text" id="supp-bank-account" name="bankAccount" maxlength="30" placeholder="Nomor rekening">
                </div>
                <div class="form-group">
                  <label for="supp-bank-account-name">Atas Nama</label>
                  <input type="text" id="supp-bank-account-name" name="bankAccountName" maxlength="200" placeholder="Nama pemilik rekening">
                </div>

                <!-- Ketentuan -->
                <div class="form-group">
                  <label for="supp-payment-terms">Jatuh Tempo (hari)</label>
                  <input type="number" id="supp-payment-terms" name="paymentTerms" min="0" step="1" value="30" placeholder="30">
                </div>
                <div class="form-group">
                  <label for="supp-rating">Rating (1-5)</label>
                  <input type="number" id="supp-rating" name="rating" min="1" max="5" step="1" value="3" placeholder="3">
                </div>
                <div class="form-group" style="grid-column: span 2;">
                  <label for="supp-notes">Catatan</label>
                  <textarea id="supp-notes" name="notes" maxlength="300" rows="2" placeholder="Catatan khusus"></textarea>
                </div>
              </div>
              <div style="display:flex; gap: var(--space-4); margin-top: var(--space-4);">
                <button type="submit" class="btn btn--primary">💾 Simpan</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Tabel Supplier -->
        <div class="table-container">
          <table>
            <caption>Daftar Supplier — ${_suppliers.length} supplier</caption>
            <thead>
              <tr>
                <th scope="col">Nama</th>
                <th scope="col">Perusahaan</th>
                <th scope="col">Telepon</th>
                <th scope="col">Rating</th>
                <th scope="col">Jatuh Tempo</th>
                <th scope="col" style="width:100px;">Aksi</th>
              </tr>
            </thead>
            <tbody id="supplier-tbody">
              ${_suppliers.length === 0 ? `
                <tr><td colspan="6" class="text-muted text-center">Belum ada supplier.</td></tr>
              ` : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    if (_suppliers.length > 0) _renderSupplierRows();
  }

  function _renderSupplierRows() {
    const tbody = document.getElementById('supplier-tbody');
    if (!tbody) return;

    const fragment = document.createDocumentFragment();
    _suppliers.forEach(supp => {
      const ratingStars = '⭐'.repeat(supp.rating ?? 0);
      const tr = document.createElement('tr');
      tr.dataset.id = supp.id;
      tr.innerHTML = `
        <td><strong>${Utils.escapeHtml(supp.name)}</strong></td>
        <td>${Utils.escapeHtml(supp.company || '-')}</td>
        <td>${Utils.escapeHtml(supp.phone || '-')}</td>
        <td>${ratingStars || '-'}</td>
        <td>${supp.paymentTerms ?? '-'} hari</td>
        <td>
          <button class="btn btn--sm btn--ghost" data-action="edit-supplier" aria-label="Edit ${Utils.escapeHtml(supp.name)}">✏️</button>
          <button class="btn btn--sm btn--ghost" data-action="delete-supplier" aria-label="Hapus ${Utils.escapeHtml(supp.name)}">🗑️</button>
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

      if (btn.id === 'btn-add-supplier') {
        _showForm();
        return;
      }

      if (btn.id === 'btn-cancel-supplier-form') {
        _hideForm();
        return;
      }

      if (btn.dataset.action === 'edit-supplier') {
        const tr = btn.closest('tr');
        const id = Number(tr?.dataset.id);
        if (id) _editSupplier(id);
        return;
      }

      if (btn.dataset.action === 'delete-supplier') {
        const tr = btn.closest('tr');
        const id = Number(tr?.dataset.id);
        const name = tr?.querySelector('strong')?.textContent || 'supplier ini';
        if (id && confirm(`Hapus ${name}?`)) {
          _deleteSupplier(id);
        }
        return;
      }
    });

    _container.addEventListener('submit', (e) => {
      if (e.target.id === 'supplier-form') {
        e.preventDefault();
        _saveSupplier(new FormData(e.target));
      }
    });
  }

  // ─── Form Handlers ───────────────────────────────────────────
  function _showForm(supplier = null) {
    const card  = document.getElementById('supplier-form-card');
    const title = document.getElementById('form-title');
    const form  = document.getElementById('supplier-form');

    if (!card || !form) return;
    card.hidden = false;
    form.reset();

    if (supplier) {
      _editingId = supplier.id;
      title.textContent = 'Edit Supplier';
      document.getElementById('supp-name').value                = supplier.name || '';
      document.getElementById('supp-company').value             = supplier.company || '';
      document.getElementById('supp-phone').value               = supplier.phone || '';
      document.getElementById('supp-email').value               = supplier.email || '';
      document.getElementById('supp-address').value             = supplier.address || '';
      document.getElementById('supp-bank-name').value           = supplier.bankName || '';
      document.getElementById('supp-bank-account').value        = supplier.bankAccount || '';
      document.getElementById('supp-bank-account-name').value   = supplier.bankAccountName || '';
      document.getElementById('supp-payment-terms').value       = supplier.paymentTerms ?? 30;
      document.getElementById('supp-rating').value              = supplier.rating ?? 3;
      document.getElementById('supp-notes').value               = supplier.notes || '';
    } else {
      _editingId = null;
      title.textContent = 'Tambah Supplier';
    }

    card.scrollIntoView({ behavior: 'smooth' });
  }

  function _hideForm() {
    const card = document.getElementById('supplier-form-card');
    if (card) card.hidden = true;
    _editingId = null;
  }

  // ─── Actions ─────────────────────────────────────────────────

  async function _saveSupplier(formData) {
    const raw = {
      name             : String(formData.get('name') ?? '').trim(),
      company          : String(formData.get('company') ?? '').trim(),
      phone            : String(formData.get('phone') ?? '').trim(),
      email            : String(formData.get('email') ?? '').trim(),
      address          : String(formData.get('address') ?? '').trim(),
      bankName         : String(formData.get('bankName') ?? '').trim(),
      bankAccount      : String(formData.get('bankAccount') ?? '').trim(),
      bankAccountName  : String(formData.get('bankAccountName') ?? '').trim(),
      paymentTerms     : Math.max(0, parseInt(formData.get('paymentTerms')) || 0),
      rating           : Math.min(5, Math.max(1, parseInt(formData.get('rating')) || 3)),
      notes            : String(formData.get('notes') ?? '').trim(),
    };

    if (!raw.name) {
      alert('Nama supplier wajib diisi.');
      return;
    }
    if (!raw.phone) {
      alert('Nomor telepon wajib diisi.');
      return;
    }

    try {
      if (_editingId) {
        const existing = await DB.get('suppliers', _editingId);
        if (!existing) throw new Error('Supplier tidak ditemukan');
        await DB.put('suppliers', {
          ...existing,
          ...raw,
          id: _editingId,
        });
      } else {
        await DB.add('suppliers', raw);
      }

      _hideForm();
      await _loadData();
      _render();
      EventBus.emit('supplier:changed');
    } catch (error) {
      console.error('[SupplierModule] Gagal simpan supplier:', error);
      alert('Gagal menyimpan supplier.');
    }
  }

  function _editSupplier(id) {
    const supp = _suppliers.find(s => s.id === id);
    if (!supp) return;
    _showForm(supp);
  }

  async function _deleteSupplier(id) {
    try {
      await DB.delete('suppliers', id);
      _suppliers = _suppliers.filter(s => s.id !== id);
      _renderSupplierRows();
      EventBus.emit('supplier:changed');
    } catch (error) {
      console.error('[SupplierModule] Gagal hapus supplier:', error);
      alert('Gagal menghapus supplier.');
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