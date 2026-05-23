/* ============================================================
   EVENTBUS.JS — Pub/Sub Event System
   ============================================================ */
'use strict';

const EventBus = (() => {
  // ─── Private State ───────────────────────────────────────────
  const _listeners = new Map();

  // ─── Subscribe ───────────────────────────────────────────────
  function on(event, handler) {
    if (typeof handler !== 'function') {
      console.error('[EventBus] Handler harus berupa function');
      return () => {};
    }

    if (!_listeners.has(event)) {
      _listeners.set(event, new Set());
    }
    _listeners.get(event).add(handler);

    // Return unsubscribe function
    return () => off(event, handler);
  }

  // ─── Unsubscribe ────────────────────────────────────────────
  function off(event, handler) {
    const handlers = _listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        _listeners.delete(event);
      }
    }
  }

  // ─── Emit (Fire) ────────────────────────────────────────────
  function emit(event, data) {
    const handlers = _listeners.get(event);
    if (!handlers || handlers.size === 0) return;

    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`[EventBus] Error in handler for "${event}":`, error);
      }
    });
  }

  // ─── Once (Subscribe satu kali) ─────────────────────────────
  function once(event, handler) {
    if (typeof handler !== 'function') {
      console.error('[EventBus] Handler harus berupa function');
      return;
    }

    const wrapper = (data) => {
      handler(data);
      off(event, wrapper);
    };
    on(event, wrapper);
  }

  // ─── Clear semua listener ────────────────────────────────────
  function clear() {
    _listeners.clear();
  }

  // ─── Debug: list semua event yang aktif ─────────────────────
  function debug() {
    const result = {};
    _listeners.forEach((handlers, event) => {
      result[event] = handlers.size;
    });
    return result;
  }

  // ─── Public API ─────────────────────────────────────────────
  return {
    on,
    off,
    emit,
    once,
    clear,
    debug,
  };
})();