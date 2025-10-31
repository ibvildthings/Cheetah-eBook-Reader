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
        const defaults = {
            fontSize: 18,
            font: 'opendyslexic',
            lineHeight: 1.8,
            theme: 'sepia',
            autoTheme: false,
            marginL: 60,
            marginR: 60,
            mode: 'normal',
            bionic: false,
            bionicStrength: 0.5,
            flow: {
                playing: false,
                speed: 400,
                currentWordIndex: 0,
                focusWidth: 2,
                scrollLevel: 1
            }
        };

        // ✅ PRIVATE: Initialize StateManager with merged state
        this._state = new StateManager({
            fontSize: savedSettings.fontSize ?? options.fontSize ?? defaults.fontSize,
            font: savedSettings.font ?? options.font ?? defaults.font,
            lineHeight: savedSettings.lineHeight ?? options.lineHeight ?? defaults.lineHeight,
            theme: savedSettings.theme ?? options.theme ?? defaults.theme,
            autoTheme: savedSettings.autoTheme ?? options.autoTheme ?? defaults.autoTheme,
            marginL: savedSettings.marginL ?? options.marginL ?? defaults.marginL,
            marginR: savedSettings.marginR ?? options.marginR ?? defaults.marginR,
            mode: defaults.mode,
            bionic: savedSettings.bionic ?? options.bionic ?? defaults.bionic,
            bionicStrength: savedSettings.bionicStrength ?? options.bionicStrength ?? defaults.bionicStrength,
            flow: {
                playing: defaults.flow.playing,
                speed: savedSettings.flow?.speed ?? options.speed ?? defaults.flow.speed,
                currentWordIndex: defaults.flow.currentWordIndex,
                focusWidth: savedSettings.flow?.focusWidth ?? options.focusWidth ?? defaults.flow.focusWidth,
                scrollLevel: savedSettings.flow?.scrollLevel ?? options.scrollLevel ?? defaults.flow.scrollLevel
            }
        });

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

                // FIXED BUG #9: Only proceed if the finished chapter matches the one we expected to be running
                if (actualFinishedIndex !== -1 && actualFinishedIndex === expectedCurrentIndex) {
                    console.log('✅ Chapter end matches current index, loading next...');
                    this._epubService.nextChapter();
                } else {
                    console.warn('⚠️ Chapter end event ignored (likely from a previous chapter or race condition).');
                }
            });

            console.log('✅ CheetahReaderApp v2.0.0 initialized');
        }, 100);
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
        return this._themeService ? this.themeService.getCurrentTheme() : this.state.get('theme');
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
        const current = this.state.get('bionic');
        this.setBionic(!current);
        
        // Trigger re-render
        if (this._reader) {
            this._reader.setBionic(!current);
        }
    }
    
    setBionicStrength(strength) {
        // Clamp between 0.2 and 0.7
        const clamped = Math.max(0.2, Math.min(0.7, strength));
        this._state.set('bionicStrength', clamped);
        
        // Re-render if bionic is active
        if (this.reader && this.state.get('bionic')) {
            this._reader.setBionic(true);
        }
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - FLOW MODE
    // ========================================
    
    setSpeed(wpm) {
        const clamped = Math.max(100, Math.min(650, wpm));
        this._state.set('flow.speed', clamped);
    }
    
    setFocusWidth(width) {
        const clamped = Math.max(1, Math.min(5, width));
        this._state.set('flow.focusWidth', clamped);
    }
    
    setScrollLevel(level) {
        const clamped = Math.max(1, Math.min(5, level));
        this._state.set('flow.scrollLevel', clamped);
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
            this._reader.loadContent(html);
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
    
    loadEPUB(file) {
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
            return this.epubService.on(event, callback);
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
        if (this.persistence) {
            this._persistence.clearSettings();
        }
    }
    
    /**
     * Export settings as JSON string
     * @returns {string}
     */
    exportSettings() {
        return this._persistence ? this.persistence.exportSettings() : '{}';
    }
    
    /**
     * Import settings from JSON string
     * @param {string} jsonString
     * @returns {boolean}
     */
    importSettings(jsonString) {
        return this._persistence ? this.persistence.importSettings(jsonString) : false;
    }
    
    // ========================================
    // LIFECYCLE
    // ========================================
    
    destroy() {
        if (this._epubService) {
            this._epubService.destroy();
        }
        if (this.themeService) {
            this.themeService.destroy();
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
