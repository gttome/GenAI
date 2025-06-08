// js/lang.js  – initialise i18next with local JSON files @@@@@
// Exposes window.i18nextReady (Promise) so main.js waits for translations.

// ------------------------------------------------------------------------
// 1. Utility: replace innerText / placeholder / title / aria via data-i18n
// ------------------------------------------------------------------------
function localizePage() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const txt = i18next.t(key);

    if (el.placeholder !== undefined && el.hasAttribute('placeholder')) {
      el.placeholder = txt;
    } else if (el.tagName.toLowerCase() === 'input' && el.type === 'button') {
      el.value = txt;
    } else {
      el.innerText = txt;
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = i18next.t(el.getAttribute('data-i18n-title'));
  });

  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', i18next.t(el.getAttribute('data-i18n-aria')));
  });

  const titleEl = document.querySelector('title[data-i18n]');
  if (titleEl) {
    document.title = i18next.t(titleEl.getAttribute('data-i18n'));
  }

  document.documentElement.lang = i18next.language;
}

// ------------------------------------------------------------------------
// 2. Helper: switch language, persist in localStorage
// ------------------------------------------------------------------------
function changeLanguage(lang) {
  i18next.changeLanguage(lang, err => {
    if (err) console.error('changeLanguage:', err);
    localizePage();
    localStorage.setItem('preferredLanguage', lang);
  });
}

// ------------------------------------------------------------------------
// 3. Initialise i18next
// ------------------------------------------------------------------------
window.i18nextReady = i18next
  .use(typeof i18nextHttpBackend !== 'undefined'
       ? i18nextHttpBackend
       : { type: 'backend', read: () => {} })
  .use(i18nextBrowserLanguageDetector)
  .init({
    // Tell i18next which languages to load
    supportedLngs: ['en','pt','ja','es','zh','hi','fr','ar','bn'],
    load: 'languageOnly',           // strip region codes
    fallbackLng: 'en',
    lng: localStorage.getItem('preferredLanguage') || 'en',
    detection: {
      caches: []                    // don’t write automatic detector cache
    },
    backend: {
      loadPath: 'json/{{lng}}.json' // json/en.json, json/pt.json, json/ja.json
    },
    debug: false,
    interpolation: { escapeValue: false },
    returnEmptyString: false
  })
  .then(() => localizePage())
  .catch(err => console.error('i18next init failed:', err));

// ------------------------------------------------------------------------
// 4. Wire <select id="lang-select"> after DOM ready
// ------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  const selector = document.getElementById('lang-select');
  if (!selector) return;

  const lang = i18next.language || '';
  
  // Pick the best match, defaulting to English
  if (lang.startsWith('en')) {
    selector.value = 'en';
  } else if (lang.startsWith('es')) {
    selector.value = 'es';
  } else if (lang.startsWith('pt')) {
    selector.value = 'pt';
  } else if (lang.startsWith('ja')) {
    selector.value = 'ja';
  } else if (lang.startsWith('zh')) {
    selector.value = 'zh';
  } else if (lang.startsWith('hi')) {
    selector.value = 'hi';
  } else if (lang.startsWith('fr')) {
    selector.value = 'fr';
  } else if (lang.startsWith('ar')) {
    selector.value = 'ar';
  } else if (lang.startsWith('bn')) {
    selector.value = 'bn';
  } else {
    selector.value = 'en';
}

  selector.addEventListener('change', e => changeLanguage(e.target.value));
});

