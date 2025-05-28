// js/IndexedDBService.js  – v4
// Universal wrapper: works with inline **and** out‑of‑line object‑store keys.
// -----------------------------------------------------------------------------
const DB_NAME    = 'GenAIPromptEBookReaderDB';
const DB_VERSION = 1;
const STORE      = 'userSettings';

let dbPromise;

function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE); // out‑of‑line keys by default
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
  return dbPromise;
}

export async function saveSetting(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
    let req;
    try {
      req = store.put(value, key); // out‑of‑line attempt
    } catch {
      // inline fallback
      const inlineKey = store.keyPath || 'id';
      const wrapped   = (typeof value === 'object' && value !== null)
        ? { ...value, [inlineKey]: key }
        : { [inlineKey]: key, value };
      req = store.put(wrapped);
    }
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function getSetting(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => {
      let val = req.result;
      if (val && typeof val === 'object' && 'value' in val) val = val.value;
      resolve(val);
    };
    req.onerror = () => reject(req.error);
  });
}

export { openDB as initDB };