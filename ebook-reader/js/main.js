/* =======================================================================
   main.js – HTML-5 PDF Reader with Zoom‐Synchronized Text Layer, Search,
             and Persistent User Highlighting (search highlights shifted
             3 characters left and 1 character wider)
   ======================================================================= */

/* ---------- DOM helpers ------------------------------------------------ */
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

/* ---------- Theme applicator (forces PDF-area gutters) ------------ */
function applyThemeColors() {
  const pdfBg    = getComputedStyle(document.body).getPropertyValue('--pdf-bg').trim();
  const canvasBg = getComputedStyle(document.body).getPropertyValue('--canvas-bg').trim();

  document.documentElement.style.backgroundColor = pdfBg;
  document.body.style.backgroundColor            = pdfBg;

  const pdfArea = $("#pdf-render-area");
  if (pdfArea) pdfArea.style.backgroundColor = pdfBg;

  const canvasContainer = $("#canvas-container");
  if (canvasContainer) canvasContainer.style.backgroundColor = canvasBg;
}

/* ---------- Runtime state ---------------------------------------------- */
let pdfDoc        = null,
    currentPage   = 1,
    totalPages    = 0,
    zoom          = 1,
    docId         = "";    // identifier for the loaded PDF
let rendering     = false,
    pendingPage   = null,
    showProgress  = false;

/* Search state */
let flatMatches        = [];
let totalMatches       = 0;
let matchIdx           = -1;
let searchTerm         = "";

/* If we jump to a match on a different page, store its index here */
let pendingMatchIdx    = null;

/* Highlights storage format:
   {
     [docId]: {
       [pageNum]: [
         { xPct, yPct, wPct, hPct }
       ]
     }
   }
*/
let hiStore = JSON.parse(localStorage.getItem("hiStore") || "{}");

/* ---------- Local‐storage helpers -------------------------------------- */
function saveHiStore() {
  localStorage.setItem("hiStore", JSON.stringify(hiStore));
}
function getPageHighlights(pageNum) {
  if (!hiStore[docId]) return [];
  return hiStore[docId][pageNum] || [];
}
function addPageHighlight(pageNum, normRect) {
  if (!hiStore[docId]) hiStore[docId] = {};
  if (!hiStore[docId][pageNum]) hiStore[docId][pageNum] = [];
  hiStore[docId][pageNum].push(normRect);
  saveHiStore();
}
function removePageHighlight(pageNum, index) {
  if (!hiStore[docId] || !hiStore[docId][pageNum]) return;
  hiStore[docId][pageNum].splice(index, 1);
  saveHiStore();
}

/* ---------- Progress bar ------------------------------------------------ */
function updateProgress() {
  const bar = $("#progress-bar"), txt = $("#progress-text");
  if (!bar || !txt || !pdfDoc) return;
  if (!showProgress) {
    bar.style.display = "none";
    txt.style.display = "none";
    return;
  }
  bar.style.display = "";
  txt.style.display = "";
  const pct = (currentPage / totalPages) * 100;
  bar.value = pct;
  txt.textContent = `${Math.round(pct)}%`;
}

/* ======================================================================
   PDF load & initial render
   ====================================================================== */
async function loadPDF(url) {
  const bar = $("#progress-bar");
  if (bar) {
    bar.value = 0;
    bar.style.display = "";
  }

  const task = pdfjsLib.getDocument(url);
  task.onProgress = (p) => {
    if (bar && p.total) bar.value = (p.loaded / p.total) * 100;
  };

  pdfDoc = await task.promise;
  totalPages = pdfDoc.numPages;

  // Derive docId from URL or file name
  const parts = url.split("/");
  docId = parts[parts.length - 1].replace(/\.[^/.]+$/, "");

  const tot = $("#total-pages");
  if (tot) tot.textContent = totalPages;

  updateProgress();
}

/* render page n (1‐based) */
async function renderPage(n) {
  rendering = true;
  const page = await pdfDoc.getPage(n);
  const vp   = page.getViewport({ scale: zoom });

  // Clear old content
  const holder = $("#canvas-container");
  holder.innerHTML = "";

  /* ---------- Canvas layer ---------- */
  const wrap = Object.assign(document.createElement("div"), {
    className: "page",
    style: `position:relative; width:${vp.width}px; height:${vp.height}px; margin-bottom:10px;`
  });
  wrap.dataset.page = n; // mark which page this is
  const canvas = document.createElement("canvas");
  canvas.width  = vp.width;
  canvas.height = vp.height;
  wrap.appendChild(canvas);
  holder.appendChild(wrap);

  // Render the PDF page into the canvas
  await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;

  /* -------- Text Layer (zoom‐synchronized) -------- */
  const tl = Object.assign(document.createElement("div"), {
    className: "textLayer",
    style: `
      width:${vp.width}px;
      height:${vp.height}px;
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
    `
  });
  wrap.appendChild(tl);

  await pdfjsLib.renderTextLayer({
    textContent: await page.getTextContent(),
    container:   tl,
    viewport:    page.getViewport({ scale: zoom }),
    textDivs:    []
  }).promise;

  // Hook up user highlighting on the .page container
  hookUserHighlighting(wrap);

  // Restore persistent highlights for this page
  restoreHighlights(n, wrap);

  // If a search term exists, paint highlights on this page
  if (searchTerm) paintSearchHighlights(n, searchTerm);

  currentPage = n;
  rendering   = false;

  // Update page number input
  const inp = $("#page-num-input");
  if (inp) inp.value = n;

  // Update zoom‐display and progress
  $("#zoom-level-display").textContent = `${Math.round(zoom * 100)}%`;
  updateProgress();
  applyThemeColors();

  // If we had a pending match jump, scroll to it
  if (pendingMatchIdx !== null) {
    const desiredPage = flatMatches[pendingMatchIdx];
    if (desiredPage === n) {
      scrollToMatchOnPage(n, pendingMatchIdx);
      pendingMatchIdx = null;
    }
  }

  // If another page was queued, render it now
  if (pendingPage) {
    const p = pendingPage;
    pendingPage = null;
    return renderPage(p);
  }
}

/* Render‐or‐queue helper */
const renderOrQueue = (n) => (rendering ? (pendingPage = n) : renderPage(n));

/* ======================================================================
   UI bindings (toolbar, inputs, search bar controls)
   ====================================================================== */
function bindUI() {
  /* Theme selector */
  $("#theme-select").onchange = (e) => {
    const v = e.target.value;
    document.documentElement.dataset.theme = v;
    document.body.dataset.theme            = v;
    localStorage.setItem("theme", v);
    applyThemeColors();
  };

  /* Show/hide progress bar */
  $("#show-progress").onchange = (e) => {
    showProgress = e.target.checked;
    updateProgress();
  };

  /* Load PDF button */
  $("#load-pdf-button").onclick = () => $("#file-picker").click();
  $("#file-picker").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const u = URL.createObjectURL(f);
    await loadPDF(u);
    await renderOrQueue(1);
    setTimeout(() => URL.revokeObjectURL(u), 400);
  };

  /* Prev / Next page */
  $("#prev-page").onclick = () => currentPage > 1 && renderOrQueue(currentPage - 1);
  $("#next-page").onclick = () => currentPage < totalPages && renderOrQueue(currentPage + 1);

  /* Go to page (#) */
  $("#go-to-page").onclick = () => {
    const n = +$("#page-num-input").value;
    if (n >= 1 && n <= totalPages) renderOrQueue(n);
  };

  /* Zoom In / Zoom Out */
  $("#zoom-in").onclick = () => {
    zoom = Math.min(zoom + 0.25, 3);
    renderOrQueue(currentPage);
  };
  $("#zoom-out").onclick = () => {
    zoom = Math.max(zoom - 0.25, 0.25);
    renderOrQueue(currentPage);
  };

  /* Toggle search bar */
  $("#toggle-search").onclick = () => {
    $("#search-bar").classList.toggle("hidden");
    if (!$("#search-bar").classList.contains("hidden")) {
      setTimeout(() => $("#search-input").focus(), 50);
    }
  };

  /* Search input: Enter to search */
  $("#search-input").onkeydown = (e) => {
    if (e.key === "Enter") doSearch(e.target.value);
  };
  $("#search-prev").onclick  = () => stepMatch(-1);
  $("#search-next").onclick  = () => stepMatch(+1);
  $("#search-clear").onclick = clearSearch;

  /* Mouse‐wheel flipping (no ctrl) */
  (() => {
    const area = $("#pdf-render-area");
    if (!area) return;
    let last = 0, TH = 250;
    area.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey) return;
        const now = Date.now();
        if (now - last < TH) return;
        last = now;
        e.deltaY > 0 ? $("#next-page").click() : $("#prev-page").click();
        e.preventDefault();
      },
      { passive: false }
    );
  })();
}

/* ======================================================================
   Search & precise highlight helpers (zoom‐synchronized)
   ====================================================================== */

/**
 * clearSearch()
 * --------------
 * Reset all search state, remove highlight overlays, and show "0/0".
 */
function clearSearch() {
  flatMatches      = [];
  totalMatches     = 0;
  matchIdx         = -1;
  searchTerm       = "";
  pendingMatchIdx  = null;
  $("#search-counter").textContent = "0/0";
  $$(".search-match").forEach(el => el.remove());
}

/**
 * doSearch(term)
 * --------------
 * 1) Lowercase the term.
 * 2) For pages 1..totalPages:
 *    a) Get textContent.
 *    b) Count each occurrence (case‐insensitive) in item.str.
 *    c) For each occurrence, push pageNum into flatMatches.
 * 3) totalMatches = flatMatches.length.
 * 4) If found, matchIdx=0, show "1/totalMatches", render that page.
 */
async function doSearch(term) {
  if (!pdfDoc) return;
  clearSearch();
  searchTerm = term.trim().toLowerCase();
  if (!searchTerm) return;

  for (let p = 1; p <= totalPages; p++) {
    const page    = await pdfDoc.getPage(p);
    const content = await page.getTextContent();
    let countInPage = 0;

    content.items.forEach(item => {
      const txt = (item.str || "").toLowerCase();
      let idx = 0;
      while ((idx = txt.indexOf(searchTerm, idx)) !== -1) {
        countInPage++;
        idx += searchTerm.length;
      }
    });

    for (let i = 0; i < countInPage; i++) {
      flatMatches.push(p);
    }
  }

  totalMatches = flatMatches.length;
  if (!totalMatches) return;

  matchIdx = 0;
  $("#search-counter").textContent = `1/${totalMatches}`;

  const firstPage = flatMatches[0];
  await renderOrQueue(firstPage);
}

/**
 * stepMatch(dir)
 * ---------------
 * Move forward (dir=+1) or backward (dir=-1) in flatMatches.
 * Update counter. If new match’s page ≠ currentPage, set pendingMatchIdx
 * and re‐render. Otherwise, clear & repaint highlights and scroll.
 */
function stepMatch(dir) {
  if (!flatMatches.length) return;
  matchIdx = (matchIdx + dir + totalMatches) % totalMatches;
  $("#search-counter").textContent = `${matchIdx + 1}/${totalMatches}`;

  const desiredPage = flatMatches[matchIdx];
  if (desiredPage !== currentPage) {
    pendingMatchIdx = matchIdx;
    renderOrQueue(desiredPage);
  } else {
    // Same page: clear old highlights, repaint, scroll
    $$(".search-match").forEach(el => el.remove());
    paintSearchHighlights(currentPage, searchTerm);
    scrollToMatchOnPage(currentPage, matchIdx);
  }
}

/**
 * paintSearchHighlights(pageNum, term)
 * -------------------------------------
 * 1) Grab the single .page container (only one exists).
 * 2) Within its .textLayer (already rendered at zoom scale), find
 *    every <span> whose lowercase text includes term.
 * 3) For each occurrence in that span:
 *    a) Create a Range covering exactly those characters.
 *    b) Call range.getClientRects(), then use rects[0] for a single
 *       left/top/width/height (correct for zoom, no horizontal shift).
 *    c) Subtract wrapRect.left/top to get coords within .page.
 *    d) Compute average character width from span width/length.
 *    e) Shift highlight exactly 3 characters to the left, then
 *       subtract those 3 char‐widths from the right and add back
 *       1 char‐width so it becomes net “2 char shrink” on the right.
 *    f) Create <div class="search-match"> at that position/dimension:
 *       - semi‐transparent yellow (40% opacity)
 *       - If this occurrence’s global index === matchIdx, add
 *         `border:2px solid red; z-index:3`. Otherwise `z-index:2`.
 */
function paintSearchHighlights(pageNum, term) {
  const wrap      = document.querySelector(".page");
  if (!wrap || !term) return;
  const textLayer = wrap.querySelector(".textLayer");
  if (!textLayer) return;

  // 1) Remove any old highlights on this page
  wrap.querySelectorAll(".search-match").forEach(el => el.remove());

  const wrapRect = wrap.getBoundingClientRect();

  // 2) Build an array of global‐match indices for this page
  const pageIndices = [];
  flatMatches.forEach((p, idx) => {
    if (p === pageNum) pageIndices.push(idx);
  });

  // 3) Walk each <span> in the textLayer
  textLayer.querySelectorAll("span").forEach(span => {
    const fullText = span.textContent || "";
    const lowText  = fullText.toLowerCase();
    if (!lowText.includes(term)) return;

    // 3.d) Compute average character width in this span
    const spanRect = span.getBoundingClientRect();
    const avgCharWidth = spanRect.width / fullText.length;

    let searchStart = 0;
    while (searchStart < lowText.length) {
      const idx = lowText.indexOf(term, searchStart);
      if (idx === -1) break;
      const matchStart = idx;
      const matchEnd   = idx + term.length;

      const textNode = span.firstChild;
      if (!textNode) break;

      // 3.a) Create a Range for exactly this substring
      const range = document.createRange();
      range.setStart(textNode, matchStart);
      range.setEnd(textNode, matchEnd);

      // 3.b) Count how many occurrences on this page appear before this one
      let countSoFarOnPage = 0;
      for (const s of textLayer.querySelectorAll("span")) {
        const sText = (s.textContent || "").toLowerCase();
        if (s === span) {
          let partialCount = 0, idx2 = 0;
          while ((idx2 = sText.indexOf(term, idx2)) !== -1 && idx2 < matchStart) {
            partialCount++;
            idx2 += term.length;
          }
          countSoFarOnPage += partialCount;
          break;
        } else {
          let idx3 = 0;
          while ((idx3 = sText.indexOf(term, idx3)) !== -1) {
            countSoFarOnPage++;
            idx3 += term.length;
          }
        }
      }
      const globalIdx = pageIndices[countSoFarOnPage];

      // 3.b) Get the first client rect for this substring
      const rects = Array.from(range.getClientRects());
      if (rects.length) {
        const r = rects[0];
        // raw left/top relative to the viewport:
        let left = r.left - wrapRect.left;
        const top = r.top - wrapRect.top;
        let w    = r.width;
        const h  = r.height;

        // 3.e) Shift 3 characters to the left:
        const shiftPx  = Math.round(avgCharWidth * 3);
        // subtract shiftPx from left (but don’t go negative):
        left = Math.max(0, Math.round(left - shiftPx));

        // now shrink width by (3 - 1) = 2 char widths:
        //   so subtract 3 char widths, then add back 1 char width
        const shrinkPx = Math.round(avgCharWidth * 3);
        const addBack  = Math.round(avgCharWidth * 3);
        w = Math.max(0, Math.round(w - shrinkPx + addBack));

        // 3.f) Create the <div class="search-match">
        const hl = document.createElement("div");
        hl.className = "search-match";
        const isCurrent = (globalIdx === matchIdx);
        Object.assign(hl.style, {
          position:        "absolute",
          left:            `${left}px`,
          top:             `${Math.round(top)}px`,
          width:           `${w}px`,
          height:          `${Math.round(h)}px`,
          backgroundColor: "rgba(255, 255, 0, 0.4)",
          pointerEvents:   "none",
          zIndex:          isCurrent ? 3 : 2,
          border:          isCurrent ? "2px solid red" : "none"
        });
        wrap.appendChild(hl);

        // If the match wraps onto a second line, apply same logic to rects[1]
        if (rects.length > 1) {
          const r2 = rects[1];
          let left2 = r2.left - wrapRect.left;
          const top2 = r2.top - wrapRect.top;
          let w2     = r2.width;

          left2 = Math.max(0, Math.round(left2 - shiftPx));
          w2     = Math.max(0, Math.round(w2 - shrinkPx + addBack));

          const hl2 = document.createElement("div");
          hl2.className = "search-match";
          Object.assign(hl2.style, {
            position:        "absolute",
            left:            `${left2}px`,
            top:             `${Math.round(top2)}px`,
            width:           `${w2}px`,
            height:          `${Math.round(r2.height)}px`,
            backgroundColor: "rgba(255, 255, 0, 0.4)",
            pointerEvents:   "none",
            zIndex:          isCurrent ? 3 : 2,
            border:          isCurrent ? "2px solid red" : "none"
          });
          wrap.appendChild(hl2);
        }
      }

      range.detach();
      searchStart = matchEnd;
    }
  });
}

/**
 * scrollToMatchOnPage(pageNum, matchIndex)
 * -----------------------------------------
 * 1) Find which <span> + substring on this page corresponds to matchIndex.
 * 2) Create a Range exactly around that substring, extract the first ClientRect,
 *    then scroll #pdf-render-area so that this rect’s top is ~20px below viewport top.
 */
function scrollToMatchOnPage(pageNum, matchIndex) {
  const wrap      = document.querySelector(".page");
  const textLayer = wrap?.querySelector(".textLayer");
  if (!wrap || !textLayer) return;

  let occurrenceCount = 0;
  let targetRange     = null;

  for (const span of textLayer.querySelectorAll("span")) {
    const fullText = span.textContent || "";
    const lowText  = fullText.toLowerCase();
    if (!lowText.includes(searchTerm)) continue;

    let localCount = 0, idx2 = 0;
    while ((idx2 = lowText.indexOf(searchTerm, idx2)) !== -1) {
      localCount++;
      idx2 += searchTerm.length;
    }

    if (matchIndex < occurrenceCount + localCount) {
      const occurrenceInSpan = matchIndex - occurrenceCount;
      let foundCount = 0, searchIdx = lowText.indexOf(searchTerm);
      while (foundCount < occurrenceInSpan) {
        searchIdx = lowText.indexOf(searchTerm, searchIdx + searchTerm.length);
        foundCount++;
      }
      const textNode = span.firstChild;
      const range = document.createRange();
      range.setStart(textNode, searchIdx);
      range.setEnd(textNode, searchIdx + searchTerm.length);
      targetRange = range;
      break;
    }
    occurrenceCount += localCount;
  }

  if (targetRange) {
    const rects = Array.from(targetRange.getClientRects());
    if (rects.length) {
      const r = rects[0];
      const pdfArea  = $("#pdf-render-area");
      const areaRect = pdfArea.getBoundingClientRect();
      const offsetY  = (pdfArea.scrollTop + (r.top - areaRect.top)) - 20;
      pdfArea.scrollTo({ top: offsetY, behavior: "smooth" });
    }
    targetRange.detach();
  }
}

/* ======================================================================
   Persistent USER HIGHLIGHTING: 
   click‐and‐drag to draw dark-green rectangles that scale with zoom,
   click to remove, persists across pages and reloads.
   ====================================================================== */
function hookUserHighlighting(wrap) {
  let startX = 0, startY = 0;
  let selBox = null;

  wrap.addEventListener("mousedown", (e) => {
    // Only respond to left‐button
    if (e.button !== 0) return;
    // If clicked directly on an existing highlight, remove it
    if (e.target.classList.contains("user-highlight")) {
      // Determine index among highlights
      const highlights = Array.from(wrap.children).filter(c => c.classList.contains("user-highlight"));
      const idx = highlights.indexOf(e.target);
      e.target.remove();
      removePageHighlight(currentPage, idx);
      return;
    }
    e.preventDefault();

    const wrapRect = wrap.getBoundingClientRect();
    startX = e.clientX - wrapRect.left;
    startY = e.clientY - wrapRect.top;
    selBox = null;

    function onMouseMove(me) {
      const currX = me.clientX - wrapRect.left;
      const currY = me.clientY - wrapRect.top;
      const x = Math.min(startX, currX);
      const y = Math.min(startY, currY);
      const w = Math.abs(currX - startX);
      const h = Math.abs(currY - startY);

      if (!selBox) {
        selBox = document.createElement("div");
        selBox.className = "user-highlight-temp";
        Object.assign(selBox.style, {
          position: "absolute",
          border: "1px dashed #008000",
          backgroundColor: "rgba(0, 128, 0, 0.5)",
          pointerEvents: "none"
        });
        wrap.appendChild(selBox);
      }
      selBox.style.left   = `${x}px`;
      selBox.style.top    = `${y}px`;
      selBox.style.width  = `${w}px`;
      selBox.style.height = `${h}px`;
    }

    function onMouseUp(mu) {
      if (selBox) {
        // Normalize coordinates relative to current viewport size
        const vpWidth  = wrap.clientWidth;
        const vpHeight = wrap.clientHeight;
        const x = parseFloat(selBox.style.left);
        const y = parseFloat(selBox.style.top);
        const w = parseFloat(selBox.style.width);
        const h = parseFloat(selBox.style.height);
        const normRect = {
          xPct: x / vpWidth,
          yPct: y / vpHeight,
          wPct: w / vpWidth,
          hPct: h / vpHeight
        };

        // Create a permanent highlight adjusted to current size
        const highlight = document.createElement("div");
        highlight.className = "user-highlight";
        Object.assign(highlight.style, {
          position: "absolute",
          left:    `${x}px`,
          top:     `${y}px`,
          width:    `${w}px`,
          height:   `${h}px`,
          backgroundColor: "rgba(0, 128, 0, 0.5)",
          cursor:  "pointer",
          zIndex:  1
        });
        highlight.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const highlights = Array.from(wrap.children).filter(c => c.classList.contains("user-highlight"));
          const idx = highlights.indexOf(highlight);
          highlight.remove();
          removePageHighlight(currentPage, idx);
        });
        wrap.appendChild(highlight);

        addPageHighlight(currentPage, normRect);
        selBox.remove();
      }
      wrap.removeEventListener("mousemove", onMouseMove);
      wrap.removeEventListener("mouseup", onMouseUp);
    }

    wrap.addEventListener("mousemove", onMouseMove);
    wrap.addEventListener("mouseup", onMouseUp);
  });
}

/**
 * restoreHighlights(pageNum, wrap)
 * --------------------------------
 * Draws all saved highlights for this page inside the given .page element,
 * scaling them to the current zoom (viewport) size.
 */
function restoreHighlights(pageNum, wrap) {
  const arr = getPageHighlights(pageNum);
  const vpWidth  = wrap.clientWidth;
  const vpHeight = wrap.clientHeight;

  arr.forEach((normRect, idx) => {
    const x = normRect.xPct * vpWidth;
    const y = normRect.yPct * vpHeight;
    const w = normRect.wPct * vpWidth;
    const h = normRect.hPct * vpHeight;

    const highlight = document.createElement("div");
    highlight.className = "user-highlight";
    Object.assign(highlight.style, {
      position: "absolute",
      left:     `${x}px`,
      top:      `${y}px`,
      width:    `${w}px`,
      height:   `${h}px`,
      backgroundColor: "rgba(0, 128, 0, 0.5)",
      cursor:   "pointer",
      zIndex:   1
    });
    highlight.addEventListener("click", (ev) => {
      ev.stopPropagation();
      highlight.remove();
      removePageHighlight(pageNum, idx);
    });
    wrap.appendChild(highlight);
  });
}

/* ======================================================================
   Initialization
   ====================================================================== */
async function init() {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.1.81/pdf.worker.min.js";

  /* If a default PDF URL is specified in <script data-pdf-url="…">, load it */
  const mainTag    = [...document.scripts].find(s => s.src.includes("/js/main.js"));
  const defaultUrl = mainTag?.dataset.pdfUrl || "";

  if (defaultUrl) {
    await loadPDF(defaultUrl);
    await renderOrQueue(1);
  }

  /* Restore theme & last page */
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.dataset.theme = savedTheme;
  document.body.dataset.theme            = savedTheme;
  $("#theme-select").value              = savedTheme;
  applyThemeColors();

  const savedPage = +localStorage.getItem("lastPage") || 1;
  if (savedPage > 1 && savedPage <= totalPages) {
    currentPage = savedPage;
    await renderOrQueue(savedPage);
  }

  window.addEventListener("beforeunload", () => {
    localStorage.setItem("lastPage", currentPage);
  });

  bindUI();
}

/* Kick off the app when DOM is ready */
document.addEventListener("DOMContentLoaded", () => {
  init().catch(console.error);
});
