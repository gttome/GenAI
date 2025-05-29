// js/FloatingToolbar.js
// Displays a color-pick toolbar on text selection

import AnnotationService from './AnnotationService.js';

export default class FloatingToolbar {
  constructor(annotationService) {
    this.annotationService = annotationService;
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'floating-toolbar';
    this.toolbar.style.display = 'none';
    document.body.appendChild(this.toolbar);
    this._buildButtons();
    document.addEventListener('selectionchange', () => this._onSelectionChange());
  }

  _buildButtons() {
    ['yellow', 'green', 'pink'].forEach(color => {
      const btn = document.createElement('button');
      btn.className = `floating-toolbar__button floating-toolbar__button--${color}`;
      btn.title = `Highlight ${color}`;
      btn.addEventListener('click', () => this._applyHighlight(color));
      this.toolbar.appendChild(btn);
    });
  }

  _onSelectionChange() {
    const selection = window.getSelection();
    if (selection.isCollapsed) {
      this.toolbar.style.display = 'none';
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    this.toolbar.style.top = `${rect.top - this.toolbar.offsetHeight - 8 + window.scrollY}px`;
    this.toolbar.style.left = `${rect.left + window.scrollX}px`;
    this.toolbar.style.display = 'flex';
  }

  async _applyHighlight(color) {
    const selection = window.getSelection();
    if (selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const annotation = await this.annotationService.addHighlight(range, color);
    const span = document.createElement('span');
    span.className = `highlight highlight--${color}`;
    span.dataset.id = annotation.id;
    range.surroundContents(span);
    selection.removeAllRanges();
    this.toolbar.style.display = 'none';
  }
}
