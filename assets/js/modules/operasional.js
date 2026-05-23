/* ============================================================
   OPERASIONAL.JS — Modul Operasional: Tugas & QC
   ============================================================ */
'use strict';

const OperasionalModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container   = null;
  let _currentTab  = 'tasks'; // 'tasks' | 'qc'
  let _tasks       = [];
  let _employees   = [];
  let _qcRecords   = [];
  let _workOrders  = [];
  let _purchases   = [];

  // ─── Init ────────────────────────────────────────────────────
  async function init(container) {
    _container = container;
    await _loadData();
    _render();
    _bindEvents();
  }

  async function _loadData() {
    try {
      const [tasks, employees, workOrders, purchases] = await Promise.all([
        DB.getAll('tasks'),
        DB.getAll('employees'),
        DB.getAll('production_orders'),
        DB.getAll('purchases'),
      ]);
      _tasks       = tasks;
      _employees   = employees;
      _workOrders  = workOrders;
      _purchases   = purchases;
      // QC Records disimpan di array lokal untuk demo; di DB bisa ditambahkan object store 'qc_records' nanti
      _qcRecords   = JSON.parse(localStorage.getItem('umkm_qc_records') || '[]');
    } catch (error) {
      console.error('[OperasionalModule] Gagal memuat data:', error);
      _tasks = []; _employees = []; _qcRecords = []; _workOrders = []; _purchases = [];
    }
  }

  function _saveQCRecords() {
    localStorage.setItem('umkm_qc_records', JSON.stringify(_qcRecords));
  }

  // ─── Render ──────────────────────────────────────────────────
  function _render() {
    if (!_container) return;
    _container.innerHTML = `
      <div class="master-data">
        <div class="master-data__header">
          <h1 class="dashboard__title">Operasional</h1>
          <div class="master-data__tabs">
            <button class="btn ${_currentTab==='tasks'?'btn--primary':'btn--ghost'}" data-tab="tasks">📅 Tugas Harian</button>
            <button class="btn ${_currentTab==='qc'?'btn--primary':'btn--ghost'}" data-tab="qc">🔍 Quality Control</button>
          </div>
        </div>
        <div id="operasional-content"></div>
      </div>
    `;
    _renderContent();
  }

  function _renderContent() {
    const el = document.getElementById('operasional-content');
    if (!el) return;
    if (_currentTab === 'tasks') _renderTasksView(el);
    else _renderQCView(el);
  }

  // ──────────────────────────────────────────────────────────────
  //  TAB 1: TUGAS HARIAN
  // ──────────────────────────────────────────────────────────────
  function _renderTasksView(container) {
    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__header"><h3 class="card__title">Tambah Tugas</h3></div>
        <div class="card__body">
          <form id="task-form" autocomplete="off">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
              <div class="form-group" style="grid-column:span 2;">
                <label for="task-title">Judul Tugas <span class="required">*</span></label>
                <input type="text" id="task-title" name="title" required maxlength="300" placeholder="Deskripsi tugas">
              </div>
              <div class="form-group">
                <label for="task-type">Tipe</label>
                <select id="task-type" name="type">
                  <option value="production">Produksi</option>
                  <option value="delivery">Pengiriman</option>
                  <option value="qc">QC</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              <div class="form-group">
                <label for="task-priority">Prioritas</label>
                <select id="task-priority" name="priority">
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div class="form-group">
                <label for="task-assign">Ditugaskan ke</label>
                <select id="task-assign" name="assignedTo">
                  <option value="">-- Pilih --</option>
                  ${_employees.filter(e => e.isActive !== false).map(e => `<option value="${e.id}">${Utils.escapeHtml(e.name)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="task-due">Deadline</label>
                <input type="date" id="task-due" name="dueDate" value="${new Date().toISOString().slice(0,10)}">
              </div>
            </div>
            <button type="submit" class="btn btn--primary mt-4">➕ Tambah Tugas</button>
          </form>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Daftar Tugas — ${_tasks.length}</caption>
          <thead><tr><th>Judul</th><th>Tipe</th><th>Penanggung Jawab</th><th>Deadline</th><th>Prioritas</th><th>Status</th><th style="width:100px;">Aksi</th></tr></thead>
          <tbody id="task-tbody">
            ${_tasks.length === 0 ? `<tr><td colspan="7" class="text-muted text-center">Belum ada tugas.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (_tasks.length > 0) _renderTaskRows();
  }

  function _renderTaskRows() {
    const tbody = document.getElementById('task-tbody');
    if (!tbody) return;
    const fragment = document.createDocumentFragment();
    _tasks.sort((a,b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0) || new Date(a.dueDate) - new Date(b.dueDate)).forEach(t => {
      const emp = _employees.find(e => e.id === t.assignedTo);
      const tr = document.createElement('tr');
      tr.dataset.id = t.id;
      tr.innerHTML = `
        <td><strong>${Utils.escapeHtml(t.title)}</strong></td>
        <td><span class="badge badge--info">${Utils.escapeHtml(t.type)}</span></td>
        <td>${emp ? Utils.escapeHtml(emp.name) : '-'}</td>
        <td>${Utils.formatDate(t.dueDate)}</td>
        <td><span class="badge badge--${t.priority==='high'?'danger':t.priority==='low'?'neutral':'warning'}">${t.priority}</span></td>
        <td><span class="badge badge--${t.status==='done'?'success':t.status==='in_progress'?'info':'warning'}">${t.status}</span></td>
        <td>
          ${t.status !== 'done' ? `<button class="btn btn--sm btn--success" data-action="complete-task" title="Selesai">✅</button>` : ''}
          <button class="btn btn--sm btn--ghost" data-action="delete-task">🗑️</button>
        </td>
      `;
      fragment.appendChild(tr);
    });
    tbody.replaceChildren(fragment);
  }

  // ──────────────────────────────────────────────────────────────
  //  TAB 2: QUALITY CONTROL
  // ──────────────────────────────────────────────────────────────
  function _renderQCView(container) {
    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__header"><h3 class="card__title">Catat Hasil QC</h3></div>
        <div class="card__body">
          <form id="qc-form" autocomplete="off">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
              <div class="form-group">
                <label for="qc-ref-type">Referensi</label>
                <select id="qc-ref-type" name="refType" required>
                  <option value="production">Work Order (Produksi)</option>
                  <option value="purchase">Purchase Order</option>
                </select>
              </div>
              <div class="form-group">
                <label for="qc-ref-id">ID Referensi <span class="required">*</span></label>
                <select id="qc-ref-id" name="refId" required>
                  <option value="">-- Pilih --</option>
                </select>
              </div>
              <div class="form-group">
                <label for="qc-checked">Qty Diperiksa <span class="required">*</span></label>
                <input type="number" id="qc-checked" name="checkedQty" min="1" step="1" required placeholder="0">
              </div>
              <div class="form-group">
                <label for="qc-passed">Qty Lolos</label>
                <input type="number" id="qc-passed" name="passedQty" min="0" step="1" value="0">
              </div>
              <div class="form-group">
                <label for="qc-failed">Qty Gagal</label>
                <input type="number" id="qc-failed" name="failedQty" min="0" step="1" value="0">
              </div>
              <div class="form-group">
                <label for="qc-reason">Alasan Kegagalan</label>
                <input type="text" id="qc-reason" name="failureReason" maxlength="300" placeholder="Opsional">
              </div>
              <div class="form-group">
                <label for="qc-checker">Diperiksa Oleh</label>
                <select id="qc-checker" name="checkedBy">
                  <option value="">-- Pilih --</option>
                  ${_employees.filter(e => e.isActive !== false).map(e => `<option value="${e.id}">${Utils.escapeHtml(e.name)}</option>`).join('')}
                </select>
              </div>
            </div>
            <button type="submit" class="btn btn--primary mt-4">📋 Catat QC</button>
          </form>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Riwayat QC — ${_qcRecords.length} catatan</caption>
          <thead><tr><th>Tanggal</th><th>Ref</th><th style="text-align:right;">Diperiksa</th><th style="text-align:right;">Lolos</th><th style="text-align:right;">Gagal</th><th>Pemeriksa</th></tr></thead>
          <tbody id="qc-tbody">
            ${_qcRecords.length === 0 ? `<tr><td colspan="6" class="text-muted text-center">Belum ada catatan QC.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (_qcRecords.length > 0) _renderQCRows();

    // Event untuk update dropdown referensi
    const refTypeSel = document.getElementById('qc-ref-type');
    const refIdSel = document.getElementById('qc-ref-id');
    if (refTypeSel && refIdSel) {
      refTypeSel.addEventListener('change', () => {
        const type = refTypeSel.value;
        refIdSel.innerHTML = '<option value="">-- Pilih --</option>';
        const items = type === 'production' ? _workOrders : _purchases;
        items.forEach(item => {
          const opt = document.createElement('option');
          opt.value = item.id;
          opt.textContent = `${item.woNo || item.poNo || 'ID:'+item.id} (${Utils.formatDate(item.date || item.startDate || '')})`;
          refIdSel.appendChild(opt);
        });
      });
      refTypeSel.dispatchEvent(new Event('change'));
    }
  }

  function _renderQCRows() {
    const tbody = document.getElementById('qc-tbody');
    if (!tbody) return;
    const fragment = document.createDocumentFragment();
    _qcRecords.sort((a,b) => new Date(b.checkedAt) - new Date(a.checkedAt)).forEach(qc => {
      const checker = _employees.find(e => e.id === qc.checkedBy);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${Utils.formatDate(qc.checkedAt, 'DD/MM/YYYY hh:mm')}</td>
        <td><small>${Utils.escapeHtml(qc.refType)} #${qc.refId}</small></td>
        <td class="text-right">${qc.checkedQty}</td>
        <td class="text-right" style="color:var(--color-success);">${qc.passedQty}</td>
        <td class="text-right" style="color:var(--color-danger);">${qc.failedQty}</td>
        <td>${checker ? Utils.escapeHtml(checker.name) : '-'}</td>
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

      const completeBtn = e.target.closest('[data-action="complete-task"]');
      if (completeBtn) {
        const tr = completeBtn.closest('tr');
        const id = Number(tr?.dataset.id);
        if (id) _completeTask(id);
        return;
      }

      const delTaskBtn = e.target.closest('[data-action="delete-task"]');
      if (delTaskBtn) {
        const tr = delTaskBtn.closest('tr');
        const id = Number(tr?.dataset.id);
        if (id && confirm('Hapus tugas ini?')) _deleteTask(id);
        return;
      }
    });

    _container.addEventListener('submit', (e) => {
      if (e.target.id === 'task-form') { e.preventDefault(); _saveTask(new FormData(e.target)); }
      if (e.target.id === 'qc-form') { e.preventDefault(); _saveQC(new FormData(e.target)); }
    });
  }

  // ─── Actions ─────────────────────────────────────────────────

  async function _saveTask(formData) {
    const data = {
      title      : formData.get('title').trim(),
      type       : formData.get('type'),
      assignedTo : Number(formData.get('assignedTo')) || null,
      dueDate    : formData.get('dueDate') || new Date().toISOString().slice(0,10),
      dueTime    : null,
      priority   : formData.get('priority'),
      status     : 'pending',
      notes      : '',
    };
    if (!data.title) { alert('Judul tugas wajib diisi.'); return; }
    try {
      await DB.add('tasks', data);
      await _loadData();
      _renderContent();
      EventBus.emit('task:changed');
    } catch (error) { alert('Gagal menyimpan tugas.'); }
  }

  async function _completeTask(id) {
    const task = _tasks.find(t => t.id === id);
    if (!task) return;
    try {
      await DB.put('tasks', { ...task, status: 'done' });
      await _loadData();
      _renderContent();
      EventBus.emit('task:changed');
    } catch (error) { alert('Gagal menyelesaikan tugas.'); }
  }

  async function _deleteTask(id) {
    try {
      await DB.delete('tasks', id);
      _tasks = _tasks.filter(t => t.id !== id);
      _renderTaskRows();
      EventBus.emit('task:changed');
    } catch (error) { alert('Gagal menghapus tugas.'); }
  }

  function _saveQC(formData) {
    const data = {
      refType       : formData.get('refType'),
      refId         : Number(formData.get('refId')),
      checkedQty    : parseInt(formData.get('checkedQty')) || 0,
      passedQty     : parseInt(formData.get('passedQty')) || 0,
      failedQty     : parseInt(formData.get('failedQty')) || 0,
      failureReason : formData.get('failureReason').trim(),
      checkedBy     : Number(formData.get('checkedBy')) || null,
      checkedAt     : new Date().toISOString(),
    };
    if (!data.refId || data.checkedQty <= 0) { alert('Referensi dan Qty diperiksa wajib diisi.'); return; }
    _qcRecords.push(data);
    _saveQCRecords();
    _renderContent();
    EventBus.emit('qc:recorded');
  }

  // ─── Destroy ─────────────────────────────────────────────────
  function destroy() {
    _container?.replaceChildren();
    _container = null;
  }

  return { init, destroy };
})();