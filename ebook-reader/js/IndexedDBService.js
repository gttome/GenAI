// js/IndexedDBService.js
// Gen AI Prompt eBook Reader - IndexedDBService.js (v1)
// Service module for all IndexedDB operations.

const DB_NAME = 'GenAIPromptEBookReaderDB';
const DB_VERSION = 1;
const STORES = {
    USER_SETTINGS: 'userSettings',
    ANNOTATIONS: 'annotations'
};

let dbPromise = null;

/**
 * Initializes the IndexedDB database and creates object stores if needed.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 */
function initDB() {
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log(`[IndexedDBService] Upgrading database to version ${DB_VERSION}`);

            // User Settings Store
            if (!db.objectStoreNames.contains(STORES.USER_SETTINGS)) {
                db.createObjectStore(STORES.USER_SETTINGS, { keyPath: 'key' });
                console.log(`[IndexedDBService] Object store created: ${STORES.USER_SETTINGS}`);
            }

            // Annotations Store
            if (!db.objectStoreNames.contains(STORES.ANNOTATIONS)) {
                const annotationsStore = db.createObjectStore(STORES.ANNOTATIONS, { keyPath: 'id', autoIncrement: true });
                annotationsStore.createIndex('pdfIdentifier_idx', 'pdfIdentifier', { unique: false });
                annotationsStore.createIndex('pageNumber_idx', 'pageNumber', { unique: false });
                console.log(`[IndexedDBService] Object store created: ${STORES.ANNOTATIONS} with indexes.`);
            }
        };

        request.onsuccess = (event) => {
            console.log('[IndexedDBService] Database initialized successfully.');
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error('[IndexedDBService] Database error:', event.target.error);
            reject(event.target.error);
        };
    });
    return dbPromise;
}

/**
 * Saves or updates a setting in the userSettings store.
 * @param {string} key - The key for the setting.
 * @param {any} value - The value of the setting.
 * @returns {Promise<void>}
 */
async function saveSetting(key, value) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.USER_SETTINGS, 'readwrite');
        const store = transaction.objectStore(STORES.USER_SETTINGS);
        const request = store.put({ key: key, value: value });

        request.onsuccess = () => {
            // console.log(`[IndexedDBService] Setting saved: { ${key}:`, value, `}`);
            resolve();
        };
        request.onerror = (event) => {
            console.error(`[IndexedDBService] Error saving setting ${key}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Retrieves a setting from the userSettings store.
 * @param {string} key - The key of the setting to retrieve.
 * @returns {Promise<any|undefined>} A promise that resolves with the setting value or undefined if not found.
 */
async function getSetting(key) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.USER_SETTINGS, 'readonly');
        const store = transaction.objectStore(STORES.USER_SETTINGS);
        const request = store.get(key);

        request.onsuccess = (event) => {
            // console.log(`[IndexedDBService] Setting retrieved: { ${key}:`, event.target.result ? event.target.result.value : undefined, `}`);
            resolve(event.target.result ? event.target.result.value : undefined);
        };
        request.onerror = (event) => {
            console.error(`[IndexedDBService] Error getting setting ${key}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

// --- Placeholder Annotation Functions ---
// These will be fully implemented when we work on US-MVP-010 and US-MVP-011

/**
 * Adds an annotation to the annotations store.
 * @param {object} annotationData - The annotation object to save.
 * @returns {Promise<number>} A promise that resolves with the ID of the added annotation.
 */
async function addAnnotation(annotationData) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.ANNOTATIONS, 'readwrite');
        const store = transaction.objectStore(STORES.ANNOTATIONS);
        // Add pdfIdentifier if not present, or ensure it matches the current book
        // Add createdTimestamp
        const dataToStore = { ...annotationData, createdTimestamp: new Date() };
        const request = store.add(dataToStore);

        request.onsuccess = (event) => {
            console.log('[IndexedDBService] Annotation added, ID:', event.target.result);
            resolve(event.target.result); // Returns the ID of the new object
        };
        request.onerror = (event) => {
            console.error('[IndexedDBService] Error adding annotation:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Retrieves all annotations for a specific PDF.
 * @param {string} pdfIdentifier - The identifier of the PDF.
 * @returns {Promise<Array<object>>} A promise that resolves with an array of annotation objects.
 */
async function getAnnotationsForBook(pdfIdentifier) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.ANNOTATIONS, 'readonly');
        const store = transaction.objectStore(STORES.ANNOTATIONS);
        const index = store.index('pdfIdentifier_idx');
        const request = index.getAll(pdfIdentifier);

        request.onsuccess = (event) => {
            console.log(`[IndexedDBService] Annotations retrieved for ${pdfIdentifier}:`, event.target.result);
            resolve(event.target.result || []);
        };
        request.onerror = (event) => {
            console.error(`[IndexedDBService] Error getting annotations for ${pdfIdentifier}:`, event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Updates an existing annotation.
 * @param {object} annotationData - The annotation object to update (must include its 'id').
 * @returns {Promise<void>}
 */
async function updateAnnotation(annotationData) {
    if (!annotationData.id) {
        return Promise.reject(new Error("Annotation ID is required for update."));
    }
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.ANNOTATIONS, 'readwrite');
        const store = transaction.objectStore(STORES.ANNOTATIONS);
        const request = store.put(annotationData); // put will update if key exists

        request.onsuccess = () => {
            console.log('[IndexedDBService] Annotation updated:', annotationData.id);
            resolve();
        };
        request.onerror = (event) => {
            console.error('[IndexedDBService] Error updating annotation:', event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Deletes an annotation by its ID.
 * @param {number} annotationId - The ID of the annotation to delete.
 * @returns {Promise<void>}
 */
async function deleteAnnotation(annotationId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.ANNOTATIONS, 'readwrite');
        const store = transaction.objectStore(STORES.ANNOTATIONS);
        const request = store.delete(annotationId);

        request.onsuccess = () => {
            console.log('[IndexedDBService] Annotation deleted:', annotationId);
            resolve();
        };
        request.onerror = (event) => {
            console.error('[IndexedDBService] Error deleting annotation:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Export functions to be used by other modules
// This pattern makes it easy to import: import { initDB, saveSetting, getSetting } from './IndexedDBService.js';
export {
    initDB,
    saveSetting,
    getSetting,
    addAnnotation,
    getAnnotationsForBook,
    updateAnnotation,
    deleteAnnotation,
    STORES // Export store names if needed elsewhere
};
