// ────────────────────────────────────────────────────────────────────────
//                          js/IndexedDBService.js (v1.2)
// ────────────────────────────────────────────────────────────────────────
//
// A simple IndexedDB wrapper to store, retrieve, and delete “annotation”
// records (for highlighting). Each record has an auto‐incremented numeric “id”
// and fields: { page, x, y, width, height }.
// Object store: “annotations” with keyPath “id” (autoIncrement).
//
// Public API:
//   openDB(): Promise<IDBDatabase>
//   createAnnotation(page: number, meta: {x, y, width, height}): Promise<number>
//   getAnnotationsForPage(page: number): Promise<Array<{id, x, y, width, height}>>
//   deleteAnnotation(id: number): Promise<void>
// ────────────────────────────────────────────────────────────────────────

const DB_NAME    = "annotations-db";
const DB_VERSION = 1;
const STORE_NAME = "annotations";

class IndexedDBService {
  constructor() {
    this._db = null;
  }

  // Open (or upgrade) the database; returns a Promise<IDBDatabase>
  async openDB() {
    if (this._db) {
      return this._db;
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        }
      };
      request.onsuccess = (event) => {
        this._db = event.target.result;
        resolve(this._db);
      };
      request.onerror = (event) => {
        console.error("IndexedDB open error:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  // Internal helper: get a transaction and object store in the specified mode
  async _getStore(mode = "readonly") {
    const db = await this.openDB();
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    return { store, tx };
  }

  /**
   * createAnnotation
   * @param {number} page
   * @param {{x: number, y: number, width: number, height: number}} meta
   * @returns {Promise<number>} - resolves to the newly created ID
   */
  async createAnnotation(page, meta) {
    const { store } = await this._getStore("readwrite");
    return new Promise((resolve, reject) => {
      const record = {
        page,
        x: meta.x,
        y: meta.y,
        width: meta.width,
        height: meta.height,
      };
      const request = store.add(record);
      request.onsuccess = (e) => {
        resolve(e.target.result);
      };
      request.onerror = (e) => {
        console.error("createAnnotation error:", e.target.error);
        reject(e.target.error);
      };
    });
  }

  /**
   * getAnnotationsForPage
   * @param {number} page
   * @returns {Promise<Array<{id: number, x: number, y: number, width: number, height: number}>>}
   */
  async getAnnotationsForPage(page) {
    const { store } = await this._getStore("readonly");
    return new Promise((resolve, reject) => {
      const results = [];
      const request = store.openCursor();
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const record = cursor.value;
          if (record.page === page) {
            results.push({
              id: record.id,
              x: record.x,
              y: record.y,
              width: record.width,
              height: record.height,
            });
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = (e) => {
        console.error("getAnnotationsForPage error:", e.target.error);
        reject(e.target.error);
      };
    });
  }

  /**
   * deleteAnnotation
   * @param {number} id
   * @returns {Promise<void>}
   */
  async deleteAnnotation(id) {
    const { store } = await this._getStore("readwrite");
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = (e) => {
        console.error("deleteAnnotation error:", e.target.error);
        reject(e.target.error);
      };
    });
  }
}

export default IndexedDBService;
