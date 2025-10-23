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
        // Stub - will implement in Step 10B
        return true;
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
