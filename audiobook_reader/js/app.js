// js/app.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("Generative AI Prompt Guide Reader: Initializing...");

    // UI Elements
    const chapterListUL = document.getElementById('chapter-list');
    const audioPlayer = document.getElementById('audio-player');
    
    const playPauseButton = document.getElementById('play-pause-button');
    const skipBackwardButton = document.getElementById('skip-backward-button');
    const skipForwardButton = document.getElementById('skip-forward-button');
    
    const volumeSlider = document.getElementById('volume-slider');
    const speedSelector = document.getElementById('speed-selector');
    const currentSpeedDisplay = document.getElementById('current-speed-display');

    const coverArtImg = document.getElementById('cover-art-img');
    const currentBookTitleDisplay = document.getElementById('current-book-title');
    const currentChapterTitleDisplay = document.getElementById('current-chapter-title');
    const currentBookAuthorDisplay = document.getElementById('current-book-author');
    const metadataStatusDisplay = document.getElementById('metadata-status');

    const progressContainer = document.getElementById('progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const currentTimeDisplay = document.getElementById('current-time');
    const totalDurationDisplay = document.getElementById('total-duration');

    const bookmarksListUL = document.getElementById('bookmarks-list');
    const noBookmarksMsgLI = document.getElementById('no-bookmarks-msg');
    const bookmarkNoteInput = document.getElementById('bookmark-note-input');
    const addBookmarkButton = document.getElementById('add-bookmark-button');
    
    const sleepTimerSelect = document.getElementById('sleep-timer-select');
    const sleepTimerStatus = document.getElementById('sleep-timer-status');
    const cancelSleepTimerButton = document.getElementById('cancel-sleep-timer-button');

    // Visualizer Elements
    const waveformContainer = document.getElementById('waveform-container');
    const visualizerCanvas = document.getElementById('audio-visualizer-canvas');
    const toggleVisualizationButton = document.getElementById('toggle-visualization-button');
    let canvasCtx = null;

    // Theme Elements
    const toggleSettingsButton = document.getElementById('toggle-settings-button');
    const themeSettingsPanel = document.getElementById('theme-settings-panel');
    const themeModeToggleButton = document.getElementById('theme-mode-toggle-button');
    const accentColorOptionsContainer = document.getElementById('accent-color-options');

    // State
    let chaptersData = []; 
    let currentChapterIndex = -1;
    let bookDetails = { 
        bookTitle: "Generative AI Prompt Guide Reader", 
        bookAuthor: "Unknown Author", 
        defaultBookCover: 'images/default-cover-512.png',
        artwork: [{ src: 'images/default-cover-512.png', sizes: '512x512', type: 'image/png' }] 
    };
    let isProgrammaticSeek = false; 
    let shouldBePlayingAfterSeek = false; 
    let bookmarks = [];
    let sleepTimerId = null;
    let sleepTimerEndsAt = 0; 
    let sleepTimerIntervalId = null; 
    
    let audioContext = null;
    let analyserNode = null;
    let visualizerSourceNode = null;
    let visualizerDataArray = null;
    let visualizerAnimationId = null;
    let isVisualizerActive = false;

    const LAST_POSITION_KEY = 'generativeAiPromptGuideReaderLastPosition';
    const CHAPTER_PROGRESS_KEY = 'generativeAiPromptGuideReaderChapterProgress';
    const BOOKMARKS_KEY = 'generativeAiPromptGuideReaderBookmarks';
    const THEME_MODE_KEY = 'generativeAiPromptGuideReaderThemeMode';
    const THEME_ACCENT_KEY = 'generativeAiPromptGuideReaderThemeAccent';

    // --- Utility Functions ---
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const H = h > 0 ? `${h.toString().padStart(2, '0')}:` : '';
        return `${H}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function displayUserMessage(message, type = 'info') {
        if (!metadataStatusDisplay) return;
        metadataStatusDisplay.textContent = message;
        metadataStatusDisplay.className = `status-message status-${type}`;
        if (type !== 'error') {
            setTimeout(() => { if (metadataStatusDisplay.textContent === message) metadataStatusDisplay.textContent = ''; }, 4000);
        }
    }

    // --- Theme Management ---
    function applyThemeMode(mode) { 
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(mode === 'dark' ? 'dark-mode' : 'light-mode');
        localStorage.setItem(THEME_MODE_KEY, mode);
        if (themeModeToggleButton) {
            themeModeToggleButton.textContent = mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
            themeModeToggleButton.setAttribute('aria-label', mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
        }
        updateDefaultAccentSwatchColor(mode);
    }

    function applyAccentColor(accentName) { 
        const accents = ["accent-default", "accent-green", "accent-blue", "accent-purple"];
        accents.forEach(acc => document.body.classList.remove(acc));
        document.body.classList.add(`accent-${accentName}`);
        localStorage.setItem(THEME_ACCENT_KEY, accentName);
        if (accentColorOptionsContainer) {
            accentColorOptionsContainer.querySelectorAll('.accent-swatch').forEach(swatch => {
                swatch.classList.toggle('active', swatch.dataset.accent === accentName);
            });
        }
    }
    
    function updateDefaultAccentSwatchColor(mode) {
        const defaultSwatch = accentColorOptionsContainer?.querySelector('.accent-swatch[data-accent="default"]');
        if (defaultSwatch) {
            const lightModeDefaultHighlight = getComputedStyle(document.documentElement).getPropertyValue('--highlight-color-primary').trim() || '#0A1931';
            // To get dark mode's default, we need to temporarily apply class or have it stored
            let darkModeDefaultHighlight = '#1DB954'; // Fallback
            
            // Create a temporary element to get computed style for dark mode if not currently active
            if (mode !== 'dark') {
                const tempDiv = document.createElement('div');
                tempDiv.style.display = 'none';
                tempDiv.className = 'dark-mode accent-default'; // Apply classes
                document.body.appendChild(tempDiv);
                darkModeDefaultHighlight = getComputedStyle(tempDiv).getPropertyValue('--highlight-color-primary').trim() || '#1DB954';
                document.body.removeChild(tempDiv);
            } else {
                 darkModeDefaultHighlight = getComputedStyle(document.body).getPropertyValue('--highlight-color-primary').trim() || '#1DB954';
            }
            
            defaultSwatch.style.setProperty('--swatch-color', mode === 'dark' ? darkModeDefaultHighlight : lightModeDefaultHighlight);
            defaultSwatch.style.backgroundColor = defaultSwatch.style.getPropertyValue('--swatch-color');
        }
    }

    function loadThemeSettings() {
        const savedMode = localStorage.getItem(THEME_MODE_KEY) || 'dark'; 
        const savedAccent = localStorage.getItem(THEME_ACCENT_KEY) || 'default';
        applyThemeMode(savedMode); 
        applyAccentColor(savedAccent); 
    }
    
    // --- Chapter Progress & Last Position ---
    function loadChapterProgressData() {
        const progressData = localStorage.getItem(CHAPTER_PROGRESS_KEY);
        try { return progressData ? JSON.parse(progressData) : {}; } 
        catch (e) { console.error("Error parsing chapter progress data:", e); return {}; }
    }
    function saveCurrentChapterProgress() {
        if (currentChapterIndex !== -1 && chaptersData[currentChapterIndex] && audioPlayer.currentTime > 0) {
            const chapterFileName = chaptersData[currentChapterIndex].fileName;
            let allProgress = loadChapterProgressData();
            allProgress[chapterFileName] = audioPlayer.currentTime;
            localStorage.setItem(CHAPTER_PROGRESS_KEY, JSON.stringify(allProgress));
        }
    }
    function saveGlobalLastPosition() { 
         if (currentChapterIndex !== -1 && chaptersData[currentChapterIndex]) {
            const lastPosition = { chapterIndex: currentChapterIndex, timestamp: audioPlayer.currentTime, fileName: chaptersData[currentChapterIndex].fileName };
            localStorage.setItem(LAST_POSITION_KEY, JSON.stringify(lastPosition));
        }
    }
    function handlePlaybackEndOrPause() { 
        saveCurrentChapterProgress();
        saveGlobalLastPosition();
    }

    // --- Chapter Loading & Selection ---
    async function loadAppContent() { 
        chapterListUL.innerHTML = '<li id="loading-chapters-msg" class="status-message">Loading content...</li>';
        const loadingMsgElement = document.getElementById('loading-chapters-msg');
        try {
            const [chaptersResponse, bookDetailsResponse] = await Promise.all([ fetch('chapters-manifest.json'), fetch('book_details.json')]);
            if (!chaptersResponse.ok) { const errorText = await chaptersResponse.text(); throw new Error(`HTTP error ${chaptersResponse.status} fetching chapters-manifest.json. Server said: ${errorText}`);}
            if (!bookDetailsResponse.ok) { const errorText = await bookDetailsResponse.text(); throw new Error(`HTTP error ${bookDetailsResponse.status} fetching book_details.json. Server said: ${errorText}`);}
            const chapterFiles = await chaptersResponse.json();
            const detailsFromFile = await bookDetailsResponse.json();
            if (!Array.isArray(chapterFiles)) throw new Error("chapters-manifest.json data not in expected array format.");
            if (typeof detailsFromFile !== 'object' || !Array.isArray(detailsFromFile.chapters)) throw new Error("book_details.json data not in expected object format or missing chapters array.");
            bookDetails.bookTitle = detailsFromFile.bookTitle || bookDetails.bookTitle; 
            if (detailsFromFile.hasOwnProperty('bookAuthor')) { bookDetails.bookAuthor = detailsFromFile.bookAuthor; } 
            else { console.warn("book_details.json is missing 'bookAuthor'. Using default.");}
            if (detailsFromFile.hasOwnProperty('defaultBookCover')) { bookDetails.defaultBookCover = detailsFromFile.defaultBookCover; }
            bookDetails.artwork = [{ src: bookDetails.defaultBookCover, sizes: '512x512', type: 'image/png' }];
            chaptersData = chapterFiles.map(fileEntry => {
                const detailEntry = detailsFromFile.chapters.find(d => d.fileName === fileEntry.fileName);
                return { ...fileEntry, displayTitle: detailEntry?.displayTitle || fileEntry.fileName.replace(/\.[^/.]+$/, ""), coverArt: detailEntry?.coverArt || bookDetails.defaultBookCover };
            });
            if (chaptersData.length > 0) {
                renderChapterList();
                currentBookTitleDisplay.textContent = bookDetails.bookTitle;
                currentBookAuthorDisplay.textContent = bookDetails.bookAuthor;
                coverArtImg.src = bookDetails.defaultBookCover; 
                coverArtImg.alt = `${bookDetails.bookTitle} Cover Art`;
                currentChapterTitleDisplay.textContent = "Select a chapter"; 
                loadGlobalLastPositionOnStartup(); loadBookmarks();    
                console.log("Content loaded and initial state restored.");
            } else {
                const msg = 'No chapters found in manifests.';
                if(loadingMsgElement) loadingMsgElement.textContent = msg; else chapterListUL.innerHTML = `<li class="status-message">${msg}</li>`;
                displayUserMessage(msg, 'warn');
            }
        } catch (error) {
            console.error('Error loading app content:', error);
            const errorMsg = `Error loading content: ${error.message}. Ensure JSON files are correct.`;
            if(loadingMsgElement) loadingMsgElement.textContent = errorMsg; else chapterListUL.innerHTML = `<li class="status-message">${errorMsg}</li>`;
            displayUserMessage(errorMsg, 'error');
        }
    }
    function renderChapterList() { 
        chapterListUL.innerHTML = ''; 
        chaptersData.forEach((chapter, index) => {
            const li = document.createElement('li');
            li.textContent = chapter.displayTitle || 'Untitled Chapter';
            li.dataset.fileName = chapter.fileName; li.dataset.index = index;
            li.addEventListener('click', () => selectChapterAndPlay(index)); 
            chapterListUL.appendChild(li);
        });
    }
    async function selectChapterAndPlay(index, playFromTimestamp = 0) { 
        if (index < 0 || index >= chaptersData.length) return;
        if (currentChapterIndex !== -1 && currentChapterIndex !== index) { saveCurrentChapterProgress(); }
        const chapter = chaptersData[index]; const newSrc = `audio/${chapter.fileName}`;
        const currentAudioFileSrc = audioPlayer.currentSrc.substring(audioPlayer.currentSrc.lastIndexOf('/') + 1);
        let effectivePlayFromTimestamp = playFromTimestamp;
        if (playFromTimestamp === 0) { const chapterProgressData = loadChapterProgressData(); if (chapterProgressData[chapter.fileName]) { effectivePlayFromTimestamp = chapterProgressData[chapter.fileName]; }}
        if (index === currentChapterIndex && currentAudioFileSrc === chapter.fileName && audioPlayer.paused && audioPlayer.readyState > 0 && effectivePlayFromTimestamp === audioPlayer.currentTime) {
            try { await audioPlayer.play(); updateMediaSessionState(); } catch (error) { console.error("Error resuming audio:", error); updatePlayPauseButtonUI(); } return;
        }
        currentChapterIndex = index; isProgrammaticSeek = false; audioPlayer.src = newSrc; audioPlayer.load(); 
        const setTimeAndPlay = async () => {
            audioPlayer.removeEventListener('canplay', setTimeAndPlay); audioPlayer.removeEventListener('loadedmetadata', setTimeAndPlay); 
            if (effectivePlayFromTimestamp > 0 && effectivePlayFromTimestamp < audioPlayer.duration) { audioPlayer.currentTime = effectivePlayFromTimestamp; }
            try { await audioPlayer.play(); updateMediaSessionState();
                  if (isVisualizerActive) setupAudioVisualizerNodes();
            } catch (error) { console.error(`Error initiating play for ${chapter.fileName}:`, error); updatePlayPauseButtonUI(); }
        };
        audioPlayer.addEventListener('loadedmetadata', setTimeAndPlay, {once: true}); audioPlayer.addEventListener('canplay', setTimeAndPlay, {once: true}); 
        await fetchAndDisplayMetadata(chapter); updateChapterListActiveState(); saveGlobalLastPosition(); 
    }
    function updateChapterListActiveState() { 
        const listItems = chapterListUL.querySelectorAll('li');
        listItems.forEach((item, idx) => item.classList.toggle('active', idx === currentChapterIndex));
    }
    async function fetchAndDisplayMetadata(chapter) { 
        metadataStatusDisplay.textContent = ''; 
        currentBookTitleDisplay.textContent = bookDetails.bookTitle;
        currentBookAuthorDisplay.textContent = bookDetails.bookAuthor; 
        currentChapterTitleDisplay.textContent = chapter.displayTitle;
        coverArtImg.src = chapter.coverArt || bookDetails.defaultBookCover;
        coverArtImg.alt = `${chapter.displayTitle || 'Audiobook'} Cover Art`;
        updateMediaSessionMetadata(chapter.displayTitle, bookDetails.bookAuthor, bookDetails.bookTitle, chapter.coverArt || bookDetails.defaultBookCover);
    }

    // --- Playback Controls ---
    function togglePlayPause() { 
        if (currentChapterIndex === -1 && chaptersData.length > 0) { 
            selectChapterAndPlay(0); 
        } else if (audioPlayer.src) { 
            if (audioPlayer.paused || audioPlayer.ended) {
                audioPlayer.play().then(() => {
                    if (audioContext && audioContext.state === 'suspended') {
                        audioContext.resume().catch(e => console.error("Error resuming AudioContext on play:", e));
                    }
                    updateMediaSessionState();
                }).catch(e => { console.error("Play error on toggle:", e); updatePlayPauseButtonUI(); });
            } else { 
                audioPlayer.pause(); 
            }
        } else if (chaptersData.length > 0) { 
            selectChapterAndPlay(0); 
        }
    }
    function updatePlayPauseButtonUI() { 
        const isEffectivelyPlaying = !audioPlayer.paused && !audioPlayer.ended && audioPlayer.readyState > 2;
        if (playPauseButton) {
            playPauseButton.textContent = isEffectivelyPlaying ? 'Pause' : 'Play';
            playPauseButton.setAttribute('aria-label', isEffectivelyPlaying ? 'Pause' : 'Play');
        }
    }
    function handleSeekOperation(offset) {
        if (currentChapterIndex === -1 || !audioPlayer.src || audioPlayer.readyState < HTMLMediaElement.HAVE_METADATA) { return; }
        if (isNaN(audioPlayer.duration) || audioPlayer.duration <= 0) { return; }
        const oldTime = audioPlayer.currentTime; let newTime;
        if (offset > 0) { newTime = Math.min(audioPlayer.duration - 0.01, oldTime + offset); } 
        else { newTime = Math.max(0, oldTime + offset); }
        if (isNaN(newTime)) { console.error("Seek Failed: newTime calculated as NaN."); return; }
        isProgrammaticSeek = true; shouldBePlayingAfterSeek = !audioPlayer.paused; 
        try { audioPlayer.currentTime = newTime; } 
        catch (e) { console.error("Seek Operation: JS ERROR during currentTime assignment:", e); isProgrammaticSeek = false; shouldBePlayingAfterSeek = false; }
    }
    
    // --- Global Last Position for App Startup ---
    function loadGlobalLastPositionOnStartup() {
        const savedPosition = localStorage.getItem(LAST_POSITION_KEY);
        if (savedPosition) {
            try {
                const lastPosition = JSON.parse(savedPosition);
                const chapterIdx = chaptersData.findIndex(ch => ch.fileName === lastPosition.fileName);
                if (chapterIdx !== -1 && lastPosition.timestamp) {
                    selectChapterAndPlay(chapterIdx, lastPosition.timestamp);
                } else { localStorage.removeItem(LAST_POSITION_KEY); }
            } catch (e) { console.error("Error parsing global last position:", e); localStorage.removeItem(LAST_POSITION_KEY); }
        }
    }

    // --- Bookmarking (FR5) ---
    function generateBookmarkId() { return Date.now().toString(36) + Math.random().toString(36).substring(2); }
    function renderBookmarks() { 
        if (!bookmarksListUL || !noBookmarksMsgLI) return;
        bookmarksListUL.innerHTML = ''; 
        if (bookmarks.length === 0) { bookmarksListUL.appendChild(noBookmarksMsgLI); noBookmarksMsgLI.style.display = 'list-item'; return; }
        noBookmarksMsgLI.style.display = 'none';
        const sortedBookmarks = [...bookmarks].sort((a, b) => { 
            const aChapter = chaptersData.find(ch => ch.fileName === a.chapterFileName);
            const bChapter = chaptersData.find(ch => ch.fileName === b.chapterFileName);
            const aChapterOrder = aChapter ? chaptersData.indexOf(aChapter) : -1;
            const bChapterOrder = bChapter ? chaptersData.indexOf(bChapter) : -1;
            if (aChapterOrder !== bChapterOrder) return aChapterOrder - bChapterOrder; 
            return a.timestamp - b.timestamp; 
        });
        sortedBookmarks.forEach(bookmark => { 
            const li = document.createElement('li'); li.dataset.bookmarkId = bookmark.id;
            const chapterForBookmark = chaptersData.find(ch => ch.fileName === bookmark.chapterFileName);
            const titleEl = document.createElement('strong'); 
            titleEl.textContent = `${chapterForBookmark?.displayTitle || 'Unknown Chapter'} at ${formatTime(bookmark.timestamp)}`;
            const noteEl = document.createElement('p'); noteEl.classList.add('bookmark-note'); noteEl.textContent = bookmark.note || 'No note.';
            const infoEl = document.createElement('div'); infoEl.classList.add('bookmark-info'); infoEl.textContent = `(Added: ${new Date(bookmark.createdAt).toLocaleDateString()})`;
            const actionsEl = document.createElement('div'); actionsEl.classList.add('bookmark-actions');
            const goToButton = document.createElement('button'); goToButton.textContent = 'Go To'; 
            goToButton.addEventListener('click', () => {
                const chapterToPlayIndex = chaptersData.findIndex(ch => ch.fileName === bookmark.chapterFileName);
                if (chapterToPlayIndex !== -1) {
                    selectChapterAndPlay(chapterToPlayIndex, bookmark.timestamp);
                } else { displayUserMessage("Could not find chapter for this bookmark.", "error"); }
            });
            const editButton = document.createElement('button'); editButton.textContent = 'Edit Note'; editButton.addEventListener('click', () => editBookmarkNote(bookmark.id));
            const deleteButton = document.createElement('button'); deleteButton.textContent = 'Delete'; deleteButton.addEventListener('click', () => deleteBookmark(bookmark.id));
            actionsEl.appendChild(goToButton); actionsEl.appendChild(editButton); actionsEl.appendChild(deleteButton);
            li.appendChild(titleEl); li.appendChild(noteEl); li.appendChild(infoEl); li.appendChild(actionsEl);
            bookmarksListUL.appendChild(li);
        });
    }
    function saveBookmarks() { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks)); renderBookmarks(); }
    function loadBookmarks() {
        const savedBookmarks = localStorage.getItem(BOOKMARKS_KEY);
        if (savedBookmarks) { try { bookmarks = JSON.parse(savedBookmarks); } catch (e) { console.error("Error parsing saved bookmarks:", e); bookmarks = []; }}
        renderBookmarks();
    }
    function handleAddBookmark() { 
        if (currentChapterIndex === -1 || isNaN(audioPlayer.currentTime) || !chaptersData[currentChapterIndex]) { 
            displayUserMessage("Play a chapter to add a bookmark.", "warn"); return; 
        }
        const currentChapterDetails = chaptersData[currentChapterIndex];
        const newBookmark = { 
            id: generateBookmarkId(), 
            chapterFileName: currentChapterDetails.fileName, 
            timestamp: audioPlayer.currentTime, 
            note: bookmarkNoteInput.value.trim(), 
            createdAt: Date.now() 
        };
        bookmarks.push(newBookmark); saveBookmarks(); bookmarkNoteInput.value = ''; 
        displayUserMessage("Bookmark added!", "success");
    }
    function deleteBookmark(bookmarkId) { bookmarks = bookmarks.filter(b => b.id !== bookmarkId); saveBookmarks(); displayUserMessage("Bookmark deleted.", "info"); }
    function editBookmarkNote(bookmarkId) { 
        const bookmark = bookmarks.find(b => b.id === bookmarkId); if (!bookmark) return;
        const newNote = prompt("Edit bookmark note:", bookmark.note);
        if (newNote !== null) { bookmark.note = newNote.trim(); saveBookmarks(); displayUserMessage("Bookmark note updated.", "info"); }
    }

    // --- Sleep Timer (FR7) ---
    function clearExistingSleepTimer() { 
        if (sleepTimerId) clearTimeout(sleepTimerId); if (sleepTimerIntervalId) clearInterval(sleepTimerIntervalId);
        sleepTimerId = null; sleepTimerIntervalId = null; sleepTimerEndsAt = 0;
        if (sleepTimerStatus) sleepTimerStatus.textContent = ''; 
        if (cancelSleepTimerButton) cancelSleepTimerButton.style.display = 'none';
        audioPlayer.removeEventListener('ended', pauseOnChapterEndForSleepTimer); 
    }
    function pauseOnChapterEndForSleepTimer() { 
        audioPlayer.pause(); 
        if (sleepTimerStatus) sleepTimerStatus.textContent = "Paused: End of chapter.";
        if (sleepTimerSelect) sleepTimerSelect.value = "0"; 
        if (cancelSleepTimerButton) cancelSleepTimerButton.style.display = 'none';
    }
    function updateSleepTimerCountdown() { 
        const timeLeft = Math.max(0, Math.round((sleepTimerEndsAt - Date.now()) / 1000));
        if (sleepTimerStatus) {
            if (timeLeft > 0) { sleepTimerStatus.textContent = `Pausing in: ${formatTime(timeLeft)}`; } 
            else { sleepTimerStatus.textContent = "Timer expired."; clearInterval(sleepTimerIntervalId); sleepTimerIntervalId = null; }
        }
    }
    function handleSleepTimerChange() {
        clearExistingSleepTimer(); 
        const value = sleepTimerSelect.value;
        if (value === "0") { return; } 
        else if (value === "1") {
            if (sleepTimerStatus) sleepTimerStatus.textContent = "Will pause at end of chapter.";
            audioPlayer.addEventListener('ended', pauseOnChapterEndForSleepTimer, { once: true }); 
            if (cancelSleepTimerButton) cancelSleepTimerButton.style.display = 'inline-block';
        } else { 
            const durationSeconds = parseInt(value, 10); 
            if (isNaN(durationSeconds) || durationSeconds <= 0) return;
            sleepTimerEndsAt = Date.now() + durationSeconds * 1000;
            sleepTimerId = setTimeout(() => {
                audioPlayer.pause(); 
                if (sleepTimerStatus) sleepTimerStatus.textContent = "Playback paused by timer.";
                clearInterval(sleepTimerIntervalId); 
                sleepTimerIntervalId = null;
                if (sleepTimerSelect) sleepTimerSelect.value = "0"; 
                if (cancelSleepTimerButton) cancelSleepTimerButton.style.display = 'none';
            }, durationSeconds * 1000);
            updateSleepTimerCountdown(); 
            sleepTimerIntervalId = setInterval(updateSleepTimerCountdown, 1000);
            if (cancelSleepTimerButton) cancelSleepTimerButton.style.display = 'inline-block';
        }
    }

    // --- Audio Visualizer Logic ---
    function initAudioContext() {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                // console.log("AudioContext initialized."); // Less verbose
            } catch (e) {
                console.error("Error initializing AudioContext:", e);
                displayUserMessage("Audio visualizer not supported by this browser.", "warn");
                return false;
            }
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume().catch(e => console.error("Error resuming AudioContext:", e));
        }
        return true;
    }

    function setupAudioVisualizerNodes() {
        if (!audioContext || !audioPlayer.src || audioPlayer.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            // console.warn("Visualizer: Audio player not ready for node setup."); // Less verbose
            return false; 
        }
        if (visualizerSourceNode && visualizerSourceNode.mediaElement === audioPlayer && analyserNode) {
            return true; 
        }
        if (visualizerSourceNode) { try { visualizerSourceNode.disconnect(); } catch(e) {} }
        if (analyserNode) { try { analyserNode.disconnect(); } catch(e) {} }
        try {
            visualizerSourceNode = audioContext.createMediaElementSource(audioPlayer);
            analyserNode = audioContext.createAnalyser(); analyserNode.fftSize = 1024; 
            const bufferLength = analyserNode.frequencyBinCount; visualizerDataArray = new Uint8Array(bufferLength);
            visualizerSourceNode.connect(analyserNode); analyserNode.connect(audioContext.destination);
            // console.log("Audio visualizer nodes set up."); // Less verbose
            return true; 
        } catch (e) {
            console.error("Error setting up audio visualizer nodes:", e);
            isVisualizerActive = false; 
            if (waveformContainer) waveformContainer.style.display = 'none';
            if (toggleVisualizationButton) {
                toggleVisualizationButton.textContent = 'Show Visualizer';
                toggleVisualizationButton.setAttribute('aria-pressed', 'false');
            }
            return false; 
        }
    }

    function drawVisualizer() {
        if (!isVisualizerActive || !analyserNode || !canvasCtx || !visualizerDataArray) {
            if (visualizerAnimationId) cancelAnimationFrame(visualizerAnimationId);
            visualizerAnimationId = null; return;
        }
        visualizerAnimationId = requestAnimationFrame(drawVisualizer);
        analyserNode.getByteTimeDomainData(visualizerDataArray); 
        const isDarkMode = document.body.classList.contains('dark-mode');
        canvasCtx.fillStyle = isDarkMode ? 
            getComputedStyle(document.body).getPropertyValue('--surface-alt-dark').trim() || '#18324a' :
            getComputedStyle(document.body).getPropertyValue('--surface-color-light').trim() || '#FFFFFF';
        canvasCtx.fillRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
        canvasCtx.lineWidth = 2; 
        canvasCtx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--highlight-color-primary').trim(); 
        canvasCtx.beginPath(); const sliceWidth = visualizerCanvas.width * 1.0 / visualizerDataArray.length; let x = 0;
        for (let i = 0; i < visualizerDataArray.length; i++) {
            const v = visualizerDataArray[i] / 128.0; const y = v * visualizerCanvas.height / 2;
            if (i === 0) { canvasCtx.moveTo(x, y); } else { canvasCtx.lineTo(x, y); }
            x += sliceWidth;
        }
        canvasCtx.lineTo(visualizerCanvas.width, visualizerCanvas.height / 2); canvasCtx.stroke();
    }

    function toggleVisualizer() {
        isVisualizerActive = !isVisualizerActive; 
        if (isVisualizerActive) {
            if (!initAudioContext() || !setupAudioVisualizerNodes()) { 
                isVisualizerActive = false; 
                if (waveformContainer) waveformContainer.style.display = 'none';
                if (toggleVisualizationButton) {
                    toggleVisualizationButton.textContent = 'Show Visualizer';
                    toggleVisualizationButton.setAttribute('aria-pressed', 'false');
                }
                displayUserMessage("Could not start audio visualizer.", "warn"); return;
            }
            if (waveformContainer) waveformContainer.style.display = 'block';
            if (visualizerCanvas) {
                visualizerCanvas.width = visualizerCanvas.clientWidth; 
                visualizerCanvas.height = visualizerCanvas.clientHeight;
            }
            if (toggleVisualizationButton) {
                toggleVisualizationButton.textContent = 'Hide Visualizer';
                toggleVisualizationButton.setAttribute('aria-pressed', 'true');
            }
            if (visualizerAnimationId) cancelAnimationFrame(visualizerAnimationId); 
            drawVisualizer();
        } else {
            if (visualizerAnimationId) cancelAnimationFrame(visualizerAnimationId);
            visualizerAnimationId = null;
            if (waveformContainer) waveformContainer.style.display = 'none';
            if (toggleVisualizationButton) {
                toggleVisualizationButton.textContent = 'Show Visualizer';
                toggleVisualizationButton.setAttribute('aria-pressed', 'false');
            }
            if(canvasCtx && visualizerCanvas) canvasCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
        }
    }

    // --- Media Session API ---
    function updateMediaSessionMetadata(chapterTitle, author, bookTitle, artworkSrcInput) {
        if ('mediaSession' in navigator) {
            const artworkPath = artworkSrcInput || bookDetails.defaultBookCover || 'images/default-cover-512.png';
            navigator.mediaSession.metadata = new MediaMetadata({
                title: chapterTitle || 'Unknown Chapter', artist: author || bookDetails.bookAuthor,
                album: bookTitle || bookDetails.bookTitle,
                artwork: [{ src: artworkPath, sizes: '512x512', type: 'image/png' }]
            });
        }
    }
    function updateMediaSessionState() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = (audioPlayer.paused || audioPlayer.ended) ? 'paused' : 'playing';
        }
    }
    function setupMediaSessionActions() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
            navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
            navigator.mediaSession.setActionHandler('stop', () => { audioPlayer.pause(); updateMediaSessionState(); });
            navigator.mediaSession.setActionHandler('seekbackward', (d) => handleSeekOperation(-(d.seekOffset || 15)));
            navigator.mediaSession.setActionHandler('seekforward', (d) => handleSeekOperation(d.seekOffset || 30));
            navigator.mediaSession.setActionHandler('previoustrack', () => { 
                if (currentChapterIndex > 0) selectChapterAndPlay(currentChapterIndex - 1); 
                else { audioPlayer.currentTime = 0; if (audioPlayer.paused) audioPlayer.play().then(updateMediaSessionState); }
            });
            navigator.mediaSession.setActionHandler('nexttrack', () => { 
                if (currentChapterIndex < chaptersData.length - 1) selectChapterAndPlay(currentChapterIndex + 1); 
            });
            console.log("Media Session action handlers set up.");
        }
    }

    // --- Audio Player Event Listeners ---
    audioPlayer.addEventListener('play', () => { 
        updatePlayPauseButtonUI(); updateMediaSessionState(); 
        if (isVisualizerActive && audioContext && audioContext.state === 'suspended') {
            audioContext.resume().catch(e => console.error("Error resuming AudioContext on play:", e));
        }
        if (isVisualizerActive && !visualizerAnimationId) { 
            if (!analyserNode || visualizerSourceNode?.mediaElement !== audioPlayer) { setupAudioVisualizerNodes(); }
            if(analyserNode) drawVisualizer(); 
        }
    });
    audioPlayer.addEventListener('pause', () => { 
        updatePlayPauseButtonUI(); handlePlaybackEndOrPause(); updateMediaSessionState(); 
        if (isVisualizerActive && visualizerAnimationId) { cancelAnimationFrame(visualizerAnimationId); visualizerAnimationId = null; }
    });
    audioPlayer.addEventListener('ended', () => { 
        updatePlayPauseButtonUI(); handlePlaybackEndOrPause(); updateMediaSessionState(); 
        if (isVisualizerActive && visualizerAnimationId) { cancelAnimationFrame(visualizerAnimationId); visualizerAnimationId = null; }
    });
    audioPlayer.addEventListener('loadedmetadata', () => { 
        totalDurationDisplay.textContent = formatTime(audioPlayer.duration);
        currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
        progressBarFill.style.width = audioPlayer.duration > 0 ? `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%` : '0%';
        if (chaptersData[currentChapterIndex]) { fetchAndDisplayMetadata(chaptersData[currentChapterIndex]); }
        if (isVisualizerActive) { setupAudioVisualizerNodes(); }
    });
    audioPlayer.addEventListener('timeupdate', () => {
        if (isProgrammaticSeek || !audioPlayer.duration || isNaN(audioPlayer.currentTime)) return;
        currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
        progressBarFill.style.width = `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%`;
    });
    audioPlayer.addEventListener('seeked', () => {
        isProgrammaticSeek = false; 
        if (audioPlayer.duration > 0 && !isNaN(audioPlayer.currentTime)) {
            currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
            progressBarFill.style.width = `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%`;
        }
        if (shouldBePlayingAfterSeek) {
            if (audioPlayer.paused) { audioPlayer.play().catch(e => console.error("Error resuming play after seeked:", e)); }
        }
        shouldBePlayingAfterSeek = false; 
        updatePlayPauseButtonUI(); 
        handlePlaybackEndOrPause(); 
        updateMediaSessionState(); 
    });
     audioPlayer.addEventListener('error', (e) => { 
        console.error("Audio Player Error Event. Code:", audioPlayer.error?.code, "Message:", audioPlayer.error?.message);
        let errorMsg = 'Error playing audio file.';
        if (audioPlayer.error) { 
            switch (audioPlayer.error.code) {
                case MediaError.MEDIA_ERR_ABORTED: errorMsg += ' Playback aborted.'; break;
                case MediaError.MEDIA_ERR_NETWORK: errorMsg += ' Network error.'; break;
                case MediaError.MEDIA_ERR_DECODE:  errorMsg += ' Decode error.'; break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg += ' Source not supported.'; break;
                default: errorMsg += ` Unknown error (Code: ${audioPlayer.error.code}).`;
            }
        }
        displayUserMessage(errorMsg, 'error');
        updatePlayPauseButtonUI(); isProgrammaticSeek = false; shouldBePlayingAfterSeek = false; updateMediaSessionState(); 
    }); 

    // Progress Bar Seeking & Other Controls
    if(progressContainer) progressContainer.addEventListener('click', (e) => {
        if (!audioPlayer.duration || currentChapterIndex === -1 || audioPlayer.readyState < HTMLMediaElement.HAVE_METADATA) return;
        const rect = progressContainer.getBoundingClientRect(); const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width)); const targetTime = audioPlayer.duration * percentage;
        handleSeekOperation(targetTime - audioPlayer.currentTime); 
    });
    if(progressContainer) progressContainer.addEventListener('keydown', (e) => { 
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); if (!audioPlayer.duration || currentChapterIndex === -1) return;
            const seekAmount = e.key === 'ArrowLeft' ? -10 : 10; handleSeekOperation(seekAmount); }
    });
    if(speedSelector) speedSelector.addEventListener('change', (e) => { if(audioPlayer.src) audioPlayer.playbackRate = parseFloat(e.target.value); currentSpeedDisplay.textContent = `${parseFloat(e.target.value).toFixed(2)}x`; });
    if(volumeSlider) volumeSlider.addEventListener('input', (e) => { if(audioPlayer.src) audioPlayer.volume = e.target.value; });
    window.addEventListener('beforeunload', () => { saveCurrentChapterProgress(); saveGlobalLastPosition(); });

    // --- Initialization ---
    loadThemeSettings(); 

    if(playPauseButton) playPauseButton.addEventListener('click', togglePlayPause);
    if(skipBackwardButton) skipBackwardButton.addEventListener('click', () => handleSeekOperation(-15));
    if(skipForwardButton) skipForwardButton.addEventListener('click', () => handleSeekOperation(30));
    
    if (addBookmarkButton) addBookmarkButton.addEventListener('click', handleAddBookmark); 
    if (sleepTimerSelect) sleepTimerSelect.addEventListener('change', handleSleepTimerChange); 
    if (cancelSleepTimerButton) {
        cancelSleepTimerButton.addEventListener('click', () => {
            clearExistingSleepTimer(); 
            if(sleepTimerSelect) sleepTimerSelect.value = "0"; 
        });
    }
    if (toggleVisualizationButton) toggleVisualizationButton.addEventListener('click', toggleVisualizer);

    if (toggleSettingsButton && themeSettingsPanel) {
        toggleSettingsButton.addEventListener('click', () => {
            const isExpanded = toggleSettingsButton.getAttribute('aria-expanded') === 'true';
            themeSettingsPanel.style.display = isExpanded ? 'none' : 'block';
            toggleSettingsButton.setAttribute('aria-expanded', !isExpanded);
        });
    }
    if (themeModeToggleButton) {
        themeModeToggleButton.addEventListener('click', () => {
            const currentModeIsDark = document.body.classList.contains('dark-mode');
            applyThemeMode(currentModeIsDark ? 'light' : 'dark');
        });
    }
    if (accentColorOptionsContainer) {
        accentColorOptionsContainer.querySelectorAll('.accent-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                applyAccentColor(swatch.dataset.accent);
            });
            // Set swatch background from its own --swatch-color variable if defined in HTML
            // This ensures the swatches themselves show the color they represent
            const swatchColorVar = getComputedStyle(swatch).getPropertyValue('--swatch-color');
            if (swatchColorVar) {
                 swatch.style.backgroundColor = swatchColorVar.trim();
            } else if (swatch.dataset.accent === 'default') {
                // For the default swatch, its color depends on light/dark mode, handled by updateDefaultAccentSwatchColor
            }
        });
    }

    loadAppContent().then(() => { 
        setupMediaSessionActions(); 
    }); 
    
    if(currentSpeedDisplay) currentSpeedDisplay.textContent = `${parseFloat(speedSelector.value).toFixed(2)}x`;
    if(coverArtImg) coverArtImg.alt = "Select a chapter to see cover art";
    if(currentBookTitleDisplay) currentBookTitleDisplay.textContent = bookDetails.bookTitle; 
    if(currentBookAuthorDisplay) currentBookAuthorDisplay.textContent = bookDetails.author; 

    if (visualizerCanvas) {
        canvasCtx = visualizerCanvas.getContext('2d');
    } else {
        if(toggleVisualizationButton) toggleVisualizationButton.style.display = 'none';
    }
});
