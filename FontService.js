/**
 * FontService v2.0.0
 * Service for managing font loading and application
 *
 * REFACTORED: Now uses dependency injection for DOM operations
 *
 * @license MIT
 * @version 2.0.0
 */

class FontService {
    constructor(stateManager, contentElement, reader, options = {}) {
        this.stateManager = stateManager;
        this.contentElement = contentElement;
        this.reader = reader;
        this.loadedFonts = new Set();
        this.loadingFonts = new Map();
        this.fontTimeouts = new Map();
        this.fontsReady = null;

        // ✅ NEW: Dependency injection for DOM operations
        // Consumers can provide custom implementations for testing or different environments
        this.injectStyleElement = options.injectStyleElement || this._defaultInjectStyleElement.bind(this);
        this.queryStyleElement = options.queryStyleElement || this._defaultQueryStyleElement.bind(this);

        // STEP 10C: Subscribe to font changes and auto-load + apply
        if (this.stateManager) {
            this.stateManager.subscribe('font', async (fontKey) => {
                await this.loadFont(fontKey);
                this.applyFont(fontKey);
            });
        }

        console.log('FontService v2.0.0 initialized (dependency injection)');
    }

    // ========================================
    // DEFAULT IMPLEMENTATIONS (Backwards Compatible)
    // ========================================

    /**
     * Default style element injection (appends to document.head)
     * ✅ Can be overridden via constructor options
     * @private
     */
    _defaultInjectStyleElement(element) {
        if (document && document.head) {
            document.head.appendChild(element);
        }
    }

    /**
     * Default style element query (queries document)
     * ✅ Can be overridden via constructor options
     * @private
     */
    _defaultQueryStyleElement(selector) {
        if (document) {
            return document.querySelector(selector);
        }
        return null;
    }
    
    /**
     * Apply font to content element
     * @param {string} fontKey - Font key from FONTS registry
     */
    applyFont(fontKey) {
        if (!this.contentElement) return;
        
        const FONTS = window.EBookReaderCore?.FONTS || {};
        const font = FONTS[fontKey];
        
        if (!font) return;
        
        this.contentElement.style.fontFamily = font.family;
        
        // Update line height in StateManager
        if (this.stateManager) {
            this.stateManager.set('lineHeight', font.lineHeight, true);
        }

        //
        // --- ADD THIS BLOCK ---
        //
        // Tell the reader to invalidate its index *after* the font has
        // actually been applied, preventing the race condition.
        if (this.reader && this.reader.updateLayout) {
            this.reader.updateLayout();
        }
        // --- END OF BLOCK ---
    }

    /**
     * Load a font by key
     * @param {string} fontKey - Font key from FONTS registry
     * @returns {Promise<boolean>}
     */
    async loadFont(fontKey) {
        // Get FONTS from global scope (imported from ebook-reader-core.js)
        const FONTS = window.EBookReaderCore?.FONTS || {};
        const font = FONTS[fontKey];
        
        if (!font) {
            throw new Error(`Font not found: ${fontKey}`);
        }

        // System fonts don't need loading
        if (font.source === 'system') {
            this.loadedFonts.add(fontKey);
            return true;
        }

        // Already loaded
        if (this.loadedFonts.has(fontKey)) {
            return true;
        }

        // Currently loading - return existing promise
        if (this.loadingFonts.has(fontKey)) {
            return this.loadingFonts.get(fontKey);
        }

        // Start loading
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
            throw new Error(`Failed to load font ${font.name}: ${error.message}`);
        }
    }

    /**
     * Load a CDN-hosted font (e.g., OpenDyslexic)
     * @private
     */
    async _loadCDNFont(fontKey, font) {
        return new Promise((resolve, reject) => {
            // ✅ Use injected query function instead of direct document access
            const existingStyle = this.queryStyleElement(`style[data-font="${fontKey}"]`);
            if (existingStyle) {
                resolve();
                return;
            }

            // Create @font-face style with jsDelivr URLs
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

            // ✅ Use injected inject function instead of direct document.head access
            this.injectStyleElement(style);
            
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

    /**
     * Load a Google Font
     * @private
     */
    async _loadGoogleFont(fontKey, font) {
        return new Promise((resolve, reject) => {
            // ✅ Use injected query function instead of direct document access
            const existingLink = this.queryStyleElement(`link[data-font="${fontKey}"]`);
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

            // ✅ Use injected inject function instead of direct document.head access
            this.injectStyleElement(link);
        });
    }

    /**
     * Check if font is loaded
     * @param {string} fontKey - Font key
     * @returns {boolean}
     */
    isLoaded(fontKey) {
        return this.loadedFonts.has(fontKey);
    }

    /**
     * Check if font is currently loading
     * @param {string} fontKey - Font key
     * @returns {boolean}
     */
    isLoading(fontKey) {
        return this.loadingFonts.has(fontKey);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FontService;
}
if (typeof window !== 'undefined') {
    window.FontService = FontService;
}
