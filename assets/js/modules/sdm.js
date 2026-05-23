/* ============================================================
   SDM.JS — Modul SDM: Karyawan, Absensi, Penggajian
   ============================================================ */
'use strict';

const SDMModule = (() => {
  // ─── Private State ───────────────────────────────────────────
  let _container   = null;
  let _currentTab  = 'employees'; // 'employees' | 'attendance' | 'payroll'
  let _employees   = [];
  let _attendance  = [];
  let _payroll     = [];

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
      const [employees, attendance, payroll] = await Promise.all([
        DB.getAll('employees'),
        DB.getAll('attendance'),
        DB.getAll('payroll'),
      ]);
      _employees  = employees;
      _attendance = attendance;
      _payroll    = payroll;
    } catch (error) {
      console.error('[SDMModule] Gagal memuat data:', error);
      _employees  = [];
      _attendance = [];
      _payroll    = [];
    }
  }

  // ─── Render ──────────────────────────────────────────────────
  function _render() {
    if (!_container) return;

    _container.innerHTML = `
      <div class="master-data">
        <div class="master-data__header">
          <h1 class="dashboard__title">SDM</h1>
          <div class="master-data__tabs">
            <button class="btn ${_currentTab === 'employees' ? 'btn--primary' : 'btn--ghost'}" data-tab="employees">👤 Karyawan</button>
            <button class="btn ${_currentTab === 'attendance' ? 'btn--primary' : 'btn--ghost'}" data-tab="attendance">📅 Absensi</button>
            <button class="btn ${_currentTab === 'payroll' ? 'btn--primary' : 'btn--ghost'}" data-tab="payroll">💵 Penggajian</button>
          </div>
        </div>
        <div id="sdm-content"></div>
      </div>
    `;

    _renderContent();
  }

  function _renderContent() {
    const contentEl = document.getElementById('sdm-content');
    if (!contentEl) return;

    if (_currentTab === 'employees') _renderEmployeeView(contentEl);
    else if (_currentTab === 'attendance') _renderAttendanceView(contentEl);
    else _renderPayrollView(contentEl);
  }

  // ─── View: Karyawan ─────────────────────────────────────────
  function _renderEmployeeView(container) {
    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__header">
          <h3 class="card__title">Tambah Karyawan</h3>
        </div>
        <div class="card__body">
          <form id="employee-form" autocomplete="off">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4);">
              <div class="form-group">
                <label for="emp-name">Nama Lengkap <span class="required">*</span></label>
                <input type="text" id="emp-name" name="name" required maxlength="200" placeholder="Nama">
              </div>
              <div class="form-group">
                <label for="emp-nik">NIK <span class="required">*</span></label>
                <input type="text" id="emp-nik" name="nik" required maxlength="50" placeholder="ID Karyawan">
              </div>
              <div class="form-group">
                <label for="emp-position">Jabatan</label>
                <input type="text" id="emp-position" name="position" maxlength="100" placeholder="Jabatan">
              </div>
              <div class="form-group">
                <label for="emp-department">Divisi</label>
                <input type="text" id="emp-department" name="department" maxlength="100" placeholder="Divisi">
              </div>
              <div class="form-group">
                <label for="emp-join">Tanggal Masuk</label>
                <input type="date" id="emp-join" name="joinDate">
              </div>
              <div class="form-group">
                <label for="emp-salary">Gaji Pokok (Rp) <span class="required">*</span></label>
                <input type="number" id="emp-salary" name="baseSalary" min="0" step="1000" required placeholder="0">
              </div>
              <div class="form-group">
                <label for="emp-salary-type">Tipe Gaji</label>
                <select id="emp-salary-type" name="salaryType">
                  <option value="monthly">Bulanan</option>
                  <option value="daily">Harian</option>
                  <option value="piecework">Borongan</option>
                </select>
              </div>
              <div class="form-group">
                <label for="emp-phone">Telepon</label>
                <input type="tel" id="emp-phone" name="phone" maxlength="20" placeholder="0812xxxx">
              </div>
              <div class="form-group" style="grid-column: span 2;">
                <label for="emp-address">Alamat</label>
                <textarea id="emp-address" name="address" maxlength="300" rows="2" placeholder="Alamat lengkap"></textarea>
              </div>
              <div class="form-group">
                <label for="emp-bank">Bank</label>
                <input type="text" id="emp-bank" name="bankAccount" maxlength="50" placeholder="Nama bank & no.rek">
              </div>
            </div>
            <button type="submit" class="btn btn--primary mt-4">💾 Simpan Karyawan</button>
          </form>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Daftar Karyawan — ${_employees.length} orang</caption>
          <thead>
            <tr>
              <th scope="col">NIK</th>
              <th scope="col">Nama</th>
              <th scope="col">Jabatan</th>
              <th scope="col" style="text-align:right;">Gaji Pokok</th>
              <th scope="col">Status</th>
              <th scope="col" style="width:80px;">Aksi</th>
            </tr>
          </thead>
          <tbody id="employee-tbody">
            ${_employees.length === 0 ? `<tr><td colspan="6" class="text-muted text-center">Belum ada karyawan.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (_employees.length > 0) _renderEmployeeRows();
  }

  function _renderEmployeeRows() {
    const tbody = document.getElementById('employee-tbody');
    if (!tbody) return;
    const fragment = document.createDocumentFragment();
    _employees.forEach(emp => {
      const tr = document.createElement('tr');
      tr.dataset.id = emp.id;
      tr.innerHTML = `
        <td><code>${Utils.escapeHtml(emp.nik)}</code></td>
        <td><strong>${Utils.escapeHtml(emp.name)}</strong></td>
        <td>${Utils.escapeHtml(emp.position || '-')}</td>
        <td class="text-right font-mono">${Utils.formatIDR(emp.baseSalary)}</td>
        <td><span class="badge ${emp.isActive !== false ? 'badge--success' : 'badge--neutral'}">${emp.isActive !== false ? 'Aktif' : 'Nonaktif'}</span></td>
        <td><button class="btn btn--sm btn--ghost" data-action="delete-employee">🗑️</button></td>
      `;
      fragment.appendChild(tr);
    });
    tbody.replaceChildren(fragment);
  }

  // ─── View: Absensi ──────────────────────────────────────────
  function _renderAttendanceView(container) {
    const today = new Date().toISOString().slice(0,10);
    const todayAttendance = _attendance.filter(a => a.date === today);

    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__header"><h3 class="card__title">Absensi Hari Ini (${Utils.formatDate(today)})</h3></div>
        <div class="card__body">
          <form id="attendance-form" autocomplete="off">
            <div style="display:flex; gap:var(--space-3); align-items:end; flex-wrap:wrap;">
              <div class="form-group" style="min-width:200px;">
                <label for="att-emp">Karyawan <span class="required">*</span></label>
                <select id="att-emp" required>
                  <option value="">-- Pilih --</option>
                  ${_employees.filter(e => e.isActive !== false).map(e => `<option value="${e.id}">${Utils.escapeHtml(e.name)}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="att-status">Status</label>
                <select id="att-status">
                  <option value="present">Hadir</option>
                  <option value="late">Terlambat</option>
                  <option value="sick">Sakit</option>
                  <option value="leave">Cuti</option>
                  <option value="absent">Tanpa Keterangan</option>
                </select>
              </div>
              <div class="form-group">
                <label for="att-checkin">Check-in</label>
                <input type="time" id="att-checkin" value="08:00">
              </div>
              <div class="form-group">
                <label for="att-checkout">Check-out</label>
                <input type="time" id="att-checkout" value="17:00">
              </div>
              <button type="submit" class="btn btn--primary" style="align-self:end;">✅ Catat Absensi</button>
            </div>
          </form>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Riwayat Absensi Hari Ini — ${todayAttendance.length} catatan</caption>
          <thead>
            <tr><th>Karyawan</th><th>Check-in</th><th>Check-out</th><th>Status</th><th>Jam Kerja</th></tr>
          </thead>
          <tbody id="attendance-tbody">
            ${todayAttendance.length === 0 ? `<tr><td colspan="5" class="text-muted text-center">Belum ada absensi hari ini.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (todayAttendance.length > 0) _renderAttendanceRows(todayAttendance);
  }

  function _renderAttendanceRows(attendanceList) {
    const tbody = document.getElementById('attendance-tbody');
    if (!tbody) return;
    const fragment = document.createDocumentFragment();
    attendanceList.forEach(a => {
      const emp = _employees.find(e => e.id === a.employeeId);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${emp ? Utils.escapeHtml(emp.name) : '-'}</td>
        <td>${a.checkIn || '-'}</td>
        <td>${a.checkOut || '-'}</td>
        <td><span class="badge badge--${a.status==='present'?'success':a.status==='late'?'warning':'danger'}">${a.status}</span></td>
        <td>${a.workHours ?? '-'} jam</td>
      `;
      fragment.appendChild(tr);
    });
    tbody.replaceChildren(fragment);
  }

  // ─── View: Penggajian ──────────────────────────────────────
  function _renderPayrollView(container) {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    container.innerHTML = `
      <div class="card" style="margin-bottom:var(--space-4);">
        <div class="card__header"><h3 class="card__title">Generate Slip Gaji</h3></div>
        <div class="card__body">
          <form id="payroll-form" autocomplete="off">
            <div style="display:flex; gap:var(--space-3); align-items:end; flex-wrap:wrap;">
              <div class="form-group" style="min-width:200px;">
                <label for="pay-emp">Karyawan <span class="required">*</span></label>
                <select id="pay-emp" required>
                  <option value="">-- Pilih --</option>
                  ${_employees.filter(e => e.isActive !== false).map(e => `<option value="${e.id}">${Utils.escapeHtml(e.name)} (${Utils.escapeHtml(e.nik)})</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label for="pay-period">Periode</label>
                <input type="text" id="pay-period" value="${period}" placeholder="YYYY-MM" maxlength="7">
              </div>
              <div class="form-group">
                <label for="pay-bonus">Bonus (Rp)</label>
                <input type="number" id="pay-bonus" min="0" step="1000" value="0">
              </div>
              <div class="form-group">
                <label for="pay-deduction">Potongan (Rp)</label>
                <input type="number" id="pay-deduction" min="0" step="1000" value="0">
              </div>
              <button type="submit" class="btn btn--primary" style="align-self:end;">💵 Simpan Slip Gaji</button>
            </div>
          </form>
        </div>
      </div>

      <div class="table-container">
        <table>
          <caption>Riwayat Penggajian — ${_payroll.length} slip</caption>
          <thead>
            <tr><th>Periode</th><th>Karyawan</th><th style="text-align:right;">Gaji Pokok</th><th style="text-align:right;">Bonus</th><th style="text-align:right;">Potongan</th><th style="text-align:right;">Bersih</th></tr>
          </thead>
          <tbody id="payroll-tbody">
            ${_payroll.length === 0 ? `<tr><td colspan="6" class="text-muted text-center">Belum ada slip gaji.</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    if (_payroll.length > 0) _renderPayrollRows();
  }

  function _renderPayrollRows() {
    const tbody = document.getElementById('payroll-tbody');
    if (!tbody) return;
    const fragment = document.createDocumentFragment();
    _payroll.sort((a,b) => b.period.localeCompare(a.period)).forEach(p => {
      const emp = _employees.find(e => e.id === p.employeeId);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${Utils.escapeHtml(p.period)}</td>
        <td>${emp ? Utils.escapeHtml(emp.name) : '-'}</td>
        <td class="text-right font-mono">${Utils.formatIDR(p.baseSalary)}</td>
        <td class="text-right font-mono">${Utils.formatIDR(p.bonus)}</td>
        <td class="text-right font-mono" style="color:var(--color-danger);">(${Utils.formatIDR(p.deduction)})</td>
        <td class="text-right font-mono" style="font-weight:700;">${Utils.formatIDR(p.netSalary)}</td>
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

      const delEmp = e.target.closest('[data-action="delete-employee"]');
      if (delEmp) {
        const tr = delEmp.closest('tr');
        const id = Number(tr?.dataset.id);
        if (id && confirm('Hapus karyawan ini?')) _deleteEmployee(id);
        return;
      }
    });

    _container.addEventListener('submit', (e) => {
      if (e.target.id === 'employee-form') {
        e.preventDefault();
        _saveEmployee(new FormData(e.target));
      }
      if (e.target.id === 'attendance-form') {
        e.preventDefault();
        _saveAttendance(new FormData(e.target));
      }
      if (e.target.id === 'payroll-form') {
        e.preventDefault();
        _savePayroll(new FormData(e.target));
      }
    });
  }

  // ─── Actions ─────────────────────────────────────────────────

  async function _saveEmployee(formData) {
    const data = {
      name        : formData.get('name').trim(),
      nik         : formData.get('nik').trim(),
      position    : formData.get('position').trim(),
      department  : formData.get('department').trim(),
      joinDate    : formData.get('joinDate') ? new Date(formData.get('joinDate')).toISOString() : null,
      baseSalary  : Utils.sanitizeNumber(formData.get('baseSalary')),
      salaryType  : formData.get('salaryType'),
      phone       : formData.get('phone').trim(),
      address     : formData.get('address').trim(),
      bankAccount : formData.get('bankAccount').trim(),
      isActive    : true,
    };
    if (!data.name || !data.nik) { alert('Nama dan NIK wajib diisi.'); return; }
    try {
      await DB.add('employees', data);
      await _loadData();
      _renderContent();
      EventBus.emit('sdm:changed');
    } catch (error) { alert('Gagal menyimpan karyawan.'); }
  }

  async function _saveAttendance(formData) {
    const employeeId = Number(formData.get('att-emp'));
    const status = formData.get('att-status');
    const checkIn = formData.get('att-checkin');
    const checkOut = formData.get('att-checkout');
    if (!employeeId) { alert('Karyawan wajib dipilih.'); return; }

    const today = new Date().toISOString().slice(0,10);
    // Cek duplikat
    const existing = _attendance.find(a => a.employeeId === employeeId && a.date === today);
    if (existing) { alert('Absensi karyawan ini sudah tercatat hari ini.'); return; }

    // Hitung jam kerja
    let workHours = 0;
    if (checkIn && checkOut) {
      const [h1, m1] = checkIn.split(':').map(Number);
      const [h2, m2] = checkOut.split(':').map(Number);
      workHours = (h2 + m2/60) - (h1 + m1/60);
      if (workHours < 0) workHours += 24;
    }

    const data = { employeeId, date: today, checkIn, checkOut, status, workHours: Math.round(workHours * 10) / 10, notes: '' };
    try {
      await DB.add('attendance', data);
      await _loadData();
      _renderContent();
      EventBus.emit('sdm:changed');
    } catch (error) { alert('Gagal mencatat absensi.'); }
  }

  async function _savePayroll(formData) {
    const employeeId = Number(formData.get('pay-emp'));
    const period     = formData.get('pay-period').trim();
    const bonus      = Utils.sanitizeNumber(formData.get('pay-bonus'));
    const deduction  = Utils.sanitizeNumber(formData.get('pay-deduction'));
    if (!employeeId || !period) { alert('Karyawan dan periode wajib diisi.'); return; }

    const emp = _employees.find(e => e.id === employeeId);
    if (!emp) { alert('Karyawan tidak ditemukan.'); return; }

    const baseSalary = emp.baseSalary ?? 0;
    const netSalary  = baseSalary + bonus - deduction;
    if (netSalary < 0) { alert('Gaji bersih tidak bisa negatif.'); return; }

    try {
      await DB.add('payroll', { employeeId, period, baseSalary, bonus, deduction, netSalary, createdAt: new Date().toISOString() });
      await _loadData();
      _renderContent();
      EventBus.emit('sdm:changed');
    } catch (error) { alert('Gagal menyimpan slip gaji.'); }
  }

  async function _deleteEmployee(id) {
    try {
      await DB.delete('employees', id);
      _employees = _employees.filter(e => e.id !== id);
      _renderEmployeeRows();
      EventBus.emit('sdm:changed');
    } catch (error) { alert('Gagal menghapus karyawan.'); }
  }

  // ─── Destroy ─────────────────────────────────────────────────
  function destroy() {
    _container?.replaceChildren();
    _container = null;
  }

  return { init, destroy };
})();