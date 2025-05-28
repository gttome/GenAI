export default class ProgressIndicator {
  constructor({ container, readerState }) {
    this.container = container;
    this.readerState = readerState;
    this._render();
    this._setupListeners();
  }

  _render() {
    this.container.innerHTML = `
      <div class="progress-indicator" aria-label="Reading progress">
        <span class="progress-indicator__label" aria-live="polite">Page 0 of 0</span>
        <progress class="progress-indicator__bar" max="100" value="0"></progress>
      </div>
    `;
    this.labelEl = this.container.querySelector('.progress-indicator__label');
    this.barEl = this.container.querySelector('.progress-indicator__bar');
  }

  _setupListeners() {
    const update = () => {
      const { currentLocationIndex, totalLocationCount } = this.readerState.get();
      const percent = totalLocationCount
        ? Math.round((currentLocationIndex / totalLocationCount) * 100)
        : 0;
      this.labelEl.textContent = `Page ${currentLocationIndex} of ${totalLocationCount}`;
      this.barEl.value = percent;
    };

    this.readerState.on('change', () => {
      clearTimeout(this._debounce);
      this._debounce = setTimeout(update, 100);
    });

    update();
  }

  update(currentIndex, totalCount) {
    this.readerState.set({ currentLocationIndex: currentIndex, totalLocationCount: totalCount });
  }
}