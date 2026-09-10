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

        // The engine puts the `ebook-reader-root` class on the container element
        // ITSELF (not a child), so querySelector would miss it and the themed
        // gutter background would never get applied (light gutter on dark themes).
        const root = this.container.classList && this.container.classList.contains('ebook-reader-root')
            ? this.container
            : this.container.querySelector('.ebook-reader-root');

        return {
            root,
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

        // Set CSS variables on container.
        // The per-theme `focusIndicator` values are ~0.12 alpha - far too faint
        // to guide the eye in Flow mode. Derive a stronger, high-contrast pair
        // from the theme accent instead: a visible fill plus a solid underline.
        if (this.container) {
            this.container.style.setProperty('--theme-accent', theme.accent);
            this.container.style.setProperty('--theme-focus', this._rgba(theme.accent, 0.20));
            this.container.style.setProperty('--theme-focus-border', theme.accent);
        }
    }

    /**
     * Convert a #RGB / #RRGGBB hex string to an rgba() string.
     * @private
     */
    _rgba(hex, alpha) {
        if (typeof hex !== 'string') return `rgba(96, 165, 250, ${alpha})`;
        let h = hex.trim().replace('#', '');
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        if ([r, g, b].some(Number.isNaN)) return `rgba(96, 165, 250, ${alpha})`;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
