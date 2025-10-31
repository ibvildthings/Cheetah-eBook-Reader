/**
 * CheetahReaderApp v1.0.0
 * Main application coordinator that manages reader, state, and services
 * 
 * STEP 14: Application Controller Layer
 * 
 * @license MIT
 * @version 1.0.0
 */

class CheetahReaderApp {
    constructor(selector, options = {}) {
        console.log('🐆 CheetahReaderApp initializing...');
        
        // Initialize persistence manager first (before StateManager)
        const tempState = new StateManager({});
        this.persistence = new SettingsPersistence(tempState);
        
        // Try to load saved settings
        const savedSettings = this.persistence.loadSettings() || {};
        
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
        
        // STEP 14A: Initialize StateManager with merged state
        this.state = new StateManager({
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
        this.persistence.stateManager = this.state;
        
        // Enable auto-save for settings
        this.persistence.enableAutoSave();
        
        // STEP 14A: Initialize reader with StateManager
        this.reader = new EBookReader(selector, {
            stateManager: this.state
        });
        
        // Store container reference for services
        this.container = this.reader.container;
        
        // STEP 14A: Initialize services
        // Wait for DOM to be ready before initializing services
        setTimeout(() => {
            const contentElement = this.reader.el?.content;
            
            if (contentElement) {
                this.fontService = new FontService(this.state, contentElement, this.reader);
                
                // Load initial font
                this.fontService.loadFont(this.state.get('font')).then(() => {
                    this.fontService.applyFont(this.state.get('font'));
                });
            }
            
            if (this.container) {
                this.themeService = new ThemeService(this.state, this.container);
                // Apply initial theme
                this.themeService.applyTheme(this.state.get('theme'));
            }
            
            this.epubService = new EPUBService(this.reader);

            //
            // Listen for the engine to signal the chapter end
            //
            this.reader.on('onChapterEnd', () => {
                // Get the index that the EPUB service *thinks* is current
                const expectedCurrentIndex = this.epubService.currentChapterIndex;

                // Get the index the reader *actually* had when it finished
                const readerState = this.reader.getState(); // Use API getState for safety
                const actualFinishedIndex = readerState?.currentWordIndex >= (readerState?.totalWords - 1)
                                            ? expectedCurrentIndex // Assume it finished the one we thought was loaded
                                            : -1; // Event fired unexpectedly, ignore it

                console.log(`🏁 onChapterEnd received. Expected: ${expectedCurrentIndex}, Actual finished index relates to: ${actualFinishedIndex}`);

                // FIXED BUG #9: Only proceed if the finished chapter matches the one we expected to be running
                if (actualFinishedIndex !== -1 && actualFinishedIndex === expectedCurrentIndex) {
                    console.log('✅ Chapter end matches current index, loading next...');
                    this.epubService.nextChapter();
                } else {
                    console.warn('⚠️ Chapter end event ignored (likely from a previous chapter or race condition).');
                }
            });
            
            console.log('✅ CheetahReaderApp initialized');
        }, 100);
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - TYPOGRAPHY
    // ========================================
    
    setFontSize(size) {
        this.state.set('fontSize', size);
        if (this.reader) {
            this.reader.updateStyles();
        }
    }
    
    setFont(fontKey) {
        this.state.set('font', fontKey);
    }
    
    setLineHeight(height) {
        this.state.set('lineHeight', height);
        if (this.reader) {
            this.reader.updateStyles();
        }
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - THEME
    // ========================================
    
    setTheme(themeName) {
        this.state.set('theme', themeName);
        this.state.set('autoTheme', false);
    }
    
    setAutoTheme(enabled) {
        this.state.set('autoTheme', enabled);
    }
    
    getTheme() {
        return this.themeService ? this.themeService.getCurrentTheme() : this.state.get('theme');
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - LAYOUT
    // ========================================
    
    setMargins(left, right) {
        if (left !== undefined) {
            this.state.set('marginL', Math.max(10, Math.min(400, left)));
        }
        if (right !== undefined) {
            this.state.set('marginR', Math.max(10, Math.min(400, right)));
        }
        if (this.reader) {
            this.reader.updateLayout();
        }
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - BIONIC
    // ========================================
    
    setBionic(enabled) {
        this.state.set('bionic', enabled);
    }
    
    toggleBionic() {
        const current = this.state.get('bionic');
        this.setBionic(!current);
        
        // Trigger re-render
        if (this.reader) {
            this.reader.setBionic(!current);
        }
    }
    
    setBionicStrength(strength) {
        // Clamp between 0.2 and 0.7
        const clamped = Math.max(0.2, Math.min(0.7, strength));
        this.state.set('bionicStrength', clamped);
        
        // Re-render if bionic is active
        if (this.reader && this.state.get('bionic')) {
            this.reader.setBionic(true);
        }
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - FLOW MODE
    // ========================================
    
    setSpeed(wpm) {
        const clamped = Math.max(100, Math.min(650, wpm));
        this.state.set('flow.speed', clamped);
    }
    
    setFocusWidth(width) {
        const clamped = Math.max(1, Math.min(5, width));
        this.state.set('flow.focusWidth', clamped);
    }
    
    setScrollLevel(level) {
        const clamped = Math.max(1, Math.min(5, level));
        this.state.set('flow.scrollLevel', clamped);
    }
    
    startFlow() {
        if (this.reader) {
            this.reader.setMode('flow');
            setTimeout(() => {
                if (this.reader) {
                    this.reader.play();
                }
            }, 300);
        }
    }
    
    stopFlow() {
        if (this.reader) {
            this.reader.setMode('normal');
        }
    }
    
    play() {
        if (this.reader) {
            this.reader.play();
        }
    }
    
    pause() {
        if (this.reader) {
            this.reader.pause();
        }
    }
    
    togglePlay() {
        if (this.reader) {
            this.reader.togglePlay();
        }
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - CONTENT
    // ========================================
    
    loadContent(html) {
        if (this.reader) {
            this.reader.loadContent(html);
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
        if (this.epubService) {
            this.epubService.loadBook(file);
        } else {
            console.error('EPUBService not initialized yet');
        }
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - EPUB NAVIGATION
    // ========================================
    
    nextChapter() {
        if (this.epubService) {
            this.epubService.nextChapter();
        }
    }
    
    previousChapter() {
        if (this.epubService) {
            this.epubService.previousChapter();
        }
    }
    
    loadChapter(index) {
        if (this.epubService) {
            this.epubService.loadChapter(index);
        }
    }
    
    // ========================================
    // PUBLIC API - STATE ACCESS
    // ========================================
    
    getState() {
        return this.state.getAll();
    }
    
    getReaderState() {
        return this.reader ? this.reader.getState() : null;
    }
    
    // ========================================
    // PUBLIC API - EVENT SYSTEM
    // ========================================
    
    on(event, callback) {
        if (this.reader) {
            return this.reader.on(event, callback);
        }
    }

    off(event, callback) {
        if (this.reader) {
            this.reader.off(event, callback);
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
        if (this.epubService) {
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
        if (this.epubService) {
            this.epubService.off(event, callback);
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
            this.persistence.clearSettings();
        }
    }
    
    /**
     * Export settings as JSON string
     * @returns {string}
     */
    exportSettings() {
        return this.persistence ? this.persistence.exportSettings() : '{}';
    }
    
    /**
     * Import settings from JSON string
     * @param {string} jsonString
     * @returns {boolean}
     */
    importSettings(jsonString) {
        return this.persistence ? this.persistence.importSettings(jsonString) : false;
    }
    
    // ========================================
    // LIFECYCLE
    // ========================================
    
    destroy() {
        if (this.epubService) {
            this.epubService.destroy();
        }
        if (this.themeService) {
            this.themeService.destroy();
        }
        if (this.reader) {
            this.reader.destroy();
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
