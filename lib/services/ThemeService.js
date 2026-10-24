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

        // Re-apply whenever anything that feeds the look changes
        if (this.stateManager) {
            this.stateManager.subscribe(['theme', 'autoTheme', 'autoLightTheme', 'autoDarkTheme'], () => {
                this.applyTheme(this.getCurrentTheme());
            });
            this.stateManager.subscribe(
                ['flow.focusStrength', 'flow.focusUnderline', 'flow.focusBackground', 'invertLineArt'],
                () => this.applyTheme(this.getCurrentTheme()));
        }

        // Listen for system theme changes
        this._handleSystemThemeChange = () => {
            if (this.stateManager && this.stateManager.get('autoTheme')) {
                this.applyTheme(this.getCurrentTheme());
            }
        };
        this.mediaQuery.addEventListener('change', this._handleSystemThemeChange);

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
            const get = (k, d) => {
                const v = this.stateManager ? this.stateManager.get(k) : undefined;
                return v == null ? d : v;
            };
            const strength = get('flow.focusStrength', 1);
            // 1 is the standard look; less fades the band toward nothing,
            // more makes it bolder.
            const fill = Math.min(0.6, 0.2 * strength);
            const line = Math.min(1, strength);
            this.container.style.setProperty('--theme-accent', theme.accent);
            this.container.style.setProperty('--theme-focus', this._rgba(theme.accent, fill));
            this.container.style.setProperty('--theme-focus-border', this._rgba(theme.accent, line));
            this.container.classList.toggle('focus-no-underline', !get('flow.focusUnderline', true));
            this.container.classList.toggle('focus-no-background', !get('flow.focusBackground', true));
            // Diagrams drawn black on white are turned light on dark themes.
            this.container.classList.toggle('invert-line-art',
                !!get('invertLineArt', false) && theme.group !== 'light');
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
        if (!this.stateManager) return 'twilight';

        if (this.stateManager.get('autoTheme')) {
            return this.mediaQuery.matches
                ? (this.stateManager.get('autoDarkTheme') || 'dark')
                : (this.stateManager.get('autoLightTheme') || 'sepia');
        }

        return this.stateManager.get('theme') || 'twilight';
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
