/**
 * FontService v1.0.0
 * Service for managing font loading and application
 * 
 * @license MIT
 * @version 1.0.0
 */

class FontService {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.loadedFonts = new Set();
        this.loadingFonts = new Map();
        this.fontTimeouts = new Map();
        this.fontsReady = null;
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
            // Check if font face already exists
            const existingStyle = document.querySelector(`style[data-font="${fontKey}"]`);
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

    /**
     * Load a Google Font
     * @private
     */
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
