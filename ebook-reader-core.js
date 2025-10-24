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
// FONT REGISTRY - MOVED TO config/fonts.js
// ============================================================================

// STEP 17E: FONTS now loaded from config/fonts.js
// Import FONTS from window.FONTS (loaded by config/fonts.js)
const FONTS = window.FONTS || {};

// ============================================================================
// THEME SYSTEM - MOVED TO config/themes.js
// ============================================================================

// STEP 17E: THEMES now loaded from config/themes.js
// Import THEMES from window.THEMES (loaded by config/themes.js)
const THEMES = window.THEMES || {};

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
            this.observer = null;  // ADD THIS LINE - fully release the observer
        }
        this.observerEnabled = false;
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

        const loadPromise = font.source === 'cdn' 
            ? this._loadCDNFont(fontKey, font)
            : this._loadGoogleFont(fontKey, font);
            
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

    async _loadCDNFont(fontKey, font) {
        return new Promise((resolve, reject) => {
            // Check if font face already exists
            const existingStyle = document.querySelector(`style[data-font="${fontKey}"]`);
            if (existingStyle) {
                resolve();
                return;
            }

            // Create @font-face style with correct jsDelivr URLs
            const style = document.createElement('style');
            style.setAttribute('data-font', fontKey);
            style.textContent = `
                @font-face {
                    font-family: 'OpenDyslexic';
                    src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Regular.woff') format('woff');
                    font-weight: 400;
                    font-style: normal;
                }
                @font-face {
                    font-family: 'OpenDyslexic';
                    src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Bold.woff') format('woff');
                    font-weight: 700;
                    font-style: normal;
                }
            `;

            const timeout = setTimeout(() => {
                reject(new Error('Font load timeout'));
            }, 5000);

            this.fontTimeouts.set(fontKey, timeout);

            // Append style and wait for fonts to load
            document.head.appendChild(style);
            
            // Wait for font to be ready
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => {
                    setTimeout(() => {
                        clearTimeout(timeout);
                        this.fontTimeouts.delete(fontKey);
                        resolve();
                    }, 100);
                }).catch(error => {
                    clearTimeout(timeout);
                    this.fontTimeouts.delete(fontKey);
                    reject(error);
                });
            } else {
                // Fallback if document.fonts not supported
                setTimeout(() => {
                    clearTimeout(timeout);
                    this.fontTimeouts.delete(fontKey);
                    resolve();
                }, 500);
            }
        });
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