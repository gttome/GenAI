// ────────────────────────────────────────────────────────────────────────
//                          js/settings.js (v1.0)
// ────────────────────────────────────────────────────────────────────────
//
// Handles saving and loading user settings (e.g., preferred theme) via readerState.
// This file replaces any previous getSetting/saveSetting usage.
// ────────────────────────────────────────────────────────────────────────

import { readerState } from "./state.js";

const themeSelector = document.getElementById("theme-selector");
const fontSizeInput = document.getElementById("font-size-input");

/**
 * Initialize settings UI: load saved values from readerState (IndexedDB) and apply.
 */
(async function initSettings() {
  // 1) Load saved theme
  try {
    const savedTheme = await readerState.get("reader-theme");
    if (savedTheme && ["light", "dark", "sepia"].includes(savedTheme)) {
      document.documentElement.setAttribute("data-theme", savedTheme);
      if (themeSelector) themeSelector.value = savedTheme;
    }
  } catch (e) {
    console.warn("Could not load saved theme:", e);
  }

  // 2) Load saved font size (if applicable)
  try {
    const savedFontSize = await readerState.get("reader-font-size");
    if (savedFontSize && fontSizeInput) {
      fontSizeInput.value = savedFontSize;
      document.body.style.fontSize = `${savedFontSize}px`;
    }
  } catch (e) {
    console.warn("Could not load saved font size:", e);
  }
})();

/**
 * When the user selects a new theme from the dropdown (if present),
 * save it to readerState and apply immediately.
 */
if (themeSelector) {
  themeSelector.addEventListener("change", async (e) => {
    const newTheme = e.target.value;
    document.documentElement.setAttribute("data-theme", newTheme);
    try {
      await readerState.set("reader-theme", newTheme);
    } catch (err) {
      console.error("Error saving theme:", err);
    }
  });
}

/**
 * When the user changes the font size input (if present),
 * save it and apply immediately.
 */
if (fontSizeInput) {
  fontSizeInput.addEventListener("input", async (e) => {
    const size = parseInt(e.target.value, 10);
    if (!isNaN(size)) {
      document.body.style.fontSize = `${size}px`;
      try {
        await readerState.set("reader-font-size", size);
      } catch (err) {
        console.error("Error saving font size:", err);
      }
    }
  });
}
