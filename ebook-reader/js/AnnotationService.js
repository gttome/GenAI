// js/AnnotationService.js — COMPLETE FILE with delete support
import { saveAnnotation, getAnnotations, deleteAnnotation as dbDel } from './IndexedDBService.js';

export default class AnnotationService {
  constructor(bookId) { this.bookId = bookId; }

  async addHighlightRect(rect) {
    const data = { ...rect, bookId: this.bookId, ts: Date.now() };
    const id = await saveAnnotation(data);
    return { ...data, id };
  }

  async getAnnotationsByPage(page) {
    const all = await getAnnotations(this.bookId);
    return all.filter(a => a.page === page);
  }

  async deleteAnnotation(id) { await dbDel(id); }
}