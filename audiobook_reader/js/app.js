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

    const LAST_POSITION_KEY = 'generativeAiPromptGuideReaderLastPosition';
    const CHAPTER_PROGRESS_KEY = 'generativeAiPromptGuideReaderChapterProgress';
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
        metadataStatusDisplay.className = `status-message status-${type}`;
        if (type !== 'error') {
            setTimeout(() => { if (metadataStatusDisplay.textContent === message) metadataStatusDisplay.textContent = ''; }, 4000);
        }
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
            const lastPosition = { 
                chapterIndex: currentChapterIndex, 
                timestamp: audioPlayer.currentTime, 
                fileName: chaptersData[currentChapterIndex].fileName 
            };
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
            const [chaptersResponse, bookDetailsResponse] = await Promise.all([
                fetch('chapters-manifest.json'),
                fetch('book_details.json')
            ]);

            if (!chaptersResponse.ok) { 
                const errorText = await chaptersResponse.text(); 
                throw new Error(`HTTP error ${chaptersResponse.status} fetching chapters-manifest.json. Server said: ${errorText}`);
            }
            if (!bookDetailsResponse.ok) { 
                const errorText = await bookDetailsResponse.text(); 
                throw new Error(`HTTP error ${bookDetailsResponse.status} fetching book_details.json. Server said: ${errorText}`);
            }

            const chapterFiles = await chaptersResponse.json();
            const detailsFromFile = await bookDetailsResponse.json();

            if (!Array.isArray(chapterFiles)) throw new Error("chapters-manifest.json data not in expected array format.");
            if (typeof detailsFromFile !== 'object' || !Array.isArray(detailsFromFile.chapters)) throw new Error("book_details.json data not in expected object format or missing chapters array.");

            bookDetails.bookTitle = detailsFromFile.bookTitle || bookDetails.bookTitle; 
            if (detailsFromFile.hasOwnProperty('bookAuthor')) {
                bookDetails.bookAuthor = detailsFromFile.bookAuthor;
            } else {
                console.warn("book_details.json is missing 'bookAuthor'. Using default.");
            }
            if (detailsFromFile.hasOwnProperty('defaultBookCover')) {
                bookDetails.defaultBookCover = detailsFromFile.defaultBookCover;
            }
            bookDetails.artwork = [{ src: bookDetails.defaultBookCover, sizes: '512x512', type: 'image/png' }];
            // console.log("Loaded book details:", bookDetails); // Can be enabled for debugging bookDetails loading

            chaptersData = chapterFiles.map(fileEntry => {
                const detailEntry = detailsFromFile.chapters.find(d => d.fileName === fileEntry.fileName);
                return {
                    ...fileEntry, 
                    displayTitle: detailEntry?.displayTitle || fileEntry.fileName.replace(/\.[^/.]+$/, ""), 
                    coverArt: detailEntry?.coverArt || bookDetails.defaultBookCover 
                };
            });

            if (chaptersData.length > 0) {
                renderChapterList();
                currentBookTitleDisplay.textContent = bookDetails.bookTitle;
                currentBookAuthorDisplay.textContent = bookDetails.bookAuthor;
                coverArtImg.src = bookDetails.defaultBookCover; 
                coverArtImg.alt = `${bookDetails.bookTitle} Cover Art`;
                currentChapterTitleDisplay.textContent = "Select a chapter"; 
                
                loadGlobalLastPositionOnStartup(); 
                loadBookmarks();    
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
            li.dataset.fileName = chapter.fileName; 
            li.dataset.index = index;
            li.addEventListener('click', () => selectChapterAndPlay(index)); 
            chapterListUL.appendChild(li);
        });
    }

    async function selectChapterAndPlay(index, playFromTimestamp = 0) { 
        if (index < 0 || index >= chaptersData.length) return;

        if (currentChapterIndex !== -1 && currentChapterIndex !== index) {
            saveCurrentChapterProgress();
        }

        const chapter = chaptersData[index]; 
        const newSrc = `audio/${chapter.fileName}`;
        const currentAudioFileSrc = audioPlayer.currentSrc.substring(audioPlayer.currentSrc.lastIndexOf('/') + 1);
        
        let effectivePlayFromTimestamp = playFromTimestamp;
        if (playFromTimestamp === 0) {
            const chapterProgressData = loadChapterProgressData();
            if (chapterProgressData[chapter.fileName]) {
                effectivePlayFromTimestamp = chapterProgressData[chapter.fileName];
            }
        }
        
        if (index === currentChapterIndex && currentAudioFileSrc === chapter.fileName && audioPlayer.paused && audioPlayer.readyState > 0 && effectivePlayFromTimestamp === audioPlayer.currentTime) {
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
            if (effectivePlayFromTimestamp > 0 && effectivePlayFromTimestamp < audioPlayer.duration) {
                audioPlayer.currentTime = effectivePlayFromTimestamp;
            }
            try { 
                await audioPlayer.play(); 
                updateMediaSessionState();
            } catch (error) { console.error(`Error initiating play for ${chapter.fileName}:`, error); updatePlayPauseButtonUI(); }
        };
        audioPlayer.addEventListener('loadedmetadata', setTimeAndPlay, {once: true});
        audioPlayer.addEventListener('canplay', setTimeAndPlay, {once: true}); 

        await fetchAndDisplayMetadata(chapter); 
        updateChapterListActiveState();
        saveGlobalLastPosition(); 
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
        if (currentChapterIndex === -1 && chaptersData.length > 0) { selectChapterAndPlay(0); } 
        else if (audioPlayer.src) { 
            if (audioPlayer.paused || audioPlayer.ended) {
                audioPlayer.play().then(updateMediaSessionState).catch(e => { console.error("Play error on toggle:", e); updatePlayPauseButtonUI(); });
            } else { audioPlayer.pause(); }
        } else if (chaptersData.length > 0) { selectChapterAndPlay(0); }
    }
    function updatePlayPauseButtonUI() { 
        const isEffectivelyPlaying = !audioPlayer.paused && !audioPlayer.ended && audioPlayer.readyState > 2;
        playPauseButton.textContent = isEffectivelyPlaying ? 'Pause' : 'Play';
        playPauseButton.setAttribute('aria-label', isEffectivelyPlaying ? 'Pause' : 'Play');
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
                    // console.log("Resuming from global last position:", `Chapter ${chapterIdx + 1}`, `at ${formatTime(lastPosition.timestamp)}`); // Less critical
                    selectChapterAndPlay(chapterIdx, lastPosition.timestamp);
                } else { localStorage.removeItem(LAST_POSITION_KEY); }
            } catch (e) { console.error("Error parsing global last position:", e); localStorage.removeItem(LAST_POSITION_KEY); }
        }
    }

    // --- Bookmarking ---
    function generateBookmarkId() { return Date.now().toString(36) + Math.random().toString(36).substring(2); }
    function renderBookmarks() { 
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
        if (currentChapterIndex === -1 || isNaN(audioPlayer.currentTime) || !chaptersData[currentChapterIndex]) { displayUserMessage("Play a chapter to add a bookmark.", "warn"); return; }
        const currentChapterDetails = chaptersData[currentChapterIndex];
        const newBookmark = { 
            id: generateBookmarkId(), 
            chapterFileName: currentChapterDetails.fileName, 
            timestamp: audioPlayer.currentTime, 
            note: bookmarkNoteInput.value.trim(), 
            createdAt: Date.now() 
        };
        bookmarks.push(newBookmark); saveBookmarks(); bookmarkNoteInput.value = ''; displayUserMessage("Bookmark added!", "success");
    }
    function deleteBookmark(bookmarkId) { bookmarks = bookmarks.filter(b => b.id !== bookmarkId); saveBookmarks(); displayUserMessage("Bookmark deleted.", "info"); }
    function editBookmarkNote(bookmarkId) { 
        const bookmark = bookmarks.find(b => b.id === bookmarkId); if (!bookmark) return;
        const newNote = prompt("Edit bookmark note:", bookmark.note);
        if (newNote !== null) { bookmark.note = newNote.trim(); saveBookmarks(); displayUserMessage("Bookmark note updated.", "info"); }
    }

    // --- Sleep Timer ---
    function clearExistingSleepTimer() { 
        if (sleepTimerId) clearTimeout(sleepTimerId); if (sleepTimerIntervalId) clearInterval(sleepTimerIntervalId);
        sleepTimerId = null; sleepTimerIntervalId = null; sleepTimerEndsAt = 0;
        sleepTimerStatus.textContent = ''; cancelSleepTimerButton.style.display = 'none';
        audioPlayer.removeEventListener('ended', pauseOnChapterEndForSleepTimer); 
    }
    function pauseOnChapterEndForSleepTimer() { 
        audioPlayer.pause(); sleepTimerStatus.textContent = "Paused: End of chapter.";
        sleepTimerSelect.value = "0"; cancelSleepTimerButton.style.display = 'none';
        // console.log("Sleep timer: Paused at end of chapter."); // Less critical
    }
    function updateSleepTimerCountdown() { 
        const timeLeft = Math.max(0, Math.round((sleepTimerEndsAt - Date.now()) / 1000));
        if (timeLeft > 0) { sleepTimerStatus.textContent = `Pausing in: ${formatTime(timeLeft)}`; } 
        else { sleepTimerStatus.textContent = "Timer expired."; clearInterval(sleepTimerIntervalId); sleepTimerIntervalId = null; }
    }
    function handleSleepTimerChange() {
        clearExistingSleepTimer(); const value = sleepTimerSelect.value;
        if (value === "0") { return; } 
        else if (value === "1") {
            sleepTimerStatus.textContent = "Will pause at end of chapter.";
            audioPlayer.addEventListener('ended', pauseOnChapterEndForSleepTimer, { once: true }); 
            cancelSleepTimerButton.style.display = 'inline-block';
            // console.log("Sleep timer set: End of Chapter."); // Less critical
        } else { 
            const durationSeconds = parseInt(value, 10); if (isNaN(durationSeconds) || durationSeconds <= 0) return;
            sleepTimerEndsAt = Date.now() + durationSeconds * 1000;
            sleepTimerId = setTimeout(() => {
                audioPlayer.pause(); sleepTimerStatus.textContent = "Playback paused by timer.";
                clearInterval(sleepTimerIntervalId); sleepTimerIntervalId = null;
                sleepTimerSelect.value = "0"; cancelSleepTimerButton.style.display = 'none';
                // console.log("Sleep timer: Expired and paused playback."); // Less critical
            }, durationSeconds * 1000);
            updateSleepTimerCountdown(); 
            sleepTimerIntervalId = setInterval(updateSleepTimerCountdown, 1000);
            cancelSleepTimerButton.style.display = 'inline-block';
            // console.log(`Sleep timer set: ${durationSeconds / 60} minutes.`); // Less critical
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
            console.log("Media Session action handlers set up."); // Important one-time log
        }
    }

    // --- Audio Player Event Listeners ---
    audioPlayer.addEventListener('play', () => { updatePlayPauseButtonUI(); updateMediaSessionState(); });
    audioPlayer.addEventListener('pause', () => { updatePlayPauseButtonUI(); handlePlaybackEndOrPause(); updateMediaSessionState(); });
    audioPlayer.addEventListener('ended', () => { updatePlayPauseButtonUI(); handlePlaybackEndOrPause(); updateMediaSessionState(); });
    audioPlayer.addEventListener('loadedmetadata', () => { 
        totalDurationDisplay.textContent = formatTime(audioPlayer.duration);
        currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
        progressBarFill.style.width = audioPlayer.duration > 0 ? `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%` : '0%';
        if (chaptersData[currentChapterIndex]) {
            // Metadata for MediaSession is updated via fetchAndDisplayMetadata called from selectChapterAndPlay
        }
        // console.log(`Event: 'loadedmetadata'. Duration: ${audioPlayer.duration.toFixed(2)}`); // Less critical
    });
    audioPlayer.addEventListener('timeupdate', () => {
        if (isProgrammaticSeek || !audioPlayer.duration || isNaN(audioPlayer.currentTime)) return;
        currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
        progressBarFill.style.width = `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%`;
    });
    // audioPlayer.addEventListener('seeking', () => { /* console.log(`Event: 'seeking'.`); */ });
    audioPlayer.addEventListener('seeked', () => {
        // console.log(`Event: 'seeked'. Final currentTime: ${audioPlayer.currentTime.toFixed(2)}`); // Less critical
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
        updatePlayPauseButtonUI(); 
        isProgrammaticSeek = false; shouldBePlayingAfterSeek = false;
        updateMediaSessionState(); 
    }); 
    // audioPlayer.addEventListener('loadstart', () => { /* console.log(`Event: 'loadstart'.`); */ });
    // audioPlayer.addEventListener('canplay', () => { /* console.log(`Event: 'canplay'.`); */ });

    // Progress Bar Seeking & Keyboard Accessibility
    progressContainer.addEventListener('click', (e) => {
        if (!audioPlayer.duration || currentChapterIndex === -1 || audioPlayer.readyState < HTMLMediaElement.HAVE_METADATA) return;
        const rect = progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        const targetTime = audioPlayer.duration * percentage;
        handleSeekOperation(targetTime - audioPlayer.currentTime); 
    });
    progressContainer.addEventListener('keydown', (e) => { 
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            if (!audioPlayer.duration || currentChapterIndex === -1) return;
            const seekAmount = e.key === 'ArrowLeft' ? -10 : 10; 
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

    window.addEventListener('beforeunload', () => {
        saveCurrentChapterProgress(); 
        saveGlobalLastPosition();     
    });

    // Initialization
    playPauseButton.addEventListener('click', togglePlayPause);
    skipBackwardButton.addEventListener('click', () => handleSeekOperation(-15));
    skipForwardButton.addEventListener('click', () => handleSeekOperation(30));
    addBookmarkButton.addEventListener('click', handleAddBookmark); 
    sleepTimerSelect.addEventListener('change', handleSleepTimerChange); 
    cancelSleepTimerButton.addEventListener('click', () => {
        clearExistingSleepTimer(); sleepTimerSelect.value = "0"; 
    });

    loadAppContent().then(() => { 
        setupMediaSessionActions(); 
    }); 
    
    currentSpeedDisplay.textContent = `${parseFloat(speedSelector.value).toFixed(2)}x`;
    coverArtImg.alt = "Select a chapter to see cover art";
    currentBookTitleDisplay.textContent = bookDetails.bookTitle; 
    currentBookAuthorDisplay.textContent = bookDetails.author; // Corrected to use bookDetails.author
});
