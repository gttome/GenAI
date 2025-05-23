// js/app.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("APP.JS: DOMContentLoaded event fired.");

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

    // Sprint 3 UI Elements
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
    let currentBookMetadata = { title: "Generative AI Prompt Guide Reader", author: "Author Name" };
    let isProgrammaticSeek = false; 
    let shouldBePlayingAfterSeek = false; 
    let bookmarks = [];
    let sleepTimerId = null;
    let sleepTimerEndsAt = 0; // Timestamp for countdown
    let sleepTimerIntervalId = null; // For updating countdown display

    // Constants for localStorage keys
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

    // --- Chapter Loading & Selection ---
    async function loadChapters() { 
        console.log("loadChapters: Initiating...");
        chapterListUL.innerHTML = '<li id="loading-chapters-msg" class="status-message">Loading chapters...</li>';
        const loadingMsgElement = document.getElementById('loading-chapters-msg');
        try {
            const response = await fetch('chapters-manifest.json');
            if (!response.ok) { const errorText = await response.text(); throw new Error(`HTTP error ${response.status} fetching manifest. Server said: ${errorText}`);}
            chapters = await response.json();
            if (!Array.isArray(chapters)) throw new Error("Manifest data not in expected array format.");

            if (chapters.length > 0) {
                renderChapterList();
                await fetchAndDisplayMetadata(chapters[0], true, true); 
                currentChapterTitleDisplay.textContent = "Select a chapter";
                loadLastPosition(); // Load last position after chapters are ready
                loadBookmarks();    // Load bookmarks after chapters are ready
                console.log("loadChapters: Chapters loaded and initial state restored.");
            } else {
                if(loadingMsgElement) loadingMsgElement.textContent = 'No chapters found in manifest.';
                else chapterListUL.innerHTML = '<li class="status-message">No chapters found in manifest.</li>';
                console.warn("loadChapters: No chapters found in manifest.");
            }
        } catch (error) {
            console.error('loadChapters: CRITICAL ERROR:', error);
            if(loadingMsgElement) loadingMsgElement.textContent = `FAILED to load chapters. Error: ${error.message}`;
            else chapterListUL.innerHTML = `<li class="status-message">FAILED to load chapters. Error: ${error.message}</li>`;
        }
    }

    function renderChapterList() { 
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

    async function selectChapterAndPlay(index, playFromTimestamp = 0) { 
        if (index < 0 || index >= chapters.length) return;
        const chapter = chapters[index];
        const newSrc = `audio/${chapter.fileName}`;
        const currentAudioFileSrc = audioPlayer.currentSrc.substring(audioPlayer.currentSrc.lastIndexOf('/') + 1);

        console.log(`selectChapterAndPlay: Chapter ${index + 1} ('${chapter.fileName}') selected. Play from: ${playFromTimestamp}`);
        
        // If it's the same chapter and already loaded + paused, and we're not trying to seek to a new time
        if (index === currentChapterIndex && currentAudioFileSrc === chapter.fileName && audioPlayer.paused && audioPlayer.readyState > 0 && playFromTimestamp === 0 && audioPlayer.currentTime > 0) {
            try { 
                await audioPlayer.play(); 
            } catch (error) { console.error("selectChapterAndPlay: Error resuming audio:", error); updatePlayPauseButtonUI(); }
            return;
        }
        
        currentChapterIndex = index; 
        isProgrammaticSeek = false; 
        audioPlayer.src = newSrc; 
        audioPlayer.load(); 

        // Listen for 'canplay' or 'loadedmetadata' to set currentTime if needed
        const setTimeAndPlay = async () => {
            audioPlayer.removeEventListener('canplay', setTimeAndPlay); // Clean up listener
            audioPlayer.removeEventListener('loadedmetadata', setTimeAndPlay); // Clean up listener

            if (playFromTimestamp > 0 && playFromTimestamp < audioPlayer.duration) {
                console.log(`selectChapterAndPlay: Setting currentTime to ${playFromTimestamp} for ${chapter.fileName}`);
                audioPlayer.currentTime = playFromTimestamp;
            }
            try { 
                await audioPlayer.play(); 
                console.log(`selectChapterAndPlay: Play initiated for ${chapter.fileName}`);
            } catch (error) { console.error(`selectChapterAndPlay: Error initiating play for ${chapter.fileName}:`, error); updatePlayPauseButtonUI(); }
        };

        // Prefer 'canplay' as it indicates enough data is buffered to start playing
        // 'loadedmetadata' fires earlier but might not be enough to seek and play immediately.
        audioPlayer.addEventListener('canplay', setTimeAndPlay);
        // Fallback if 'canplay' doesn't fire quickly or for some reason
        audioPlayer.addEventListener('loadedmetadata', setTimeAndPlay);


        currentChapterTitleDisplay.textContent = chapter.title;
        updateChapterListActiveState();
        fetchAndDisplayMetadata(chapter, false, false).catch(metaError => console.error(`selectChapterAndPlay: Error fetching metadata (non-blocking):`, metaError));
        saveLastPosition(); // Save position when a new chapter starts
    }

    function updateChapterListActiveState() { 
        const listItems = chapterListUL.querySelectorAll('li');
        listItems.forEach((item, idx) => item.classList.toggle('active', idx === currentChapterIndex));
    }

    async function fetchAndDisplayMetadata(chapter, isBookLevel = false, dontAutoPlay = false) { 
        metadataStatusDisplay.textContent = 'Loading metadata...';
        if (!isBookLevel) { coverArtImg.src = "";  coverArtImg.alt = "Loading cover art..."; }
        try {
            let extracted = { title: chapter.title, author: currentBookMetadata.author, album: currentBookMetadata.title, coverArtBlob: null  };
            console.warn("M4B parsing library not yet implemented for metadata extraction.");

            if (isBookLevel) {
                currentBookMetadata.title = extracted.album || chapter.title || "Generative AI Prompt Guide Reader"; 
                currentBookMetadata.author = extracted.author || "Unknown Author";
                currentBookTitleDisplay.textContent = currentBookMetadata.title;
                currentBookAuthorDisplay.textContent = currentBookMetadata.author;
            }
            currentChapterTitleDisplay.textContent = extracted.title; 
            if (extracted.coverArtBlob) { 
                // const objectURL = URL.createObjectURL(extracted.coverArtBlob);
                // coverArtImg.src = objectURL; coverArtImg.alt = `${extracted.title} Cover Art`;
            } else { coverArtImg.src = ""; coverArtImg.alt = "No cover art available"; }
            metadataStatusDisplay.textContent = '';
        } catch (error) { 
            console.error(`fetchAndDisplayMetadata: Error for ${chapter.fileName}:`, error);
            metadataStatusDisplay.textContent = 'Error loading metadata.';
            coverArtImg.src = ""; coverArtImg.alt = "Error loading cover art";
            if(!isBookLevel) currentChapterTitleDisplay.textContent = chapter.title;
            currentBookTitleDisplay.textContent = currentBookMetadata.title || "Generative AI Prompt Guide Reader";
            currentBookAuthorDisplay.textContent = currentBookMetadata.author || "Unknown Author";
        }
    }

    // --- Playback Controls ---
    function togglePlayPause() { 
        if (currentChapterIndex === -1 && chapters.length > 0) { selectChapterAndPlay(0); } 
        else if (audioPlayer.src) { 
            if (audioPlayer.paused || audioPlayer.ended) {
                audioPlayer.play().catch(e => { console.error("Play error on toggle:", e); updatePlayPauseButtonUI(); });
            } else { audioPlayer.pause(); }
        } else if (chapters.length > 0) { selectChapterAndPlay(0); }
    }

    function updatePlayPauseButtonUI() { 
        const isEffectivelyPlaying = !audioPlayer.paused && !audioPlayer.ended && audioPlayer.readyState > 2;
        playPauseButton.textContent = isEffectivelyPlaying ? 'Pause' : 'Play';
        playPauseButton.setAttribute('aria-label', isEffectivelyPlaying ? 'Pause' : 'Play');
    }

    function handleSeekOperation(offset) {
        if (currentChapterIndex === -1 || !audioPlayer.src || audioPlayer.readyState < HTMLMediaElement.HAVE_METADATA) {
            console.warn(`Seek Denied: Player not ready (readyState=${audioPlayer.readyState}) or no chapter.`); return;
        }
        if (isNaN(audioPlayer.duration) || audioPlayer.duration <= 0) {
            console.warn(`Seek Denied: Duration invalid (${audioPlayer.duration}).`); return;
        }
        const oldTime = audioPlayer.currentTime;
        let newTime;
        if (offset > 0) { newTime = Math.min(audioPlayer.duration - 0.01, oldTime + offset); } 
        else { newTime = Math.max(0, oldTime + offset); }
        if (isNaN(newTime)) { console.error("Seek Failed: newTime calculated as NaN."); return; }
        
        isProgrammaticSeek = true; 
        shouldBePlayingAfterSeek = !audioPlayer.paused; 
        try { audioPlayer.currentTime = newTime; } 
        catch (e) { console.error("Seek Operation: JS ERROR during currentTime assignment:", e); isProgrammaticSeek = false; shouldBePlayingAfterSeek = false; }
    }

    skipBackwardButton.addEventListener('click', () => handleSeekOperation(-15));
    skipForwardButton.addEventListener('click', () => handleSeekOperation(30));

    // --- Last Position Persistence (FR9) ---
    function saveLastPosition() {
        if (currentChapterIndex !== -1 && audioPlayer.currentTime > 0 && chapters[currentChapterIndex]) {
            const lastPosition = {
                chapterIndex: currentChapterIndex,
                timestamp: audioPlayer.currentTime,
                fileName: chapters[currentChapterIndex].fileName // Store filename for robustness
            };
            localStorage.setItem(LAST_POSITION_KEY, JSON.stringify(lastPosition));
            // console.log("Last position saved:", lastPosition);
        }
    }

    function loadLastPosition() {
        const savedPosition = localStorage.getItem(LAST_POSITION_KEY);
        if (savedPosition) {
            try {
                const lastPosition = JSON.parse(savedPosition);
                // Validate if chapter still exists (e.g., by fileName if manifest changed)
                const chapterExists = chapters.some(ch => ch.fileName === lastPosition.fileName && chapters.indexOf(ch) === lastPosition.chapterIndex);
                
                if (chapterExists && lastPosition.chapterIndex >= 0 && lastPosition.chapterIndex < chapters.length) {
                    console.log("Resuming from last position:", lastPosition);
                    // Don't auto-play, just set up the chapter and time. User can press play.
                    // Or, add a "Resume?" prompt. For now, just load.
                    selectChapterAndPlay(lastPosition.chapterIndex, lastPosition.timestamp);
                } else {
                    console.warn("Saved last position chapter not found or index mismatch. Clearing.");
                    localStorage.removeItem(LAST_POSITION_KEY);
                }
            } catch (e) {
                console.error("Error parsing saved last position:", e);
                localStorage.removeItem(LAST_POSITION_KEY);
            }
        }
    }

    // --- Bookmarking (FR5) ---
    function generateBookmarkId() { return Date.now().toString() + Math.random().toString(36).substring(2, 9); }

    function renderBookmarks() {
        bookmarksListUL.innerHTML = ''; // Clear existing
        if (bookmarks.length === 0) {
            bookmarksListUL.appendChild(noBookmarksMsgLI);
            noBookmarksMsgLI.style.display = 'list-item';
            return;
        }
        noBookmarksMsgLI.style.display = 'none';

        // Sort bookmarks by chapter index then timestamp (optional, but good UX)
        const sortedBookmarks = [...bookmarks].sort((a, b) => {
            if (a.chapterIndex !== b.chapterIndex) {
                return a.chapterIndex - b.chapterIndex;
            }
            return a.timestamp - b.timestamp;
        });

        sortedBookmarks.forEach(bookmark => {
            const li = document.createElement('li');
            li.dataset.bookmarkId = bookmark.id;

            const titleEl = document.createElement('strong');
            titleEl.textContent = `${chapters[bookmark.chapterIndex]?.title || 'Unknown Chapter'} at ${formatTime(bookmark.timestamp)}`;
            
            const noteEl = document.createElement('p');
            noteEl.classList.add('bookmark-note');
            noteEl.textContent = bookmark.note || 'No note.';

            const infoEl = document.createElement('div');
            infoEl.classList.add('bookmark-info');
            infoEl.textContent = `(Added: ${new Date(bookmark.createdAt).toLocaleDateString()})`;

            const actionsEl = document.createElement('div');
            actionsEl.classList.add('bookmark-actions');

            const goToButton = document.createElement('button');
            goToButton.textContent = 'Go To';
            goToButton.addEventListener('click', () => {
                selectChapterAndPlay(bookmark.chapterIndex, bookmark.timestamp);
            });

            const editButton = document.createElement('button');
            editButton.textContent = 'Edit Note';
            editButton.addEventListener('click', () => editBookmarkNote(bookmark.id));
            
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => deleteBookmark(bookmark.id));

            actionsEl.appendChild(goToButton);
            actionsEl.appendChild(editButton);
            actionsEl.appendChild(deleteButton);

            li.appendChild(titleEl);
            li.appendChild(noteEl);
            li.appendChild(infoEl);
            li.appendChild(actionsEl);
            bookmarksListUL.appendChild(li);
        });
    }

    function saveBookmarks() {
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
        renderBookmarks();
    }

    function loadBookmarks() {
        const savedBookmarks = localStorage.getItem(BOOKMARKS_KEY);
        if (savedBookmarks) {
            try {
                bookmarks = JSON.parse(savedBookmarks);
            } catch (e) {
                console.error("Error parsing saved bookmarks:", e);
                bookmarks = []; // Reset if corrupted
            }
        }
        renderBookmarks();
    }

    addBookmarkButton.addEventListener('click', () => {
        if (currentChapterIndex === -1 || isNaN(audioPlayer.currentTime) || !chapters[currentChapterIndex]) {
            alert("Please play a chapter to add a bookmark.");
            return;
        }
        const newBookmark = {
            id: generateBookmarkId(),
            chapterIndex: currentChapterIndex,
            chapterFileName: chapters[currentChapterIndex].fileName,
            chapterTitle: chapters[currentChapterIndex].title, // Store for display robustness
            timestamp: audioPlayer.currentTime,
            note: bookmarkNoteInput.value.trim(),
            createdAt: Date.now()
        };
        bookmarks.push(newBookmark);
        saveBookmarks();
        bookmarkNoteInput.value = ''; // Clear input
        console.log("Bookmark added:", newBookmark);
    });

    function deleteBookmark(bookmarkId) {
        bookmarks = bookmarks.filter(b => b.id !== bookmarkId);
        saveBookmarks();
        console.log("Bookmark deleted:", bookmarkId);
    }

    function editBookmarkNote(bookmarkId) {
        const bookmark = bookmarks.find(b => b.id === bookmarkId);
        if (!bookmark) return;
        const newNote = prompt("Edit bookmark note:", bookmark.note);
        if (newNote !== null) { // Prompt returns null if cancelled
            bookmark.note = newNote.trim();
            saveBookmarks();
            console.log("Bookmark note updated:", bookmarkId);
        }
    }

    // --- Sleep Timer (FR7) ---
    function clearExistingSleepTimer() {
        if (sleepTimerId) clearTimeout(sleepTimerId);
        if (sleepTimerIntervalId) clearInterval(sleepTimerIntervalId);
        sleepTimerId = null;
        sleepTimerIntervalId = null;
        sleepTimerEndsAt = 0;
        sleepTimerStatus.textContent = '';
        cancelSleepTimerButton.style.display = 'none';
        // Remove 'ended' listener if it was for "End of Chapter"
        audioPlayer.removeEventListener('ended', pauseOnChapterEnd); 
    }

    function pauseOnChapterEnd() {
        audioPlayer.pause();
        sleepTimerStatus.textContent = "Paused at end of chapter.";
        // Reset select to "Off" as the action is complete
        sleepTimerSelect.value = "0"; 
        cancelSleepTimerButton.style.display = 'none';
        // No need to clear 'ended' listener here as it's a one-off for this specific timer instance
    }
    
    function updateSleepTimerCountdown() {
        const timeLeft = Math.max(0, Math.round((sleepTimerEndsAt - Date.now()) / 1000));
        if (timeLeft > 0) {
            sleepTimerStatus.textContent = `Pausing in: ${formatTime(timeLeft)}`;
        } else {
            sleepTimerStatus.textContent = "Timer expired."; // Should be paused by setTimeout
            clearInterval(sleepTimerIntervalId);
            sleepTimerIntervalId = null;
        }
    }

    sleepTimerSelect.addEventListener('change', (e) => {
        clearExistingSleepTimer();
        const value = e.target.value;

        if (value === "0") { // Off
            return;
        } else if (value === "1") { // End of Chapter
            sleepTimerStatus.textContent = "Will pause at end of chapter.";
            audioPlayer.addEventListener('ended', pauseOnChapterEnd, { once: true }); // Listen for current chapter end
            cancelSleepTimerButton.style.display = 'inline-block';
        } else { // Duration based
            const durationSeconds = parseInt(value, 10);
            if (isNaN(durationSeconds) || durationSeconds <= 0) return;

            sleepTimerEndsAt = Date.now() + durationSeconds * 1000;
            sleepTimerId = setTimeout(() => {
                audioPlayer.pause();
                sleepTimerStatus.textContent = "Playback paused by timer.";
                clearInterval(sleepTimerIntervalId);
                sleepTimerIntervalId = null;
                sleepTimerSelect.value = "0"; // Reset select
                cancelSleepTimerButton.style.display = 'none';
            }, durationSeconds * 1000);
            
            updateSleepTimerCountdown(); // Initial display
            sleepTimerIntervalId = setInterval(updateSleepTimerCountdown, 1000);
            cancelSleepTimerButton.style.display = 'inline-block';
        }
    });

    cancelSleepTimerButton.addEventListener('click', () => {
        clearExistingSleepTimer();
        sleepTimerSelect.value = "0"; // Reset dropdown to "Off"
        console.log("Sleep timer cancelled by user.");
    });


    // --- Audio Player Event Listeners (Consolidated) ---
    audioPlayer.addEventListener('play', () => { updatePlayPauseButtonUI(); });
    audioPlayer.addEventListener('pause', () => { updatePlayPauseButtonUI(); saveLastPosition(); }); // Save on pause
    audioPlayer.addEventListener('ended', () => { updatePlayPauseButtonUI(); saveLastPosition(); /* Handled by sleep timer if active */ });
    audioPlayer.addEventListener('loadedmetadata', () => { 
        totalDurationDisplay.textContent = formatTime(audioPlayer.duration);
        currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
        progressBarFill.style.width = audioPlayer.duration > 0 ? `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%` : '0%';
    });
    audioPlayer.addEventListener('timeupdate', () => {
        if (isProgrammaticSeek || !audioPlayer.duration || isNaN(audioPlayer.currentTime)) return;
        currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
        progressBarFill.style.width = `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%`;
        // Throttle saving last position to avoid excessive writes
        // For simplicity now, save on pause/ended/chapter change. Could add throttled save here.
    });
    audioPlayer.addEventListener('seeking', () => { /* console.log(`Event: 'seeking'.`); */ });
    audioPlayer.addEventListener('seeked', () => {
        console.log(`Event: 'seeked'. Final currentTime: ${audioPlayer.currentTime.toFixed(2)}`);
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
        saveLastPosition(); // Save after seeking
    });
    audioPlayer.addEventListener('error', (e) => { 
        console.error("Audio Player Error Event:", audioPlayer.error, e);
        let errorMsg = 'Error playing audio file.';
        if (audioPlayer.error) { /* ... error code switch ... */ }
        metadataStatusDisplay.textContent = errorMsg;
        updatePlayPauseButtonUI(); 
        isProgrammaticSeek = false; shouldBePlayingAfterSeek = false;
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

    // Other controls
    speedSelector.addEventListener('change', (e) => {
        if(audioPlayer.src) audioPlayer.playbackRate = parseFloat(e.target.value);
        currentSpeedDisplay.textContent = `${parseFloat(e.target.value).toFixed(2)}x`;
    });
    volumeSlider.addEventListener('input', (e) => {
        if(audioPlayer.src) audioPlayer.volume = e.target.value;
    });

    // Window event for saving last position before unload (best effort)
    window.addEventListener('beforeunload', saveLastPosition);

    // Initialization
    playPauseButton.addEventListener('click', togglePlayPause);
    loadChapters(); // This will also trigger loadLastPosition and loadBookmarks
    
    currentSpeedDisplay.textContent = `${parseFloat(speedSelector.value).toFixed(2)}x`;
    coverArtImg.alt = "Select a chapter to see cover art";
    currentBookTitleDisplay.textContent = currentBookMetadata.title; 
    currentBookAuthorDisplay.textContent = currentBookMetadata.author; 
});
