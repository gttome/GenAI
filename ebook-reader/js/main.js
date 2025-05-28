// Main logic (v30) – keeps viewport anchored after zoom and live-scroll tracking
import { initDB, saveSetting, getSetting } from './IndexedDBService.js';

/*********************************
 * Config
 *********************************/
const PDF_PATH      = 'pdf/Generative AI Professional Prompt Engineering Guide - First Edition Release 9.0.pdf';
const DEFAULT_ZOOM  = 1.5;
const ZOOM_STEP     = 0.25;
const MIN_ZOOM      = 0.5;
const MAX_ZOOM      = 3;
const DEFAULT_THEME = 'sepia';

/*********************************
 * State
 *********************************/
let pdfDoc, pageCount = 0;
let currentPage = 1;
let zoom        = DEFAULT_ZOOM;
let theme       = DEFAULT_THEME;

/*********************************
 * DOM references
 *********************************/
const area      = document.getElementById('pdf-render-area');
const loadEl    = document.getElementById('loading-indicator');
const numEl     = document.getElementById('page-num');
const cntEl     = document.getElementById('page-count');
const inpEl     = document.getElementById('page-input');
const gotoBtn   = document.getElementById('goto-page-button');
const prevBtn   = document.getElementById('prev-page');
const nextBtn   = document.getElementById('next-page');
const zoomOut   = document.getElementById('zoom-out');
const zoomIn    = document.getElementById('zoom-in');
const zoomLbl   = document.getElementById('zoom-level-display');
const themeBtns = {
  light: document.getElementById('theme-light'),
  dark : document.getElementById('theme-dark'),
  sepia: document.getElementById('theme-sepia')
};

/*********************************
 * Helpers
 *********************************/
const live = (() => {
  let el = document.getElementById('live');
  if (!el) {
    el = document.createElement('div');
    el.id = 'live';
    el.className = 'sr-only';
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  return el;
})();
const ann   = msg => (live.textContent = msg);
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
const show  = (el, on) => { el.style.display = on ? 'flex' : 'none'; };

function applyTheme(t) {
  document.documentElement.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
  document.documentElement.classList.add(`theme-${t}`);
  Object.entries(themeBtns).forEach(([k, b]) => b.classList.toggle('opacity-50', k !== t));
  theme = t;
  saveSetting('theme', t);
}
function updateZoomUI() {
  zoomLbl.textContent = `${Math.round(zoom * 100)}%`;
  saveSetting('zoom', zoom);
}
function updateNavUI() {
  numEl.textContent = currentPage;
  inpEl.value       = currentPage;
  prevBtn.disabled  = currentPage <= 1;
  nextBtn.disabled  = currentPage >= pageCount;
}
function scrollToCurrent() {
  area.children[currentPage - 1]?.scrollIntoView({ behavior: 'auto', block: 'start' });
}
function detectCurrentPage() {
  const rects = [...area.children].map(c => Math.abs(c.getBoundingClientRect().top));
  const idx = rects.indexOf(Math.min(...rects));
  return idx + 1;
}

/*********************************
 * Rendering
 *********************************/
async function renderPage(n) {
  const page = await pdfDoc.getPage(n);
  const vp   = page.getViewport({ scale: zoom });
  const c    = document.createElement('canvas');
  c.width = vp.width; c.height = vp.height;
  await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  area.appendChild(c);
}
async function renderAllPages() {
  show(loadEl, true);
  area.innerHTML = '';
  for (let i = 1; i <= pageCount; i++) await renderPage(i);
  show(loadEl, false);
  scrollToCurrent();
}

/*********************************
 * Load PDF
 *********************************/
async function loadPDF() {
  show(loadEl, true);
  pdfDoc    = await pdfjsLib.getDocument(PDF_PATH).promise;
  pageCount = pdfDoc.numPages;
  cntEl.textContent = pageCount;
  currentPage = clamp(parseInt(await getSetting('lastPage') || '1', 10), 1, pageCount);
  await renderAllPages();
  updateNavUI();
  show(loadEl, false);
}

/*********************************
 * Navigation
 *********************************/
function afterNavigate() {
  updateNavUI();
  scrollToCurrent();
  saveSetting('lastPage', currentPage);
  ann(`Page ${currentPage}`);
}
prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; afterNavigate(); } };
nextBtn.onclick = () => { if (currentPage < pageCount) { currentPage++; afterNavigate(); } };

gotoBtn.onclick = () => {
  const n = parseInt(inpEl.value.trim(), 10);
  if (!Number.isInteger(n) || n < 1 || n > pageCount) {
    inpEl.classList.add('animate-shake', 'border-red-500');
    setTimeout(() => inpEl.classList.remove('animate-shake', 'border-red-500'), 400);
    return;
  }
  currentPage = n;
  afterNavigate();
};
inpEl.onkeydown = e => { if (e.key === 'Enter') gotoBtn.click(); };

/*********************************
 * Zoom
 *********************************/
function zoomTo(newZ) {
  currentPage = detectCurrentPage(); // snapshot before redraw
  zoom = clamp(newZ, MIN_ZOOM, MAX_ZOOM);
  updateZoomUI();
  renderAllPages().then(afterNavigate);
}
zoomIn.onclick  = () => zoomTo(zoom + ZOOM_STEP);
zoomOut.onclick = () => zoomTo(zoom - ZOOM_STEP);

/*********************************
 * Themes
 *********************************/
Object.entries(themeBtns).forEach(([k, btn]) => btn.onclick = () => applyTheme(k));

/*********************************
 * Scroll tracking
 *********************************/
area.addEventListener('scroll', () => {
  clearTimeout(area._tm);
  area._tm = setTimeout(() => {
    const p = detectCurrentPage();
    if (p !== currentPage) {
      currentPage = p;
      updateNavUI();
      saveSetting('lastPage', currentPage);
    }
  }, 120);
});

/*********************************
 * Initialise
 *********************************/
(async () => {
  await initDB();
  zoom  = parseFloat(await getSetting('zoom')  || DEFAULT_ZOOM);
  theme = await getSetting('theme')            || DEFAULT_THEME;
  applyTheme(theme);
  updateZoomUI();
  await loadPDF();
})();