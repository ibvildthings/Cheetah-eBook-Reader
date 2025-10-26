/**
 * EBookReader API v2.4.1-autoflow-fix
 * Public API, constructor, state management, and event system
 * Requires: ebook-reader-core.js and ebook-reader-engine.js to be loaded first
 * 
 * VERSION: 2.4.1-autoflow-fix (2024-10-21)
 * FIX: Added debug logging to play() method
 * 
 * @license MIT
 * @version 2.4.1
 */

(function() {
    'use strict';
    
    console.log('🐆 EBookReader API v2.4.1-autoflow-fix loaded');

    // Import from core
    const {
        FONTS,
        THEMES,
        LINE_BREAK_THRESHOLD,
        WordIndexManager,
        // FontLoader removed in Step 18B - use FontService instead
        EBookReaderError,
        ConfigurationError,
        ContentError,
        StateError,
        FontError
    } = window.EBookReaderCore;

    // Import from engine
    const { EBookReaderEngine } = window;

    // ============================================================================
    // EBOOK READER API CLASS
    // ============================================================================

    class EBookReader extends EBookReaderEngine {
        static VERSION = '2.4.0';

        constructor(containerSelector, options = {}) {
            super();
            
            try {
                this._validateConstructorArgs(containerSelector, options);
                
                // STEP 9A: Store StateManager reference
                this.stateManager = options.stateManager || null;
                
                this.config = {
                    fontSize: { min: 12, default: 18, max: 48 },
                    speed: { min: 100, default: 400, max: 650 },
                    newlinePause: 1.5,
                    scroll: {
                        timeout: 1500,
                        gap: 0.1,
                        comfortZoneTop: 0.15,
                        comfortZoneBottom: 0.70
                    }
                };

                // STEP 9A: Renamed this.state → this._internal (runtime state only)
                this._internal = {
                    // STEP 9B: fontSize, font, lineHeight removed - now in StateManager
                    // STEP 9C: theme, autoTheme removed - now in StateManager
                    // STEP 9E: bionic removed - now in StateManager
                    fontLoading: false,
                    mode: 'normal',
                    content: '',
                    flow: {
                        // STEP 9F: speed, fingers, scrollLevel removed - now in StateManager
                        // Runtime state only:
                        playing: false,
                        currentWordIndex: 0,
                        startTime: 0,
                        rafId: null,
                        userScroll: false,
                        pauseUntil: 0,
                        lastPausedWord: -1
                    },
                    gesture: {
                        touches: [],
                        initDist: 0,
                        initSize: 0
                    },
                    saved: null
                };
                
                // STEP 9A: Keep backward compatibility with this.state
                this.state = this._internal;

                this._lastTapTime = null;
                this._lastTapWordIndex = null;

                this.callbacks = {
                    onModeChange: [],
                    onBionicChange: [],
                    onPlayChange: [],
                    onSpeedChange: [],
                    onThemeChange: [],
                    onFontChange: [],
                    onFontLoading: [],
                    onFontLoaded: [],
                    onStateChange: [],
                    onChapterEnd: []
                };

                this.container = typeof containerSelector === 'string' 
                    ? document.querySelector(containerSelector) 
                    : containerSelector;
                
                if (!this.container) {
                    throw new ConfigurationError(
                        `Container element not found: "${containerSelector}"`
                    );
                }

                this.wordIndexManager = new WordIndexManager();
                // Step 18B: fontLoader removed - FontService used instead
                this._destroyed = false;
                this._pendingStyleUpdate = null;
                
                this._resizeHandler = () => this.updateStyles();
                this._scrollHandler = () => this._handleScroll();
                this._systemThemeHandler = (e) => this._handleSystemThemeChange(e);
                this._wordClickHandler = (e) => this._handleWordClick(e);
                
                this._injectStyles();
                this._buildDOM();
                this._attachEventListeners();
                
                // STEP 11E: mediaQuery and theme application removed - ThemeService handles it
                
                requestAnimationFrame(() => {
                    this.updateStyles();
                    
                    if (this.el.dragZoneL && this.el.dragZoneR && this.el.content) {
                        const contentHeight = this.el.content.scrollHeight;
                        // STEP 9D: Read from StateManager
                        const marginL = this.stateManager ? this.stateManager.get('marginL') : 60;
                        const marginR = this.stateManager ? this.stateManager.get('marginR') : 60;
                        const leftWidth = Math.max(60, marginL);
                        const rightWidth = Math.max(60, marginR);
                        
                        this.el.dragZoneL.style.width = leftWidth + 'px';
                        this.el.dragZoneL.style.height = contentHeight + 'px';
                        
                        this.el.dragZoneR.style.width = rightWidth + 'px';
                        this.el.dragZoneR.style.height = contentHeight + 'px';
                    }
                });
            } catch (error) {
                if (error instanceof EBookReaderError) {
                    throw error;
                }
                throw new ConfigurationError(`Failed to initialize: ${error.message}`);
            }
        }

        // ========================================
        // PUBLIC API - FONT METHODS
        // ========================================

        async setFont(fontKey) {
            if (!FONTS[fontKey]) {
                throw new FontError(`Invalid font: ${fontKey}. Valid fonts: ${Object.keys(FONTS).join(', ')}`);
            }

            // Update StateManager (FontService will handle loading,
            // applying, and triggering the layout update)
            if (this.stateManager) {
                this.stateManager.set('font', fontKey);
            }
        }

        getFont() {
            // STEP 9B: Read from StateManager
            const fontKey = this.stateManager ? this.stateManager.get('font') : 'opendyslexic';
            const font = FONTS[fontKey];
            return {
                key: fontKey,
                name: font.name,
                family: font.family,
                category: font.category,
                lineHeight: font.lineHeight,
                source: font.source,
                loaded: false, // Step 18B: FontService handles loading now
                loading: this.state.fontLoading
            };
        }

        getFonts() {
            return Object.keys(FONTS).map(key => ({
                key,
                ...FONTS[key],
                loaded: false, // Step 18B: FontService handles loading now
                loading: false
            }));
        }

        getAvailableFonts() {
            const fonts = this.getFonts();
            const grouped = {
                serif: [],
                sans: [],
                mono: [],
                slab: [],
                accessibility: []
            };

            fonts.forEach(font => {
                if (grouped[font.category]) {
                    grouped[font.category].push(font);
                }
            });

            return grouped;
        }
        
        // ========================================
        // PUBLIC API - LAYOUT
        // ========================================

        updateLayout() {
            if (this.wordIndexManager) {
                this.wordIndexManager.invalidate();
            }
            if (this.state.mode === 'flow' && !this._destroyed && this.wordIndexManager) {
                requestAnimationFrame(() => {
                    this._updateWordStates(this.state.flow.currentWordIndex);
                });
            }
        }

        // ========================================
        // PUBLIC API - CONTENT & MODE
        // ========================================

        loadContent(html) {
            if (typeof html !== 'string') {
                throw new ContentError(`Content must be a string`);
            }
            if (html.trim().length === 0) {
                throw new ContentError('Content cannot be empty');
            }

            this.state.content = html;
            
            // CRITICAL: Reset word index SYNCHRONOUSLY before async render starts
            // This prevents race conditions where play() is called before render completes
            this.state.flow.currentWordIndex = 0;
            
            this._render();
        }

        setMode(mode) {
            if (mode !== 'normal' && mode !== 'flow') {
                throw new Error('Mode must be "normal" or "flow"');
            }
            this._setMode(mode, true);
            this._emit('onModeChange', mode);
        }

        setBionic(enabled) {
            // STEP 9E: Read from StateManager
            const currentBionic = this.stateManager ? this.stateManager.get('bionic') : false;
            if (currentBionic !== enabled) {
                this._toggleBionic();
                this._emit('onBionicChange', enabled);
            }
        }

        // ========================================
        // PUBLIC API - THEME
        // ========================================

        setTheme(themeName) {
            // STEP 11E: Simplified - ThemeService handles application now
            if (!THEMES[themeName]) {
                throw new Error(`Invalid theme: ${themeName}. Valid themes: ${Object.keys(THEMES).join(', ')}`);
            }
            // Update StateManager (ThemeService will apply)
            if (this.stateManager) {
                this.stateManager.set('theme', themeName);
                this.stateManager.set('autoTheme', false);
            }
        }

        setAutoTheme(enabled) {
            // STEP 11E: Simplified - ThemeService handles application now
            // Update StateManager (ThemeService will apply)
            if (this.stateManager) {
                this.stateManager.set('autoTheme', enabled);
            }
        }

        getTheme() {
            // STEP 9C: Read from StateManager
            const autoTheme = this.stateManager ? this.stateManager.get('autoTheme') : false;
            const selectedTheme = this.stateManager ? this.stateManager.get('theme') : 'sepia';
            const currentTheme = autoTheme 
                ? (this.mediaQuery.matches ? 'dark' : 'light')
                : selectedTheme;
            return {
                current: currentTheme,
                selected: selectedTheme,
                auto: autoTheme,
                colors: THEMES[currentTheme]
            };
        }

        // ========================================
        // PUBLIC API - FLOW MODE CONTROLS
        // ========================================

        setSpeed(wpm) {
            if (typeof wpm !== 'number' || wpm < this.config.speed.min || wpm > this.config.speed.max) {
                throw new Error(`Speed must be between ${this.config.speed.min} and ${this.config.speed.max}`);
            }
            
            // STEP 9F: Write to StateManager
            if (this.stateManager) {
                this.stateManager.set('flow.speed', wpm, true);
            }
            
            //
            // --- FIX BUG #5 ---
            //
            // If playing, tell the Animator to jump to its current position.
            // This forces it to recalculate its internal startTime with the new speed.
            if (this.state.flow.playing && this.animator) {
                this.animator.jumpTo(this.state.flow.currentWordIndex);
            }
            // --- END OF FIX ---
            
            this._emit('onSpeedChange', wpm);
        }

        setLineHeight(lineHeight) {
            if (typeof lineHeight !== 'number' || lineHeight < 1.0 || lineHeight > 3.0) {
                throw new Error('Line height must be between 1.0 and 3.0');
            }
            // STEP 9B: Write to StateManager
            if (this.stateManager) {
                this.stateManager.set('lineHeight', lineHeight, true);
            }
            this.updateStyles();
        }

        setFocusWidth(width) {
            if (typeof width !== 'number' || width < 1 || width > 5) {
                throw new Error('Focus width must be between 1 and 5');
            }
            // STEP 9F: Write to StateManager
            if (this.stateManager) {
                this.stateManager.set('flow.focusWidth', width, true);
            }
            if (this.state.mode === 'flow' && !this._destroyed && this.wordIndexManager) {
                this._updateWordStates(this.state.flow.currentWordIndex);
            }
        }

        setScrollLevel(level) {
            if (typeof level !== 'number' || level < 1 || level > 5) {
                throw new Error('Scroll level must be between 1 and 5');
            }
            // STEP 9F: Write to StateManager
            if (this.stateManager) {
                this.stateManager.set('flow.scrollLevel', level, true);
            }
        }

        play() {
            console.log('🎬 play() called - State check:', {
                'flow.playing': this.state.flow.playing,
                'mode': this.state.mode,
                'will_toggle': !this.state.flow.playing && this.state.mode === 'flow'
            });
            
            if (!this.state.flow.playing && this.state.mode === 'flow') {
                console.log('✅ Conditions met, calling _togglePlay()');
                this._togglePlay();
            } else {
                console.warn('❌ play() conditions not met:', {
                    alreadyPlaying: this.state.flow.playing,
                    notInFlowMode: this.state.mode !== 'flow'
                });
            }
        }

        pause() {
            if (this.state.flow.playing) {
                this._togglePlay();
            }
        }

        togglePlay() {
            if (this.state.mode === 'flow') {
                this._togglePlay();
            }
        }

        jumpToWord(index) {
            if (typeof index !== 'number' || index < 0) {
                throw new Error('Word index must be a non-negative number');
            }
            
            const totalWords = this.wordIndexManager?.getTotalWords() || 0;
            if (index >= totalWords) {
                throw new Error(`Word index ${index} exceeds total words ${totalWords}`);
            }
            
            if (this.state.mode === 'flow') {
                this._jumpToWord(index);
            }
        }

        // ========================================
        // PUBLIC API - STATE GETTERS
        // ========================================

        getState() {
            return {
                version: EBookReader.VERSION,
                mode: this.state.mode,
                // STEP 9E: Read from StateManager
                bionic: this.stateManager ? this.stateManager.get('bionic') : false,
                // STEP 9B: Read from StateManager
                fontSize: this.stateManager ? this.stateManager.get('fontSize') : 18,
                lineHeight: this.stateManager ? this.stateManager.get('lineHeight') : 1.7,
                font: this.getFont(),
                theme: this.getTheme(),
                playing: this.state.flow.playing,
                // STEP 9F: Read from StateManager
                speed: this.stateManager ? this.stateManager.get('flow.speed') : 400,
                currentWordIndex: this.state.flow.currentWordIndex,
                totalWords: this.wordIndexManager?.getTotalWords() || 0,
                focusWidth: this.stateManager ? this.stateManager.get('flow.focusWidth') : 2,
                scrollLevel: this.stateManager ? this.stateManager.get('flow.scrollLevel') : 1
            };
        }

        // ========================================
        // PUBLIC API - LIFECYCLE
        // ========================================

        destroy() {
            if (this._destroyed) return;
            
            this._destroyed = true;

            if (this.state.flow.rafId) {
                cancelAnimationFrame(this.state.flow.rafId);
                this.state.flow.rafId = null;
            }

            window.removeEventListener('resize', this._resizeHandler);
            // STEP 11E: mediaQuery removed - ThemeService handles it
            
            if (this.el?.reader) {
                this.el.reader.removeEventListener('scroll', this._scrollHandler);
                this.el.reader.removeEventListener('wheel', this._wheelHandler);
            }
            
            if (this.el?.content) {
                this.el.content.removeEventListener('click', this._wordClickHandler);
                this.el.content.removeEventListener('touchstart', this._touchStartHandler);
                this.el.content.removeEventListener('touchmove', this._touchMoveHandler);
            }

            this.wordIndexManager = null;
            // Step 18B: fontLoader removed
            
            if (this.container) {
                this.container.innerHTML = '';
            }
            
            this.callbacks = {};
            
            console.log('EBookReader destroyed');
        }

        // ========================================
        // PUBLIC API - EVENT SYSTEM
        // ========================================

        on(event, callback) {
            if (!this.callbacks[event]) {
                throw new Error(`Unknown event: ${event}`);
            }
            if (typeof callback !== 'function') {
                throw new Error('Callback must be a function');
            }
            this.callbacks[event].push(callback);
            return () => this.off(event, callback);
        }

        off(event, callback) {
            if (!this.callbacks[event]) return;
            const index = this.callbacks[event].indexOf(callback);
            if (index > -1) {
                this.callbacks[event].splice(index, 1);
            }
        }

        _emit(event, data) {
            if (this.callbacks[event]) {
                this.callbacks[event].forEach(cb => {
                    try {
                        cb(data);
                    } catch (error) {
                        console.error(`Error in ${event} callback:`, error);
                    }
                });
            }
        }

        // ========================================
        // PRIVATE - VALIDATION
        // ========================================

        _validateConstructorArgs(selector, options) {
            if (!selector) {
                throw new ConfigurationError('Container selector is required');
            }
            if (typeof options !== 'object') {
                throw new ConfigurationError('Options must be an object');
            }
        }

        _validateOption(value, config, name) {
            if (value === undefined) return config.default;
            if (typeof value !== 'number') {
                throw new ConfigurationError(`${name} must be a number`);
            }
            if (value < config.min || value > config.max) {
                throw new ConfigurationError(
                    `${name} must be between ${config.min} and ${config.max}`
                );
            }
            return value;
        }
    }

    // ============================================================================
    // EXPOSE LIBRARY
    // ============================================================================

    window.EBookReader = EBookReader;
    window.EBookReaderError = EBookReaderError;
    window.ConfigurationError = ConfigurationError;
    window.ContentError = ContentError;
    window.StateError = StateError;
    window.FontError = FontError;

})();
