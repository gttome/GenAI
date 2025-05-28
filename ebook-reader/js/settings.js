// js/settings.js
import { getSetting, saveSetting } from './IndexedDBService.js';

/**
 * Apply the given theme by toggling classes on the <html> element.
 * @param {'light'|'dark'|'sepia'} theme
 */
function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
  root.classList.add(`theme-${theme}`);
  saveSetting('theme', theme);
}

function initSettings() {
  // Progress Toggle
  const toggle = document.querySelector('#toggle-progress');
  if (toggle) {
    toggle.addEventListener('change', e => {
      const visible = e.target.checked;
      document.getElementById('progress-indicator').style.display = visible ? 'flex' : 'none';
      saveSetting('showProgress', visible);
    });
  }

  // Theme Buttons
  const themeButtons = {
    light: document.getElementById('theme-light'),
    dark: document.getElementById('theme-dark'),
    sepia: document.getElementById('theme-sepia')
  };

  Object.entries(themeButtons).forEach(([theme, btn]) => {
    if (btn) {
      btn.addEventListener('click', () => applyTheme(theme));
    }
  });

  // Restore saved settings
  getSetting('theme')
    .then(savedTheme => {
      if (savedTheme && themeButtons[savedTheme]) {
        applyTheme(savedTheme);
      }
    })
    .catch(err => console.error('Error loading theme setting:', err));

  getSetting('showProgress')
    .then(show => {
      if (toggle && typeof show === 'boolean') {
        toggle.checked = show;
        document.getElementById('progress-indicator').style.display = show ? 'flex' : 'none';
      }
    })
    .catch(err => console.error('Error loading progress setting:', err));
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSettings);
} else {
  initSettings();
}
