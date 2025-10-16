/**
 * EBookReader Core Library v2.2.1
 * Pure reading functionality with modern theming and fonts
 * 
 * @license MIT
 * @version 2.2.1
 */

// ============================================================================
// ERROR CLASSES
// ============================================================================

class EBookReaderError extends Error {
    constructor(message) {
        super(message);
        this.name = 'EBookReaderError';
    }
}

class ConfigurationError extends EBookReaderError {
    constructor(message) {
        super(message);
        this.name = 'ConfigurationError';
    }
}

class ContentError extends EBookReaderError {
    constructor(message) {
        super(message);
        this.name = 'ContentError';
    }
}

class StateError extends EBookReaderError {
    constructor(message) {
        super(message);
        this.name = 'StateError';
    }
}

class FontError extends EBookReaderError {
    constructor(message) {
        super(message);
        this.name = 'FontError';
    }
}

// ============================================================================
// FONT REGISTRY
// ============================================================================

const FONTS = {
    // SERIF
    georgia: {
        name: 'Georgia',
        family: 'Georgia, serif',
        category: 'serif',
        lineHeight: 1.7,
        source: 'system',
        weights: [400, 700]
    },
    merriweather: {
        name: 'Merriweather',
        family: "'Merriweather', serif",
        category: 'serif',
        lineHeight: 1.8,
        source: 'google',
        googleFont: 'Merriweather:wght@400;700',
        weights: [400, 700]
    },
    lora: {
        name: 'Lora',
        family: "'Lora', serif",
        category: 'serif',
        lineHeight: 1.75,
        source: 'google',
        googleFont: 'Lora:wght@400;700',
        weights: [400, 700]
    },
    crimson: {
        name: 'Crimson Pro',
        family: "'Crimson Pro', serif",
        category: 'serif',
        lineHeight: 1.7,
        source: 'google',
        googleFont: 'Crimson+Pro:wght@400;700',
        weights: [400, 700]
    },
    baskerville: {
        name: 'Libre Baskerville',
        family: "'Libre Baskerville', serif",
        category: 'serif',
        lineHeight: 1.8,
        source: 'google',
        googleFont: 'Libre+Baskerville:wght@400;700',
        weights: [400, 700]
    },
    
    // SANS SERIF
    inter: {
        name: 'Inter',
        family: "'Inter', sans-serif",
        category: 'sans',
        lineHeight: 1.6,
        source: 'google',
        googleFont: 'Inter:wght@400;700',
        weights: [400, 700]
    },
    opensans: {
        name: 'Open Sans',
        family: "'Open Sans', sans-serif",
        category: 'sans',
        lineHeight: 1.65,
        source: 'google',
        googleFont: 'Open+Sans:wght@400;700',
        weights: [400, 700]
    },
    sourcesans: {
        name: 'Source Sans 3',
        family: "'Source Sans 3', sans-serif",
        category: 'sans',
        lineHeight: 1.6,
        source: 'google',
        googleFont: 'Source+Sans+3:wght@400;700',
        weights: [400, 700]
    },
    nunito: {
        name: 'Nunito Sans',
        family: "'Nunito Sans', sans-serif",
        category: 'sans',
        lineHeight: 1.65,
        source: 'google',
        googleFont: 'Nunito+Sans:wght@400;700',
        weights: [400, 700]
    },
    
    // MONOSPACE
    jetbrains: {
        name: 'JetBrains Mono',
        family: "'JetBrains Mono', monospace",
        category: 'mono',
        lineHeight: 1.7,
        source: 'google',
        googleFont: 'JetBrains+Mono:wght@400;700',
        weights: [400, 700]
    },
    fira: {
        name: 'Fira Mono',
        family: "'Fira Mono', monospace",
        category: 'mono',
        lineHeight: 1.7,
        source: 'google',
        googleFont: 'Fira+Mono:wght@400;700',
        weights: [400, 700]
    },
    
    // SLAB
    robotoslab: {
        name: 'Roboto Slab',
        family: "'Roboto Slab', serif",
        category: 'slab',
        lineHeight: 1.7,
        source: 'google',
        googleFont: 'Roboto+Slab:wght@400;700',
        weights: [400, 700]
    }
};

// ============================================================================
// THEME SYSTEM
// ============================================================================

const THEMES = {
    light: {
        name: 'Light',
        background: '#F5F5F5',
        contentBg: '#FFFFFF',
        text: '#1A1A1A',
        textSecondary: '#666666',
        accent: '#3B82F6',
        accentHover: '#2563EB',
        border: '#E5E7EB',
        shadow: 'rgba(0, 0, 0, 0.1)',
        dragZone: 'rgba(59, 130, 246, 0.08)',
        dragZoneBorder: 'rgba(59, 130, 246, 0.2)',
        dragZoneActive: 'rgba(59, 130, 246, 0.15)',
        dragZoneActiveBorder: 'rgba(59, 130, 246, 0.4)',
        focusIndicator: 'rgba(59, 130, 246, 0.12)',
        bionic: '#000000',
        dropdownBg: '#FFFFFF',
        dropdownText: '#1A1A1A',
        dropdownBorder: '#E5E7EB',
        dropdownHover: '#F5F5F5',
        dropdownCategoryText: '#666666'
    },
    dark: {
        name: 'Dark',
        background: '#0F0F0F',
        contentBg: '#1A1A1A',
        text: '#E8E8E8',
        textSecondary: '#A0A0A0',
        accent: '#60A5FA',
        accentHover: '#3B82F6',
        border: '#2A2A2A',
        shadow: 'rgba(0, 0, 0, 0.5)',
        dragZone: 'rgba(96, 165, 250, 0.1)',
        dragZoneBorder: 'rgba(96, 165, 250, 0.25)',
        dragZoneActive: 'rgba(96, 165, 250, 0.18)',
        dragZoneActiveBorder: 'rgba(96, 165, 250, 0.5)',
        focusIndicator: 'rgba(96, 165, 250, 0.15)',
        bionic: '#FFFFFF',
        dropdownBg: '#1A1A1A',
        dropdownText: '#E8E8E8',
        dropdownBorder: '#2A2A2A',
        dropdownHover: '#2A2A2A',
        dropdownCategoryText: '#A0A0A0'
    },
    sepia: {
        name: 'Sepia',
        background: '#E8D7C3',
        contentBg: '#FBF4E9',
        text: '#3D2E1F',
        textSecondary: '#5C4B37',
        accent: '#B8860B',
        accentHover: '#8B6914',
        border: '#D4C4B0',
        shadow: 'rgba(61, 46, 31, 0.15)',
        dragZone: 'rgba(184, 134, 11, 0.08)',
        dragZoneBorder: 'rgba(184, 134, 11, 0.2)',
        dragZoneActive: 'rgba(184, 134, 11, 0.15)',
        dragZoneActiveBorder: 'rgba(184, 134, 11, 0.4)',
        focusIndicator: 'rgba(184, 134, 11, 0.12)',
        bionic: '#1A1410',
        dropdownBg: '#FBF4E9',
        dropdownText: '#3D2E1F',
        dropdownBorder: '#D4C4B0',
        dropdownHover: '#F0E6D8',
        dropdownCategoryText: '#5C4B37'
    },
    gray: {
        name: 'Gray',
        background: '#C8C8C8',
        contentBg: '#E8E8E8',
        text: '#2C2C2C',
        textSecondary: '#666666',
        accent: '#6B7280',
        accentHover: '#4B5563',
        border: '#B8B8B8',
        shadow: 'rgba(0, 0, 0, 0.12)',
        dragZone: 'rgba(107, 114, 128, 0.08)',
        dragZoneBorder: 'rgba(107, 114, 128, 0.2)',
        dragZoneActive: 'rgba(107, 114, 128, 0.15)',
        dragZoneActiveBorder: 'rgba(107, 114, 128, 0.4)',
        focusIndicator: 'rgba(107, 114, 128, 0.12)',
        bionic: '#000000',
        dropdownBg: '#E8E8E8',
        dropdownText: '#2C2C2C',
        dropdownBorder: '#B8B8B8',
        dropdownHover: '#D8D8D8',
        dropdownCategoryText: '#666666'
    }
};

// ============================================================================
// WORD INDEX MANAGER
// ============================================================================

class WordIndexManager {
    constructor() {
        this.words = [];
        this.dirty = true;
    }

    rebuild() {
        try {
            this.words = [];
            const wordElements = document.querySelectorAll('.flow-word');
            
            if (!wordElements.length) {
                this.dirty = false;
                return;
            }

            let prevTop = -1;
            wordElements.forEach((el, idx) => {
                const rect = el.getBoundingClientRect();
                const isNewline = prevTop !== -1 && rect.top > prevTop + 5;
                
                this.words.push({
                    el,
                    rect: {
                        left: rect.left,
                        right: rect.right,
                        top: rect.top,
                        bottom: rect.bottom,
                        width: rect.width,
                        height: rect.height
                    },
                    isNewline,
                    text: el.textContent,
                    index: idx
                });
                
                prevTop = rect.top;
            });
            
            this.dirty = false;
        } catch (error) {
            throw new StateError(`Failed to rebuild word index: ${error.message}`);
        }
    }

    getWord(index) {
        if (typeof index !== 'number' || isNaN(index)) {
            throw new TypeError('Word index must be a valid number');
        }
        
        if (this.dirty) this.rebuild();
        const idx = Math.floor(index);
        return this.words[idx] || null;
    }

    getActiveRange(centerIndex, focusWidth) {
        if (typeof centerIndex !== 'number' || isNaN(centerIndex)) {
            throw new TypeError('Center index must be a valid number');
        }
        if (typeof focusWidth !== 'number' || focusWidth <= 0) {
            throw new TypeError('Focus width must be a positive number');
        }
        
        if (this.dirty) this.rebuild();
        
        const centerIdx = Math.floor(centerIndex);
        const centerWord = this.words[centerIdx];
        
        if (!centerWord) return { start: 0, end: 0 };

        const centerTop = centerWord.rect.top;
        const halfWidth = focusWidth / 2;
        
        let start = Math.max(0, Math.round(centerIndex - halfWidth));
        let end = Math.min(this.words.length - 1, Math.round(centerIndex + halfWidth));

        while (start < centerIdx && this.words[start] && 
               Math.abs(this.words[start].rect.top - centerTop) > 5) {
            start++;
        }
        
        while (end > centerIdx && this.words[end] && 
               Math.abs(this.words[end].rect.top - centerTop) > 5) {
            end--;
        }

        return { start, end };
    }

    getTotalWords() {
        if (this.dirty) this.rebuild();
        return this.words.length;
    }

    invalidate() {
        this.dirty = true;
    }
}

// ============================================================================
// FONT LOADER
// ============================================================================

class FontLoader {
    constructor() {
        this.loadedFonts = new Set();
        this.loadingFonts = new Map();
        this.fontTimeouts = new Map();
    }

    async loadFont(fontKey) {
        const font = FONTS[fontKey];
        
        if (!font) {
            throw new FontError(`Font not found: ${fontKey}`);
        }

        if (font.source === 'system') {
            this.loadedFonts.add(fontKey);
            return true;
        }

        if (this.loadedFonts.has(fontKey)) {
            return true;
        }

        if (this.loadingFonts.has(fontKey)) {
            return this.loadingFonts.get(fontKey);
        }

        const loadPromise = this._loadGoogleFont(fontKey, font);
        this.loadingFonts.set(fontKey, loadPromise);

        try {
            await loadPromise;
            this.loadedFonts.add(fontKey);
            this.loadingFonts.delete(fontKey);
            return true;
        } catch (error) {
            this.loadingFonts.delete(fontKey);
            throw new FontError(`Failed to load font ${font.name}: ${error.message}`);
        }
    }

    async _loadGoogleFont(fontKey, font) {
        return new Promise((resolve, reject) => {
            const existingLink = document.querySelector(`link[data-font="${fontKey}"]`);
            if (existingLink) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${font.googleFont}&display=swap`;
            link.setAttribute('data-font', fontKey);

            const timeout = setTimeout(() => {
                reject(new Error('Font load timeout'));
            }, 5000);

            this.fontTimeouts.set(fontKey, timeout);

            link.onload = async () => {
                try {
                    await document.fonts.ready;
                    await new Promise(r => setTimeout(r, 100));
                    
                    clearTimeout(timeout);
                    this.fontTimeouts.delete(fontKey);
                    resolve();
                } catch (error) {
                    clearTimeout(timeout);
                    this.fontTimeouts.delete(fontKey);
                    reject(error);
                }
            };

            link.onerror = () => {
                clearTimeout(timeout);
                this.fontTimeouts.delete(fontKey);
                reject(new Error('Failed to load font stylesheet'));
            };

            document.head.appendChild(link);
        });
    }

    isLoaded(fontKey) {
        return this.loadedFonts.has(fontKey);
    }

    isLoading(fontKey) {
        return this.loadingFonts.has(fontKey);
    }
}

// ============================================================================
// CORE EBOOK READER CLASS
// ============================================================================

class EBookReader {
    static VERSION = '2.2.1';

    constructor(containerSelector, options = {}) {
        try {
            this._validateConstructorArgs(containerSelector, options);
            
            this.config = {
                fontSize: { min: 12, default: 18, max: 48 },
                margin: { min: 10, default: 60, max: 400 },
                speed: { min: 100, default: 300, max: 600 },
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
                font: 'georgia',
                lineHeight: FONTS.georgia.lineHeight,
                fontLoading: false,
                marginL: this._validateOption(options.margin, this.config.margin, 'margin'),
                marginR: this._validateOption(options.margin, this.config.margin, 'margin'),
                marginTB: 40,
                mode: 'normal',
                bionic: false,
                theme: 'light',
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
                    initSize: 0,
                    dragging: false,
                    side: null,
                    initMargin: 0,
                    initX: 0
                },
                saved: null
            };

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
            
            this._resizeHandler = () => this.updateStyles();
            this._scrollHandler = () => this._handleScroll();
            this._systemThemeHandler = (e) => this._handleSystemThemeChange(e);
            
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
                        this._updateWordStates(this.state.flow.currentWordIndex);
                    }
                }, 150);
            }
        } catch (error) {
            this.state.fontLoading = false;
            
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
            slab: []
        };

        fonts.forEach(font => {
            if (grouped[font.category]) {
                grouped[font.category].push(font);
            }
        });

        return grouped;
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

    _elastic(v, min, max) {
        return v < min ? min - Math.sqrt(min - v) * 2 :
               v > max ? max + Math.sqrt(v - max) * 2 : v;
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
            this.container.style.setProperty('--theme-drag-zone', theme.dragZone);
            this.container.style.setProperty('--theme-drag-zone-border', theme.dragZoneBorder);
            this.container.style.setProperty('--theme-drag-zone-active', theme.dragZoneActive);
            this.container.style.setProperty('--theme-drag-zone-active-border', theme.dragZoneActiveBorder);
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
            }
            .ebook-reader-area {
                position: relative;
                background: #fff;
                box-shadow: 0 4px 20px rgba(0,0,0,.1);
                overflow-y: auto;
                transition: all .3s ease;
                max-height: 85vh;
            }
            .ebook-drag-zone {
                position: absolute;
                top: 0;
                height: 100%;
                cursor: ew-resize;
                z-index: 100;
                transition: background .2s, border-color .2s;
                border: 1px dashed transparent;
                pointer-events: auto;
            }
            .ebook-drag-zone-left {
                left: 0;
            }
            .ebook-drag-zone-right {
                right: 0;
            }
            .ebook-drag-zone:hover {
                background: var(--theme-drag-zone, rgba(59, 130, 246, 0.08));
                border-color: var(--theme-drag-zone-border, rgba(59, 130, 246, 0.2));
            }
            .ebook-drag-zone.active {
                background: var(--theme-drag-zone-active, rgba(59, 130, 246, 0.15));
                border-color: var(--theme-drag-zone-active-border, rgba(59, 130, 246, 0.4));
            }
            .ebook-text-content {
                transition: padding .1s ease-out, opacity .2s ease-in-out, color .3s ease, font-family .2s ease;
                position: relative;
                min-height: 100%;
            }
            .ebook-text-content.transitioning { opacity: .4; }
            .bionic { 
                font-weight: 700;
                transition: color 0.3s ease;
            }
            .flow-word {
                font-weight: 400;
                cursor: pointer;
                display: inline;
                position: relative;
                transition: opacity 0.2s ease;
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
                <div class="ebook-drag-zone ebook-drag-zone-left" style="width: 60px;"></div>
                <div class="ebook-drag-zone ebook-drag-zone-right" style="width: 60px;"></div>
                <div class="ebook-focus-indicator"></div>
                <div class="ebook-text-content"></div>
            </div>
        `;

        this.container.innerHTML = html;

        this.el = {
            reader: this.container.querySelector('.ebook-reader-area'),
            content: this.container.querySelector('.ebook-text-content'),
            dragZoneL: this.container.querySelector('.ebook-drag-zone-left'),
            dragZoneR: this.container.querySelector('.ebook-drag-zone-right'),
            focus: this.container.querySelector('.ebook-focus-indicator')
        };
    }

    _attachEventListeners() {
        ['mousedown', 'touchstart'].forEach(evt => {
            this.el.dragZoneL.addEventListener(evt, e => this._startMarginDrag(e, 'left'));
            this.el.dragZoneR.addEventListener(evt, e => this._startMarginDrag(e, 'right'));
        });

        ['mousemove', 'touchmove'].forEach(evt => {
            document.addEventListener(evt, e => this._handleMarginDrag(e));
        });

        ['mouseup', 'touchend'].forEach(evt => {
            document.addEventListener(evt, () => this._stopMarginDrag());
        });

        this.el.reader.addEventListener('touchstart', e => this._handleTouchStart(e));
        this.el.reader.addEventListener('touchmove', e => this._handleTouchMove(e));
        this.el.reader.addEventListener('wheel', e => this._handleWheel(e));
        this.el.reader.addEventListener('scroll', this._scrollHandler);

        window.addEventListener('resize', this._resizeHandler);
    }

    // ========================================
    // PRIVATE METHODS - RENDERING
    // ========================================

    updateStyles() {
        if (this._destroyed || !this.el || !this.el.content) return;
        
        const font = FONTS[this.state.font];
        
        this.el.content.style.cssText = `
            font-family: ${font.family};
            font-size: ${this.state.fontSize}px;
            line-height: ${this.state.lineHeight};
            padding: ${this.state.marginTB}px ${this.state.marginR}px ${this.state.marginTB}px ${this.state.marginL}px;
            color: inherit;
            transition: padding .1s ease-out, opacity .2s ease-in-out, color .3s ease, font-family .2s ease;
        `;

        const leftWidth = Math.max(60, this.state.marginL);
        const rightWidth = Math.max(60, this.state.marginR);
        const contentHeight = this.el.content.scrollHeight;
        
        this.el.dragZoneL.style.width = leftWidth + 'px';
        this.el.dragZoneL.style.height = contentHeight + 'px';
        
        this.el.dragZoneR.style.width = rightWidth + 'px';
        this.el.dragZoneR.style.height = contentHeight + 'px';

        if (this.state.mode === 'flow' && this.wordIndexManager) {
            this.wordIndexManager.invalidate();
            requestAnimationFrame(() => {
                if (!this._destroyed && this.wordIndexManager) {
                    this._updateWordStates(this.state.flow.currentWordIndex);
                }
            });
        }
    }

    _render() {
        if (this._destroyed || !this.el || !this.el.content) return;
        
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
                
                this.el.content.querySelectorAll('.flow-word').forEach((w, idx) => {
                    w.addEventListener('click', () => {
                        if (this.state.mode === 'flow' && !this._destroyed) this._jumpToWord(idx);
                    });
                });
                
                this.wordIndexManager.rebuild();
            }, 50);
        }
    }

    _bionicWord(w) {
        if (w.length <= 2) return w;
        const n = Math.ceil(w.length / 2);
        return `<span class="bionic">${w.slice(0, n)}</span>${w.slice(n)}`;
    }

    _makeBionic(text) {
        return text.replace(/\b(\w+)\b/g, this._bionicWord.bind(this));
    }

    _makeFlow(html, useBionic) {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        const wrap = text => text.replace(/(\S+)/g, word => {
            const parts = word.match(/[^-]+-?/g) || [word];
            
            return parts.map(part => {
                let content = part;
                if (useBionic && /\w{3,}/.test(part)) {
                    const match = part.match(/\w+/);
                    if (match) {
                        content = part.replace(match[0], this._bionicWord(match[0]));
                    }
                }
                return `<span class="flow-word inactive">${content}</span>`;
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
        
        this.el.content.querySelectorAll('.flow-word').forEach(w => {
            w.className = 'flow-word inactive';
        });

        const focusWidth = this.state.flow.fingers;
        const range = this.wordIndexManager.getActiveRange(centerIndex, focusWidth);
        
        const activeElements = [];
        for (let i = range.start; i <= range.end; i++) {
            const word = this.wordIndexManager.getWord(i);
            if (word && word.el) {
                word.el.classList.remove('inactive');
                word.el.classList.add('active');
                activeElements.push(word.el);
            }
        }

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

    _startMarginDrag(e, side) {
        e.preventDefault();
        this.state.gesture.dragging = true;
        this.state.gesture.side = side;
        
        const zone = side === 'left' ? this.el.dragZoneL : this.el.dragZoneR;
        zone.classList.add('active');

        const x = e.touches?.[0]?.clientX || e.clientX;
        this.state.gesture.initX = x;
        this.state.gesture.initMargin = side === 'left' ? this.state.marginL : this.state.marginR;
    }

    _handleMarginDrag(e) {
        if (!this.state.gesture.dragging) return;

        const x = e.touches?.[0]?.clientX || e.clientX;
        const delta = x - this.state.gesture.initX;
        
        let val = this.state.gesture.initMargin + 
            (this.state.gesture.side === 'left' ? delta : -delta);
        val = this._elastic(val, this.config.margin.min, this.config.margin.max);

        const contentHeight = this.el.content.scrollHeight;

        if (this.state.gesture.side === 'left') {
            this.state.marginL = val;
            this.el.dragZoneL.style.width = Math.max(60, val) + 'px';
            this.el.dragZoneL.style.height = contentHeight + 'px';
        } else {
            this.state.marginR = val;
            this.el.dragZoneR.style.width = Math.max(60, val) + 'px';
            this.el.dragZoneR.style.height = contentHeight + 'px';
        }
        
        this.updateStyles();
    }

    _stopMarginDrag() {
        if (this.state.gesture.dragging) {
            const zone = this.state.gesture.side === 'left' ? this.el.dragZoneL : this.el.dragZoneR;
            if (zone) zone.classList.remove('active');
            
            const isLeft = this.state.gesture.side === 'left';
            const cur = isLeft ? this.state.marginL : this.state.marginR;
            const final = this._clamp(cur, this.config.margin.min, this.config.margin.max);
            const contentHeight = this.el.content.scrollHeight;
            
            if (isLeft) {
                this.state.marginL = final;
                this.el.dragZoneL.style.width = Math.max(60, final) + 'px';
                this.el.dragZoneL.style.height = contentHeight + 'px';
            } else {
                this.state.marginR = final;
                this.el.dragZoneR.style.width = Math.max(60, final) + 'px';
                this.el.dragZoneR.style.height = contentHeight + 'px';
            }
            
            this.updateStyles();
        }
        
        this.state.gesture.dragging = false;
        this.state.gesture.side = null;
    }

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