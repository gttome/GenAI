// ===== Prompt Components Lab Script =====
// Author: Auto-generated on 2025-04-27 15:49 UTC
// ---------------------------------------

// --- Utility functions ---
function levelLabel(value) {
  switch (parseInt(value, 10)) {
    case 1: return "Low";
    case 2: return "Medium";
    case 3: return "High";
    default: return "Low";
  }
}

function wrapLabel(label, text) {
  const colors = {
    context: '#00509E',
    output: '#007B55',
    task: '#D17C00',
    constraint: '#C1121F'
  };
  return `<span style="color: ${colors[label.toLowerCase()]}; font-weight: bold;">[${label}]</span> ${text}`;
}

// --- Manifest of available prompt JSON files ---
const promptFiles = [
  { label: "Education", file: "education.json" },
  { label: "Marketing", file: "marketing.json" },
  { label: "Test", file: "test.json" }
];

// Holds the currently loaded dataset
let dataset = [];

// Populate dropdown and load default dataset on initial page load
document.addEventListener("DOMContentLoaded", () => {
  const topicSelect = document.getElementById("topicSelect");
  // Clear any hard‑coded options
  if (topicSelect) {
    topicSelect.innerHTML = "";
    promptFiles.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.file;
      opt.textContent = item.label;
      topicSelect.appendChild(opt);
    });
    topicSelect.addEventListener("change", (e) => loadPromptFile(e.target.value));
  }

  // Load first dataset
  if (promptFiles.length) {
    loadPromptFile(promptFiles[0].file);
  }

  // Event handlers
  document.getElementById("clearBtn")?.addEventListener("click", () => {
    document.getElementById("promptOutput").innerHTML = "";
  });

  ["contextSlider", "outputSlider", "taskSlider", "constraintSlider"].forEach(id => {
    document.getElementById(id)?.addEventListener("input", updateLivePreview);
  });

  // Copy to clipboard
  const copyBtn = document.getElementById("copyLiveBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const liveText = document.getElementById("livePreviewOutput").textContent;
      navigator.clipboard.writeText(liveText)
        .then(() => copyBtn.textContent = "Copied!")
        .catch(() => alert("Unable to copy text to clipboard"));
      setTimeout(() => copyBtn.textContent = "Copy", 1500);
    });
  }

  // Guided tour modal visibility
  const modal = document.getElementById("guidedTourModal");
  const seen = localStorage.getItem("guidedTourSeen");
  if (modal) {
    modal.style.display = seen === "yes" ? "none" : "block";
  }

  // Load saved notes
  const notesTextarea = document.getElementById("notes-infoBox");
  if (notesTextarea) {
    const savedNote = localStorage.getItem("notes-infoBox");
    if (savedNote) notesTextarea.value = savedNote;
    notesTextarea.addEventListener("input", () => {
      localStorage.setItem("notes-infoBox", notesTextarea.value);
    });
  }
});

// Fetch and cache the dataset for the selected topic
function loadPromptFile(fileName) {
  fetch(fileName)
    .then(resp => resp.json())
    .then(json => {
      dataset = json;
      updateLivePreview();
    })
    .catch(err => {
      console.error("Error loading prompt file:", err);
      dataset = [];
      document.getElementById("livePreviewOutput").innerHTML =
        "<span style='color:red;'>Could not load prompt file.</span>";
    });
}

function updateLivePreview() {
  if (!dataset.length) {
    document.getElementById("livePreviewOutput").innerHTML = "<span style='color: gray;'>No preview available.</span>";
    return;
  }

  const contextLevel = levelLabel(document.getElementById("contextSlider").value);
  const outputLevel   = levelLabel(document.getElementById("outputSlider").value);
  const taskLevel     = levelLabel(document.getElementById("taskSlider").value);
  const constraintLevel = levelLabel(document.getElementById("constraintSlider").value);

  const match = dataset.find(p =>
    p[`Context (${contextLevel})`] &&
    p[`Output Format (${outputLevel})`] &&
    p[`Task (${taskLevel})`] &&
    p[`Constraints (${constraintLevel})`]
  );

  const previewBox = document.getElementById("livePreviewOutput");
  if (match) {
    const livePrompt = [
      wrapLabel("context", match[`Context (${contextLevel})`]),
      wrapLabel("task", match[`Task (${taskLevel})`]),
      wrapLabel("output", match[`Output Format (${outputLevel})`]),
      wrapLabel("constraint", match[`Constraints (${constraintLevel})`])
    ].join("<br>\n");
    previewBox.innerHTML = livePrompt;
  } else {
    previewBox.innerHTML = "<span style='color: gray;'>No preview available for this combination.</span>";
  }
}

function showPrompt() {
  if (!dataset.length) return;

  const contextLevel    = levelLabel(document.getElementById("contextSlider").value);
  const outputLevel     = levelLabel(document.getElementById("outputSlider").value);
  const taskLevel       = levelLabel(document.getElementById("taskSlider").value);
  const constraintLevel = levelLabel(document.getElementById("constraintSlider").value);

  const match = dataset.find(p =>
    p[`Context (${contextLevel})`] &&
    p[`Output Format (${outputLevel})`] &&
    p[`Task (${taskLevel})`] &&
    p[`Constraints (${constraintLevel})`]
  );

  const outputBox = document.getElementById("promptOutput");
  const previous  = outputBox.innerHTML.trim();

  if (match) {
    const modifiedFull = [
      wrapLabel("context", match[`Context (${contextLevel})`]),
      wrapLabel("task", match[`Task (${taskLevel})`]),
      wrapLabel("output", match[`Output Format (${outputLevel})`]),
      wrapLabel("constraint", match[`Constraints (${constraintLevel})`])
    ].join(" ");

    const entry = `<div>${modifiedFull}</div>`;
    outputBox.innerHTML = entry + (previous ? "<hr><br>" + previous : "");
  } else {
    outputBox.innerHTML = `<div><span style="color: red;">Prompt not found for this combination.</span></div>` +
      (previous ? "<hr><br>" + previous : "");
  }
}

// Close guided tour handler (called from modal's close button)
function closeTour() {
  const modal = document.getElementById("guidedTourModal");
  const dontShow = document.getElementById("dontShowAgain")?.checked;
  if (modal) modal.style.display = "none";
  if (dontShow) {
    localStorage.setItem("guidedTourSeen", "yes");
  }
}
