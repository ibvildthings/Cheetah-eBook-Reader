/**
 * ThemeService v2.0.0
 * Service for managing theme application
 *
 * REFACTORED: Now uses dependency injection for elements
 *
 * @license MIT
 * @version 2.0.0
 */

class ThemeService {
    constructor(stateManager, container, options = {}) {
        this.stateManager = stateManager;
        this.container = container;

        // ✅ NEW: Dependency injection for elements
        // Consumers can provide specific element references or getters
        // Falls back to querying container for backwards compatibility
        this.getElements = options.getElements || this._defaultGetElements.bind(this);

        // Media query for auto theme
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        // STEP 11C: Subscribe to theme changes and auto-apply
        if (this.stateManager) {
            this.stateManager.subscribe('theme', (themeName) => {
                const autoTheme = this.stateManager.get('autoTheme');
                if (!autoTheme) {
                    this.applyTheme(themeName);
                }
            });

            this.stateManager.subscribe('autoTheme', (enabled) => {
                if (enabled) {
                    const autoThemeName = this.mediaQuery.matches ? 'dark' : 'light';
                    this.applyTheme(autoThemeName);
                } else {
                    const selectedTheme = this.stateManager.get('theme');
                    this.applyTheme(selectedTheme);
                }
            });
        }

        // Listen for system theme changes
        this.mediaQuery.addEventListener('change', (e) => {
            const autoTheme = this.stateManager ? this.stateManager.get('autoTheme') : false;
            if (autoTheme) {
                const autoThemeName = e.matches ? 'dark' : 'light';
                this.applyTheme(autoThemeName);
            }
        });

        console.log('ThemeService v2.0.0 initialized (dependency injection)');
    }

    // ========================================
    // DEFAULT IMPLEMENTATION (Backwards Compatible)
    // ========================================

    /**
     * Default element getter (queries container)
     * ✅ Can be overridden via constructor options
     * @private
     */
    _defaultGetElements() {
        if (!this.container) {
            return {
                root: null,
                reader: null,
                content: null
            };
        }

        return {
            root: this.container.querySelector('.ebook-reader-root'),
            reader: this.container.querySelector('.ebook-reader-area'),
            content: this.container.querySelector('.ebook-text-content')
        };
    }

    /**
     * Apply a theme to the reader
     * ✅ REFACTORED: Uses injected element getter
     * @param {string} themeName - Theme name from THEMES registry
     */
    applyTheme(themeName) {
        const THEMES = window.EBookReaderCore?.THEMES || {};
        const theme = THEMES[themeName];

        if (!theme) return;

        // ✅ Use injected getter instead of hardcoded queries
        const elements = this.getElements();
        const { root, reader, content } = elements;

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

        // Apply bionic styles
        const bionicElements = content ? content.querySelectorAll('.bionic') : [];
        bionicElements.forEach(el => {
            el.style.color = theme.bionic;
        });

        // Set CSS variables on container
        if (this.container) {
            this.container.style.setProperty('--theme-accent', theme.accent);
            this.container.style.setProperty('--theme-focus', theme.focusIndicator);
        }
    }
    
    /**
     * Get current theme name (considering auto theme)
     * @returns {string}
     */
    getCurrentTheme() {
        if (!this.stateManager) return 'sepia';
        
        const autoTheme = this.stateManager.get('autoTheme');
        if (autoTheme) {
            return this.mediaQuery.matches ? 'dark' : 'light';
        }
        
        return this.stateManager.get('theme') || 'sepia';
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.mediaQuery.removeEventListener('change', this._handleSystemThemeChange);
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeService;
}
if (typeof window !== 'undefined') {
    window.ThemeService = ThemeService;
}
