// ────────────────────────────────────────────────────────────────────────
//                             js/state.js (v1.1)
// ────────────────────────────────────────────────────────────────────────
//
// A minimal key/value store in IndexedDB for “reader settings” (e.g. lastPage,
// theme, font size). We’ll store everything in one object store “settings”
// (keyPath: “key”, so “key” is a string, “value” can be anything).
//
// Public API:
//   readerState.get(key: string): Promise<any>
//   readerState.set(key: string, value: any): Promise<void>
// ────────────────────────────────────────────────────────────────────────

const STATE_DB_NAME    = "reader-state-db";
const STATE_DB_VERSION = 1;
const STATE_STORE_NAME = "settings";

class StateService {
  constructor() {
    this._db = null;
  }

  async openDB() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(STATE_DB_NAME, STATE_DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STATE_STORE_NAME)) {
          db.createObjectStore(STATE_STORE_NAME, { keyPath: "key" });
        }
      };
      request.onsuccess = (event) => {
        this._db = event.target.result;
        resolve(this._db);
      };
      request.onerror = (event) => {
        console.error("StateService open error:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  async _getStore(mode = "readonly") {
    const db = await this.openDB();
    const tx = db.transaction(STATE_STORE_NAME, mode);
    const store = tx.objectStore(STATE_STORE_NAME);
    return { store, tx };
  }

  /**
   * get
   * @param {string} key
   * @returns {Promise<any>}  resolves to the stored value or undefined
   */
  async get(key) {
    const { store } = await this._getStore("readonly");
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = (e) => {
        const result = e.target.result;
        resolve(result ? result.value : undefined);
      };
      request.onerror = (e) => {
        console.error("StateService get error:", e.target.error);
        reject(e.target.error);
      };
    });
  }

  /**
   * set
   * @param {string} key
   * @param {any} value
   * @returns {Promise<void>}
   */
  async set(key, value) {
    const { store } = await this._getStore("readwrite");
    return new Promise((resolve, reject) => {
      const record = { key, value };
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = (e) => {
        console.error("StateService set error:", e.target.error);
        reject(e.target.error);
      };
    });
  }
}

// Export a singleton
export const readerState = new StateService();
