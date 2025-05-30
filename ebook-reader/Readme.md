````markdown
# Gen AI Prompt eBook Reader

A lightweight, HTML5-based PDF reader with customizable themes, annotation support, and the ability to load any local PDF file. Built on [PDF.js][pdfjs] and leveraging IndexedDB for persistent settings and highlights.

---

## Table of Contents

1. [Features](#features)  
2. [Demo](#demo)  
3. [Getting Started](#getting-started)  
   - [Prerequisites](#prerequisites)  
   - [Installation](#installation)  
   - [Running Locally](#running-locally)  
4. [Usage](#usage)  
   - [Default Load](#default-load)  
   - [Load Your Own PDF](#load-your-own-pdf)  
   - [Navigation & Zoom](#navigation--zoom)  
   - [Themes](#themes)  
   - [Annotations & Highlights](#annotations--highlights)  
   - [Progress Indicator](#progress-indicator)  
5. [File Structure](#file-structure)  
6. [Development Notes](#development-notes)  
7. [Cleanup & Deployment](#cleanup--deployment)  
8. [License](#license)  

---

## Features

- **Embedded PDF Viewing** via `data-pdf-url` attribute  
- **Native File Picker** to load any local PDF  
- **Page Navigation**: Prev / Next / Go to page  
- **Zoom Controls** with live percentage display  
- **Three Themes**: Light, Dark (default), Sepia  
- **Drag-to-Highlight** with color-picker popup  
- **Persistent Annotations** stored in IndexedDB  
- **Toggleable Progress Bar** showing reading progress  
- **Settings Persistence** (last page, zoom, theme, progress)  
- **Responsive, Tailwind-style UI**  

---

## Demo

![Reader Screenshot – Dark Theme](screenshots/dark-theme.png)  
![Highlight & Color Picker](screenshots/highlight.png)

---

## Getting Started

### Prerequisites

- Modern web browser with ES6 module support  
- (Optional) Local web server for testing (e.g., `http-server`, `live-server`)

### Installation

1. Clone this repository:  
   ```bash
   git clone https://github.com/yourusername/gen-ai-prompt-reader.git
   cd gen-ai-prompt-reader
````

2. Install dependencies (if using a bundler/PWA setup):

   ```bash
   npm install
   ```

### Running Locally

* **Without a server**:
  Simply open `index.html` in your browser.
* **With a local server** (recommended for CORS and module support):

  ```bash
  npx http-server . -c-1
  # or
  npx live-server
  ```

Then navigate to `http://localhost:8080` (or the port reported by your server).

---

## Usage

### Default Load

On page load, the reader fetches and displays the PDF specified in the `data-pdf-url` attribute of the `<script>` tag in `index.html`.

```html
<script
  type="module"
  src="js/main.js"
  data-pdf-url="pdf/Generative AI Professional Prompt Engineering Guide - First Edition Release 9.0.pdf"
></script>
```

### Load Your Own PDF

1. Click the **Load PDF** button in the top-right toolbar.
2. Select a PDF file in the system dialog (filtered to `.pdf`).
3. The viewer swaps out the embedded PDF and displays **page 1** of your chosen document.

*No files are uploaded anywhere—everything runs client-side via blob URLs.*

### Navigation & Zoom

* **Prev / Next** buttons to move between pages.
* **Page Input**: Enter a page number and click **Go**.
* **Zoom – / +** buttons adjust scale (10–300%) and update the percentage display.

### Themes

* **Light (L)**, **Dark (D)**, **Sepia (S)** buttons toggle UI themes.
* **Dark** theme is applied by default on load and persisted across sessions.

### Annotations & Highlights

1. **Drag** on the PDF canvas to draw a selection box.
2. **Color Picker** appears if the drag exceeds a 5 px threshold.
3. Choose a color to **save** and **render** your highlight.
4. Highlights persist in IndexedDB and reappear when you revisit the page or switch PDFs.

Click on a highlight to open a **delete** popup.

### Progress Indicator

Toggle the **Show Progress** checkbox to display or hide a progress bar that fills based on current page / total pages. Its state is saved in settings.

---

## File Structure

```
├── css/
│   ├── style.css
│   └── annotations.css
├── icons/                ← (Optional PWA icons; unused unless you add `<link rel="icon">`)
├── js/
│   ├── main.js           ← Core application logic
│   ├── state.js          ← ReaderState & IndexedDB settings wrapper
│   ├── IndexedDBService.js
│   ├── AnnotationService.js
│   └── AnnotationPopup.js
├── pdf/                  ← Default PDF
│   └── Generative AI Professional Prompt Engineering Guide.pdf
├── screenshots/          ← Example screenshots (not shipped)
├── index.html
└── README.md
```

---

## Development Notes

* **PDF.js** is loaded via CDN in `index.html` and accessed as `window.pdfjsLib` in `main.js`.
* **Settings**: Wrapped `getSetting()` in `getSettingVal()` to await IndexedDB results safely.
* **Theme Default**: On init, we call `applyTheme("dark")` and `saveSetting("theme","dark")`.
* **Highlight Logic**: Bound to the canvas element, with a minimal drag threshold and proper cleanup of ghost elements.

---

## Cleanup & Deployment

We recommend removing unused files before deploying:

-- * Unreferenced JS modules (e.g. `FilePicker.js`, `ToastManager.js`) --
-- * Unused CSS (`ProgressIndicator.css`) --
-- * PWA manifests/icons unless you implement a service worker --
-- * Documentation screenshots, manifests, and batch scripts --

This will slim down your build and reduce load times.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ using <a href="https://mozilla.github.io/pdf.js/">PDF.js</a>
</p>

[pdfjs]: https://mozilla.github.io/pdf.js/

```
```
