/**
 * ThemeService v1.0.0
 * Service for managing theme application
 * 
 * @license MIT
 * @version 1.0.0
 */

class ThemeService {
    constructor(stateManager, container) {
        this.stateManager = stateManager;
        this.container = container;
        
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
    }

    /**
     * Apply a theme to the reader
     * @param {string} themeName - Theme name from THEMES registry
     */
    applyTheme(themeName) {
        if (!this.container) return;
        
        const THEMES = window.EBookReaderCore?.THEMES || {};
        const theme = THEMES[themeName];
        
        if (!theme) return;
        
        const root = this.container.querySelector('.ebook-reader-root');
        const reader = this.container.querySelector('.ebook-reader-area');
        const content = this.container.querySelector('.ebook-text-content');
        
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
