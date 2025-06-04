// ────────────────────────────────────────────────────────────────────────
//                          js/AnnotationService.js (v1.2)
// ────────────────────────────────────────────────────────────────────────
//
// A thin wrapper around IndexedDBService to manage annotations on each page.
// This ensures that deletes actually hit IndexedDB and persist across reloads.
// ────────────────────────────────────────────────────────────────────────

import IndexedDBService from "./IndexedDBService.js";

class AnnotationService {
  constructor(documentId) {
    // documentId isn’t strictly used here, but could be used to namespace
    // if you wanted separate stores per PDF. In this example, we store
    // all annotations in one global “annotations” store.
    this.documentId = documentId;
    this.dbService  = new IndexedDBService();
  }

  /**
   * getAnnotationsForPage
   * @param {number} page
   * @returns {Promise<Array<{id: number, x: number, y: number, width: number, height: number}>>}
   */
  async getAnnotationsForPage(page) {
    return this.dbService.getAnnotationsForPage(page);
  }

  /**
   * createAnnotation
   * @param {number} page
   * @param {{x: number, y: number, width: number, height: number}} meta
   * @returns {Promise<number>} - resolves to the new annotation’s ID
   */
  async createAnnotation(page, meta) {
    return this.dbService.createAnnotation(page, meta);
  }

  /**
   * deleteAnnotation
   * @param {number} id
   * @returns {Promise<void>}
   */
  async deleteAnnotation(id) {
    return this.dbService.deleteAnnotation(id);
  }
}

export default AnnotationService;
