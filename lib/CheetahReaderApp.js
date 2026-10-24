/**
 * CheetahReaderApp v2.0.0
 * Main application coordinator that manages reader, state, and services
 *
 * REFACTORED: Properties are now private, use public API only
 *
 * @license MIT
 * @version 2.0.0
 */

class CheetahReaderApp {
    constructor(selector, options = {}) {
        console.log('🐆 CheetahReaderApp v2.0.0 initializing...');

        // ✅ PRIVATE: Initialize persistence manager first
        const tempState = new StateManager({});
        this._persistence = new SettingsPersistence(tempState);

        // Try to load saved settings
        const savedSettings = this._persistence.loadSettings() || {};

        // Merge saved settings with defaults and options (priority: saved > options > defaults)
        const defaults = window.DEFAULT_CONFIG;
        const initial = { mode: defaults.mode };
        for (const key of this._persistence.persistedKeys) {
            if (key.startsWith('flow.')) continue;
            initial[key] = savedSettings[key] ?? options[key] ?? defaults[key];
        }
        const saved = savedSettings.flow || {};
        const flowOptions = {
            speed: options.speed, focusWidth: options.focusWidth, scrollLevel: options.scrollLevel,
            ...(options.flow || {})
        };
        initial.flow = {
            playing: defaults.flow.playing,
            currentWordIndex: defaults.flow.currentWordIndex,
            newlinePause: defaults.flow.newlinePause
        };
        for (const key of ['speed', 'speedMin', 'speedMax', 'focusWidth', 'focusStrength',
                           'focusUnderline', 'focusBackground', 'scrollLevel']) {
            initial.flow[key] = saved[key] ?? flowOptions[key] ?? defaults.flow[key];
        }
        // A saved range that makes no sense falls back to the default dial.
        if (!CheetahReaderApp.isValidSpeedRange(initial.flow.speedMin, initial.flow.speedMax)) {
            initial.flow.speedMin = defaults.flow.speedMin;
            initial.flow.speedMax = defaults.flow.speedMax;
        }
        initial.flow.speed = Math.max(initial.flow.speedMin, Math.min(initial.flow.speedMax, initial.flow.speed));

        // ✅ PRIVATE: Initialize StateManager with merged state
        this._state = new StateManager(initial);

        // Update persistence manager to use the real state manager
        this._persistence.stateManager = this._state;

        // Enable auto-save for settings
        this._persistence.enableAutoSave();

        // ✅ PRIVATE: Initialize reader with StateManager
        this._reader = new EBookReader(selector, {
            stateManager: this._state
        });

        // ✅ PRIVATE: Store container reference for services
        this._container = this._reader.container;

        // ✅ PRIVATE: Initialize services
        // Wait for DOM to be ready before initializing services
        setTimeout(() => {
            const contentElement = this._reader.el?.content;

            if (contentElement) {
                this._fontService = new FontService(this._state, contentElement, this._reader);

                // Load initial font
                this._fontService.loadFont(this._state.get('font')).then(() => {
                    this._fontService.applyFont(this._state.get('font'));
                });
            }

            if (this._container) {
                this._themeService = new ThemeService(this._state, this._container);
                // Apply initial theme
                this._themeService.applyTheme(this._state.get('theme'));
            }

            this._epubService = new EPUBService(this._reader);

            //
            // Listen for the engine to signal the chapter end
            //
            this._reader.on('onChapterEnd', () => {
                // Get the index that the EPUB service *thinks* is current
                const expectedCurrentIndex = this._epubService.currentChapterIndex;

                // Get the index the reader *actually* had when it finished
                const readerState = this._reader.getState(); // Use API getState for safety
                const actualFinishedIndex = readerState?.currentWordIndex >= (readerState?.totalWords - 1)
                                            ? expectedCurrentIndex // Assume it finished the one we thought was loaded
                                            : -1; // Event fired unexpectedly, ignore it

                console.log(`🏁 onChapterEnd received. Expected: ${expectedCurrentIndex}, Actual finished index relates to: ${actualFinishedIndex}`);

                const reallyFinished = readerState?.currentWordIndex >= (readerState?.totalWords - 1);
                const chapterCount = this._epubService.chapters.length;
                const hasNextChapter = expectedCurrentIndex >= 0 && expectedCurrentIndex < chapterCount - 1;

                // FIXED BUG #9: Only proceed if the finished chapter matches the one we expected to be running
                if (actualFinishedIndex !== -1 && actualFinishedIndex === expectedCurrentIndex && hasNextChapter) {
                    console.log('✅ Chapter end matches current index, loading next...');
                    this._epubService.nextChapter();
                } else if (reallyFinished) {
                    // End of the book (or non-EPUB content) - there is nothing more
                    // to play, so drop back to normal mode. Otherwise the reader
                    // stays in 'flow' mode and the Flow button is stuck showing
                    // "Stop Flow" even though playback has ended.
                    console.log('🏁 Reached end of content, returning to normal mode.');
                    if (this._reader) {
                        this._reader.setMode('normal');
                    }
                } else {
                    console.warn('⚠️ Chapter end event ignored (likely from a previous chapter or race condition).');
                }
            });

            console.log('✅ CheetahReaderApp v2.0.0 initialized');
        }, 100);
    }

    /** The slowest and fastest must lie inside the limits and be far enough apart. */
    static isValidSpeedRange(min, max) {
        const r = window.DEFAULT_CONFIG.ranges;
        return Number.isFinite(min) && Number.isFinite(max)
            && min >= r.speedLimits[0] && max <= r.speedLimits[1]
            && max - min >= r.minimumSpeedSpan;
    }

    // ========================================
    // DEPRECATED GETTERS (Backwards Compatibility)
    // ========================================

    /**
     * @deprecated Use getCurrentSettings() instead
     */
    get state() {
        console.warn('[DEPRECATED] Direct access to app.state is deprecated. Use app.getCurrentSettings() or onSettingChange() instead.');
        return this._state;
    }

    /**
     * @deprecated Internal reader should not be accessed directly
     */
    get reader() {
        console.warn('[DEPRECATED] Direct access to app.reader is deprecated. Use public API methods instead.');
        return this._reader;
    }

    /**
     * @deprecated Internal service should not be accessed directly
     */
    get epubService() {
        console.warn('[DEPRECATED] Direct access to app.epubService is deprecated. Use app.onEPUB() for events instead.');
        return this._epubService;
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - TYPOGRAPHY
    // ========================================
    
    setFontSize(size) {
        this._state.set('fontSize', size);
        if (this._reader) {
            this._reader.updateStyles();
        }
    }
    
    setFont(fontKey) {
        this._state.set('font', fontKey);
    }
    
    setLineHeight(height) {
        this._state.set('lineHeight', height);
        if (this._reader) {
            this._reader.updateStyles();
        }
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - THEME
    // ========================================
    
    setTheme(themeName) {
        this._state.set('theme', themeName);
        this._state.set('autoTheme', false);
    }
    
    setAutoTheme(enabled) {
        this._state.set('autoTheme', enabled);
    }
    
    getTheme() {
        return this._themeService ? this._themeService.getCurrentTheme() : this._state.get('theme');
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - LAYOUT
    // ========================================
    
    setMargins(left, right) {
        if (left !== undefined) {
            this._state.set('marginL', Math.max(10, Math.min(400, left)));
        }
        if (right !== undefined) {
            this._state.set('marginR', Math.max(10, Math.min(400, right)));
        }
        if (this._reader) {
            this._reader.updateLayout();
        }
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - BIONIC
    // ========================================
    
    setBionic(enabled) {
        this._state.set('bionic', enabled);
    }
    
    toggleBionic() {
        const current = this._state.get('bionic');

        // Set the state exactly once. Going through reader.setBionic() updates
        // the StateManager and emits the change; the 'bionic' subscription then
        // triggers a single re-render. (Previously this both called setBionic()
        // AND reader.setBionic(), firing the expensive re-render twice.)
        if (this._reader) {
            this._reader.setBionic(!current);
        } else {
            this._state.set('bionic', !current);
        }
    }

    setBionicStrength(strength) {
        // Clamp between 0.2 and 0.7
        const clamped = Math.max(0.2, Math.min(0.7, strength));
        this._state.set('bionicStrength', clamped);

        // Re-render if bionic is active
        if (this._reader && this._state.get('bionic')) {
            this._reader.setBionic(true);
        }
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - FLOW MODE
    // ========================================
    
    setSpeed(wpm) {
        const lo = this._state.get('flow.speedMin');
        const hi = this._state.get('flow.speedMax');
        const clamped = Math.max(lo, Math.min(hi, Math.round(wpm)));
        // Route through the engine so the animator timeline stays coherent if
        // speed changes mid-playback (no highlight jump). _setSpeedValue writes
        // to the shared StateManager (non-silent) so persistence + UI react.
        if (this._reader && typeof this._reader._setSpeedValue === 'function') {
            this._reader._setSpeedValue(clamped);
        } else {
            this._state.set('flow.speed', clamped);
        }
    }
    
    /**
     * Set the dial's slowest and fastest. Refuses a range that makes no sense
     * and pulls the current speed inside the new one.
     * @returns {boolean} whether the range was accepted
     */
    setSpeedRange(min, max) {
        if (!CheetahReaderApp.isValidSpeedRange(min, max)) return false;
        this._state.set('flow.speedMin', Math.round(min));
        this._state.set('flow.speedMax', Math.round(max));
        this.setSpeed(this._state.get('flow.speed'));
        return true;
    }

    setFocusWidth(width) {
        const [lo, hi] = window.DEFAULT_CONFIG.ranges.focusWidth;
        this._state.set('flow.focusWidth', Math.max(lo, Math.min(hi, width)));
    }

    /** How strongly the focus band is lit (0.1 faint ... 2.5 bold). */
    setFocusStrength(strength) {
        const [lo, hi] = window.DEFAULT_CONFIG.ranges.focusStrength;
        this._state.set('flow.focusStrength', Math.max(lo, Math.min(hi, strength)));
    }

    setFocusUnderline(on) {
        this._state.set('flow.focusUnderline', !!on);
    }

    setFocusBackground(on) {
        this._state.set('flow.focusBackground', !!on);
    }

    setScrollLevel(level) {
        const [lo, hi] = window.DEFAULT_CONFIG.ranges.scrollLevel;
        this._state.set('flow.scrollLevel', Math.max(lo, Math.min(hi, level)));
    }

    // ========================================
    // PUBLIC API - PAGE TYPOGRAPHY
    // ========================================

    setLetterSpacing(em) {
        const [lo, hi] = window.DEFAULT_CONFIG.ranges.letterSpacing;
        this._state.set('letterSpacing', Math.max(lo, Math.min(hi, em)));
    }

    setWordSpacing(em) {
        const [lo, hi] = window.DEFAULT_CONFIG.ranges.wordSpacing;
        this._state.set('wordSpacing', Math.max(lo, Math.min(hi, em)));
    }

    setJustify(on) {
        this._state.set('justify', !!on);
    }

    setLimitShelf(on) {
        this._state.set('limitShelf', !!on);
    }

    setHomeStyle(style) {
        this._state.set('homeStyle', style === 'shelf' ? 'shelf' : 'editorial');
    }

    setInvertLineArt(on) {
        this._state.set('invertLineArt', !!on);
    }

    /** The two themes "match system" switches between. */
    setAutoThemes(lightKey, darkKey) {
        if (lightKey) this._state.set('autoLightTheme', lightKey);
        if (darkKey) this._state.set('autoDarkTheme', darkKey);
    }

    startFlow() {
        if (this._reader) {
            this._reader.setMode('flow');
            setTimeout(() => {
                if (this._reader) {
                    this._reader.play();
                }
            }, 300);
        }
    }
    
    stopFlow() {
        if (this._reader) {
            this._reader.setMode('normal');
        }
    }
    
    play() {
        if (this._reader) {
            this._reader.play();
        }
    }
    
    pause() {
        if (this._reader) {
            this._reader.pause();
        }
    }
    
    togglePlay() {
        if (this._reader) {
            this._reader.togglePlay();
        }
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - CONTENT
    // ========================================
    
    loadContent(html) {
        if (this._reader) {
            // Sanitize before rendering. EPUB chapters are already cleaned by
            // EPUBService, but sample/pasted content reaches here raw and is
            // assigned via innerHTML further down the pipeline (XSS risk).
            let safeHtml = html;
            if (typeof DOMPurify !== 'undefined') {
                safeHtml = DOMPurify.sanitize(html, {
                    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                                   'span', 'div', 'img', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
                                   'table', 'thead', 'tbody', 'tr', 'td', 'th', 'figure', 'figcaption'],
                    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style', 'role'],
                    KEEP_CONTENT: true
                });
            }
            this._reader.loadContent(safeHtml);
        }
    }
    
    // STEP 15B: Text formatting logic moved to CheetahReaderApp
    loadPastedText(text) {
        if (!text || text.trim().length === 0) {
            throw new Error('Text is empty');
        }
        
        // Format plain text as HTML
        let formattedText = text;
        if (!text.includes('<p>') && !text.includes('<div>')) {
            const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
            formattedText = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
        }
        
        this.loadContent(formattedText);
        return formattedText;
    }
    
    /**
     * Be told when a book file is about to be opened (any route: upload,
     * drop, library). Returns an unsubscribe function.
     */
    onBookOpen(callback) {
        this._bookOpenListeners = this._bookOpenListeners || new Set();
        this._bookOpenListeners.add(callback);
        return () => this._bookOpenListeners.delete(callback);
    }

    /** The open book's cover art, or null. */
    getCoverBlob() {
        return this._epubService ? this._epubService.getCoverBlob() : Promise.resolve(null);
    }

    loadEPUB(file) {
        (this._bookOpenListeners || []).forEach((cb) => cb(file));
        if (this._epubService) {
            this._epubService.loadBook(file);
        } else {
            console.error('EPUBService not initialized yet');
        }
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - EPUB NAVIGATION
    // ========================================
    
    nextChapter() {
        if (this._epubService) {
            this._epubService.nextChapter();
        }
    }
    
    previousChapter() {
        if (this._epubService) {
            this._epubService.previousChapter();
        }
    }
    
    loadChapter(index) {
        if (this._epubService) {
            this._epubService.loadChapter(index);
        }
    }
    
    // ========================================
    // PUBLIC API - STATE ACCESS
    // ========================================

    /**
     * Get all settings (read-only copy)
     * ✅ NEW: Returns copy of state, not reference
     * @deprecated Use getCurrentSettings() instead for clarity
     */
    getState() {
        return this._state.getAll();
    }

    /**
     * Get current settings (read-only copy)
     * ✅ NEW: Preferred method for getting settings
     * @returns {Object} Copy of current settings
     */
    getCurrentSettings() {
        return this._state.getAll();
    }

    /**
     * Get current chapter index
     * ✅ NEW: Safe access to EPUB state
     * @returns {number} Current chapter index (-1 if no EPUB loaded)
     */
    getCurrentChapterIndex() {
        return this._epubService ? this._epubService.currentChapterIndex : -1;
    }

    /**
     * Get chapters list
     * ✅ NEW: Safe access to EPUB chapters
     * @returns {Array} Copy of chapters array
     */
    getChapters() {
        if (!this._epubService) return [];
        return this._epubService.chapters.map(ch => ({ ...ch }));
    }

    /**
     * Get reader engine state
     * @returns {Object|null} Reader state or null
     */
    getReaderState() {
        return this._reader ? this._reader.getState() : null;
    }

    /**
     * Subscribe to setting changes
     * ✅ NEW: Allows UI to react to setting changes
     * @param {string|Array<string>} keys - Setting key(s) to watch
     * @param {Function} callback - Callback when settings change
     * @returns {Function} Unsubscribe function
     */
    onSettingChange(keys, callback) {
        if (this._state) {
            return this._state.subscribe(keys, callback);
        }
        return () => {};
    }

    // ========================================
    // PUBLIC API - EVENT SYSTEM
    // ========================================

    on(event, callback) {
        if (this._reader) {
            return this._reader.on(event, callback);
        }
    }

    off(event, callback) {
        if (this._reader) {
            this._reader.off(event, callback);
        }
    }

    // ========================================
    // PUBLIC API - EPUB EVENT SYSTEM
    // ========================================

    /**
     * Subscribe to EPUB service events
     * ✅ NEW: Exposes EPUB events to external consumers
     *
     * Available events:
     * - 'bookLoadStarted' - { filename }
     * - 'bookLoaded' - { filename, chapterCount }
     * - 'metadataUpdated' - { title, author, publisher, language, ... }
     * - 'chaptersExtracted' - { chapters: [...], isEmpty }
     * - 'chapterChanged' - { index, title, isFirst, isLast, totalChapters }
     * - 'navigationStateChanged' - { visible, hasPrev, hasNext, currentIndex, totalChapters }
     * - 'epubError' - { code, message, details }
     *
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    onEPUB(event, callback) {
        if (this._epubService) {
            return this._epubService.on(event, callback);
        }
        // Return no-op unsubscribe if service not ready
        return () => {};
    }

    /**
     * Unsubscribe from EPUB service events
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    offEPUB(event, callback) {
        if (this._epubService) {
            this._epubService.off(event, callback);
        }
    }

    // ========================================
    // PUBLIC API - SETTINGS PERSISTENCE
    // ========================================
    
    /**
     * Clear all saved settings
     */
    clearSettings() {
        if (this._persistence) {
            this._persistence.clearSettings();
        }
    }
    
    /**
     * Export settings as JSON string
     * @returns {string}
     */
    exportSettings() {
        return this._persistence ? this._persistence.exportSettings() : '{}';
    }
    
    /**
     * Import settings from JSON string
     * @param {string} jsonString
     * @returns {boolean}
     */
    importSettings(jsonString) {
        return this._persistence ? this._persistence.importSettings(jsonString) : false;
    }
    
    // ========================================
    // LIFECYCLE
    // ========================================
    
    destroy() {
        if (this._epubService) {
            this._epubService.destroy();
        }
        if (this._themeService) {
            this._themeService.destroy();
        }
        if (this._reader) {
            this._reader.destroy();
        }
        console.log('CheetahReaderApp destroyed');
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CheetahReaderApp;
}
if (typeof window !== 'undefined') {
    window.CheetahReaderApp = CheetahReaderApp;
}
