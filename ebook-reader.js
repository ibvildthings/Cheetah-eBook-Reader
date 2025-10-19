/**
 * EBookReader Main Class v2.4.0
 * Main reader implementation and public API
 * Requires: ebook-reader-core.js to be loaded first
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

    // ============================================================================
    // CORE EBOOK READER CLASS
    // ============================================================================

    class EBookReader {
        static VERSION = '2.4.0';

        constructor(containerSelector, options = {}) {
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
            if (this.state.mode === 'flow') {
                this._jumpToWord(index);
            }
        }

        // ========================================
        // PUBLIC API - STATE & EVENTS
        // ========================================

        getState() {
            return {
                version: EBookReader.VERSION,
                mode: this.state.mode,
                bionic: this.state.bionic,
                theme: this.getTheme(),
                font: this.getFont(),
                fontSize: this.state.fontSize,
                isPlaying: this.state.flow.playing,
                currentWordIndex: this.state.flow.currentWordIndex,
                totalWords: this.wordIndexManager ? this.wordIndexManager.getTotalWords() : 0,
                speed: this.state.flow.speed,
                focusWidth: this.state.flow.fingers,
                scrollLevel: this.state.flow.scrollLevel
            };
        }

        on(event, callback) {
            if (this.callbacks[event]) {
                this.callbacks[event].push(callback);
            }
        }

        off(event, callback) {
            if (this.callbacks[event]) {
                this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
            }
        }

        destroy() {
            try {
                if (this.state.flow.playing) {
                    cancelAnimationFrame(this.state.flow.rafId);
                }
                
                window.removeEventListener('resize', this._resizeHandler);
                this.mediaQuery.removeEventListener('change', this._systemThemeHandler);
                
                if (this.el && this.el.reader) {
                    this.el.reader.removeEventListener('scroll', this._scrollHandler);
                }
                
                if (this.el && this.el.content) {
                    this.el.content.removeEventListener('click', this._wordClickHandler);
                }
                
                if (this.wordIndexManager) {
                    this.wordIndexManager.disconnectObserver();
                }
                
                if (this.container) {
                    this.container.innerHTML = '';
                }
                
                this._destroyed = true;
                this.wordIndexManager = null;
                this.fontLoader = null;
            } catch (error) {
                throw new StateError(`Failed to destroy reader: ${error.message}`);
            }
        }

        // ========================================
        // PRIVATE METHODS - UTILITIES
        // ========================================

        _emit(event, data) {
            if (this.callbacks[event]) {
                this.callbacks[event].forEach(cb => cb(data));
            }
        }

        _validateConstructorArgs(containerSelector, options) {
            if (!containerSelector) {
                throw new ConfigurationError('Container selector is required');
            }
            if (options && typeof options !== 'object') {
                throw new ConfigurationError('Options must be an object');
            }
        }

        _validateOption(value, config, name) {
            if (value === undefined) return config.default;
            if (typeof value !== 'number' || isNaN(value)) {
                throw new ConfigurationError(`${name} must be a valid number`);
            }
            if (value < config.min || value > config.max) {
                console.warn(`${name} clamped to [${config.min}, ${config.max}]`);
                return Math.max(config.min, Math.min(config.max, value));
            }
            return value;
        }

        _clamp(v, min, max) {
            return Math.max(min, Math.min(max, v));
        }

        _dist(t1, t2) {
            return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        }

        // ========================================
        // PRIVATE METHODS - THEME
        // ========================================

        _handleSystemThemeChange(e) {
            if (this.state.autoTheme && !this._destroyed) {
                const autoTheme = e.matches ? 'dark' : 'light';
                this._applyTheme(autoTheme);
                this._emit('onThemeChange', { theme: autoTheme, auto: true });
            }
        }

        _applyTheme(themeName) {
            if (!THEMES[themeName] || !this.el || !this.el.reader) return;
            
            const theme = THEMES[themeName];
            const root = this.container.querySelector('.ebook-reader-root');
            const reader = this.el.reader;
            const content = this.el.content;
            
            if (root) {
                root.style.background = theme.background;
            }
            
            if (reader) {
                reader.style.background = theme.contentBg;
                reader.style.boxShadow = `0 4px 20px ${theme.shadow}`;
            }
            
            if (content) {
                content.style.color = theme.text;
            }
            
            const bionicElements = content ? content.querySelectorAll('.bionic') : [];
            bionicElements.forEach(el => {
                el.style.color = theme.bionic;
            });
            
            if (this.container) {
                this.container.style.setProperty('--theme-accent', theme.accent);
                this.container.style.setProperty('--theme-focus', theme.focusIndicator);
            }
        }

        // ========================================
        // PRIVATE METHODS - DOM SETUP
        // ========================================

        _injectStyles() {
            if (document.getElementById('ebook-reader-styles')) return;

            const style = document.createElement('style');
            style.id = 'ebook-reader-styles';
            style.textContent = `
                .ebook-reader-root {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: #f5f5f5;
                    overflow: hidden;
                    touch-action: none;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    transition: background 0.3s ease;
                    contain: layout style;
                }
                .ebook-reader-area {
                    position: relative;
                    background: #fff;
                    box-shadow: 0 4px 20px rgba(0,0,0,.1);
                    overflow-y: auto;
                    transition: all .3s ease;
                    max-height: 100vh;
                    padding: 30px 0;
                    contain: layout style;
                }
                .ebook-text-content {
                    transition: padding .1s ease-out, opacity .2s ease-in-out, color .3s ease, font-family .2s ease;
                    position: relative;
                    min-height: 100%;
                    padding: 0 60px;
                    padding-bottom: 60vh;
                    contain: layout style paint;
                }
                .ebook-text-content.transitioning { opacity: .4; }
                .bionic { 
                    font-weight: 700;
                    transition: color 0.3s ease;
                    contain: style;
                }
                .flow-word {
                    font-weight: 400;
                    cursor: pointer;
                    display: inline;
                    position: relative;
                    transition: opacity 0.2s ease;
                    will-change: opacity;
                    contain: layout style;
                }
                .flow-word:hover { opacity: .7; }
                .flow-word.active {
                    opacity: 1;
                }
                .flow-word.inactive { opacity: .2; }
                .ebook-focus-indicator {
                    position: absolute;
                    top: 0;
                    left: 0;
                    pointer-events: none;
                    z-index: 50;
                    background: var(--theme-focus, rgba(59,130,246,.08));
                    display: none;
                    border-radius: 3px;
                    transition: background 0.3s ease;
                    will-change: transform;
                    contain: layout style paint;
                }
                .ebook-focus-indicator.visible { display: block; }
            `;
            document.head.appendChild(style);
        }

        _buildDOM() {
            this.container.innerHTML = '';
            this.container.className = 'ebook-reader-root';

            const html = `
               <div class="ebook-reader-area">
                   <div class="ebook-focus-indicator"></div>
                   <div class="ebook-text-content"></div>
               </div>
           `;

            this.container.innerHTML = html;

            this.el = {
               reader: this.container.querySelector('.ebook-reader-area'),
               content: this.container.querySelector('.ebook-text-content'),
               focus: this.container.querySelector('.ebook-focus-indicator')
           };
        }

        _attachEventListeners() {
            this.el.reader.addEventListener('touchstart', e => this._handleTouchStart(e));
            this.el.reader.addEventListener('touchmove', e => this._handleTouchMove(e));
            this.el.reader.addEventListener('wheel', e => this._handleWheel(e));
            this.el.reader.addEventListener('scroll', this._scrollHandler);

            this.el.content.addEventListener('click', this._wordClickHandler);

            window.addEventListener('resize', this._resizeHandler);
        }

        // ========================================
        // PRIVATE METHODS - EVENT HANDLERS
        // ========================================

        _handleWordClick(e) {
            if (this._destroyed) return;
            
            const state = this.state;
            
            // Handle double-tap for jump functionality
            const now = Date.now();
            const wordEl = e.target.closest('.flow-word');
            
            if (wordEl) {
                const idx = parseInt(wordEl.dataset.wordIndex);
                
                // Check if this is a double-tap on the same word
                if (this._lastTapTime && 
                    now - this._lastTapTime < 300 && 
                    this._lastTapWordIndex === idx &&
                    state.mode === 'flow') {
                    
                    // Double-tap detected - prevent text selection AND prevent single-tap behavior
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Jump to word and keep playing state
                    if (!isNaN(idx)) {
                        const wasPlaying = this.state.flow.playing;
                        this._jumpToWord(idx);
                        
                        // If it was paused, start playing from new position
                        if (!wasPlaying) {
                            setTimeout(() => {
                                if (!this._destroyed) {
                                    this.play();
                                }
                            }, 100);
                        }
                    }
                    
                    // Reset tap tracking
                    this._lastTapTime = null;
                    this._lastTapWordIndex = null;
                    return; // EXIT HERE - don't run single-tap logic
                }
                
                // Record this tap for double-tap detection
                this._lastTapTime = now;
                this._lastTapWordIndex = idx;
                
                // Delay single-tap action to allow time for potential second tap
                setTimeout(() => {
                    // Only execute single-tap if no second tap came within 300ms
                    if (this._lastTapTime === now && this._lastTapWordIndex === idx) {
                        // Prevent text selection in flow mode
                        if (state.mode === 'flow') {
                            e.preventDefault();
                        }
                        
                        // Single tap behavior - toggle flow mode
                        if (state.mode === 'flow') {
                            // In flow mode: tap stops flow (exit to normal mode)
                            this.setMode('normal');
                            this._emit('onModeChange', 'normal');
                        } else {
                            // In normal mode: tap starts flow
                            this.setMode('flow');
                            this._emit('onModeChange', 'flow');
                            setTimeout(() => {
                                if (!this._destroyed) {
                                    this.play();
                                }
                            }, 300);
                        }
                    }
                }, 310); // Wait slightly longer than double-tap threshold
                
                return; // Exit after setting up delayed single-tap
            }
            
            // Clicked outside a word - treat as single tap immediately
            if (state.mode === 'flow') {
                e.preventDefault();
                this.setMode('normal');
                this._emit('onModeChange', 'normal');
            } else {
                this.setMode('flow');
                this._emit('onModeChange', 'flow');
                setTimeout(() => {
                    if (!this._destroyed) {
                        this.play();
                    }
                }, 300);
            }
        }

        // ========================================
        // PRIVATE METHODS - RENDERING
        // ========================================

        updateStyles() {
            if (this._destroyed || !this.el || !this.el.content) return;
            
            if (this._pendingStyleUpdate) {
                cancelAnimationFrame(this._pendingStyleUpdate);
            }
            
            this._pendingStyleUpdate = requestAnimationFrame(() => {
                if (this._destroyed || !this.el || !this.el.content) return;
                
                const font = FONTS[this.state.font];
                
                this.el.content.style.fontFamily = font.family;
                this.el.content.style.fontSize = this.state.fontSize + 'px';
                this.el.content.style.lineHeight = this.state.lineHeight;
                
                if (this.state.mode === 'flow' && this.wordIndexManager) {
                    this.wordIndexManager.invalidate();
                    requestAnimationFrame(() => {
                        if (!this._destroyed && this.wordIndexManager) {
                            this._updateWordStates(this.state.flow.currentWordIndex);
                        }
                    });
                }
                
                this._pendingStyleUpdate = null;
            });
        }

        _render() {
            if (this._destroyed || !this.el || !this.el.content) return;
            
            if (this.wordIndexManager) {
                this.wordIndexManager.disconnectObserver();
            }
            
            this.el.content.classList.add('transitioning');
            
            let html = this.state.content;
            if (this.state.mode === 'flow') {
                html = this._makeFlow(html, this.state.bionic);
                if (!this.state.saved) {
                    this.state.flow.currentWordIndex = 0;
                }
            } else if (this.state.bionic) {
                html = this._makeBionic(html);
            }

            this.el.content.innerHTML = html;
            
            if (this.wordIndexManager) {
                this.wordIndexManager.invalidate();
            }

            setTimeout(() => {
                if (!this._destroyed && this.el && this.el.content) {
                    this.el.content.classList.remove('transitioning');
                    
                    const contentHeight = this.el.content.scrollHeight;
                    if (this.el.dragZoneL && this.el.dragZoneR) {
                        this.el.dragZoneL.style.height = contentHeight + 'px';
                        this.el.dragZoneR.style.height = contentHeight + 'px';
                    }
                    
                    const currentTheme = this.state.autoTheme 
                        ? (this.mediaQuery.matches ? 'dark' : 'light')
                        : this.state.theme;
                    this._applyTheme(currentTheme);
                }
            }, 200);

            if (this.state.mode === 'flow') {
                setTimeout(() => {
                    if (this._destroyed || !this.el || !this.el.content || !this.wordIndexManager) return;
                    
                    const wordNodes = this.el.content.querySelectorAll('.flow-word');
                    this.wordIndexManager.cacheNodes(wordNodes);
                    
                    this.wordIndexManager.setupObserver(this.el.reader);
                    this.wordIndexManager.observeWords(wordNodes);
                    
                    this._initialVisibilityCheck(wordNodes);
                    
                    this.wordIndexManager.rebuild();
                }, 50);
            }
        }

        _initialVisibilityCheck(wordNodes) {
            if (!this.el || !this.el.reader) return;
            
            const readerRect = this.el.reader.getBoundingClientRect();
            const buffer = 200;
            
            wordNodes.forEach((el, idx) => {
                const rect = el.getBoundingClientRect();
                const isVisible = (
                    rect.bottom >= readerRect.top - buffer &&
                    rect.top <= readerRect.bottom + buffer
                );
                
                if (isVisible && this.wordIndexManager) {
                    this.wordIndexManager.visibleIndices.add(idx);
                }
            });
        }

        _bionicWord(w) {
            if (w.length <= 2) return w;
            const n = Math.ceil(w.length / 2);
            return `<span class="bionic">${w.slice(0, n)}</span>${w.slice(n)}`;
        }

        _makeBionic(text) {
            // Create a temporary container to safely parse HTML
            const temp = document.createElement('div');
            temp.innerHTML = text;
            
            // Process only text nodes, leave HTML structure intact
            const processNode = (node) => {
                if (node.nodeType === 3) { // Text node
                    const text = node.textContent;
                    const processedText = text.replace(/\b(\w+)\b/g, this._bionicWord.bind(this));
                    
                    if (processedText !== text) {
                        const span = document.createElement('span');
                        span.innerHTML = processedText;
                        node.replaceWith(...span.childNodes);
                    }
                } else if (node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                    // Element node - process children
                    [...node.childNodes].forEach(processNode);
                }
            };
            
            [...temp.childNodes].forEach(processNode);
            return temp.innerHTML;
        }

        _makeFlow(html, useBionic) {
            const temp = document.createElement('div');
            temp.innerHTML = html;

            let wordIndex = 0;
            const wrap = text => text.replace(/(\S+)/g, word => {
                // Split hyphenated words into separate spans
                const parts = word.match(/[^-]+-?/g) || [word];
                
                return parts.map(part => {
                    let content = part;
                    if (useBionic && /\w{3,}/.test(part)) {
                        const match = part.match(/\w+/);
                        if (match) {
                            content = part.replace(match[0], this._bionicWord(match[0]));
                        }
                    }
                    const idx = wordIndex++;
                    return `<span class="flow-word inactive" data-word-index="${idx}">${content}</span>`;
                }).join('');
            });

            const process = node => {
                if (node.nodeType === 3) {
                    const t = document.createElement('span');
                    t.innerHTML = wrap(node.textContent);
                    node.replaceWith(...t.childNodes);
                } else if (node.nodeType === 1) {
                    [...node.childNodes].forEach(process);
                }
            };

            [...temp.childNodes].forEach(process);
            return temp.innerHTML;
        }

        // ========================================
        // PRIVATE METHODS - FLOW MODE
        // ========================================

        _updateWordStates(centerIndex) {
            if (this._destroyed || !this.wordIndexManager || !this.el || !this.el.content) return;
            
            const allWords = this.wordIndexManager.wordNodes || this.el.content.querySelectorAll('.flow-word');
            
            requestAnimationFrame(() => {
                if (this._destroyed) return;
                
                const focusWidth = this.state.flow.fingers;
                const range = this.wordIndexManager.getActiveRange(centerIndex, focusWidth);
                const centerIdx = Math.floor(centerIndex);
                
                const visibleIndices = this.wordIndexManager.observerEnabled 
                    ? this.wordIndexManager.visibleIndices 
                    : new Set(Array.from({length: allWords.length}, (_, i) => i));
                
                const indicesToUpdate = new Set(visibleIndices);
                for (let i = range.start; i <= range.end; i++) {
                    indicesToUpdate.add(i);
                }
                indicesToUpdate.add(centerIdx);
                
                const activeElements = [];
                
                indicesToUpdate.forEach(idx => {
                    const word = this.wordIndexManager.getWord(idx);
                    if (word && word.el) {
                        const isActive = idx >= range.start && idx <= range.end;
                        
                        if (isActive) {
                            word.el.classList.remove('inactive');
                            word.el.classList.add('active');
                            activeElements.push(word.el);
                        } else {
                            word.el.classList.remove('active');
                            word.el.classList.add('inactive');
                        }
                    }
                });

                if (this.state.mode !== 'flow' || activeElements.length === 0) {
                    this.el.focus.classList.remove('visible');
                    return;
                }

                const activeRects = activeElements.map(el => el.getBoundingClientRect());
                const byLine = {};
                activeRects.forEach(r => {
                    const k = Math.round(r.top);
                    (byLine[k] = byLine[k] || []).push(r);
                });

                const primary = Object.values(byLine).sort((a, b) => b.length - a.length)[0];
                if (!primary) {
                    this.el.focus.classList.remove('visible');
                    return;
                }

                const minL = Math.min(...primary.map(r => r.left));
                const maxR = Math.max(...primary.map(r => r.right));
                const minT = Math.min(...primary.map(r => r.top));
                const maxB = Math.max(...primary.map(r => r.bottom));

                const rr = this.el.reader.getBoundingClientRect();
                
                this.el.focus.style.cssText = `
                    left: ${minL - rr.left}px;
                    width: ${maxR - minL}px;
                    top: ${minT - rr.top + this.el.reader.scrollTop}px;
                    height: ${maxB - minT}px;
                `;
                this.el.focus.classList.add('visible');
            });
        }

        _scrollToWordIfNeeded(wordIndex) {
            if (this._destroyed || !this.wordIndexManager || this.state.flow.userScroll) return;
            if (!this.el || !this.el.reader) return;

            const currentIdx = Math.floor(wordIndex);
            const nextIdx = currentIdx + 1;
            const fraction = wordIndex - currentIdx;

            const currentWord = this.wordIndexManager.getWord(currentIdx);
            const nextWord = this.wordIndexManager.getWord(nextIdx);
            
            if (!currentWord) return;

            let wordTop = currentWord.el.getBoundingClientRect().top;
            if (nextWord && fraction > 0) {
                const nextTop = nextWord.el.getBoundingClientRect().top;
                wordTop = wordTop + (nextTop - wordTop) * fraction;
            }

            const readerRect = this.el.reader.getBoundingClientRect();
            const viewportHeight = readerRect.height;
            
            const comfortZoneTop = readerRect.top + (viewportHeight * this.config.scroll.comfortZoneTop);
            const comfortZoneBottom = readerRect.top + (viewportHeight * this.config.scroll.comfortZoneBottom);
            
            if (wordTop < comfortZoneTop || wordTop > comfortZoneBottom) {
                const targetRatio = this.config.scroll.gap + (this.state.flow.scrollLevel - 1) * 0.2;
                const targetY = readerRect.top + (viewportHeight * targetRatio);
                
                const scrollAdjustment = wordTop - targetY;
                const targetScroll = this.el.reader.scrollTop + scrollAdjustment;
                
                this.el.reader.scrollTo({
                    top: targetScroll,
                    behavior: 'smooth'
                });
            }
        }

        _animate() {
            const frame = (t) => {
                if (!this.state.flow.playing || this._destroyed || !this.wordIndexManager) return;

                if (this.state.flow.pauseUntil > 0) {
                    if (t < this.state.flow.pauseUntil) {
                        this.state.flow.rafId = requestAnimationFrame(frame);
                        return;
                    }
                    this.state.flow.startTime = t - (this.state.flow.currentWordIndex / (this.state.flow.speed / 60)) * 1000;
                    this.state.flow.pauseUntil = 0;
                }

                const elapsed = t - this.state.flow.startTime;
                const wordsPerSecond = this.state.flow.speed / 60;
                const wordIndex = (elapsed / 1000) * wordsPerSecond;

                this.state.flow.currentWordIndex = wordIndex;

                const totalWords = this.wordIndexManager.getTotalWords();
                if (wordIndex >= totalWords) {
                    // Chapter finished - try to load next chapter
                    if (window.EPUBHandler && typeof window.EPUBHandler.loadNextChapter === 'function') {
                        const hasNext = window.EPUBHandler.loadNextChapter();
                        if (hasNext) {
                            // Next chapter loading - wait for it to load, then auto-resume
                            this.state.flow.playing = false;
                            
                            // Set a flag to auto-resume after chapter loads
                            setTimeout(() => {
                                if (!this._destroyed && this.wordIndexManager) {
                                    this.state.flow.currentWordIndex = 0;
                                    this.state.flow.startTime = performance.now();
                                    this.state.flow.pauseUntil = 0;
                                    this.state.flow.lastPausedWord = -1;
                                    this.state.flow.playing = true;
                                    this._animate();
                                }
                            }, 500); // Give time for chapter to load
                            
                            return;
                        }
                    }
                    
                    // No next chapter or no EPUB handler - restart current chapter
                    this.state.flow.currentWordIndex = 0;
                    this.state.flow.startTime = t;
                    this.state.flow.pauseUntil = 0;
                    this.state.flow.lastPausedWord = -1;
                }

                const currentWordIdx = Math.floor(wordIndex);
                const currentWord = this.wordIndexManager.getWord(currentWordIdx);

                this._scrollToWordIfNeeded(wordIndex);
                this._updateWordStates(wordIndex);

                if (currentWord && currentWord.isNewline && 
                    this.state.flow.pauseUntil === 0 && 
                    this.state.flow.lastPausedWord !== currentWordIdx) {
                    const pauseDuration = (60000 / this.state.flow.speed) * this.config.newlinePause;
                    this.state.flow.pauseUntil = t + pauseDuration;
                    this.state.flow.lastPausedWord = currentWordIdx;
                }

                this.state.flow.rafId = requestAnimationFrame(frame);
            };

            this.state.flow.rafId = requestAnimationFrame(frame);
        }

        _togglePlay() {
            if (this._destroyed || !this.wordIndexManager) return;
            
            if (this.state.flow.playing) {
                cancelAnimationFrame(this.state.flow.rafId);
                this.state.flow.playing = false;
            } else {
                this.wordIndexManager.rebuild();
                const totalWords = this.wordIndexManager.getTotalWords();
                if (!totalWords) return;

                this.state.flow.playing = true;
                
                const wordsPerSecond = this.state.flow.speed / 60;
                this.state.flow.startTime = performance.now() - 
                    (this.state.flow.currentWordIndex / wordsPerSecond) * 1000;
                this.state.flow.pauseUntil = 0;
                this.state.flow.lastPausedWord = -1;
                
                this._animate();
            }
            this._emit('onPlayChange', this.state.flow.playing);
        }

        _jumpToWord(idx) {
            if (this._destroyed || !this.wordIndexManager) return;
            
            this.state.flow.currentWordIndex = idx;
            
            const word = this.wordIndexManager.getWord(idx);
            if (word && this.el && this.el.reader) {
                const rr = this.el.reader.getBoundingClientRect();
                const vhh = rr.height;
                const targetRatio = this.config.scroll.gap + (this.state.flow.scrollLevel - 1) * 0.2;
                const idealY = rr.top + (vhh * targetRatio);
                const wordTop = word.el.getBoundingClientRect().top;
                const diff = wordTop - idealY;
                
                this.el.reader.scrollTop = this.el.reader.scrollTop + diff;
            }
            
            if (!this.state.flow.playing) {
                this._updateWordStates(idx);
            } else {
                const wordsPerSecond = this.state.flow.speed / 60;
                this.state.flow.startTime = performance.now() - (idx / wordsPerSecond) * 1000;
                this.state.flow.pauseUntil = 0;
                this.state.flow.lastPausedWord = -1;
                this._updateWordStates(idx);
            }
        }

        _setMode(mode, preserve = false) {
            if (this._destroyed) return;
            
            const wasPlaying = this.state.flow.playing;
            
            if (this.state.mode === 'flow' && mode !== 'flow') {
                this.state.saved = {
                    wordIndex: this.state.flow.currentWordIndex,
                    playing: wasPlaying
                };
            }

            this.state.mode = mode;
            
            // Add/remove flow-mode class to prevent text selection
            if (this.el && this.el.content) {
                if (mode === 'flow') {
                    this.el.content.classList.add('flow-mode');
                } else {
                    this.el.content.classList.remove('flow-mode');
                }
            }
            
            if (this.state.flow.playing) this._togglePlay();

            this._render();

            if (mode === 'flow' && this.state.saved && preserve) {
                setTimeout(() => {
                    if (this._destroyed || !this.wordIndexManager) return;
                    
                    this.state.flow.currentWordIndex = this.state.saved.wordIndex || 0;
                    this._updateWordStates(this.state.flow.currentWordIndex);
                    if (this.state.saved.playing) {
                        setTimeout(() => {
                            if (!this._destroyed && this.wordIndexManager) this._togglePlay();
                        }, 100);
                    }
                }, 100);
            } else if (mode === 'flow') {
                setTimeout(() => {
                    if (!this._destroyed && this.wordIndexManager) {
                        this._updateWordStates(this.state.flow.currentWordIndex);
                    }
                }, 100);
            }

            if (mode !== 'flow') {
                this.el.focus.classList.remove('visible');
            }
        }

        _toggleBionic() {
            if (this._destroyed) return;
            
            const wasPlaying = this.state.flow.playing;
            const savedIdx = this.state.flow.currentWordIndex;
            
            this.state.bionic = !this.state.bionic;
            
            if (wasPlaying) this._togglePlay();
            
            this._render();
            
            if (this.state.mode === 'flow') {
                setTimeout(() => {
                    if (this._destroyed || !this.wordIndexManager) return;
                    
                    this.state.flow.currentWordIndex = savedIdx;
                    this._updateWordStates(savedIdx);
                    if (wasPlaying) {
                        setTimeout(() => {
                            if (!this._destroyed && this.wordIndexManager) this._togglePlay();
                        }, 100);
                    }
                }, 100);
            }
        }

        // ========================================
        // PRIVATE METHODS - GESTURE HANDLING
        // ========================================

        _handleTouchStart(e) {
            if (this.state.gesture.dragging) return;
            this.state.gesture.touches = [...e.touches];
            
            if (e.touches.length === 2) {
                e.preventDefault();
                this.state.gesture.initDist = this._dist(e.touches[0], e.touches[1]);
                this.state.gesture.initSize = this.state.fontSize;
            }
        }

        _handleTouchMove(e) {
            if (this.state.gesture.dragging || e.touches.length !== 2) return;
            e.preventDefault();

            const curDist = this._dist(e.touches[0], e.touches[1]);
            const distChange = Math.abs(curDist - this.state.gesture.initDist);

            const mid1 = {
                x: (this.state.gesture.touches[0].clientX + this.state.gesture.touches[1].clientX) / 2,
                y: (this.state.gesture.touches[0].clientY + this.state.gesture.touches[1].clientY) / 2
            };
            const mid2 = {
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2
            };
            const midDelta = {
                x: Math.abs(mid2.x - mid1.x),
                y: Math.abs(mid2.y - mid1.y)
            };

            if (distChange > 10 && distChange > midDelta.x && distChange > midDelta.y) {
                const scale = curDist / this.state.gesture.initDist;
                this.state.fontSize = this._clamp(
                    this.state.gesture.initSize * scale,
                    this.config.fontSize.min,
                    this.config.fontSize.max
                );
                this.updateStyles();
            }
        }

        _handleWheel(e) {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                this.state.fontSize = this._clamp(
                    this.state.fontSize - e.deltaY * 0.1,
                    this.config.fontSize.min,
                    this.config.fontSize.max
                );
                this.updateStyles();
            }
        }

        _handleScroll() {
            this.state.flow.userScroll = true;
            clearTimeout(this._scrollTimeout);
            this._scrollTimeout = setTimeout(() => {
                this.state.flow.userScroll = false;
            }, this.config.scroll.timeout);
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