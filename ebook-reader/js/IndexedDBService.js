// js/IndexedDBService.js — COMPLETE FILE (settings + annotations CRUD)
const DB_NAME = 'gptReaderDB';
const DB_VERSION = 3;
const SETTINGS_STORE = 'settings';
const ANNO_STORE = 'annotations';

let dbPromise = null;
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE);
      if (!db.objectStoreNames.contains(ANNO_STORE)) {
        const store = db.createObjectStore(ANNO_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('page', 'page', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

/* ================= Settings helpers ================= */
export async function getSetting(key) {
  const db = await openDB();
  return new Promise(r => {
    const tx = db.transaction(SETTINGS_STORE, 'readonly');
    r(tx.objectStore(SETTINGS_STORE).get(key));
  });
}
export async function saveSetting(key, value) {
  const db = await openDB();
  return new Promise(r => {
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    tx.objectStore(SETTINGS_STORE).put(value, key);
    tx.oncomplete = () => r();
  });
}

/* ================= Annotation helpers ================= */
export async function saveAnnotation(anno) {
  const db = await openDB();
  return new Promise(r => {
    const tx = db.transaction(ANNO_STORE, 'readwrite');
    const idReq = tx.objectStore(ANNO_STORE).add(anno);
    idReq.onsuccess = () => r(idReq.result);
  });
}
export async function getAnnotations(bookId) {
  const db = await openDB();
  return new Promise(r => {
    const tx = db.transaction(ANNO_STORE, 'readonly');
    const os = tx.objectStore(ANNO_STORE);
    const allReq = os.getAll();
    allReq.onsuccess = () => r(allReq.result.filter(a => a.bookId === bookId));
  });
}
export async function deleteAnnotation(id) {
  const db = await openDB();
  return new Promise(r => {
    const tx = db.transaction(ANNO_STORE, 'readwrite');
    tx.objectStore(ANNO_STORE).delete(id);
    tx.oncomplete = () => r();
  });
}