// js/AnnotationPopup.js — COMPLETE FILE with user hint text

export default class AnnotationPopup {
  /**
   * @param {function(Object)} onColorSelect receives { page,x,y,w,h,color }
   * @param {function(number)} onDelete      receives annotation id to delete
   */
  constructor(onColorSelect, onDelete) {
    this.onColorSelect = onColorSelect;
    this.onDelete      = onDelete;
    this.popup = null;
  }

  /* ------------------------------------------------------
     Show popup for creating a new rectangle highlight
     ------------------------------------------------------ */
  showColor(x, y, rectMeta) {
    this.remove();
    const pop = this.#createBase(x, y);
    pop.innerHTML = `
      <p class="annotation-popup__hint">Highlight -> click, drag, pick a color</p>
      <div class="annotation-popup__colors">
        <button class="annotation-popup__swatch" data-color="yellow"></button>
        <button class="annotation-popup__swatch" data-color="green"></button>
        <button class="annotation-popup__swatch" data-color="pink"></button>
      </div>
      <button class="annotation-popup__close">Close</button>`;

    // color swatch listeners
    pop.querySelectorAll('.annotation-popup__swatch').forEach(btn =>
      btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        this.onColorSelect({ ...rectMeta, color });
        this.remove();
      }));

    pop.querySelector('.annotation-popup__close')
        .addEventListener('click', () => this.remove());
  }

  /* ------------------------------------------------------
     Show popup for deleting an existing highlight
     ------------------------------------------------------ */
  showDelete(x, y, annoId) {
    this.remove();
    const pop = this.#createBase(x, y);
    pop.innerHTML = `<button class="annotation-popup__close">Delete highlight</button>`;
    pop.querySelector('.annotation-popup__close')
        .addEventListener('click', () => {
          this.onDelete(annoId);
          this.remove();
        });
  }

  /* ------------------------------------------------------
     Internal helpers
     ------------------------------------------------------ */
  #createBase(x, y) {
    const div = document.createElement('div');
    div.className = 'annotation-popup';
    div.style.left = `${x}px`;
    div.style.top  = `${y}px`;
    document.body.appendChild(div);
    this.popup = div;
    return div;
  }

  remove() {
    if (this.popup) {
      this.popup.remove();
      this.popup = null;
    }
  }
}
