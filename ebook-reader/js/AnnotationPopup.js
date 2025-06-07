// AnnotationPopup.js
// ----------------------------------------------------------------------------
// [AI-ASSISTED] Updated 2025-06-04
// Renders a small popup for creating or deleting annotations.
// All user‐facing strings are localized via i18next.t(...).
// ----------------------------------------------------------------------------

class AnnotationPopup {
  constructor(onCreate, onDelete) {
    this.onCreate = onCreate;
    this.onDelete = onDelete;

    // Create the popup container (hidden by default)
    this.popupElement = document.createElement("div");
    this.popupElement.className = "annotation-popup hidden";
    this.popupElement.style.position = "absolute";
    document.body.appendChild(this.popupElement);
  }

  /**
   * Show the “Create Annotation” button at (x, y) screen coordinates.
   * @param {number} x – X coordinate in pixels
   * @param {number} y – Y coordinate in pixels
   */
  showCreate(x, y) {
    const createText = i18next.t("annotation.create_button");
    this.popupElement.innerHTML = `<button id="popup-confirm">${createText}</button>`;
    this.popupElement.style.left = `${x}px`;
    this.popupElement.style.top = `${y}px`;
    this.popupElement.classList.remove("hidden");

    const confirmBtn = document.getElementById("popup-confirm");
    confirmBtn.onclick = () => {
      this.hide();
      this.onCreate();
    };
  }

  /**
   * Show the “Delete Annotation” button at (x,y).
   * @param {number} x – X coordinate in pixels
   * @param {number} y – Y coordinate in pixels
   * @param {string|number} id – Annotation ID to delete
   */
  showDelete(x, y, id) {
    const deleteText = i18next.t("annotation.delete_button");
    this.popupElement.innerHTML = `<button id="popup-delete">${deleteText}</button>`;
    this.popupElement.style.left = `${x}px`;
    this.popupElement.style.top = `${y}px`;
    this.popupElement.classList.remove("hidden");

    const deleteBtn = document.getElementById("popup-delete");
    deleteBtn.onclick = () => {
      this.hide();
      this.onDelete(id);
    };
  }

  /**
   * Hide the popup.
   */
  hide() {
    this.popupElement.classList.add("hidden");
    this.popupElement.innerHTML = "";
  }
}

export default AnnotationPopup;
