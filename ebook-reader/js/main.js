// js/main.js

import { getSetting, saveSetting } from "./IndexedDBService.js";
import AnnotationService            from "./AnnotationService.js";
import AnnotationPopup              from "./AnnotationPopup.js";
import { readerState }              from "./state.js";
import { computeDocumentId }        from "./utils.js";

// PDF.js is loaded globally via <script> in index.html
const pdfjsLib = window.pdfjsLib;

/* ---------- global state ---------- */
let currentPage = 1;
let pageCount   = 1;
let scale       = 1;
let pdfDoc      = null;
let pdfReady    = false;
let pdfUrl      = document.querySelector('script[data-pdf-url]')?.dataset.pdfUrl || "";
let documentId  = null;
let annSvc      = null;
let popup       = null;

/* ---------- helpers ---------- */
const clampPage = n =>
  Number.isFinite(n) ? Math.min(Math.max(1, Math.round(n)), pageCount) : 1;
const q = id => document.getElementById(id);

// Canvas setup
const container = q("canvas-container");
const canvas    = document.createElement("canvas");
container.appendChild(canvas);
const ctx       = canvas.getContext("2d");

// Toolbar controls
const prev     = q("prev-page"), next       = q("next-page");
const pageNum  = q("page-num"), pageCnt    = q("page-count");
const pageBox  = q("page-input"), gotoBtn   = q("goto-page-button");
const zoomIn   = q("zoom-in"), zoomOut    = q("zoom-out"), zoomLbl = q("zoom-level-display");
const btnLight = q("theme-light"), btnDark  = q("theme-dark"), btnSepia = q("theme-sepia");

// File picker
const loadBtn   = q("load-pdf-button");
const filePicker= q("file-picker");
loadBtn.addEventListener("click", () => filePicker.click());
filePicker.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  // Compute new documentId from file
  documentId = await computeDocumentId(file);
  // Update URL and services
  pdfUrl = URL.createObjectURL(file);
  annSvc = new AnnotationService(documentId);
  popup  = createPopup();
  // Load and render first page
  await loadPDF();
  await renderPage(1, true);
});

// Helper to instantiate popup with current annSvc
function createPopup() {
  return new AnnotationPopup(
    meta => annSvc.createAnnotation(currentPage, meta).then(id => drawRect({ id, ...meta })),
    id => annSvc.deleteAnnotation(id).then(() => renderPage(currentPage, true))
  );
}

/**
 * Load the PDF document.
 */
async function loadPDF() {
  pdfReady = false;
  pdfDoc   = await pdfjsLib.getDocument(pdfUrl).promise;
  pageCount = pdfDoc.numPages;
  pageCnt.textContent = pageCount;
  pdfReady = true;
}

/**
 * Render a specific page.
 */
async function renderPage(n, skipStateUpdate = false) {
  if (!pdfDoc) return;
  const p = clampPage(n);
  if (!skipStateUpdate && p === currentPage) return;
  const page    = await pdfDoc.getPage(p);
  const viewport= page.getViewport({ scale });
  canvas.width  = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;

  currentPage = p;
  pageNum.textContent = p;
  
  // Update progress bar width on page change
  progressBarFill.style.width = `${(currentPage / pageCount) * 100}%`;

  // Draw highlights for this page
  container.querySelectorAll(".highlight-rect").forEach(el => el.remove());
  const highlights = await annSvc.getAnnotationsForPage(p);
  highlights.forEach(drawRect);
}

/**
 * Draw a highlight rectangle on the canvas.
 */
function drawRect({ x, y, w, h, color, id }) {
  const el = document.createElement("div");
  el.className = `highlight-rect highlight-${color}`;
  el.dataset.id = id;
  Object.assign(el.style, {
    left:   `${x * canvas.width}px`,
    top:    `${y * canvas.height}px`,
    width:  `${w * canvas.width}px`,
    height: `${h * canvas.height}px`
  });
  el.addEventListener("click", ev => {
    ev.stopPropagation();
    popup.showDelete(ev.pageX, ev.pageY, id);
  });
  container.appendChild(el);
}

// Navigation & Zoom controls
prev.onclick = () => renderPage(currentPage - 1);
next.onclick = () => renderPage(currentPage + 1);
gotoBtn.onclick = () => renderPage(parseInt(pageBox.value, 10));
const setZoom = newScale => {
  scale = Math.min(Math.max(0.1, newScale), 3);
  zoomLbl.textContent = `${Math.round(scale * 100)}%`;
  renderPage(currentPage, true);
};
zoomIn.onclick  = () => setZoom(scale + 0.1);
zoomOut.onclick = () => setZoom(scale - 0.1);

// Theme handling
function applyTheme(t) {
  document.documentElement.classList.remove("theme-light", "theme-dark", "theme-sepia");
  document.documentElement.classList.add(`theme-${t}`);
  [btnLight, btnDark, btnSepia].forEach(b => b?.classList.remove("active-theme"));
  ({ light: btnLight, dark: btnDark, sepia: btnSepia }[t])?.classList.add("active-theme");
}
btnLight.addEventListener("click", () => { applyTheme("light"); saveSetting("theme", "light"); });
btnDark.addEventListener("click",  () => { applyTheme("dark");  saveSetting("theme", "dark");  });
btnSepia.addEventListener("click", () => { applyTheme("sepia"); saveSetting("theme", "sepia"); });

// Progress indicator
const toggleProgress   = q("toggle-progress"),
      progressBarFill = q("progress-bar-fill");
toggleProgress.addEventListener("change", () => {
  document.getElementById("progress-indicator").style.display = toggleProgress.checked ? "flex" : "none";
  saveSetting("showProgress", toggleProgress.checked);
});
readerState.on("change", ({ currentLocationIndex, totalLocationCount }) => {
  progressBarFill.style.width = `${(currentLocationIndex / totalLocationCount) * 100}%`;
});

// Highlight drag & color picker
let drag = null, ghost = null;
canvas.onmousedown = e => {
  popup.remove();
  if (!pdfReady || e.button !== 0) return;
  const r = canvas.getBoundingClientRect();
  drag = { x: e.clientX - r.left, y: e.clientY - r.top };
  ghost = document.createElement("div");
  ghost.className = "highlight-rect highlight-yellow";
  container.appendChild(ghost);
};
canvas.onmousemove = e => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const l = Math.min(drag.x, e.clientX - r.left);
  const t = Math.min(drag.y, e.clientY - r.top);
  const w = Math.abs(e.clientX - r.left - drag.x);
  const h = Math.abs(e.clientY - r.top - drag.y);
  Object.assign(ghost.style, { left: `${l}px`, top: `${t}px`, width: `${w}px`, height: `${h}px` });
};
canvas.onmouseup = e => {
  if (!ghost) return; const r = canvas.getBoundingClientRect(); const l = Math.min(drag.x, e.clientX - r.left); const t = Math.min(drag.y, e.clientY - r.top); const w = Math.abs(e.clientX - r.left - drag.x); const h = Math.abs(e.clientY - r.top - drag.y); ghost.remove(); drag = null; if (w > 5 && h > 5) popup.showColor(e.pageX, e.pageY, { page: currentPage, x: l / canvas.width, y: t / canvas.height, w: w / canvas.width, h: h / canvas.height }); ghost = null; };

// Wheel-to-flip pages
let wheelAcc = 0;
canvas.onwheel = e => {
  if (!pdfReady) { e.preventDefault(); return; }
  if (e.ctrlKey) { e.preventDefault(); setZoom(scale - e.deltaY * 0.001); } else { wheelAcc += e.deltaY; if (wheelAcc > 120) { wheelAcc = 0; renderPage(currentPage + 1); } else if (wheelAcc < -120) { wheelAcc = 0; renderPage(currentPage - 1); } e.preventDefault(); } };

// Init: setup documentId, services, theme, and initial PDF load
(async () => {
  documentId = await computeDocumentId(pdfUrl);
  annSvc      = new AnnotationService(documentId);
  popup       = createPopup();

  applyTheme("dark");
  saveSetting("theme", "dark");

  await loadPDF();
  await renderPage(1, true);
})();

window.addEventListener("beforeunload", () => saveSetting("lastPage", currentPage));
