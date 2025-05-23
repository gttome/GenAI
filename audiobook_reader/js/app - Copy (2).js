// js/app.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("Generative AI Prompt Guide Reader: Initializing Sprint 4...");

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

    // State
    let chapters = [];
    let currentChapterIndex = -1;
    let currentBookMetadata = { title: "Generative AI Prompt Guide Reader", author: "Unknown Author", artwork: [{ src: '', sizes: '512x512', type: 'image/png' }] }; // Added artwork placeholder for Media Session
    let isProgrammaticSeek = false; 
    let shouldBePlayingAfterSeek = false; 
    let bookmarks = [];
    let sleepTimerId = null;
    let sleepTimerEndsAt = 0; 
    let sleepTimerIntervalId = null; 

    const LAST_POSITION_KEY = 'generativeAiPromptGuideReaderLastPosition';
    const BOOKMARKS_KEY = 'generativeAiPromptGuideReaderBookmarks';

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
        metadataStatusDisplay.textContent = message;
        metadataStatusDisplay.className = `status-message status-${type}`; // For potential styling
        // console.log(`UserMessage (${type}): ${message}`); // Keep for debugging if needed
        // Auto-clear message after a few seconds? Optional.
        // setTimeout(() => { if (metadataStatusDisplay.textContent === message) metadataStatusDisplay.textContent = ''; }, 5000);
    }

    // --- Chapter Loading & Selection ---
    async function loadChapters() { 
        chapterListUL.innerHTML = '<li id="loading-chapters-msg" class="status-message">Loading chapters...</li>';
        const loadingMsgElement = document.getElementById('loading-chapters-msg');
        try {
            const response = await fetch('chapters-manifest.json');
            if (!response.ok) { 
                const errorText = await response.text(); 
                throw new Error(`HTTP error ${response.status} fetching manifest. Server said: ${errorText}`);
            }
            chapters = await response.json();
            if (!Array.isArray(chapters)) throw new Error("Manifest data not in expected array format.");

            if (chapters.length > 0) {
                renderChapterList();
                await fetchAndDisplayMetadata(chapters[0], true, true); 
                currentChapterTitleDisplay.textContent = "Select a chapter";
                loadLastPosition(); 
                loadBookmarks();    
                console.log("Chapters loaded and initial state restored.");
            } else {
                const msg = 'No chapters found in manifest.';
                if(loadingMsgElement) loadingMsgElement.textContent = msg;
                else chapterListUL.innerHTML = `<li class="status-message">${msg}</li>`;
                console.warn(msg);
                displayUserMessage(msg, 'warn');
            }
        } catch (error) {
            console.error('Error loading chapters:', error);
            const errorMsg = `Error loading chapters: ${error.message}. Please ensure 'chapters-manifest.json' is present and correct.`;
            if(loadingMsgElement) loadingMsgElement.textContent = errorMsg;
            else chapterListUL.innerHTML = `<li class="status-message">${errorMsg}</li>`;
            displayUserMessage(errorMsg, 'error');
        }
    }

    function renderChapterList() { /* ... (Same as Sprint 3 Cleaned) ... */ 
        chapterListUL.innerHTML = ''; 
        chapters.forEach((chapter, index) => {
            const li = document.createElement('li');
            li.textContent = chapter.title || 'Untitled Chapter';
            li.dataset.fileName = chapter.fileName;
            li.dataset.index = index;
            li.addEventListener('click', () => selectChapterAndPlay(index)); 
            chapterListUL.appendChild(li);
        });
    }

    async function selectChapterAndPlay(index, playFromTimestamp = 0) { /* ... (Same as Sprint 3 Cleaned, with Media Session update) ... */
        if (index < 0 || index >= chapters.length) return;
        const chapter = chapters[index];
        const newSrc = `audio/${chapter.fileName}`;
        const currentAudioFileSrc = audioPlayer.currentSrc.substring(audioPlayer.currentSrc.lastIndexOf('/') + 1);
        
        if (index === currentChapterIndex && currentAudioFileSrc === chapter.fileName && audioPlayer.paused && audioPlayer.readyState > 0 && playFromTimestamp === 0 && audioPlayer.currentTime > 0) {
            try { await audioPlayer.play(); updateMediaSessionState(); } 
            catch (error) { console.error("Error resuming audio:", error); updatePlayPauseButtonUI(); }
            return;
        }
        
        currentChapterIndex = index; 
        isProgrammaticSeek = false; 
        audioPlayer.src = newSrc; 
        audioPlayer.load(); 

        const setTimeAndPlay = async () => {
            audioPlayer.removeEventListener('canplay', setTimeAndPlay); 
            audioPlayer.removeEventListener('loadedmetadata', setTimeAndPlay); 
            if (playFromTimestamp > 0 && playFromTimestamp < audioPlayer.duration) {
                audioPlayer.currentTime = playFromTimestamp;
            }
            try { 
                await audioPlayer.play(); 
                updateMediaSessionState();
            } catch (error) { console.error(`Error initiating play for ${chapter.fileName}:`, error); updatePlayPauseButtonUI(); }
        };
        audioPlayer.addEventListener('canplay', setTimeAndPlay);
        audioPlayer.addEventListener('loadedmetadata', setTimeAndPlay);

        currentChapterTitleDisplay.textContent = chapter.title;
        updateChapterListActiveState();
        await fetchAndDisplayMetadata(chapter, false, false); // This will also update Media Session Metadata
        saveLastPosition(); 
    }

    function updateChapterListActiveState() { /* ... (Same as Sprint 3 Cleaned) ... */ 
        const listItems = chapterListUL.querySelectorAll('li');
        listItems.forEach((item, idx) => item.classList.toggle('active', idx === currentChapterIndex));
    }

    async function fetchAndDisplayMetadata(chapter, isBookLevel = false, dontAutoPlay = false) { /* ... (Same as Sprint 3 Cleaned, with Media Session update) ... */
        metadataStatusDisplay.textContent = 'Loading metadata...';
        if (!isBookLevel) { coverArtImg.src = "";  coverArtImg.alt = "Loading cover art..."; }
        try {
            let extracted = { 
                title: chapter.title, 
                author: currentBookMetadata.author, 
                album: currentBookMetadata.title, 
                coverArtBlob: null,
                artworkSrc: '' // For Media Session
            };
            // console.warn("M4B parsing library not yet implemented for metadata extraction."); // Keep for now

            // --- Conceptual M4B Parsing (if implemented) ---
            // if (typeof M4BParser !== 'undefined' && typeof M4BParser.parse === 'function') {
            //     const response = await fetch(`audio/${chapter.fileName}`);
            //     if (!response.ok) throw new Error(`Failed to fetch audio file for metadata: ${response.statusText}`);
            //     const audioFileBuffer = await response.arrayBuffer();
            //     const parsedMeta = await M4BParser.parse(audioFileBuffer); 
            //     extracted.title = parsedMeta.chapterTitle || extracted.title;
            //     extracted.author = parsedMeta.artist || currentBookMetadata.author;
            //     extracted.album = parsedMeta.album || currentBookMetadata.title;
            //     extracted.coverArtBlob = parsedMeta.coverArtBlob; 
            //     if (extracted.coverArtBlob) extracted.artworkSrc = URL.createObjectURL(extracted.coverArtBlob);
            // }
            // --- End Conceptual M4B Parsing ---
            
            // For now, use a placeholder or default artwork for Media Session if no real one
            extracted.artworkSrc = 'images/default-cover-512.png'; // Assume you have a default 512x512 cover

            if (isBookLevel) {
                currentBookMetadata.title = extracted.album || chapter.title || "Generative AI Prompt Guide Reader"; 
                currentBookMetadata.author = extracted.author || "Unknown Author";
                currentBookMetadata.artwork = [{ src: extracted.artworkSrc, sizes: '512x512', type: 'image/png' }]; // Update book level artwork
                currentBookTitleDisplay.textContent = currentBookMetadata.title;
                currentBookAuthorDisplay.textContent = currentBookMetadata.author;
            }
            currentChapterTitleDisplay.textContent = extracted.title; 
            if (extracted.coverArtBlob) { 
                coverArtImg.src = extracted.artworkSrc; 
                coverArtImg.alt = `${extracted.title} Cover Art`;
            } else { 
                coverArtImg.src = extracted.artworkSrc; // Show default/placeholder
                coverArtImg.alt = "Audiobook Cover Art"; 
            }
            metadataStatusDisplay.textContent = '';
            updateMediaSessionMetadata(extracted.title, currentBookMetadata.author, currentBookMetadata.title, extracted.artworkSrc);

        } catch (error) { 
            console.error(`Error fetching/parsing metadata for ${chapter.fileName}:`, error);
            displayUserMessage(`Error loading metadata for ${chapter.title || 'chapter'}.`, 'error');
            coverArtImg.src = currentBookMetadata.artwork[0].src; // Fallback to book default
            coverArtImg.alt = "Error loading cover art";
            if(!isBookLevel) currentChapterTitleDisplay.textContent = chapter.title;
            currentBookTitleDisplay.textContent = currentBookMetadata.title || "Generative AI Prompt Guide Reader";
            currentBookAuthorDisplay.textContent = currentBookMetadata.author || "Unknown Author";
            updateMediaSessionMetadata(chapter.title, currentBookMetadata.author, currentBookMetadata.title, currentBookMetadata.artwork[0].src);
        }
    }

    // --- Playback Controls ---
    function togglePlayPause() { /* ... (Same as Sprint 3 Cleaned, with Media Session update) ... */
        if (currentChapterIndex === -1 && chapters.length > 0) { selectChapterAndPlay(0); } 
        else if (audioPlayer.src) { 
            if (audioPlayer.paused || audioPlayer.ended) {
                audioPlayer.play().then(updateMediaSessionState).catch(e => { console.error("Play error on toggle:", e); updatePlayPauseButtonUI(); });
            } else { audioPlayer.pause(); /* State updated by 'pause' event */ }
        } else if (chapters.length > 0) { selectChapterAndPlay(0); }
    }
    function updatePlayPauseButtonUI() { /* ... (Same as Sprint 3 Cleaned) ... */ 
        const isEffectivelyPlaying = !audioPlayer.paused && !audioPlayer.ended && audioPlayer.readyState > 2;
        playPauseButton.textContent = isEffectivelyPlaying ? 'Pause' : 'Play';
        playPauseButton.setAttribute('aria-label', isEffectivelyPlaying ? 'Pause' : 'Play');
    }
    function handleSeekOperation(offset) { /* ... (Same as Sprint 3 Cleaned) ... */
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

    // --- Last Position Persistence ---
    function saveLastPosition() { /* ... (Same as Sprint 3 Cleaned) ... */
        if (currentChapterIndex !== -1 && audioPlayer.currentTime > 0 && chapters[currentChapterIndex]) {
            const lastPosition = { chapterIndex: currentChapterIndex, timestamp: audioPlayer.currentTime, fileName: chapters[currentChapterIndex].fileName };
            localStorage.setItem(LAST_POSITION_KEY, JSON.stringify(lastPosition));
        }
    }
    function loadLastPosition() { /* ... (Same as Sprint 3 Cleaned) ... */
        const savedPosition = localStorage.getItem(LAST_POSITION_KEY);
        if (savedPosition) {
            try {
                const lastPosition = JSON.parse(savedPosition);
                const chapterExists = chapters.some(ch => ch.fileName === lastPosition.fileName && chapters.indexOf(ch) === lastPosition.chapterIndex);
                if (chapterExists && lastPosition.chapterIndex >= 0 && lastPosition.chapterIndex < chapters.length) {
                    console.log("Resuming from last position:", `Chapter ${lastPosition.chapterIndex + 1}`, `at ${formatTime(lastPosition.timestamp)}`);
                    selectChapterAndPlay(lastPosition.chapterIndex, lastPosition.timestamp);
                } else { localStorage.removeItem(LAST_POSITION_KEY); }
            } catch (e) { console.error("Error parsing saved last position:", e); localStorage.removeItem(LAST_POSITION_KEY); }
        }
    }

    // --- Bookmarking ---
    function generateBookmarkId() { /* ... */ return Date.now().toString() + Math.random().toString(36).substring(2, 9); }
    function renderBookmarks() { /* ... (Same as Sprint 3 Cleaned) ... */ 
        bookmarksListUL.innerHTML = ''; 
        if (bookmarks.length === 0) { bookmarksListUL.appendChild(noBookmarksMsgLI); noBookmarksMsgLI.style.display = 'list-item'; return; }
        noBookmarksMsgLI.style.display = 'none';
        const sortedBookmarks = [...bookmarks].sort((a, b) => { if (a.chapterIndex !== b.chapterIndex) return a.chapterIndex - b.chapterIndex; return a.timestamp - b.timestamp; });
        sortedBookmarks.forEach(bookmark => { /* ... create and append li ... */ 
            const li = document.createElement('li'); li.dataset.bookmarkId = bookmark.id;
            const titleEl = document.createElement('strong'); titleEl.textContent = `${chapters[bookmark.chapterIndex]?.title || 'Unknown Chapter'} at ${formatTime(bookmark.timestamp)}`;
            const noteEl = document.createElement('p'); noteEl.classList.add('bookmark-note'); noteEl.textContent = bookmark.note || 'No note.';
            const infoEl = document.createElement('div'); infoEl.classList.add('bookmark-info'); infoEl.textContent = `(Added: ${new Date(bookmark.createdAt).toLocaleDateString()})`;
            const actionsEl = document.createElement('div'); actionsEl.classList.add('bookmark-actions');
            const goToButton = document.createElement('button'); goToButton.textContent = 'Go To'; goToButton.addEventListener('click', () => selectChapterAndPlay(bookmark.chapterIndex, bookmark.timestamp));
            const editButton = document.createElement('button'); editButton.textContent = 'Edit Note'; editButton.addEventListener('click', () => editBookmarkNote(bookmark.id));
            const deleteButton = document.createElement('button'); deleteButton.textContent = 'Delete'; deleteButton.addEventListener('click', () => deleteBookmark(bookmark.id));
            actionsEl.appendChild(goToButton); actionsEl.appendChild(editButton); actionsEl.appendChild(deleteButton);
            li.appendChild(titleEl); li.appendChild(noteEl); li.appendChild(infoEl); li.appendChild(actionsEl);
            bookmarksListUL.appendChild(li);
        });
    }
    function saveBookmarks() { /* ... */ localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks)); renderBookmarks(); }
    function loadBookmarks() { /* ... (Same as Sprint 3 Cleaned) ... */
        const savedBookmarks = localStorage.getItem(BOOKMARKS_KEY);
        if (savedBookmarks) { try { bookmarks = JSON.parse(savedBookmarks); } catch (e) { console.error("Error parsing saved bookmarks:", e); bookmarks = []; }}
        renderBookmarks();
    }
    function handleAddBookmark() { /* ... (Same as Sprint 3 Cleaned) ... */ 
        if (currentChapterIndex === -1 || isNaN(audioPlayer.currentTime) || !chapters[currentChapterIndex]) { displayUserMessage("Play a chapter to add a bookmark.", "warn"); return; }
        const newBookmark = { id: generateBookmarkId(), chapterIndex: currentChapterIndex, chapterFileName: chapters[currentChapterIndex].fileName, chapterTitle: chapters[currentChapterIndex].title, timestamp: audioPlayer.currentTime, note: bookmarkNoteInput.value.trim(), createdAt: Date.now() };
        bookmarks.push(newBookmark); saveBookmarks(); bookmarkNoteInput.value = ''; displayUserMessage("Bookmark added!", "success");
    }
    function deleteBookmark(bookmarkId) { /* ... */ bookmarks = bookmarks.filter(b => b.id !== bookmarkId); saveBookmarks(); displayUserMessage("Bookmark deleted.", "info"); }
    function editBookmarkNote(bookmarkId) { /* ... */ 
        const bookmark = bookmarks.find(b => b.id === bookmarkId); if (!bookmark) return;
        const newNote = prompt("Edit bookmark note:", bookmark.note);
        if (newNote !== null) { bookmark.note = newNote.trim(); saveBookmarks(); displayUserMessage("Bookmark note updated.", "info"); }
    }

    // --- Sleep Timer ---
    function clearExistingSleepTimer() { /* ... (Same as Sprint 3 Cleaned) ... */ 
        if (sleepTimerId) clearTimeout(sleepTimerId); if (sleepTimerIntervalId) clearInterval(sleepTimerIntervalId);
        sleepTimerId = null; sleepTimerIntervalId = null; sleepTimerEndsAt = 0;
        sleepTimerStatus.textContent = ''; cancelSleepTimerButton.style.display = 'none';
        audioPlayer.removeEventListener('ended', pauseOnChapterEndForSleepTimer); 
    }
    function pauseOnChapterEndForSleepTimer() { /* ... (Same as Sprint 3 Cleaned) ... */ 
        audioPlayer.pause(); sleepTimerStatus.textContent = "Paused: End of chapter.";
        sleepTimerSelect.value = "0"; cancelSleepTimerButton.style.display = 'none';
    }
    function updateSleepTimerCountdown() { /* ... (Same as Sprint 3 Cleaned) ... */ 
        const timeLeft = Math.max(0, Math.round((sleepTimerEndsAt - Date.now()) / 1000));
        if (timeLeft > 0) { sleepTimerStatus.textContent = `Pausing in: ${formatTime(timeLeft)}`; } 
        else { sleepTimerStatus.textContent = "Timer expired."; clearInterval(sleepTimerIntervalId); sleepTimerIntervalId = null; }
    }
    function handleSleepTimerChange() { /* ... (Same as Sprint 3 Cleaned, with console logs for state changes) ... */
        clearExistingSleepTimer(); const value = sleepTimerSelect.value;
        if (value === "0") { console.log("Sleep timer Off."); return; } 
        else if (value === "1") {
            sleepTimerStatus.textContent = "Will pause at end of chapter.";
            audioPlayer.addEventListener('ended', pauseOnChapterEndForSleepTimer, { once: true }); 
            cancelSleepTimerButton.style.display = 'inline-block';
            console.log("Sleep timer set: End of Chapter.");
        } else { 
            const durationSeconds = parseInt(value, 10); if (isNaN(durationSeconds) || durationSeconds <= 0) return;
            sleepTimerEndsAt = Date.now() + durationSeconds * 1000;
            sleepTimerId = setTimeout(() => {
                audioPlayer.pause(); sleepTimerStatus.textContent = "Playback paused by timer.";
                clearInterval(sleepTimerIntervalId); sleepTimerIntervalId = null;
                sleepTimerSelect.value = "0"; cancelSleepTimerButton.style.display = 'none';
                console.log("Sleep timer: Expired and paused playback.");
            }, durationSeconds * 1000);
            updateSleepTimerCountdown(); 
            sleepTimerIntervalId = setInterval(updateSleepTimerCountdown, 1000);
            cancelSleepTimerButton.style.display = 'inline-block';
            console.log(`Sleep timer set: ${durationSeconds / 60} minutes.`);
        }
    }

    // --- Media Session API (FR10 Enhancement, VI.E) ---
    function updateMediaSessionMetadata(chapterTitle, author, bookTitle, artworkSrc) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: chapterTitle || 'Unknown Chapter',
                artist: author || 'Unknown Author',
                album: bookTitle || 'Generative AI Prompt Guide Reader',
                artwork: [{ src: artworkSrc || 'images/default-cover-512.png', sizes: '512x512', type: 'image/png' }] // Ensure you have a default image
            });
            // console.log("Media session metadata updated.");
        }
    }

    function updateMediaSessionState() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = audioPlayer.paused ? 'paused' : 'playing';
            // console.log("Media session playbackState updated to:", navigator.mediaSession.playbackState);
        }
    }

    function setupMediaSessionActions() {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.setActionHandler('play', () => { 
                togglePlayPause(); 
                // audioPlayer.play().then(updateMediaSessionState).catch(e => console.error("MediaSession: Play error", e));
            });
            navigator.mediaSession.setActionHandler('pause', () => { 
                togglePlayPause();
                // audioPlayer.pause(); /* state updated by event */ 
            });
            navigator.mediaSession.setActionHandler('stop', () => { // Optional: map to pause and reset time or just pause
                audioPlayer.pause();
                // audioPlayer.currentTime = 0; // If you want stop to reset
                updateMediaSessionState();
            });
            navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                const offset = details.seekOffset || 15; // Default 15s
                handleSeekOperation(-offset);
            });
            navigator.mediaSession.setActionHandler('seekforward', (details) => {
                const offset = details.seekOffset || 30; // Default 30s
                handleSeekOperation(offset);
            });
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                if (currentChapterIndex > 0) {
                    selectChapterAndPlay(currentChapterIndex - 1);
                } else {
                    // Optionally, restart current track if it's the first one
                    audioPlayer.currentTime = 0;
                    if (audioPlayer.paused) audioPlayer.play().then(updateMediaSessionState);
                }
            });
            navigator.mediaSession.setActionHandler('nexttrack', () => {
                if (currentChapterIndex < chapters.length - 1) {
                    selectChapterAndPlay(currentChapterIndex + 1);
                } else {
                    // Optionally, do nothing or indicate end of book
                    // For now, if it's the last chapter, 'next' might just replay or do nothing.
                    // Or, if you want it to stop:
                    // audioPlayer.pause(); audioPlayer.currentTime = 0; updateMediaSessionState();
                }
            });
             console.log("Media Session action handlers set up.");
        }
    }


    // --- Audio Player Event Listeners (Consolidated) ---
    audioPlayer.addEventListener('play', () => { updatePlayPauseButtonUI(); updateMediaSessionState(); });
    audioPlayer.addEventListener('pause', () => { updatePlayPauseButtonUI(); saveLastPosition(); updateMediaSessionState(); });
    audioPlayer.addEventListener('ended', () => { updatePlayPauseButtonUI(); saveLastPosition(); updateMediaSessionState(); });
    audioPlayer.addEventListener('loadedmetadata', () => { 
        totalDurationDisplay.textContent = formatTime(audioPlayer.duration);
        currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
        progressBarFill.style.width = audioPlayer.duration > 0 ? `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%` : '0%';
        // Update Media Session metadata when new track is loaded
        if (chapters[currentChapterIndex]) {
            fetchAndDisplayMetadata(chapters[currentChapterIndex], false, false); // This will call updateMediaSessionMetadata
        }
    });
    audioPlayer.addEventListener('timeupdate', () => {
        if (isProgrammaticSeek || !audioPlayer.duration || isNaN(audioPlayer.currentTime)) return;
        currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
        progressBarFill.style.width = `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%`;
    });
    audioPlayer.addEventListener('seeking', () => { /* console.log(`Event: 'seeking'.`); */ });
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
        saveLastPosition(); 
        updateMediaSessionState(); // State might change after seek (e.g., if it seeks to end)
    });
    audioPlayer.addEventListener('error', (e) => { 
        console.error("Audio Player Error Event. Code:", audioPlayer.error?.code, "Message:", audioPlayer.error?.message);
        let errorMsg = 'Error playing audio file.';
        if (audioPlayer.error) { 
            switch (audioPlayer.error.code) {
                case MediaError.MEDIA_ERR_ABORTED: errorMsg += ' Playback aborted.'; break;
                case MediaError.MEDIA_ERR_NETWORK: errorMsg += ' Network error.'; break;
                case MediaError.MEDIA_ERR_DECODE:  errorMsg += ' Decode error. The file may be corrupt or in an unsupported format.'; break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg += ' Source not supported or file format issue.'; break;
                default: errorMsg += ` An unknown error occurred (Code: ${audioPlayer.error.code}).`;
            }
        }
        displayUserMessage(errorMsg, 'error');
        updatePlayPauseButtonUI(); 
        isProgrammaticSeek = false; shouldBePlayingAfterSeek = false;
        updateMediaSessionState(); // Update to paused on error
    }); 
    audioPlayer.addEventListener('loadstart', () => { /* console.log(`Event: 'loadstart'.`); */ });
    audioPlayer.addEventListener('canplay', () => { /* console.log(`Event: 'canplay'.`); */ });

    // Progress Bar Seeking
    progressContainer.addEventListener('click', (e) => {
        if (!audioPlayer.duration || currentChapterIndex === -1 || audioPlayer.readyState < HTMLMediaElement.HAVE_METADATA) return;
        const rect = progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        const targetTime = audioPlayer.duration * percentage;
        handleSeekOperation(targetTime - audioPlayer.currentTime); 
    });
    progressContainer.addEventListener('keydown', (e) => { // Basic keyboard accessibility for progress bar
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (!audioPlayer.duration || currentChapterIndex === -1) return;
            const seekAmount = e.key === 'ArrowLeft' ? -10 : 10; // Seek 10s with arrow keys
            handleSeekOperation(seekAmount);
        }
    });


    // Other controls
    speedSelector.addEventListener('change', (e) => {
        if(audioPlayer.src) audioPlayer.playbackRate = parseFloat(e.target.value);
        currentSpeedDisplay.textContent = `${parseFloat(e.target.value).toFixed(2)}x`;
    });
    volumeSlider.addEventListener('input', (e) => {
        if(audioPlayer.src) audioPlayer.volume = e.target.value;
    });

    window.addEventListener('beforeunload', saveLastPosition);

    // Initialization
    playPauseButton.addEventListener('click', togglePlayPause);
    skipBackwardButton.addEventListener('click', () => handleSeekOperation(-15));
    skipForwardButton.addEventListener('click', () => handleSeekOperation(30));
    addBookmarkButton.addEventListener('click', handleAddBookmark); 
    sleepTimerSelect.addEventListener('change', handleSleepTimerChange); 
    cancelSleepTimerButton.addEventListener('click', () => {
        clearExistingSleepTimer(); sleepTimerSelect.value = "0"; 
        console.log("Sleep timer cancelled by user.");
    });

    loadChapters().then(() => {
        setupMediaSessionActions(); // Set up Media Session actions after chapters are loaded
    }); 
    
    currentSpeedDisplay.textContent = `${parseFloat(speedSelector.value).toFixed(2)}x`;
    coverArtImg.alt = "Select a chapter to see cover art";
    currentBookTitleDisplay.textContent = currentBookMetadata.title; 
    currentBookAuthorDisplay.textContent = currentBookMetadata.author; 
});
