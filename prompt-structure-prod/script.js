// ===== Prompt Components Lab Script =====
// Version: 2025-04-27  ▸ History copies edited preview; Edit button supported
// --------------------------------------------------------

/* ---------- utility helpers ---------- */
function levelLabel(v) {
  switch (parseInt(v, 10)) {
    case 1: return "Low";
    case 2: return "Medium";
    case 3: return "High";
    default: return "Low";
  }
}

function wrapLabel(label, text) {
  const colors = {
    context:    "#00509E",
    output:     "#007B55",
    task:       "#D17C00",
    constraint: "#C1121F"
  };
  return (
    `<span style="color:${colors[label.toLowerCase()]}; font-weight:bold;">` +
    `[${label}]</span> ${text}`
  );
}

/* ---------- manifest of prompt files ---------- */
const promptFiles = [
  { label: "Education", file: "education.json" },
  { label: "Marketing", file: "marketing.json" },
  { label: "Acting As", file: "acting-as.json" },
  { label: "Test",      file: "test.json" }
];

/* ---------- globals ---------- */
let dataset      = [];   // current JSON rows
let currentLabel = "";   // Education | Marketing | Test

/* =================== bootstrap =================== */
document.addEventListener("DOMContentLoaded", () => {
  const topicSelect = document.getElementById("topicSelect");

  /* ---- populate dropdown ---- */
  topicSelect.innerHTML = "";
  promptFiles.forEach(item => {
    const opt       = document.createElement("option");
    opt.value       = item.file;
    opt.textContent = item.label;
    topicSelect.appendChild(opt);
  });

  topicSelect.addEventListener("change", e => {
    currentLabel = e.target.options[e.target.selectedIndex].textContent;
    loadPromptFile(e.target.value);
  });

  /* ---- load first dataset ---- */
  currentLabel = promptFiles[0].label;
  loadPromptFile(promptFiles[0].file);

  /* ---- Clear history ---- */
  document.getElementById("clearBtn")
    ?.addEventListener("click", () =>
      (document.getElementById("promptOutput").innerHTML = "")
    );

  /* ---- sliders update preview ---- */
  ["contextSlider", "taskSlider", "outputSlider", "constraintSlider"]
    .forEach(id =>
      document.getElementById(id)?.addEventListener("input", updateLivePreview)
    );

  /* ---- Copy to clipboard ---- */
  const copyBtn = document.getElementById("copyLiveBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const text =
        document.getElementById("livePreviewOutput").innerText;
      navigator.clipboard.writeText(text)
        .then(() => (copyBtn.textContent = "Copied!"))
        .catch(() => alert("Unable to copy text to clipboard"));
      setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
    });
  }

  /* ---- optional Edit toggle ---- */
  const editBtn = document.getElementById("editLiveBtn");
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      const box = document.getElementById("livePreviewOutput");
      const on  = !box.isContentEditable;
      box.contentEditable = on;
      box.focus();
      editBtn.textContent = on ? "Done" : "Edit";
    });
  }

  /* ---- guided-tour modal ---- */
  const modal = document.getElementById("guidedTourModal");
  if (modal) {
    const seen = localStorage.getItem("guidedTourSeen");
    modal.style.display = seen === "yes" ? "none" : "block";
  }

  /* ---- load saved notes ---- */
  const notes = document.getElementById("notes-infoBox");
  if (notes) {
    const saved = localStorage.getItem("notes-infoBox");
    if (saved) notes.value = saved;
    notes.addEventListener("input", () =>
      localStorage.setItem("notes-infoBox", notes.value)
    );
  }
});

/* ================= functions ================= */

/* ---- fetch & cache dataset ---- */
function loadPromptFile(name) {
  fetch("./" + name)
    .then(r => r.json())
    .then(json => { dataset = json; updateLivePreview(); })
    .catch(err => {
      console.error("Error loading prompt file:", err);
      dataset = [];
      document.getElementById("livePreviewOutput").innerHTML =
        "<span style='color:red;'>Could not load prompt file.</span>";
    });
}

/* ---- update the Live-Preview box ---- */
function updateLivePreview() {
  const box = document.getElementById("livePreviewOutput");

  if (!dataset.length) {
    box.innerHTML = "<span style='color:gray;'>No preview available.</span>";
    return;
  }

  const contextLevel    = levelLabel(document.getElementById("contextSlider").value);
  const outputLevel     = levelLabel(document.getElementById("outputSlider").value);
  const taskLevel       = levelLabel(document.getElementById("taskSlider").value);
  const constraintLevel = levelLabel(document.getElementById("constraintSlider").value);

  const row = dataset.find(p =>
    p[`Context (${contextLevel})`] &&
    p[`Output Format (${outputLevel})`] &&
    p[`Task (${taskLevel})`] &&
    p[`Constraints (${constraintLevel})`]
  );

  if (!row) {
    box.innerHTML =
      "<span style='color:gray;'>No preview available for this combination.</span>";
    return;
  }

  const livePrompt = [
    wrapLabel("context",    row[`Context (${contextLevel})`]),
    wrapLabel("task",       row[`Task (${taskLevel})`]),
    wrapLabel("output",     row[`Output Format (${outputLevel})`]),
    wrapLabel("constraint", row[`Constraints (${constraintLevel})`])
  ].join("<br>");

  box.innerHTML =
    "<strong>" + currentLabel + "</strong><br>" + livePrompt;
}

/* ---- Add-History: copy whatever’s in the preview ---- */
function showPrompt() {
  const previewBox  = document.getElementById("livePreviewOutput");
  const snapshot    = previewBox.innerHTML.trim();      // ← grabs edits too
  if (!snapshot) return;

  const outBox = document.getElementById("promptOutput");
  const prev   = outBox.innerHTML.trim();

  outBox.innerHTML =
    `<div>${snapshot}</div>` + (prev ? "<hr><br>" + prev : "");
}

/* ---- close guided-tour modal ---- */
function closeTour() {
  const modal    = document.getElementById("guidedTourModal");
  const dontShow = document.getElementById("dontShowAgain")?.checked;
  if (modal) modal.style.display = "none";
  if (dontShow) localStorage.setItem("guidedTourSeen", "yes");
}

/* ——— end of script.js ——— */
