/* ============================================================
   UTILS.JS — Format, Escape, Generate ID, Debounce
   ============================================================ */
'use strict';

const Utils = (() => {
  // ─── Format Mata Uang ───────────────────────────────────────
  const _idrFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  function formatIDR(amount) {
    const num = sanitizeNumber(amount);
    return _idrFormatter.format(num);
  }

  // ─── Format Angka (tanpa simbol) ────────────────────────────
  const _numberFormatter = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  function formatNumber(num) {
    return _numberFormatter.format(sanitizeNumber(num));
  }

  // ─── Format Tanggal ─────────────────────────────────────────
  function formatDate(date, format = 'DD/MM/YYYY') {
    if (!date) return '-';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '-';

    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh   = String(d.getHours()).padStart(2, '0');
    const min  = String(d.getMinutes()).padStart(2, '0');

    return format
      .replace('DD', dd)
      .replace('MM', mm)
      .replace('YYYY', yyyy)
      .replace('hh', hh)
      .replace('mm', min);
  }

  // ─── Format ISO String ──────────────────────────────────────
  function toISO(date) {
    if (!date) return null;
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString();
  }

  // ─── Escape HTML (XSS Prevention) ───────────────────────────
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // ─── Sanitasi Angka ─────────────────────────────────────────
  function sanitizeNumber(value) {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    const cleaned = String(value).replace(/[^0-9.,\-]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }

  // ─── Generate ID ────────────────────────────────────────────
  function generateID(prefix = 'ID') {
    const timestamp = Date.now().toString(36);
    const random    = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
  }

  // ─── Generate Invoice/PO Number ─────────────────────────────
  function generateDocumentNumber(prefix, date = new Date()) {
    const d     = date.toISOString().slice(0, 10).replace(/-/g, '');
    const seq   = String(Date.now() % 10000).padStart(4, '0');
    return `${prefix}-${d}-${seq}`;
  }

  // ─── Debounce ───────────────────────────────────────────────
  function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ─── Deep Clone ─────────────────────────────────────────────
  function deepClone(obj) {
    return structuredClone(obj);
  }

  // ─── Truncate Text ──────────────────────────────────────────
  function truncate(str, maxLength = 50) {
    const s = String(str ?? '');
    return s.length > maxLength ? s.slice(0, maxLength) + '...' : s;
  }

  // ─── Public API ─────────────────────────────────────────────
  return {
    formatIDR,
    formatNumber,
    formatDate,
    toISO,
    escapeHtml,
    sanitizeNumber,
    generateID,
    generateDocumentNumber,
    debounce,
    deepClone,
    truncate,
  };
})();