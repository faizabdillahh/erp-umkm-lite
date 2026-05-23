/* ============================================================
   DB.JS — IndexedDB Wrapper (Promise-based, Atomic Transaction)
   ============================================================ */
'use strict';

const DB = (() => {
  // ─── Constants ───────────────────────────────────────────────
  const DB_NAME    = 'umkm_erp_db';
  const DB_VERSION = 1; // Increment jika ada migrasi skema

  // ─── Private State ───────────────────────────────────────────
  let _db = null;

  // ─── Custom Error ────────────────────────────────────────────
  class DBError extends Error {
    constructor(message, cause) {
      super(message);
      this.name    = 'DBError';
      this.cause   = cause ?? null;
      this.code    = 'DB_ERROR';
    }
  }

  // ─── Open Database ───────────────────────────────────────────
  async function open() {
    if (_db) return _db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db      = event.target.result;
        const oldVer  = event.oldVersion;

        if (oldVer < 1) _setupV1(db);
        // Migrasi selanjutnya:
        // if (oldVer < 2) _migrateV2(db);
        // if (oldVer < 3) _migrateV3(db);
      };

      request.onsuccess = (event) => {
        _db = event.target.result;
        _db.onclose = () => { _db = null; };
        resolve(_db);
      };

      request.onerror = (event) => {
        reject(new DBError('Gagal membuka database', event.target.error));
      };

      request.onblocked = () => {
        console.warn('[DB] Database diblokir. Tutup tab lain yang membuka aplikasi ini.');
        reject(new DBError('Database diblokir'));
      };
    });
  }

  // ─── Setup V1: Semua Object Store & Index ────────────────────
  function _setupV1(db) {
    // products
    const productsStore = db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
    productsStore.createIndex('sku',      'sku',      { unique: true });
    productsStore.createIndex('category', 'categoryId', { unique: false });
    productsStore.createIndex('isActive', 'isActive', { unique: false });

    // categories
    const categoriesStore = db.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
    categoriesStore.createIndex('name', 'name', { unique: true });
    categoriesStore.createIndex('type', 'type', { unique: false });

    // units
    const unitsStore = db.createObjectStore('units', { keyPath: 'id', autoIncrement: true });
    unitsStore.createIndex('name', 'name', { unique: true });

    // customers
    const customersStore = db.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
    customersStore.createIndex('name',  'name',  { unique: false });
    customersStore.createIndex('phone', 'phone', { unique: false });
    customersStore.createIndex('segment', 'segment', { unique: false });

    // suppliers
    const suppliersStore = db.createObjectStore('suppliers', { keyPath: 'id', autoIncrement: true });
    suppliersStore.createIndex('name',  'name',  { unique: false });
    suppliersStore.createIndex('phone', 'phone', { unique: false });

    // sales
    const salesStore = db.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
    salesStore.createIndex('date',       'date',       { unique: false });
    salesStore.createIndex('customerId', 'customerId', { unique: false });
    salesStore.createIndex('status',     'status',     { unique: false });
    salesStore.createIndex('date_status', ['date', 'status'], { unique: false });

    // sale_items
    const saleItemsStore = db.createObjectStore('sale_items', { keyPath: 'id', autoIncrement: true });
    saleItemsStore.createIndex('saleId',    'saleId',    { unique: false });
    saleItemsStore.createIndex('productId', 'productId', { unique: false });

    // purchases
    const purchasesStore = db.createObjectStore('purchases', { keyPath: 'id', autoIncrement: true });
    purchasesStore.createIndex('date',       'date',       { unique: false });
    purchasesStore.createIndex('supplierId', 'supplierId', { unique: false });
    purchasesStore.createIndex('status',     'status',     { unique: false });

    // purchase_items
    const purchaseItemsStore = db.createObjectStore('purchase_items', { keyPath: 'id', autoIncrement: true });
    purchaseItemsStore.createIndex('purchaseId', 'purchaseId', { unique: false });
    purchaseItemsStore.createIndex('productId',  'productId',  { unique: false });

    // inventory (mutasi stok)
    const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id', autoIncrement: true });
    inventoryStore.createIndex('productId', 'productId', { unique: false });
    inventoryStore.createIndex('date',      'date',      { unique: false });
    inventoryStore.createIndex('type',      'type',      { unique: false });
    inventoryStore.createIndex('refId',     'refId',     { unique: false });

    // raw_materials
    const rawMaterialsStore = db.createObjectStore('raw_materials', { keyPath: 'id', autoIncrement: true });
    rawMaterialsStore.createIndex('name',       'name',       { unique: false });
    rawMaterialsStore.createIndex('categoryId', 'categoryId', { unique: false });

    // bom (Bill of Materials)
    const bomStore = db.createObjectStore('bom', { keyPath: 'id', autoIncrement: true });
    bomStore.createIndex('productId',  'productId',  { unique: false });
    bomStore.createIndex('materialId', 'materialId', { unique: false });

    // production_orders
    const productionOrdersStore = db.createObjectStore('production_orders', { keyPath: 'id', autoIncrement: true });
    productionOrdersStore.createIndex('date',      'date',      { unique: false });
    productionOrdersStore.createIndex('productId', 'productId', { unique: false });
    productionOrdersStore.createIndex('status',    'status',    { unique: false });

    // expenses
    const expensesStore = db.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
    expensesStore.createIndex('date',     'date',     { unique: false });
    expensesStore.createIndex('category', 'category', { unique: false });
    expensesStore.createIndex('type',     'type',     { unique: false });

    // incomes
    const incomesStore = db.createObjectStore('incomes', { keyPath: 'id', autoIncrement: true });
    incomesStore.createIndex('date',   'date',   { unique: false });
    incomesStore.createIndex('source', 'source', { unique: false });

    // cash_flow
    const cashFlowStore = db.createObjectStore('cash_flow', { keyPath: 'id', autoIncrement: true });
    cashFlowStore.createIndex('date', 'date', { unique: false });
    cashFlowStore.createIndex('type', 'type', { unique: false });

    // assets
    const assetsStore = db.createObjectStore('assets', { keyPath: 'id', autoIncrement: true });
    assetsStore.createIndex('type',         'type',         { unique: false });
    assetsStore.createIndex('purchaseDate', 'purchaseDate', { unique: false });

    // employees
    const employeesStore = db.createObjectStore('employees', { keyPath: 'id', autoIncrement: true });
    employeesStore.createIndex('name',       'name',       { unique: false });
    employeesStore.createIndex('department', 'department', { unique: false });

    // attendance
    const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id', autoIncrement: true });
    attendanceStore.createIndex('employeeId', 'employeeId', { unique: false });
    attendanceStore.createIndex('date',       'date',       { unique: false });

    // payroll
    const payrollStore = db.createObjectStore('payroll', { keyPath: 'id', autoIncrement: true });
    payrollStore.createIndex('employeeId', 'employeeId', { unique: false });
    payrollStore.createIndex('period',     'period',     { unique: false });

    // marketing_campaigns
    const campaignsStore = db.createObjectStore('marketing_campaigns', { keyPath: 'id', autoIncrement: true });
    campaignsStore.createIndex('startDate', 'startDate', { unique: false });
    campaignsStore.createIndex('status',    'status',    { unique: false });

    // leads
    const leadsStore = db.createObjectStore('leads', { keyPath: 'id', autoIncrement: true });
    leadsStore.createIndex('campaignId', 'campaignId', { unique: false });
    leadsStore.createIndex('status',     'status',     { unique: false });

    // tasks
    const tasksStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
    tasksStore.createIndex('dueDate',    'dueDate',    { unique: false });
    tasksStore.createIndex('status',     'status',     { unique: false });
    tasksStore.createIndex('assignedTo', 'assignedTo', { unique: false });

    // documents
    const documentsStore = db.createObjectStore('documents', { keyPath: 'id', autoIncrement: true });
    documentsStore.createIndex('type',  'type',  { unique: false });
    documentsStore.createIndex('refId', 'refId', { unique: false });
    documentsStore.createIndex('date',  'date',  { unique: false });

    // settings (key-value store, keyPath = 'key')
    db.createObjectStore('settings', { keyPath: 'key' });

    // audit_log
    const auditLogStore = db.createObjectStore('audit_log', { keyPath: 'id', autoIncrement: true });
    auditLogStore.createIndex('table',     'table',     { unique: false });
    auditLogStore.createIndex('action',    'action',    { unique: false });
    auditLogStore.createIndex('timestamp', 'timestamp', { unique: false });
  }

  // ─── Transaction Helper ──────────────────────────────────────
  async function transaction(storeNames, mode, callback) {
    const db = await open();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, mode);
      let result;

      try {
        result = callback(tx);
      } catch (err) {
        reject(new DBError('Error dalam transaksi', err));
        return;
      }

      tx.oncomplete = () => resolve(result);
      tx.onerror    = (e) => reject(new DBError('Transaksi gagal', e.target.error));
      tx.onabort    = (e) => reject(new DBError('Transaksi dibatalkan', e.target.error));
    });
  }

  // ─── CRUD Operations ────────────────────────────────────────

  async function add(storeName, data) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req   = store.add(data);

      req.onsuccess = (e) => resolve(e.target.result); // return generated key
      tx.onerror    = (e) => reject(new DBError(`Gagal menambah ke ${storeName}`, e.target.error));
    });
  }

  async function put(storeName, data) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req   = store.put(data);

      req.onsuccess = (e) => resolve(e.target.result);
      tx.onerror    = (e) => reject(new DBError(`Gagal mengupdate ${storeName}`, e.target.error));
    });
  }

  async function get(storeName, id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req   = store.get(id);

      req.onsuccess = () => resolve(req.result ?? null);
      tx.onerror    = (e) => reject(new DBError(`Gagal membaca ${storeName}`, e.target.error));
    });
  }

  async function getAll(storeName, filter = null) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req   = filter ? store.getAll(filter) : store.getAll();

      req.onsuccess = () => resolve(req.result ?? []);
      tx.onerror    = (e) => reject(new DBError(`Gagal membaca semua ${storeName}`, e.target.error));
    });
  }

  async function remove(storeName, id) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req   = store.delete(id);

      req.onsuccess = () => resolve(true);
      tx.onerror    = (e) => reject(new DBError(`Gagal menghapus dari ${storeName}`, e.target.error));
    });
  }

  async function count(storeName, query = null) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req   = query ? store.count(query) : store.count();

      req.onsuccess = () => resolve(req.result);
      tx.onerror    = (e) => reject(new DBError(`Gagal menghitung ${storeName}`, e.target.error));
    });
  }

  async function getByIndex(storeName, indexName, value) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);

      // IDBKeyRange untuk range query, atau single value
      const keyRange = (value instanceof IDBKeyRange) ? value : IDBKeyRange.only(value);
      const req      = index.getAll(keyRange);

      req.onsuccess = () => resolve(req.result ?? []);
      tx.onerror    = (e) => reject(new DBError(`Gagal query index ${indexName}`, e.target.error));
    });
  }

  async function bulkAdd(storeName, dataArray) {
    return transaction(storeName, 'readwrite', (tx) => {
      const store = tx.objectStore(storeName);
      const results = [];
      for (const data of dataArray) {
        const req = store.add(data);
        results.push(new Promise((resolve, reject) => {
          req.onsuccess = () => resolve(req.result);
          req.onerror   = (e) => reject(e.target.error);
        }));
      }
      return Promise.allSettled(results);
    });
  }

  // ─── Public API ─────────────────────────────────────────────
  return {
    open,
    transaction,
    add,
    put,
    get,
    getAll,
    delete: remove,
    count,
    getByIndex,
    bulkAdd,
    DBError,
  };
})();