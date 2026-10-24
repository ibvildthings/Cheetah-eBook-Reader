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

        this._applyChrome(theme);

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
     * Dress the app chrome (sidebars, buttons, dial, arc) in the reading
     * theme, as the iOS app does: surfaces are translucent tints of the text
     * colour over the theme's own background, and the accent is the theme's.
     * @private
     */
    _applyChrome(theme) {
        if (typeof document === 'undefined') return;
        const root = document.documentElement;
        const set = (k, v) => root.style.setProperty(k, v);
        const dark = theme.group !== 'light';
        set('color-scheme', dark ? 'dark' : 'light');
        set('--ui-accent', theme.accent);
        set('--ui-accent-hover', theme.accentHover || theme.accent);
        set('--ui-text', theme.text);
        set('--ui-text-secondary', this._rgba(theme.text, 0.78));
        set('--ui-text-muted', theme.textSecondary);
        set('--ui-surface', this._rgba(theme.text, 0.06));
        set('--ui-surface-hover', this._rgba(theme.text, 0.11));
        set('--ui-border', this._rgba(theme.text, 0.16));
        set('--ui-focus-ring', `0 0 0 2px ${theme.background}, 0 0 0 4px ${theme.accent}`);
        set('--glass-bg-sidebar', this._rgba(theme.background, 0.86));
        set('--glass-bg-panel', this._rgba(theme.text, 0.06));
        set('--glass-bg-hover', this._rgba(theme.text, 0.12));
        set('--glass-bg-active', this._rgba(theme.accent, 0.24));
        set('--glass-border', this._rgba(theme.text, 0.16));
        set('--glass-border-accent', this._rgba(theme.accent, 0.6));
        set('--glass-accent', theme.accent);
        set('--glass-accent-hover', theme.accentHover || theme.accent);
        set('--chrome-bg', theme.background);
        set('--chrome-paper', theme.contentBg);
        set('--on-accent', this._isLight(theme.accent) ? '#101010' : '#ffffff');
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme.background);
    }

    /** Whether a colour is light enough to want dark text on it. @private */
    _isLight(hex) {
        const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
        if (!m) return false;
        const n = parseInt(m[1], 16);
        const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
        return L > 0.4;
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
