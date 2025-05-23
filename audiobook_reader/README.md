# Generative AI Prompt Guide Reader

A simple, focused HTML5 audiobook player designed for an immersive listening experience of a single, pre-defined audiobook. This application plays chapters from local audio files, with metadata and structure defined by local JSON files.

## Features (Implemented up to Sprint 4)

* **Chapter-Based Playback:** Loads and plays audiobook chapters from local audio files (e.g., `.m4b`, `.mp3`).
* **External Metadata Management:**
    * Uses `chapters-manifest.json` to define the sequence of audio chapter files.
    * Uses `book_details.json` to provide overall book title, author, default cover art, and chapter-specific display titles and cover art paths.
* **Custom Audio Controls:**
    * Play / Pause
    * Skip Forward (30 seconds) / Skip Backward (15 seconds)
    * Volume control
    * Playback speed adjustment (0.5x to 2x)
* **Progress Display:** Visual progress bar with current time and total duration display for the current chapter. Click or use arrow keys (when focused) to seek.
* **Chapter Navigation:** Displays an ordered list of chapters; users can select any chapter to play.
* **Bookmarking:**
    * Create multiple bookmarks at specific timestamps within chapters.
    * Add optional text notes to bookmarks.
    * View, navigate to, edit notes for, and delete bookmarks. Bookmarks are persisted in `localStorage`.
* **Last Position Persistence:**
    * Automatically saves the last global playback position (chapter and timestamp) when the app is closed or playback is paused/ended. Resumes from this point on app startup.
    * Automatically saves and resumes individual progress within each chapter when navigating between them. Progress is persisted in `localStorage`.
* **Sleep Timer:**
    * Set a timer to automatically pause playback after a specified duration (15m, 30m, 1hr) or at the end of the current chapter.
    * Ability to cancel an active sleep timer.
* **Metadata & Cover Art Display:**
    * Shows current chapter's display title, the overall book title, and book author from `book_details.json`.
    * Displays chapter-specific cover art if specified in `book_details.json`, otherwise shows a default book cover.
* **Responsive Design:** Adapts to various screen sizes (desktop, tablet, mobile).
* **Media Session API Integration:**
    * Integrates with OS media controls for play/pause, stop, seek forward/backward, next/previous track (chapter).
    * Displays metadata (titles, author, cover art) in the system UI (e.g., lock screen, notifications).
* **Dark Mode:** Default dark theme for comfortable listening.
* **User Feedback:** Provides status messages for loading, errors, and actions like adding bookmarks.
* **Accessibility:** Includes ARIA attributes for controls and dynamic regions, keyboard navigation for the progress bar, and a visually hidden label for the bookmark note input.

## Project Structure


/ (root)
├── index.html                     # Main application HTML
├── chapters-manifest.json         # Defines the sequence of audio chapter files
├── book_details.json              # Defines book and chapter metadata (titles, author, cover art paths)
├── css/
│   └── style.css                  # Main stylesheet
├── js/
│   └── app.js                     # Main application JavaScript logic
├── audio/                         # Directory for audiobook chapter files (e.g., .m4b, .mp3)
│   ├── Chapter_01.m4b
│   └── ...
└── images/                        # Directory for cover art images
├── default_book_cover.png     # Example default cover for the book
├── chapter_01_cover.png       # Example cover for chapter 1
└── ...
└── README.md                      # This file


## Setup and Content Management

1.  **Audio Files:**
    * Place all your audiobook chapter files (e.g., `.m4b`, `.mp3`) into the `/audio/` directory.
    * Ensure filenames are consistent.

2.  **Chapter Manifest (`chapters-manifest.json`):**
    * Located in the root directory. This file lists the audio files in the desired playback order.
    * It's an array of objects, where each object **must** have a `fileName` property.
    * **Example `chapters-manifest.json`:**
        ```json
        [
          { "fileName": "Chapter_01.m4b" },
          { "fileName": "Chapter_02.m4b" },
          { "fileName": "chapter3.mp3"   }
        ]
        ```

3.  **Book Details & Metadata (`book_details.json`):**
    * Located in the root directory. This file provides all textual metadata and paths to cover art.
    * **Structure:**
        * `bookTitle` (string): The main title of the audiobook.
        * `bookAuthor` (string): The author of the audiobook.
        * `defaultBookCover` (string): Path to a default cover image for the entire book (e.g., `images/default_book_cover.png`). This is used if a chapter-specific cover isn't found or for the Media Session API.
        * `chapters` (array): An array of chapter detail objects. Each object should have:
            * `fileName` (string, **required**): **Must exactly match** a `fileName` from `chapters-manifest.json`. This links the audio file to its metadata.
            * `displayTitle` (string, **required**): The title to display for this chapter.
            * `coverArt` (string, **required**): Path to the cover art image for this specific chapter (e.g., `images/chapter_01_cover.png`). Can also point to `defaultBookCover` if no specific art.
    * **Example `book_details.json`:**
        ```json
        {
          "bookTitle": "Generative AI Professional Prompt Engineering Guide",
          "bookAuthor": "George Tome",
          "defaultBookCover": "images/default_book_cover.png",
          "chapters": [
            {
              "fileName": "Chapter_01.m4b",
              "displayTitle": "Chapter 1: Foundations of Prompting",
              "coverArt": "images/chapter_01_cover.png"
            },
            {
              "fileName": "Chapter_02.m4b",
              "displayTitle": "Chapter 2: Prompt Templates",
              "coverArt": "images/chapter_02_cover.png"
            },
            {
              "fileName": "chapter3.mp3",
              "displayTitle": "Chapter 3: Detailed Template Documentation",
              "coverArt": "images/chapter_03_cover.png"
            }
          ]
        }
        ```

4.  **Cover Art Images:**
    * Place all cover art images (the default book cover and any chapter-specific covers) into the `/images/` directory.
    * Ensure paths in `book_details.json` correctly point to these images. A recommended size for `defaultBookCover` (used in Media Session) is 512x512 pixels.

## Running the Application

1.  **Local Development Server:**
    * Due to browser security restrictions (CORS) when using `fetch` with local files (`file:///` protocol), you **must** run this application through a local web server.
    * **Options:**
        * **VS Code Live Server Extension:** If using VS Code, install the "Live Server" extension and right-click `index.html` -> "Open with Live Server".
        * **Python:** Navigate to the project root in your terminal and run `python -m http.server` (for Python 3) or `python -m SimpleHTTPServer` (for Python 2). Access via `http://localhost:8000`.
        * **Node.js:** Install `http-server` globally (`npm install -g http-server`), navigate to the project root, and run `http-server`. Access via `http://localhost:8080` (or as indicated).
2.  Open the provided `http://localhost:PORT` URL in your web browser.

## Technical Stack

* HTML5
* CSS3 (Flexbox, Grid, Custom Properties)
* JavaScript (ES6+, Vanilla JS)
* HTML5 `<audio>` Element API
* Media Session API
* `localStorage` API for persistence

## Future Considerations (Beyond Current Scope)

* Implementing actual client-side M4B metadata parsing (if external JSON becomes undesirable).
* Advanced theming options.
* Audio waveform visualization.
* Enhanced accessibility features (e.g., in-app font size adjustments).
