/**
 * EBook Reader Core Utilities v2.4.0
 * Error classes, constants, managers, and utilities
 * 
 * @license MIT
 * @version 2.4.0
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
// CONSTANTS
// ============================================================================

const LINE_BREAK_THRESHOLD = 5; // pixels

// ============================================================================
// WORD INDEX MANAGER (with IntersectionObserver)
// ============================================================================

class WordIndexManager {
    constructor() {
        this.words = [];
        this.wordNodes = null;
        this.dirty = true;
        this.visibleIndices = new Set();
        this.observer = null;
        this.observerEnabled = false;
    }

    setupObserver(readerElement) {
        // Clean up existing observer
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const idx = parseInt(entry.target.dataset.wordIndex);
                if (!isNaN(idx)) {
                    if (entry.isIntersecting) {
                        this.visibleIndices.add(idx);
                    } else {
                        this.visibleIndices.delete(idx);
                    }
                }
            });
        }, {
            root: readerElement,
            rootMargin: '200px',
            threshold: 0
        });

        this.observerEnabled = true;
    }

    observeWords(wordElements) {
        if (!this.observer || !this.observerEnabled) return;

        wordElements.forEach(el => {
            this.observer.observe(el);
        });
    }

    disconnectObserver() {
        if (this.observer) {
            this.observer.disconnect();
            this.visibleIndices.clear();
        }
    }

    enableObserver() {
        this.observerEnabled = true;
    }

    disableObserver() {
        this.observerEnabled = false;
    }

    rebuild() {
        try {
            this.words = [];
            
            const wordElements = this.wordNodes || document.querySelectorAll('.flow-word');
            
            if (!wordElements.length) {
                this.dirty = false;
                return;
            }

            const rects = [];
            wordElements.forEach(el => {
                rects.push(el.getBoundingClientRect());
            });

            let prevTop = -1;
            wordElements.forEach((el, idx) => {
                const rect = rects[idx];
                const isNewline = prevTop !== -1 && rect.top > prevTop + LINE_BREAK_THRESHOLD;
                
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
               Math.abs(this.words[start].rect.top - centerTop) > LINE_BREAK_THRESHOLD) {
            start++;
        }
        
        while (end > centerIdx && this.words[end] && 
               Math.abs(this.words[end].rect.top - centerTop) > LINE_BREAK_THRESHOLD) {
            end--;
        }

        return { start, end };
    }

    getTotalWords() {
        if (this.dirty) this.rebuild();
        return this.words.length;
    }

    isVisible(index) {
        return this.visibleIndices.has(index);
    }

    invalidate() {
        this.dirty = true;
        this.wordNodes = null;
    }

    cacheNodes(nodes) {
        this.wordNodes = nodes;
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
        this.fontsReady = null;
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
                    if (!this.fontsReady) {
                        this.fontsReady = document.fonts.ready;
                    }
                    await this.fontsReady;
                    await new Promise(r => setTimeout(r, 50));
                    
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
// EXPOSE UTILITIES
// ============================================================================

window.EBookReaderCore = {
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
};