/**
 * EBookReader API v2.4.0
 * Public API, constructor, state management, and event system
 * Requires: ebook-reader-core.js and ebook-reader-engine.js to be loaded first
 * 
 * @license MIT
 * @version 2.4.0
 */

(function() {
    'use strict';

    // Import from core
    const {
        FONTS,
        THEMES,
        LINE_BREAK_THRESHOLD,
        WordIndexManager,
        FontLoader,
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

                this.state = {
                    fontSize: this._validateOption(options.fontSize, this.config.fontSize, 'fontSize'),
                    font: 'opendyslexic',
                    lineHeight: FONTS.opendyslexic.lineHeight,
                    fontLoading: false,
                    mode: 'normal',
                    bionic: false,
                    theme: 'sepia',
                    autoTheme: false,
                    content: '',
                    flow: {
                        playing: false,
                        speed: this.config.speed.default,
                        currentWordIndex: 0,
                        startTime: 0,
                        rafId: null,
                        userScroll: false,
                        fingers: 2,
                        scrollLevel: 1,
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
                    onStateChange: []
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
                this.fontLoader = new FontLoader();
                this._destroyed = false;
                this._pendingStyleUpdate = null;
                
                this._resizeHandler = () => this.updateStyles();
                this._scrollHandler = () => this._handleScroll();
                this._systemThemeHandler = (e) => this._handleSystemThemeChange(e);
                this._wordClickHandler = (e) => this._handleWordClick(e);
                
                this._injectStyles();
                this._buildDOM();
                this._attachEventListeners();
                
                this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                this.mediaQuery.addEventListener('change', this._systemThemeHandler);
                
                requestAnimationFrame(() => {
                    this.updateStyles();
                    this._applyTheme(this.state.theme);
                    
                    if (this.el.dragZoneL && this.el.dragZoneR && this.el.content) {
                        const contentHeight = this.el.content.scrollHeight;
                        const leftWidth = Math.max(60, this.state.marginL);
                        const rightWidth = Math.max(60, this.state.marginR);
                        
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

            const font = FONTS[fontKey];
            
            try {
                this.state.fontLoading = true;
                this._emit('onFontLoading', fontKey);

                if (this.wordIndexManager) {
                    this.wordIndexManager.disableObserver();
                }

                await this.fontLoader.loadFont(fontKey);

                this.state.font = fontKey;
                this.state.lineHeight = font.lineHeight;
                this.state.fontLoading = false;

                this.updateStyles();
                
                const currentTheme = this.state.autoTheme 
                    ? (this.mediaQuery.matches ? 'dark' : 'light')
                    : this.state.theme;
                this._applyTheme(currentTheme);

                this._emit('onFontLoaded', fontKey);
                this._emit('onFontChange', this.getFont());

                if (this.state.mode === 'flow' && this.wordIndexManager) {
                    this.wordIndexManager.invalidate();
                    setTimeout(() => {
                        if (!this._destroyed && this.wordIndexManager) {
                            this.wordIndexManager.enableObserver();
                            this._updateWordStates(this.state.flow.currentWordIndex);
                        }
                    }, 150);
                } else if (this.wordIndexManager) {
                    this.wordIndexManager.enableObserver();
                }
            } catch (error) {
                this.state.fontLoading = false;
                if (this.wordIndexManager) {
                    this.wordIndexManager.enableObserver();
                }
                
                if (fontKey !== 'georgia') {
                    console.warn(`Font load failed, falling back to Georgia: ${error.message}`);
                    await this.setFont('georgia');
                } else {
                    throw error;
                }
            }
        }

        getFont() {
            const fontKey = this.state.font;
            const font = FONTS[fontKey];
            return {
                key: fontKey,
                name: font.name,
                family: font.family,
                category: font.category,
                lineHeight: font.lineHeight,
                source: font.source,
                loaded: this.fontLoader.isLoaded(fontKey),
                loading: this.state.fontLoading
            };
        }

        getFonts() {
            return Object.keys(FONTS).map(key => ({
                key,
                ...FONTS[key],
                loaded: this.fontLoader.isLoaded(key),
                loading: this.fontLoader.isLoading(key)
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
            if (this.state.bionic !== enabled) {
                this._toggleBionic();
                this._emit('onBionicChange', enabled);
            }
        }

        // ========================================
        // PUBLIC API - THEME
        // ========================================

        setTheme(themeName) {
            if (!THEMES[themeName]) {
                throw new Error(`Invalid theme: ${themeName}. Valid themes: ${Object.keys(THEMES).join(', ')}`);
            }
            this.state.theme = themeName;
            this.state.autoTheme = false;
            this._applyTheme(themeName);
            this._emit('onThemeChange', { theme: themeName, auto: false });
        }

        setAutoTheme(enabled) {
            this.state.autoTheme = enabled;
            if (enabled) {
                const isDark = this.mediaQuery.matches;
                const autoTheme = isDark ? 'dark' : 'light';
                this._applyTheme(autoTheme);
                this._emit('onThemeChange', { theme: autoTheme, auto: true });
            } else {
                this._applyTheme(this.state.theme);
                this._emit('onThemeChange', { theme: this.state.theme, auto: false });
            }
        }

        getTheme() {
            const currentTheme = this.state.autoTheme 
                ? (this.mediaQuery.matches ? 'dark' : 'light')
                : this.state.theme;
            return {
                current: currentTheme,
                selected: this.state.theme,
                auto: this.state.autoTheme,
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
            
            if (this.state.flow.playing) {
                const currentWordIndex = this.state.flow.currentWordIndex;
                this.state.flow.speed = wpm;
                const wordsPerSecond = wpm / 60;
                this.state.flow.startTime = performance.now() - (currentWordIndex / wordsPerSecond) * 1000;
            } else {
                this.state.flow.speed = wpm;
            }
            
            this._emit('onSpeedChange', wpm);
        }

        setLineHeight(lineHeight) {
            if (typeof lineHeight !== 'number' || lineHeight < 1.0 || lineHeight > 3.0) {
                throw new Error('Line height must be between 1.0 and 3.0');
            }
            this.state.lineHeight = lineHeight;
            this.updateStyles();
        }

        setFocusWidth(width) {
            if (typeof width !== 'number' || width < 1 || width > 5) {
                throw new Error('Focus width must be between 1 and 5');
            }
            this.state.flow.fingers = width;
            if (this.state.mode === 'flow' && !this._destroyed && this.wordIndexManager) {
                this._updateWordStates(this.state.flow.currentWordIndex);
            }
        }

        setScrollLevel(level) {
            if (typeof level !== 'number' || level < 1 || level > 5) {
                throw new Error('Scroll level must be between 1 and 5');
            }
            this.state.flow.scrollLevel = level;
        }

        play() {
            if (!this.state.flow.playing && this.state.mode === 'flow') {
                this._togglePlay();
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
                bionic: this.state.bionic,
                fontSize: this.state.fontSize,
                lineHeight: this.state.lineHeight,
                font: this.getFont(),
                theme: this.getTheme(),
                playing: this.state.flow.playing,
                speed: this.state.flow.speed,
                currentWordIndex: this.state.flow.currentWordIndex,
                totalWords: this.wordIndexManager?.getTotalWords() || 0,
                focusWidth: this.state.flow.fingers,
                scrollLevel: this.state.flow.scrollLevel
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
            this.mediaQuery?.removeEventListener('change', this._systemThemeHandler);
            
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
            this.fontLoader = null;
            
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
