// js/main.js
import ProgressIndicator from './ProgressIndicator.js';
import { readerState } from './state.js';
import { getSetting, saveSetting } from './IndexedDBService.js';

// Resolve PDF URL from script tag or default
function getPdfUrl() {
  const script = document.querySelector('script[data-pdf-url]');
  return script
    ? script.getAttribute('data-pdf-url')
    : 'pdf/Generative AI Professional Prompt Engineering Guide - First Edition Release 9.0.pdf';
}

const url = getPdfUrl();
let pdfDoc = null;
let currentPage = 1;
let pageCount = 0;
let scale = 1.0;

// Create and insert canvas element
const pdfArea = document.getElementById('pdf-render-area');
const canvas = document.createElement('canvas');
canvas.id = 'pdf-canvas';
pdfArea.appendChild(canvas);
const ctx = canvas.getContext('2d');

// DOM Elements
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
const pageNumEl = document.getElementById('page-num');
const pageCountEl = document.getElementById('page-count');
const pageInput = document.getElementById('page-input');
const gotoBtn = document.getElementById('goto-page-button');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomLevelDisplay = document.getElementById('zoom-level-display');

// Initialize Progress Indicator
new ProgressIndicator({ container: document.getElementById('progress-indicator'), readerState });

// Load PDF Document
async function loadPDF() {
  try {
    pdfDoc = await pdfjsLib.getDocument(url).promise;
    pageCount = pdfDoc.numPages;
    pageCountEl.textContent = pageCount;
    readerState.set({ currentLocationIndex: currentPage, totalLocationCount: pageCount });
  } catch (err) {
    console.error('Failed to load PDF:', err);
  }
}

// Render Page
async function renderPage(pageNum) {
  try {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: ctx, viewport }).promise;

    pageNumEl.textContent = pageNum;
    readerState.set({ currentLocationIndex: pageNum, totalLocationCount: pageCount });
  } catch (err) {
    console.error('Failed to render page:', err);
  }
}

// Scroll-to-navigate
pdfArea.addEventListener('wheel', e => {
  e.preventDefault();
  if (e.deltaY > 0 && currentPage < pageCount) {
    currentPage++;
    renderPage(currentPage);
  } else if (e.deltaY < 0 && currentPage > 1) {
    currentPage--;
    renderPage(currentPage);
  }
}, { passive: false });

// Navigation Handlers
if (prevBtn) {
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderPage(currentPage);
    }
  });
}

if (nextBtn) {
  nextBtn.addEventListener('click', () => {
    if (currentPage < pageCount) {
      currentPage++;
      renderPage(currentPage);
    }
  });
}

if (gotoBtn) {
  gotoBtn.addEventListener('click', () => {
    const goTo = parseInt(pageInput.value, 10);
    if (!isNaN(goTo) && goTo >= 1 && goTo <= pageCount) {
      currentPage = goTo;
      renderPage(currentPage);
    }
  });
}

// Zoom Handlers
if (zoomInBtn) zoomInBtn.addEventListener('click', () => adjustZoom(0.1));
if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => adjustZoom(-0.1));

function adjustZoom(delta) {
  scale = Math.min(Math.max(scale + delta, 0.5), 3.0);
  saveSetting('zoom', scale);
  zoomLevelDisplay.textContent = `${Math.round(scale * 100)}%`;
  renderPage(currentPage);
}

// Initialization
(async () => {
  const lastPage = await getSetting('lastPage');
  currentPage = lastPage || 1;
  const savedZoom = await getSetting('zoom');
  if (typeof savedZoom === 'number') {
    scale = savedZoom;
    zoomLevelDisplay.textContent = `${Math.round(scale * 100)}%`;
  }
  await loadPDF();
  renderPage(currentPage);
})();

// Persist last page on unload
window.addEventListener('beforeunload', () => {
  saveSetting('lastPage', currentPage);
});
