// js/main.js
// Gen AI Prompt eBook Reader - main.js (v22 - Refined Render Mode Switching - Reverted)
// Resets zoom to default when switching to "All" pages mode. No "Go to Page" input.

import { initDB, saveSetting, getSetting } from './IndexedDBService.js';

// --- Configuration ---
const DEFAULT_PDF_PATH = 'pdf/Generative AI Professional Prompt Engineering Guide - First Edition Release 9.0.pdf';
const DEFAULT_ZOOM_LEVEL = 1.5; 
const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const DEFAULT_THEME = 'sepia'; 
const DEFAULT_RENDER_MODE = 'all'; 

let currentPdfDocument = null;
let currentPageNumber = 1;
let currentZoomLevel = DEFAULT_ZOOM_LEVEL; 
let currentTheme = DEFAULT_THEME; 
let currentRenderMode = DEFAULT_RENDER_MODE;

document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Element References ---
    const pdfRenderArea = document.getElementById('pdf-render-area');
    const pdfStatusMessage = document.getElementById('pdf-status-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    const pdfNavigationControls = document.getElementById('pdf-navigation');
    const prevPageButton = document.getElementById('prev-page');
    const nextPageButton = document.getElementById('next-page');
    const pageNumDisplay = document.getElementById('page-num'); // This is a span
    const pageCountDisplay = document.getElementById('page-count');
    // const pageInput = document.getElementById('page-input'); // Removed for this version
    // const gotoPageButton = document.getElementById('goto-page-button'); // Removed for this version


    const zoomOutButton = document.getElementById('zoom-out');
    const zoomInButton = document.getElementById('zoom-in');
    const zoomResetButton = document.getElementById('zoom-reset');
    const zoomLevelDisplay = document.getElementById('zoom-level-display');

    const themeLightButton = document.getElementById('theme-light');
    const themeDarkButton = document.getElementById('theme-dark');
    const themeSepiaButton = document.getElementById('theme-sepia');
    const themeButtons = [themeLightButton, themeDarkButton, themeSepiaButton];

    const renderAllRadio = document.getElementById('render-all');
    const renderPageRadio = document.getElementById('render-page');

    if (!prevPageButton || !nextPageButton || !pageNumDisplay || !zoomOutButton || !zoomInButton || !zoomResetButton || !themeLightButton || !themeDarkButton || !themeSepiaButton || !renderAllRadio || !renderPageRadio) {
        console.warn('[MainJS Init] One or more control elements were not found in the DOM. Check HTML IDs.');
    }

    // --- Initialize IndexedDB ---
    try {
        await initDB(); 
        console.log('[MainJS] IndexedDB initialized successfully.');
    } catch (error) {
        console.error('[MainJS] Critical error: IndexedDB could not be initialized.', error);
        if(pdfStatusMessage) {
            pdfStatusMessage.textContent = 'Error: Application storage could not be initialized.';
            pdfStatusMessage.classList.remove('hidden');
            pdfStatusMessage.classList.add('text-red-500');
        }
        showLoading(false);
        return; 
    }

    // --- Initialization of the App ---
    async function initializeApp() {
        console.log('[MainJS] App initializing...');
        showLoading(true);
        if(pdfNavigationControls) pdfNavigationControls.classList.add('hidden'); 
        if(pdfStatusMessage) {
            pdfStatusMessage.textContent = 'Loading eBook...'; 
            pdfStatusMessage.classList.remove('hidden');
        }

        try {
            const savedZoom = await getSetting('currentZoomLevel');
            currentZoomLevel = (savedZoom !== undefined) ? parseFloat(savedZoom) : DEFAULT_ZOOM_LEVEL;
            updateZoomDisplay(); 

            const savedTheme = await getSetting('currentTheme');
            currentTheme = (savedTheme !== undefined) ? savedTheme : DEFAULT_THEME;
            if (savedTheme === undefined) await saveSetting('currentTheme', currentTheme);
            applyTheme(currentTheme); 

            const savedRenderMode = await getSetting('currentRenderMode');
            currentRenderMode = (savedRenderMode !== undefined) ? savedRenderMode : DEFAULT_RENDER_MODE;
            if (savedRenderMode === undefined) await saveSetting('currentRenderMode', currentRenderMode);
            updateRenderModeSelectionUI();

        } catch (settingError) {
            console.error('[MainJS] Error loading settings from IndexedDB:', settingError);
            currentZoomLevel = DEFAULT_ZOOM_LEVEL;
            currentTheme = DEFAULT_THEME;
            currentRenderMode = DEFAULT_RENDER_MODE;
            updateZoomDisplay();
            applyTheme(currentTheme);
            updateRenderModeSelectionUI();
        }

        try {
            const response = await fetch(DEFAULT_PDF_PATH);
            if (!response.ok) {
                console.error(`[MainJS] Fetch response not OK. Status: ${response.status}, StatusText: ${response.statusText} for ${DEFAULT_PDF_PATH}`);
                throw new Error(`HTTP error! status: ${response.status} while fetching ${DEFAULT_PDF_PATH}`);
            }
            const pdfData = await response.arrayBuffer();
            await loadAndRenderPdf(pdfData);
        } catch (error) {
            console.error('[MainJS] Initialization Error (PDF Fetch/Load):', error);
            if(pdfStatusMessage){
                pdfStatusMessage.textContent = `Error loading eBook: ${error.message}. Check console and file path.`;
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
            // if(pageInput) pageInput.max = pdfDoc.numPages; // Removed
            
            let initialPageToLoad = 1;
            try {
                const lastPage = await getSetting('lastViewedPage');
                if (lastPage !== undefined && lastPage > 0 && lastPage <= pdfDoc.numPages) {
                    initialPageToLoad = parseInt(lastPage); 
                }
            } catch (pageGetError) { console.warn('[MainJS] Could not get lastViewedPage:', pageGetError); }
            currentPageNumber = initialPageToLoad;
            
            await refreshPdfDisplay(true); 

        } catch (error) {
            console.error('[MainJS] Error loading PDF data:', error);
            showLoading(false);
        }
    }
    
    async function refreshPdfDisplay(initialLoad = false) {
        if (!currentPdfDocument) return;
        console.log(`[MainJS refreshPdfDisplay] Mode: ${currentRenderMode}, Page: ${currentPageNumber}, Zoom: ${currentZoomLevel*100}%`);
        showLoading(true);
        if(pdfRenderArea) pdfRenderArea.innerHTML = ''; 

        if (currentRenderMode === 'all') {
            for (let i = 1; i <= currentPdfDocument.numPages; i++) {
                await renderOrReRenderPage(currentPdfDocument, i, currentZoomLevel); 
            }
        } else { 
            await renderOrReRenderPage(currentPdfDocument, currentPageNumber, currentZoomLevel);
        }
        
        showLoading(false);
        updateNavigationControls(); 
        if(pdfNavigationControls) pdfNavigationControls.classList.remove('hidden'); 
        
        requestAnimationFrame(() => { 
            scrollToPage(currentPageNumber, initialLoad ? 'auto' : (currentRenderMode === 'page' ? 'auto' : 'smooth') );
        });
    }

    async function renderOrReRenderPage(pdfDoc, pageNum, scaleToUse) {
        try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: scaleToUse });
            let canvas = document.getElementById(`page-${pageNum}-canvas`);
            if (currentRenderMode === 'page') { 
                if (pdfRenderArea.firstChild && pdfRenderArea.firstChild.id !== `page-${pageNum}-canvas`) {
                    pdfRenderArea.innerHTML = ''; 
                    canvas = null; 
                } else if (pdfRenderArea.children.length > 1) { 
                    pdfRenderArea.innerHTML = '';
                    canvas = null;
                }
            }
            if (!canvas) { 
                canvas = document.createElement('canvas');
                canvas.className = 'pdf-page-canvas'; 
                canvas.id = `page-${pageNum}-canvas`; 
                if(pdfRenderArea) pdfRenderArea.appendChild(canvas);
            }
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            const renderContext = { canvasContext: context, viewport: viewport };
            await page.render(renderContext).promise;
        } catch (error) {
            console.error(`[MainJS] Error rendering page ${pageNum}:`, error);
        }
    }

    // --- UI Helper Functions ---
    function showLoading(isLoading) { if(loadingIndicator) loadingIndicator.style.display = isLoading ? 'flex' : 'none'; }
    
    function updateNavigationControls() { 
        if (!currentPdfDocument) {
            if(pageNumDisplay) pageNumDisplay.textContent = '0'; 
            if(pageCountDisplay) pageCountDisplay.textContent = '0';
            if(prevPageButton) prevPageButton.disabled = true;
            if(nextPageButton) nextPageButton.disabled = true;
            // if(gotoPageButton) gotoPageButton.disabled = true; // Removed
            // if(pageInput) pageInput.disabled = true; // Removed
            return;
        }
        if(pageNumDisplay) pageNumDisplay.textContent = currentPageNumber; 
        if(pageCountDisplay && currentPdfDocument) pageCountDisplay.textContent = currentPdfDocument.numPages;
        if(prevPageButton) prevPageButton.disabled = currentPageNumber <= 1;
        if(nextPageButton && currentPdfDocument) nextPageButton.disabled = currentPageNumber >= currentPdfDocument.numPages;
        // if(gotoPageButton) gotoPageButton.disabled = false; // Removed
        // if(pageInput) pageInput.disabled = false; // Removed
    }
    function updateZoomDisplay() { 
        if (zoomLevelDisplay) zoomLevelDisplay.textContent = `${Math.round(currentZoomLevel * 100)}%`;
        if (zoomOutButton) zoomOutButton.disabled = currentZoomLevel <= MIN_ZOOM;
        if (zoomInButton) zoomInButton.disabled = currentZoomLevel >= MAX_ZOOM;
    }
    function updateRenderModeSelectionUI() {
        if (renderAllRadio) renderAllRadio.checked = (currentRenderMode === 'all');
        if (renderPageRadio) renderPageRadio.checked = (currentRenderMode === 'page');
    }
    function applyTheme(themeName) { 
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-sepia');
        if (themeName === 'dark') document.body.classList.add('theme-dark');
        else if (themeName === 'sepia') document.body.classList.add('theme-sepia');
        else document.body.classList.add('theme-light'); 
        currentTheme = themeName; 
        themeButtons.forEach(button => {
            if (button) { 
                if (button.id === `theme-${themeName}`) button.classList.add('theme-button-active');
                else button.classList.remove('theme-button-active');
            }
        });
    }
    async function handleThemeSelection(themeName) { 
        applyTheme(themeName);
        try { await saveSetting('currentTheme', themeName); } 
        catch (error) { console.error('[MainJS] Error saving theme:', error); }
    }
    
    // --- Navigation Logic ---
    async function navigateToPageOptimized(newPageNum) { // Renamed for clarity in this version
        if (!currentPdfDocument || isNaN(newPageNum)) return;
        
        const newClampedPage = Math.max(1, Math.min(newPageNum, currentPdfDocument.numPages));
        
        if (newClampedPage === currentPageNumber && currentRenderMode === 'all') {
            // If in 'all' mode and page hasn't changed, just ensure scroll
            scrollToPage(newClampedPage);
            return; // No need to update currentPageNumber or save if it's the same
        }

        currentPageNumber = newClampedPage;
        updateNavigationControls(); // Update the span

        if (currentRenderMode === 'page' || newClampedPage !== currentPageNumber) { // Redundant check if page hasn't changed, but safe
             // Always refresh in 'page' mode, or if page number genuinely changed (less likely here due to direct scroll above)
            await refreshPdfDisplay(); 
        } else { // 'all' mode and page didn't change (this path less likely now)
            scrollToPage(currentPageNumber);
        }
        
        try { await saveSetting('lastViewedPage', currentPageNumber); } 
        catch (error) { console.warn('[MainJS] Could not save lastViewedPage:', error); }
    }

    if (prevPageButton) {
        prevPageButton.addEventListener('click', async () => { 
            if (currentPdfDocument && currentPageNumber > 1) {
                await navigateToPageOptimized(currentPageNumber - 1);
            }
        });
    } else { console.error('[MainJS] prevPageButton not found.'); }

    if (nextPageButton) {
        nextPageButton.addEventListener('click', async () => { 
            if (currentPdfDocument && currentPageNumber < currentPdfDocument.numPages) {
                await navigateToPageOptimized(currentPageNumber + 1);
            }
        });
    } else { console.error('[MainJS] nextPageButton not found.'); }

    // "Go to Page" input and button listeners are removed for this version.

    async function scrollToPage(pageNum, scrollBehavior = 'smooth') {
        const targetPageNumToScroll = (currentRenderMode === 'page') ? currentPageNumber : pageNum;
        const targetCanvas = document.getElementById(`page-${targetPageNumToScroll}-canvas`);
        if (targetCanvas) {
            targetCanvas.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
        } else {
            console.warn(`[MainJS scrollToPage] Canvas for page ${targetPageNumToScroll} not found.`);
        }
    }
    
    async function applyAndSaveZoom(newZoomLevel) {
        currentZoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoomLevel)); 
        updateZoomDisplay(); 
        try { await saveSetting('currentZoomLevel', currentZoomLevel); } 
        catch (error) { console.error('[MainJS] Error saving zoom level:', error); }
        if (currentPdfDocument) {
            await refreshPdfDisplay(); 
        } else {
            console.warn('[MainJS] applyAndSaveZoom - No PDF document loaded.'); 
        }
    }
    if (zoomInButton) zoomInButton.addEventListener('click', () => applyAndSaveZoom(currentZoomLevel + ZOOM_STEP));
    else console.error('[MainJS] zoomInButton not found.');
    if (zoomOutButton) zoomOutButton.addEventListener('click', () => applyAndSaveZoom(currentZoomLevel - ZOOM_STEP));
    else console.error('[MainJS] zoomOutButton not found.');
    if (zoomResetButton) zoomResetButton.addEventListener('click', () => applyAndSaveZoom(DEFAULT_ZOOM_LEVEL));
    else console.error('[MainJS] zoomResetButton not found.');

    // --- Theme Control Event Listeners ---
    if (themeLightButton) themeLightButton.addEventListener('click', () => handleThemeSelection('light'));
    else console.error('[MainJS] themeLightButton not found.');
    if (themeDarkButton) themeDarkButton.addEventListener('click', () => handleThemeSelection('dark'));
    else console.error('[MainJS] themeDarkButton not found.');
    if (themeSepiaButton) themeSepiaButton.addEventListener('click', () => handleThemeSelection('sepia'));
    else console.error('[MainJS] themeSepiaButton not found.');

    // --- Render Mode Control Event Listeners ---
    async function handleRenderModeChange(event) {
        const newMode = event.target.value;
        if (newMode !== currentRenderMode && currentPdfDocument) { 
            console.log(`[MainJS] Render mode changing from ${currentRenderMode} to: ${newMode}`);
            currentRenderMode = newMode;
            updateRenderModeSelectionUI(); 
            try {
                await saveSetting('currentRenderMode', currentRenderMode);
            } catch (error) {
                console.error('[MainJS] Error saving render mode:', error);
            }
            if (currentRenderMode === 'all') { // When switching TO 'all' mode
                currentZoomLevel = DEFAULT_ZOOM_LEVEL; // Reset global zoom
                updateZoomDisplay(); 
                try {
                    await saveSetting('currentZoomLevel', currentZoomLevel); 
                } catch (zoomSaveError) {
                    console.error('[MainJS] Error saving reset zoom for "all" mode:', zoomSaveError);
                }
            }
            await refreshPdfDisplay(true); 
        } else if (!currentPdfDocument) { 
            currentRenderMode = newMode;
            updateRenderModeSelectionUI();
             try { await saveSetting('currentRenderMode', currentRenderMode); } 
             catch (error) { console.error('[MainJS] Error saving render mode (no PDF):', error); }
        }
    }
    if (renderAllRadio) renderAllRadio.addEventListener('change', handleRenderModeChange);
    else console.error('[MainJS] renderAllRadio not found.');
    if (renderPageRadio) renderPageRadio.addEventListener('change', handleRenderModeChange);
    else console.error('[MainJS] renderPageRadio not found.');

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
});
