// js/main.js
// Gen AI Prompt eBook Reader - main.js (v15 - Sepia Default Theme)
// Default theme changed to Sepia.

import { initDB, saveSetting, getSetting } from './IndexedDBService.js';

// --- Configuration ---
const DEFAULT_PDF_PATH = 'pdf/Generative AI Professional Prompt Engineering Guide - First Edition Release 9.0.pdf';
const DEFAULT_ZOOM_LEVEL = 1.5; 
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const DEFAULT_THEME = 'sepia'; // Changed default theme to Sepia

let currentPdfDocument = null;
let currentPageNumber = 1;
let currentZoomLevel = DEFAULT_ZOOM_LEVEL; 
let currentTheme = DEFAULT_THEME; 

document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Element References ---
    const pdfRenderArea = document.getElementById('pdf-render-area');
    const pdfStatusMessage = document.getElementById('pdf-status-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    const pdfNavigationControls = document.getElementById('pdf-navigation');
    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const pageNumDisplay = document.getElementById('page-num'); 
    const pageCountDisplay = document.getElementById('page-count');

    // Zoom Controls
    const zoomOutButton = document.getElementById('zoom-out');
    const zoomInButton = document.getElementById('zoom-in');
    const zoomResetButton = document.getElementById('zoom-reset');
    const zoomLevelDisplay = document.getElementById('zoom-level-display');

    // Theme Controls
    const themeLightButton = document.getElementById('theme-light');
    const themeDarkButton = document.getElementById('theme-dark');
    const themeSepiaButton = document.getElementById('theme-sepia');
    const themeButtons = [themeLightButton, themeDarkButton, themeSepiaButton];

    // [Debug Init] Keep essential logs for element verification if issues arise
    if (!prevPageButton || !nextPageButton || !zoomOutButton || !zoomInButton || !zoomResetButton || !themeLightButton || !themeDarkButton || !themeSepiaButton) {
        console.error('[MainJS Init] One or more control button elements were not found in the DOM.');
    }


    // --- Initialize IndexedDB ---
    try {
        await initDB(); 
        console.log('[MainJS] IndexedDB initialized successfully by service.');
    } catch (error) {
        console.error('[MainJS] Critical error: IndexedDB could not be initialized.', error);
        if(pdfStatusMessage) {
            pdfStatusMessage.textContent = 'Error: Application storage could not be initialized. Some features may not work.';
            pdfStatusMessage.classList.remove('hidden');
            pdfStatusMessage.classList.add('text-red-500');
        }
        showLoading(false);
        return; 
    }

    // --- Initialization of the App ---
    async function initializeApp() {
        console.log('[MainJS] Gen AI Prompt eBook Reader initializing...');
        showLoading(true);
        if(pdfNavigationControls) pdfNavigationControls.classList.add('hidden'); 
        if(pdfStatusMessage) {
            pdfStatusMessage.textContent = 'Loading eBook...'; 
            pdfStatusMessage.classList.remove('hidden');
        }

        try {
            const savedZoom = await getSetting('currentZoomLevel');
            if (savedZoom !== undefined) {
                currentZoomLevel = parseFloat(savedZoom); 
            } else {
                currentZoomLevel = DEFAULT_ZOOM_LEVEL;
            }
            updateZoomDisplay(); 

            const savedTheme = await getSetting('currentTheme');
            if (savedTheme !== undefined) {
                currentTheme = savedTheme;
            } else {
                currentTheme = DEFAULT_THEME; 
                await saveSetting('currentTheme', currentTheme); 
            }
            applyTheme(currentTheme); 
        } catch (settingError) {
            console.error('[MainJS] Error loading settings from IndexedDB:', settingError);
            currentZoomLevel = DEFAULT_ZOOM_LEVEL;
            currentTheme = DEFAULT_THEME; // Fallback to Sepia if settings load fails
            updateZoomDisplay();
            applyTheme(currentTheme);
        }

        try {
            const response = await fetch(DEFAULT_PDF_PATH);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} while fetching ${DEFAULT_PDF_PATH}`);
            }
            const pdfData = await response.arrayBuffer();
            await loadAndRenderPdf(pdfData);
        } catch (error) {
            console.error('[MainJS] Initialization Error:', error);
            if(pdfStatusMessage){
                pdfStatusMessage.textContent = `Error loading eBook: ${error.message}. Please check the file path.`;
                pdfStatusMessage.classList.add('text-red-500');
            }
            showLoading(false);
        }
    }

    // --- PDF Handling Functions ---
    async function loadAndRenderPdf(pdfData) {
        showLoading(true); 
        if(pdfRenderArea) pdfRenderArea.innerHTML = ''; 
        if(pdfStatusMessage) pdfStatusMessage.classList.add('hidden');
        try {
            const typedarray = new Uint8Array(pdfData);
            const pdfDoc = await pdfjsLib.getDocument({ data: typedarray }).promise;
            currentPdfDocument = pdfDoc;
            if(pageCountDisplay) pageCountDisplay.textContent = pdfDoc.numPages;
            let initialPageToLoad = 1;
            try {
                const lastPage = await getSetting('lastViewedPage');
                if (lastPage !== undefined && lastPage > 0 && lastPage <= pdfDoc.numPages) {
                    initialPageToLoad = parseInt(lastPage); 
                }
            } catch (pageGetError) {
                console.warn('[MainJS] Could not retrieve last viewed page, defaulting to 1:', pageGetError);
            }
            currentPageNumber = initialPageToLoad;
            await renderAllPages(pdfDoc, true); 
        } catch (error) {
            console.error('[MainJS] Error loading PDF data:', error);
            if(pdfRenderArea) pdfRenderArea.innerHTML = ''; 
            if(pdfStatusMessage) {
                pdfStatusMessage.textContent = `Error processing PDF: ${error.message}`;
                pdfStatusMessage.classList.remove('hidden');
                pdfStatusMessage.classList.add('text-red-500');
            }
            showLoading(false);
        }
    }

    async function renderPage(pdfDoc, pageNum) {
        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: currentZoomLevel });
            const canvas = document.createElement('canvas');
            canvas.className = 'pdf-page-canvas'; 
            canvas.id = `page-${pageNum}-canvas`;
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            if(pdfRenderArea) pdfRenderArea.appendChild(canvas); 
            const renderContext = { canvasContext: context, viewport: viewport };
            await page.render(renderContext).promise;
        } catch (error) {
            console.error(`[MainJS] Error rendering page ${pageNum}:`, error);
        }
    }

    async function renderAllPages(pdfDoc, initialLoad = false) {
        const firstVisiblePageBeforeReRender = findFirstVisiblePage();
        if(pdfRenderArea) pdfRenderArea.innerHTML = ''; 
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            await renderPage(pdfDoc, i); 
        }
        showLoading(false);
        updateNavigationControls(); 
        if(pdfNavigationControls) pdfNavigationControls.classList.remove('hidden'); 
        if (initialLoad) {
            scrollToPage(currentPageNumber, 'auto');
        } else if (firstVisiblePageBeforeReRender) {
            scrollToPage(firstVisiblePageBeforeReRender, 'auto');
        } else {
            scrollToPage(currentPageNumber, 'auto'); 
        }
        console.log('[MainJS] All pages of the PDF have been rendered/re-rendered.');
    }

    // --- UI Helper Functions ---
    function showLoading(isLoading) {
        if(loadingIndicator) loadingIndicator.style.display = isLoading ? 'flex' : 'none';
    }
    
    function updateNavigationControls() {
        if (!currentPdfDocument) {
            if(pageNumDisplay) pageNumDisplay.textContent = '0';
            if(pageCountDisplay) pageCountDisplay.textContent = '0';
            if(prevPageButton) prevPageButton.disabled = true;
            if(nextPageButton) nextPageButton.disabled = true;
            return;
        }
        if(pageNumDisplay) pageNumDisplay.textContent = currentPageNumber;
        if(pageCountDisplay && currentPdfDocument) pageCountDisplay.textContent = currentPdfDocument.numPages;
        if(prevPageButton) prevPageButton.disabled = currentPageNumber <= 1;
        if(nextPageButton && currentPdfDocument) nextPageButton.disabled = currentPageNumber >= currentPdfDocument.numPages;
    }

    function updateZoomDisplay() {
        if (zoomLevelDisplay) {
            zoomLevelDisplay.textContent = `${Math.round(currentZoomLevel * 100)}%`;
        }
        if (zoomOutButton) zoomOutButton.disabled = currentZoomLevel <= MIN_ZOOM;
        if (zoomInButton) zoomInButton.disabled = currentZoomLevel >= MAX_ZOOM;
    }

    // --- Theme Application Function ---
    function applyTheme(themeName) {
        console.log(`[MainJS] Applying theme: ${themeName}`);
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
        if (themeName === 'dark') {
            document.body.classList.add('theme-dark');
        } else if (themeName === 'sepia') {
            document.body.classList.add('theme-sepia');
        } else { // Default to light if themeName is somehow invalid, though it should be 'sepia' by default now
            document.body.classList.add('theme-light'); 
        }
        currentTheme = themeName; 
        themeButtons.forEach(button => {
            if (button) { 
                if (button.id === `theme-${themeName}`) {
                    button.classList.add('theme-button-active');
                } else {
                    button.classList.remove('theme-button-active');
                }
            }
        });
    }

    async function handleThemeSelection(themeName) {
        applyTheme(themeName);
        try {
            await saveSetting('currentTheme', themeName);
            console.log(`[MainJS] Theme '${themeName}' saved to IndexedDB.`);
        } catch (error) {
            console.error('[MainJS] Error saving theme to IndexedDB:', error);
        }
    }

    // --- Navigation Logic ---
    if (prevPageButton) {
        prevPageButton.addEventListener('click', async () => {
            // console.log('[Debug Nav] Prev Page button clicked.'); 
            if (currentPdfDocument && currentPageNumber > 1) {
                currentPageNumber--;
                updateNavigationControls();
                scrollToPage(currentPageNumber);
                try {
                    await saveSetting('lastViewedPage', currentPageNumber);
                } catch (error) {
                    console.warn('[MainJS] Could not save lastViewedPage for prev click:', error);
                }
            } else {
                // console.log('[Debug Nav] Conditions NOT met for Prev Page.');
            }
        });
    } else {
        console.error('[MainJS] prevPageButton not found.');
    }

    if (nextPageButton) {
        nextPageButton.addEventListener('click', async () => {
            // console.log('[Debug Nav] Next Page button clicked.');
            if (currentPdfDocument && currentPageNumber < currentPdfDocument.numPages) {
                currentPageNumber++;
                updateNavigationControls();
                scrollToPage(currentPageNumber);
                try {
                    await saveSetting('lastViewedPage', currentPageNumber);
                } catch (error) {
                    console.warn('[MainJS] Could not save lastViewedPage for next click:', error);
                }
            } else {
                //  console.log('[Debug Nav] Conditions NOT met for Next Page.');
            }
        });
    } else {
        console.error('[MainJS] nextPageButton not found.');
    }

    function scrollToPage(pageNum, scrollBehavior = 'smooth') {
        const targetCanvas = document.getElementById(`page-${pageNum}-canvas`);
        if (targetCanvas) {
            targetCanvas.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
        } else {
            console.warn(`[MainJS] Canvas for page ${pageNum} not found for scrolling.`);
        }
    }

    // --- Zoom Logic & Event Listeners ---
    async function applyAndSaveZoom(newZoomLevel) {
        currentZoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoomLevel)); 
        updateZoomDisplay(); 
        try {
            await saveSetting('currentZoomLevel', currentZoomLevel);
        } catch (error) {
            console.error('[MainJS] Error saving zoom level to IndexedDB:', error);
        }
        if (currentPdfDocument) {
            showLoading(true); 
            try {
                await renderAllPages(currentPdfDocument); 
            } catch (renderError) {
                console.error('[MainJS] Error during renderAllPages after zoom:', renderError); 
                showLoading(false); 
            }
        } else {
            console.warn('[MainJS] applyAndSaveZoom - No PDF document loaded to re-render.'); 
            showLoading(false); 
        }
    }

    if (zoomInButton) {
        zoomInButton.addEventListener('click', () => {
            applyAndSaveZoom(currentZoomLevel + ZOOM_STEP);
        });
    } else {
        console.error('[MainJS] zoomInButton not found.');
    }

    if (zoomOutButton) {
        zoomOutButton.addEventListener('click', () => {
            applyAndSaveZoom(currentZoomLevel - ZOOM_STEP);
        });
    } else {
        console.error('[MainJS] zoomOutButton not found.');
    }
    
    if (zoomResetButton) {
        zoomResetButton.addEventListener('click', () => {
            applyAndSaveZoom(DEFAULT_ZOOM_LEVEL); 
        });
    } else {
        console.error('[MainJS] zoomResetButton not found.');
    }

    // --- Theme Control Event Listeners ---
    if (themeLightButton) {
        themeLightButton.addEventListener('click', () => {
            handleThemeSelection('light'); 
        });
    } else {
        console.error('[MainJS] themeLightButton not found.');
    }
    if (themeDarkButton) {
        themeDarkButton.addEventListener('click', () => {
            handleThemeSelection('dark'); 
        });
    } else {
        console.error('[MainJS] themeDarkButton not found.');
    }
    if (themeSepiaButton) {
        themeSepiaButton.addEventListener('click', () => { 
            handleThemeSelection('sepia'); 
        });
    } else {
        console.error('[MainJS] themeSepiaButton not found.');
    }

    function findFirstVisiblePage() {
        if (!pdfRenderArea) return currentPageNumber; 
        const canvases = pdfRenderArea.getElementsByTagName('canvas');
        const viewerContainer = document.getElementById('pdf-viewer-container');
        if (!viewerContainer) return currentPageNumber; 
        const viewerContainerRect = viewerContainer.getBoundingClientRect();
        for (let i = 0; i < canvases.length; i++) {
            const canvas = canvases[i];
            const rect = canvas.getBoundingClientRect();
            const isVisible = (rect.top < viewerContainerRect.bottom && rect.bottom > viewerContainerRect.top);
            if (isVisible) {
                const pageNum = parseInt(canvas.id.split('-')[1]);
                if (!isNaN(pageNum)) { return pageNum; }
            }
        }
        return currentPageNumber; 
    }

    // --- Start the application ---
    initializeApp();

}); // End of DOMContentLoaded
