// js/AnnotationService.js

import {
  addHighlight,
  deleteHighlight,
  getHighlightsByDocument,
  getHighlightsByDocumentAndPage
} from "./IndexedDBService.js";

/**
 * AnnotationService handles CRUD for PDF highlights tied to a specific document.
 */
export default class AnnotationService {
  /**
   * @param {string} documentId  Unique ID for the PDF file
   */
  constructor(documentId) {
    this.documentId = documentId;
  }

  /**
   * Fetch all highlights for the current document (all pages).
   * @returns {Promise<object[]>}
   */
  async getAllHighlights() {
    return await getHighlightsByDocument(this.documentId);
  }

  /**
   * Fetch highlights for a specific page of the current document.
   * @param {number} page
   * @returns {Promise<object[]>}
   */
  async getAnnotationsForPage(page) {
    return await getHighlightsByDocumentAndPage(this.documentId, page);
  }

  /**
   * Create and store a new highlight for the current document.
   * @param {number} page
   * @param {{x:number,y:number,w:number,h:number,color:string}} rect
   * @returns {Promise<number>} The new highlight's ID
   */
  async createAnnotation(page, rect) {
    const { id } = await addHighlight(this.documentId, { page, ...rect });
    return id;
  }

  /**
   * Delete an existing highlight by its ID.
   * @param {number} id
   */
  async deleteAnnotation(id) {
    await deleteHighlight(id);
  }
}
