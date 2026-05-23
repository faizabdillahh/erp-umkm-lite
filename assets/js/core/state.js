/* ============================================================
   STATE.JS — Global State & Cache Management
   ============================================================ */
'use strict';

const AppState = (() => {
  // ─── Constants ───────────────────────────────────────────────
  const CACHE_DEFAULT_TTL = 5 * 60 * 1000; // 5 menit

  // ─── Private State ───────────────────────────────────────────
  const _state = {
    currentUser: null,
    currentModule: 'dashboard',
    settings: {},
  };

  const _cache = {
    data: {},
    timestamps: {},
  };

  // ─── State Methods ──────────────────────────────────────────

  function get(key) {
    return _state[key];
  }

  function set(key, value) {
    const oldValue = _state[key];

    // Jangan emit event jika nilai tidak berubah
    if (JSON.stringify(oldValue) === JSON.stringify(value)) {
      return;
    }

    _state[key] = value;
    EventBus.emit('state:changed', { key, oldValue, newValue: value });
    EventBus.emit(`state:${key}:changed`, { oldValue, newValue: value });
  }

  function getState() {
    // Kembalikan salinan immutable (shallow copy aman untuk dashboard)
    return { ..._state };
  }

  // ─── Settings helpers ────────────────────────────────────────

  function getSetting(key, defaultValue = null) {
    return _state.settings[key] ?? defaultValue;
  }

  async function loadSettings() {
    try {
      const rows = await DB.getAll('settings');
      const settings = {};
      rows.forEach(row => {
        settings[row.key] = row.value;
      });
      _state.settings = settings;
      EventBus.emit('settings:loaded', settings);
      return settings;
    } catch (error) {
      console.error('[AppState] Gagal memuat settings:', error);
      return {};
    }
  }

  async function saveSetting(key, value) {
    try {
      await DB.put('settings', { key, value });
      _state.settings[key] = value;
      EventBus.emit('settings:updated', { key, value });
    } catch (error) {
      console.error('[AppState] Gagal menyimpan setting:', error);
      throw error;
    }
  }

  // ─── Cache Methods ───────────────────────────────────────────

  function cacheGet(cacheKey) {
    if (!_cache.data.hasOwnProperty(cacheKey)) return null;

    const ttl = _cache.timestamps[cacheKey] ?? 0;
    if (Date.now() > ttl) {
      cacheInvalidate(cacheKey);
      return null;
    }

    return _cache.data[cacheKey];
  }

  function cacheSet(cacheKey, data, ttl = CACHE_DEFAULT_TTL) {
    _cache.data[cacheKey] = data;
    _cache.timestamps[cacheKey] = Date.now() + ttl;
  }

  function cacheInvalidate(cacheKey) {
    if (cacheKey) {
      delete _cache.data[cacheKey];
      delete _cache.timestamps[cacheKey];
    } else {
      // Clear all cache jika tidak ada key spesifik
      _cache.data = {};
      _cache.timestamps = {};
    }
  }

  function cacheHas(cacheKey) {
    return cacheGet(cacheKey) !== null;
  }

  // ─── Public API ─────────────────────────────────────────────
  return {
    get,
    set,
    getState,
    getSetting,
    loadSettings,
    saveSetting,
    cacheGet,
    cacheSet,
    cacheInvalidate,
    cacheHas,
  };
})();