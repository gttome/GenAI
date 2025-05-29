/* =========================================================
   Imports & Services
   ========================================================= */
import { getSetting, saveSetting } from "./IndexedDBService.js";
import { readerState }            from "./state.js";
import AnnotationService          from "./AnnotationService.js";
import AnnotationPopup            from "./AnnotationPopup.js";

/* ---------- global state ---------- */
let currentPage = 1;
let pageCount   = 1;
let scale       = 1;
let pdfDoc      = null;
let pdfReady    = false;

/* ---------- helpers ---------- */
const clampPage = n =>
  Number.isFinite(n) ? Math.min(Math.max(1, Math.round(n)), pageCount) : 1;

/* ---------- pdf url ---------- */
const url =
  document.querySelector("script[data-pdf-url]")?.dataset.pdfUrl ||
  "default.pdf";

/* ---------- services ---------- */
const annSvc = new AnnotationService(url);
const popup  = new AnnotationPopup(
  // onColorSelect → persist + keep rectangle
  meta => annSvc.addHighlightRect(meta).then(({ id, color, ...rest }) => {
    drawRect({ id, color, ...rest });
  }),
  // onDelete
  async id => { await annSvc.deleteAnnotation(id); renderPage(currentPage, true); }
);

/* =========================================================
   DOM Elements & Canvas
   ========================================================= */
const q = id => document.getElementById(id);
const container = q("canvas-container");
const canvas    = document.createElement("canvas");
container.appendChild(canvas);
const ctx = canvas.getContext("2d");

/* toolbar controls */
const prev = q("prev-page"),   next  = q("next-page");
const pageNum = q("page-num"), pageCnt = q("page-count");
const pageBox = q("page-input"), gotoBtn = q("goto-page-button");
const zoomIn  = q("zoom-in"),  zoomOut  = q("zoom-out"), zoomLbl = q("zoom-level-display");
const btnLight = q("btn-light"), btnDark = q("btn-dark"), btnSepia = q("btn-sepia");

/* =========================================================
   Theme Handling
   ========================================================= */
function applyTheme(t) {
  document.documentElement.classList.remove(
    "theme-light", "theme-dark", "theme-sepia"
  );
  document.documentElement.classList.add(`theme-${t}`);
  [btnLight, btnDark, btnSepia].forEach(b => b?.classList.remove("active-theme"));
  ({ light: btnLight, dark: btnDark, sepia: btnSepia }[t])?.classList.add("active-theme");
}
btnLight?.addEventListener("click", () => { applyTheme("light"); saveSetting("theme", "light"); });
btnDark ?.addEventListener("click", () => { applyTheme("dark");  saveSetting("theme", "dark");  });
btnSepia?.addEventListener("click", () => { applyTheme("sepia"); saveSetting("theme", "sepia"); });

/* load last or default theme (dark) */
(async () => {
  applyTheme(["light", "sepia", "dark"].includes(await getSetting("theme"))
    ? await getSetting("theme") : "dark");
})();

/* =========================================================
   Progress Bar
   ========================================================= */
readerState.on("change", ({ currentLocationIndex, totalLocationCount }) => {
  const fill = q("progress-bar-fill");
  if (fill && totalLocationCount)
    fill.style.width = `${(currentLocationIndex / totalLocationCount) * 100}%`;
});

/* =========================================================
   Highlight rectangle
   ========================================================= */
function drawRect({ x, y, w, h, color, id }) {
  const el = document.createElement("div");
  el.className = `highlight-rect highlight-${color}`;
  el.dataset.id = id;
  Object.assign(el.style, {
    left  : `${x * canvas.width}px`,
    top   : `${y * canvas.height}px`,
    width : `${w * canvas.width}px`,
    height: `${h * canvas.height}px`
  });
  el.onclick = ev => {
    ev.stopPropagation();
    popup.showDelete(ev.pageX, ev.pageY, id);
  };
  container.appendChild(el);
}

/* =========================================================
   PDF Load & Render
   ========================================================= */
async function loadPDF() {
  pdfDoc    = await pdfjsLib.getDocument(url).promise;
  pageCount = Math.max(1, pdfDoc.numPages);
  pageCnt.textContent = pageCount;
  pdfReady  = true;
}

async function renderPage(n, force = false) {
  if (!pdfReady) return;            // wait until PDF loads
  const p = clampPage(n);
  if (!force && p === currentPage) return;

  const page = await pdfDoc.getPage(p);
  const viewport = page.getViewport({ scale });
  canvas.width  = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;

  currentPage = p;
  pageNum.textContent = p;
  readerState.set({ currentLocationIndex: p, totalLocationCount: pageCount });

  container.querySelectorAll(".highlight-rect").forEach(el => el.remove());
  (await annSvc.getAnnotationsByPage(p)).forEach(drawRect);
}

/* =========================================================
   Zoom Helper
   ========================================================= */
function setZoom(z) {
  scale = Math.min(Math.max(z, 0.5), 3);
  zoomLbl.textContent = `${Math.round(scale * 100)}%`;
  saveSetting("zoom", scale);
  renderPage(currentPage, true);
}

/* =========================================================
   Control Listeners
   ========================================================= */
prev.onclick = () => renderPage(currentPage - 1);
next.onclick = () => renderPage(currentPage + 1);
gotoBtn.onclick = () => renderPage(parseInt(pageBox.value, 10));
zoomIn.onclick  = () => setZoom(scale + 0.1);
zoomOut.onclick = () => setZoom(scale - 0.1);

/* =========================================================
   Drag-to-Highlight + Wheel
   ========================================================= */
let drag = null, ghost = null;
canvas.onmousedown = e => {
  if (!pdfReady || e.button !== 0) return;
  const r = canvas.getBoundingClientRect();
  drag = { x: e.clientX - r.left, y: e.clientY - r.top };
  ghost = document.createElement("div");
  ghost.className = "highlight-rect highlight-yellow";
  container.appendChild(ghost);
};
window.onmousemove = e => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const l = Math.min(drag.x, e.clientX - r.left);
  const t = Math.min(drag.y, e.clientY - r.top);
  const w = Math.abs(e.clientX - r.left - drag.x);
  const h = Math.abs(e.clientY - r.top  - drag.y);
  Object.assign(ghost.style,{ left:`${l}px`, top:`${t}px`, width:`${w}px`, height:`${h}px` });
};
window.onmouseup = e => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  const l = Math.min(drag.x, e.clientX - r.left);
  const t = Math.min(drag.y, e.clientY - r.top);
  const w = Math.abs(e.clientX - r.left - drag.x);
  const h = Math.abs(e.clientY - r.top  - drag.y);

  const norm = {
    page: currentPage,
    x: l / canvas.width,  y: t / canvas.height,
    w: w / canvas.width, h: h / canvas.height
  };
  popup.showColor(e.pageX, e.pageY, norm);
  ghost.remove(); ghost = null; drag = null;
};
/* Wheel page flip */
let wheel = 0;
canvas.onwheel = e => {
  if (!pdfReady) { e.preventDefault(); return; }
  wheel += e.deltaY;
  const step = 120;
  if      (wheel >  step) { wheel = 0; renderPage(currentPage + 1); }
  else if (wheel < -step) { wheel = 0; renderPage(currentPage - 1); }
  e.preventDefault();
};

/* =========================================================
   Init
   ========================================================= */
(async () => {
  currentPage = clampPage((await getSetting("lastPage")) || 1);
  const z = parseFloat(await getSetting("zoom"));
  if (Number.isFinite(z) && z > 0) scale = z;
  zoomLbl.textContent = `${Math.round(scale * 100)}%`;

  await loadPDF();
  await renderPage(currentPage, true);
})();
window.addEventListener("beforeunload", () => saveSetting("lastPage", currentPage));
