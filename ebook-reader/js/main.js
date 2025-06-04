/* ======================================================================
 * main.js  (v13.1)
 *  – Search counter = total hits
 *  – Blue outline shows on current hit (z-index raised, old outline cleared)
 *  – Theme dropdown, load-PDF, annotations, progress bar, etc.
 * =====================================================================*/

import AnnotationService from "./AnnotationService.js";
import AnnotationPopup   from "./AnnotationPopup.js";
import { readerState }   from "./state.js";

const pdfjsLib = window.pdfjsLib;

/* ───────────── Global state ───────────── */
let pdfDoc = null, pdfDocUrl = null, pageCount = 1, currentPage = 1, scale = 1;
let documentId = "default"; let annSvc = null; let popup = null;

/* Search: store every hit */
let searchTerm = "";
let searchHits = [];          // [{ page, itemIdx, charPos }]
let currentHitIndex = -1;

let lastWheel = 0;
const deletedIds = new Set();

/* ───────────── DOM helpers ───────────── */
const $ = id => document.getElementById(id);

/* ───────────── Toolbar refs ───────────── */
const themeSelect      = $("theme-select");
const loadPdfBtn       = $("load-pdf-button");
const filePicker       = $("file-picker");

const prevBtn          = $("prev-page");
const nextBtn          = $("next-page");
const pageNumDisp      = $("page-num");
const pageCountDisp    = $("page-count");
const pageInput        = $("page-input");
const gotoPageBtn      = $("goto-page-button");

const zoomOutBtn       = $("zoom-out");
const zoomInBtn        = $("zoom-in");
const zoomLabel        = $("zoom-level-display");

const toggleSearchBtn  = $("toggle-search");
const searchBar        = $("search-bar");
const searchInput      = $("search-input");
const searchPrevBtn    = $("search-prev");
const searchNextBtn    = $("search-next");
const searchCounter    = $("search-counter");
const searchClearBtn   = $("search-clear");

const toggleProgress   = $("toggle-progress");
const progressFill     = $("progress-bar-fill");
const progressText     = $("progress-text");

/* ───────────── Canvas + wrapper ───────────── */
const containerDiv = $("canvas-container");
const pageWrapper  = document.createElement("div");
const canvas       = document.createElement("canvas");
const ctx          = canvas.getContext("2d");
pageWrapper.className = "page";
pageWrapper.appendChild(canvas);
containerDiv.appendChild(pageWrapper);

const clamp = n => Math.min(Math.max(1, n), pageCount);

/* ======================================================================
 * INITIALISE
 * =====================================================================*/
(async () => {
  /* default PDF from data-pdf-url */
  pdfDocUrl = document
    .querySelector('script[type="module"][src*="main.js"]').dataset.pdfUrl;

  /* theme */
  const saved = localStorage.getItem("reader-theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  themeSelect.value = saved;
  themeSelect.onchange = () => {
    const t = themeSelect.value;
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("reader-theme", t);
  };

  annSvc = new AnnotationService(documentId);
  popup  = createPopup();

  enableDrawing();
  enableWheel();
  wireToolbar();

  await loadPDF();
  await renderPage(1, true);
})();

/* remember last page */
window.addEventListener("beforeunload",
  () => readerState.set("lastPage", currentPage));

/* ======================================================================
 * Toolbar wiring
 * =====================================================================*/
function wireToolbar() {
  loadPdfBtn.onclick = () => filePicker.click();
  filePicker.onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    const u = URL.createObjectURL(f);
    pdfDocUrl = u; documentId = f.name;
    annSvc = new AnnotationService(documentId); popup = createPopup();
    await loadPDF(f); renderPage(1, true);
    URL.revokeObjectURL(u);
  };

  toggleSearchBtn.onclick = () => {
    searchBar.classList.toggle("hidden");
    if (!searchBar.classList.contains("hidden")) searchInput.focus();
  };
  toggleProgress.onchange = () =>
    $("progress-indicator").style.display = toggleProgress.checked
      ? "inline-flex" : "none";

  prevBtn.onclick = () => renderPage(currentPage - 1);
  nextBtn.onclick = () => renderPage(currentPage + 1);

  pageInput.onkeydown = e => e.key === "Enter" && gotoPageBtn.click();
  gotoPageBtn.onclick = () => {
    const n = parseInt(pageInput.value, 10);
    if (!isNaN(n)) renderPage(n);
  };

  zoomOutBtn.onclick = () => {
    scale = Math.max(0.1, scale - 0.1);
    zoomLabel.textContent = Math.round(scale * 100) + "%";
    renderPage(currentPage, true);
  };
  zoomInBtn.onclick = () => {
    scale = Math.min(3, scale + 0.1);
    zoomLabel.textContent = Math.round(scale * 100) + "%";
    renderPage(currentPage, true);
  };

  searchInput.onkeydown = e => {
    if (e.key !== "Enter") return;
    const t = e.target.value.trim();
    t ? performSearch(t) : clearSearch();
  };
  searchPrevBtn.onclick = () => stepHit(-1);
  searchNextBtn.onclick = () => stepHit(1);
  searchClearBtn.onclick = () => {
    searchInput.value = "";
    clearSearch();
  };
}

/* ======================================================================
 * PDF loading & rendering
 * =====================================================================*/
async function loadPDF(pdfFile) {
  const url =
    pdfFile instanceof File ? URL.createObjectURL(pdfFile) : pdfDocUrl;
  pdfDoc = await pdfjsLib.getDocument(url).promise;
  pageCount = pdfDoc.numPages;
  pageCountDisp.textContent = pageCount;
  if (pdfFile instanceof File) URL.revokeObjectURL(url);
}

async function renderPage(n, force = false) {
  if (!pdfDoc) return;
  const p = clamp(n);
  if (!force && p === currentPage) return;

  const page = await pdfDoc.getPage(p);
  const vp   = page.getViewport({ scale });
  canvas.width  = vp.width;
  canvas.height = vp.height;
  pageWrapper.style.width  = vp.width + "px";
  pageWrapper.style.height = vp.height + "px";
  await page.render({ canvasContext: ctx, viewport: vp }).promise;

  currentPage = p;
  pageNumDisp.textContent = p;

  const pct = Math.round((p / pageCount) * 100);
  progressFill.style.width = pct + "%";
  progressText.textContent = pct + "%";

  /* clear previous search highlights (incl. old current-hit) */
  pageWrapper
    .querySelectorAll(".search-highlight, .current-hit")
    .forEach(el => el.remove());

  if (searchTerm) await drawSearchHighlightsOnPage(p);

  /* redraw annotations */
  pageWrapper.querySelectorAll(".highlight-rect").forEach(el => el.remove());
  (await annSvc.getAnnotationsForPage(p))
    .filter(h => !deletedIds.has(String(h.id)))
    .forEach(drawRect);

  updateCounter();
}

/* ======================================================================
 * Annotation drawing & popup
 * =====================================================================*/
function createPopup() {
  return new AnnotationPopup(
    meta => annSvc.createAnnotation(currentPage, meta)
                  .then(id => drawRect({ ...meta, id })),
    id => annSvc.deleteAnnotation(id).then(() => {
           deletedIds.add(String(id));
           pageWrapper.querySelectorAll(`[data-id='${id}']`)
                      .forEach(el => el.remove());
         })
  );
}
function enableDrawing() {
  let down = false, sx = 0, sy = 0, tmp;
  pageWrapper.addEventListener("mousedown", e => {
    if (e.button !== 0) return;
    const r = pageWrapper.getBoundingClientRect();
    sx = e.clientX - r.left; sy = e.clientY - r.top;
    tmp = document.createElement("div");
    tmp.className = "highlight-rect";
    tmp.style.position = "absolute";
    tmp.style.left = sx + "px";
    tmp.style.top  = sy + "px";
    pageWrapper.appendChild(tmp);
    down = true;
  });
  pageWrapper.addEventListener("mousemove", e => {
    if (!down) return;
    const r = pageWrapper.getBoundingClientRect();
    const cx = e.clientX - r.left, cy = e.clientY - r.top;
    tmp.style.left   = Math.min(cx, sx) + "px";
    tmp.style.top    = Math.min(cy, sy) + "px";
    tmp.style.width  = Math.abs(cx - sx) + "px";
    tmp.style.height = Math.abs(cy - sy) + "px";
  });
  pageWrapper.addEventListener("mouseup", async () => {
    if (!down) return; down = false;
    const w = parseFloat(tmp.style.width), h = parseFloat(tmp.style.height);
    tmp.remove();
    if (w < 4 || h < 4) return;
    const meta = {
      x: parseFloat(tmp.style.left) / canvas.width,
      y: parseFloat(tmp.style.top)  / canvas.height,
      width:  w / canvas.width,
      height: h / canvas.height,
    };
    const id = await annSvc.createAnnotation(currentPage, meta);
    drawRect({ ...meta, id });
  });
}
function drawRect({ id, x, y, width: w, height: h }) {
  const r = document.createElement("div");
  r.className = "highlight-rect";
  r.dataset.id = id;
  r.style.position = "absolute";
  r.style.left   = x * canvas.width  + "px";
  r.style.top    = y * canvas.height + "px";
  r.style.width  = w * canvas.width  + "px";
  r.style.height = h * canvas.height + "px";
  r.style.pointerEvents = "auto";
  pageWrapper.appendChild(r);
  r.onclick = e => {
    e.stopPropagation();
    const b = r.getBoundingClientRect();
    popup.showDelete(b.left, b.bottom + 6, id);
  };
}

/* ======================================================================
 * Mouse-wheel navigation
 * =====================================================================*/
function enableWheel() {
  containerDiv.addEventListener(
    "wheel",
    e => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheel < 250) return;
      lastWheel = now;
      renderPage(currentPage + (e.deltaY > 0 ? 1 : -1));
    },
    { passive: false }
  );
}

/* ======================================================================
 * SEARCH (hit-based)
 * =====================================================================*/
async function performSearch(term) {
  searchTerm = term.toLowerCase();
  searchHits = []; currentHitIndex = -1;

  for (let p = 1; p <= pageCount; p++) {
    const page = await pdfDoc.getPage(p);
    const txt  = await page.getTextContent();
    txt.items.forEach((item, idx) => {
      const low = item.str.toLowerCase();
      let pos = low.indexOf(searchTerm);
      while (pos !== -1) {
        searchHits.push({ page: p, itemIdx: idx, charPos: pos });
        pos = low.indexOf(searchTerm, pos + searchTerm.length);
      }
    });
  }
  if (!searchHits.length) {
    alert("No matches"); clearSearch(); return;
  }
  currentHitIndex = 0;
  renderPage(searchHits[0].page, true);
}
function stepHit(dir) {
  if (!searchHits.length) return;
  currentHitIndex =
    (currentHitIndex + dir + searchHits.length) % searchHits.length;
  renderPage(searchHits[currentHitIndex].page, true);
}
function clearSearch() {
  searchTerm = ""; searchHits = []; currentHitIndex = -1;
  pageWrapper.querySelectorAll(".search-highlight, .current-hit").forEach(el => el.remove());
  updateCounter();
}
function updateCounter() {
  searchCounter.textContent = searchHits.length
    ? `${currentHitIndex + 1}/${searchHits.length}` : "0/0";
}

/* Draw all hits on this page; outline current one */
async function drawSearchHighlightsOnPage(p) {
  const page = await pdfDoc.getPage(p);
  const vp   = page.getViewport({ scale });
  const txt  = await page.getTextContent();

  searchHits.forEach((hit, idx) => {
    if (hit.page !== p) return;

    const item = txt.items[hit.itemIdx];
    const charWidth = (item.width * scale) / item.str.length;
    const tx  = pdfjsLib.Util.transform(vp.transform, item.transform);
    const x   = tx[4] + charWidth * hit.charPos;
    const y   = tx[5] - item.height * scale;
    const w   = charWidth * searchTerm.length;
    const h   = item.height * scale;

    const hl  = document.createElement("div");
    hl.className = "search-highlight";
    hl.style.position = "absolute";
    hl.style.left   = x + "px";
    hl.style.top    = y + "px";
    hl.style.width  = w + "px";
    hl.style.height = h + "px";
    hl.style.zIndex = "5";
    if (idx === currentHitIndex) {
      hl.classList.add("current-hit");
      hl.style.zIndex = "7";
    }
    pageWrapper.appendChild(hl);
  });
}
