// js/IndexedDBService.js

const DB_NAME = 'pdf_reader_db';
const DB_VERSION = 2;
const SETTINGS_STORE = 'settings';
const HIGHLIGHTS_STORE = 'highlights';

/**
 * Open (or upgrade) the IndexedDB database.
 * Creates 'settings' and 'highlights' stores and necessary indexes.
 */
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      // Create settings store if needed
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
      // Create or upgrade highlights store
      if (!db.objectStoreNames.contains(HIGHLIGHTS_STORE)) {
        const store = db.createObjectStore(HIGHLIGHTS_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('documentId', 'documentId', { unique: false });
        store.createIndex('documentId_page', ['documentId', 'page'], { unique: false });
      } else if (event.oldVersion < 2) {
        const store = event.target.transaction.objectStore(HIGHLIGHTS_STORE);
        store.createIndex('documentId', 'documentId', { unique: false });
        store.createIndex('documentId_page', ['documentId', 'page'], { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a setting by key.
 * @param {string} key
 * @returns {IDBRequest}
 */
export function getSetting(key) {
  const promise = openDb().then(db => {
    const tx = db.transaction(SETTINGS_STORE, 'readonly');
    const store = tx.objectStore(SETTINGS_STORE);
    return store.get(key);
  });
  // Return the underlying IDBRequest
  return promise.then(req => req);
}

/**
 * Save a setting.
 * @param {string} key
 * @param {any} value
 */
export async function saveSetting(key, value) {
  const db = await openDb();
  const tx = db.transaction(SETTINGS_STORE, 'readwrite');
  const store = tx.objectStore(SETTINGS_STORE);
  store.put({ key, value });
}

/**
 * Add a highlight record for a specific document.
 * @param {string} documentId
 * @param {object} highlight  { page, x, y, w, h, color }
 * @returns {Promise<object>} The saved record with id
 */
export async function addHighlight(documentId, highlight) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HIGHLIGHTS_STORE, 'readwrite');
    const store = tx.objectStore(HIGHLIGHTS_STORE);
    const record = { ...highlight, documentId };
    const req = store.add(record);
    req.onsuccess = () => resolve({ id: req.result, ...record });
    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete a highlight by its id.
 * @param {number} id
 */
export async function deleteHighlight(id) {
  const db = await openDb();
  const tx = db.transaction(HIGHLIGHTS_STORE, 'readwrite');
  tx.objectStore(HIGHLIGHTS_STORE).delete(id);
}

/**
 * Get all highlights for a given document.
 * @param {string} documentId
 * @returns {Promise<object[]>}
 */
export async function getHighlightsByDocument(documentId) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HIGHLIGHTS_STORE, 'readonly');
    const store = tx.objectStore(HIGHLIGHTS_STORE);
    const index = store.index('documentId');
    const req = index.getAll(documentId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Get highlights for a specific document and page.
 * @param {string} documentId
 * @param {number} page
 * @returns {Promise<object[]>}
 */
export async function getHighlightsByDocumentAndPage(documentId, page) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HIGHLIGHTS_STORE, 'readonly');
    const store = tx.objectStore(HIGHLIGHTS_STORE);
    const index = store.index('documentId_page');
    const req = index.getAll([documentId, page]);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
