/**
 * Theme Configuration
 * Colour themes for the reader. Many are ports of well-known
 * terminal / editor colour schemes (Nord, Dracula, Gruvbox, ...).
 *
 * Fields actually consumed by ThemeService: background, contentBg, text,
 * accent, shadow, bionic. The rest (textSecondary, accentHover) are kept
 * for completeness. `group` + `palette` drive the visual theme picker.
 *
 * @license MIT
 */

window.THEMES = {
    /* ----------------------------- LIGHT ----------------------------- */
    light: {
        name: 'Light', group: 'light',
        background: '#E8E8E8', contentBg: '#FFFFFF',
        text: '#1A1A1A', textSecondary: '#666666',
        accent: '#3B82F6', accentHover: '#2563EB',
        shadow: 'rgba(0, 0, 0, 0.1)', bionic: '#000000',
        palette: ['#d1453b', '#c99b1e', '#3a9e4a', '#2aa9a0', '#3b82f6', '#a259c4']
    },
    sepia: {
        name: 'Sepia', group: 'light',
        background: '#E8D7C3', contentBg: '#FBF4E9',
        text: '#3D2E1F', textSecondary: '#5C4B37',
        accent: '#B8860B', accentHover: '#8B6914',
        shadow: 'rgba(61, 46, 31, 0.15)', bionic: '#1A1410',
        palette: ['#a8322d', '#b8860b', '#5a7a3a', '#4a8a80', '#3a6ea5', '#8a5a9a']
    },
    gray: {
        name: 'Gray', group: 'light',
        background: '#C8C8C8', contentBg: '#E8E8E8',
        text: '#2C2C2C', textSecondary: '#5A5A5A',
        accent: '#4B5563', accentHover: '#374151',
        shadow: 'rgba(0, 0, 0, 0.12)', bionic: '#000000',
        palette: ['#b03a3a', '#a08020', '#4a7a4a', '#3a8a8a', '#4a6a9a', '#8a5a8a']
    },
    parchment: {
        name: 'Parchment', group: 'light',
        background: '#E8DCC4', contentBg: '#F5EEDC',
        text: '#3A2F1F', textSecondary: '#6B5742',
        accent: '#A0826D', accentHover: '#8B6F4F',
        shadow: 'rgba(58, 47, 31, 0.12)', bionic: '#2A1F11',
        palette: ['#9c3b2e', '#b5852a', '#5a7340', '#4d8078', '#3f6ea5', '#8a5f7a']
    },
    solarizedlight: {
        name: 'Solarized Light', group: 'light',
        background: '#EEE8D5', contentBg: '#FDF6E3',
        text: '#586E75', textSecondary: '#93A1A1',
        accent: '#268BD2', accentHover: '#2AA198',
        shadow: 'rgba(88, 110, 117, 0.15)', bionic: '#073642',
        palette: ['#dc322f', '#b58900', '#859900', '#2aa198', '#268bd2', '#d33682']
    },
    gruvboxlight: {
        name: 'Gruvbox Light', group: 'light',
        background: '#F2E5BC', contentBg: '#FBF1C7',
        text: '#3C3836', textSecondary: '#7C6F64',
        accent: '#B57614', accentHover: '#AF3A03',
        shadow: 'rgba(60, 56, 54, 0.15)', bionic: '#282828',
        palette: ['#9d0006', '#b57614', '#79740e', '#427b58', '#076678', '#8f3f71']
    },

    /* ------------------------------ DARK ------------------------------ */
    dark: {
        name: 'Dark', group: 'dark',
        background: '#0F0F0F', contentBg: '#1A1A1A',
        text: '#E8E8E8', textSecondary: '#A0A0A0',
        accent: '#60A5FA', accentHover: '#3B82F6',
        shadow: 'rgba(0, 0, 0, 0.5)', bionic: '#FFFFFF',
        palette: ['#ff5f56', '#ffbd2e', '#27c93f', '#56b6c2', '#61afef', '#c678dd']
    },
    nord: {
        name: 'Nord', group: 'dark',
        background: '#2E3440', contentBg: '#3B4252',
        text: '#ECEFF4', textSecondary: '#D8DEE9',
        accent: '#88C0D0', accentHover: '#81A1C1',
        shadow: 'rgba(0, 0, 0, 0.3)', bionic: '#ECEFF4',
        palette: ['#bf616a', '#ebcb8b', '#a3be8c', '#88c0d0', '#81a1c1', '#b48ead']
    },
    dracula: {
        name: 'Dracula', group: 'dark',
        background: '#21222C', contentBg: '#282A36',
        text: '#F8F8F2', textSecondary: '#8A93B8',
        accent: '#BD93F9', accentHover: '#FF79C6',
        shadow: 'rgba(0, 0, 0, 0.4)', bionic: '#F8F8F2',
        palette: ['#ff5555', '#f1fa8c', '#50fa7b', '#8be9fd', '#bd93f9', '#ff79c6']
    },
    tokyonight: {
        name: 'Tokyo Night', group: 'dark',
        background: '#16161E', contentBg: '#1A1B26',
        text: '#A9B1D6', textSecondary: '#787C99',
        accent: '#7AA2F7', accentHover: '#BB9AF7',
        shadow: 'rgba(0, 0, 0, 0.5)', bionic: '#C0CAF5',
        palette: ['#f7768e', '#e0af68', '#9ece6a', '#7dcfff', '#7aa2f7', '#bb9af7']
    },
    catppuccin: {
        name: 'Catppuccin', group: 'dark',
        background: '#181825', contentBg: '#1E1E2E',
        text: '#CDD6F4', textSecondary: '#A6ADC8',
        accent: '#CBA6F7', accentHover: '#89B4FA',
        shadow: 'rgba(0, 0, 0, 0.5)', bionic: '#F5E0DC',
        palette: ['#f38ba8', '#f9e2af', '#a6e3a1', '#94e2d5', '#89b4fa', '#cba6f7']
    },
    onedark: {
        name: 'One Dark', group: 'dark',
        background: '#21252B', contentBg: '#282C34',
        text: '#ABB2BF', textSecondary: '#7F8694',
        accent: '#61AFEF', accentHover: '#528BCE',
        shadow: 'rgba(0, 0, 0, 0.45)', bionic: '#E6E6E6',
        palette: ['#e06c75', '#e5c07b', '#98c379', '#56b6c2', '#61afef', '#c678dd']
    },
    gruvbox: {
        name: 'Gruvbox Dark', group: 'dark',
        background: '#1D2021', contentBg: '#282828',
        text: '#EBDBB2', textSecondary: '#A89984',
        accent: '#FABD2F', accentHover: '#D79921',
        shadow: 'rgba(0, 0, 0, 0.5)', bionic: '#FBF1C7',
        palette: ['#fb4934', '#fabd2f', '#b8bb26', '#8ec07c', '#83a598', '#d3869b']
    },
    everforest: {
        name: 'Everforest', group: 'dark',
        background: '#272E33', contentBg: '#2D353B',
        text: '#D3C6AA', textSecondary: '#859289',
        accent: '#A7C080', accentHover: '#83C092',
        shadow: 'rgba(0, 0, 0, 0.45)', bionic: '#E6E2CC',
        palette: ['#e67e80', '#dbbc7f', '#a7c080', '#83c092', '#7fbbb3', '#d699b6']
    },
    rosepine: {
        name: 'Rosé Pine', group: 'dark',
        background: '#191724', contentBg: '#1F1D2E',
        text: '#E0DEF4', textSecondary: '#908CAA',
        accent: '#C4A7E7', accentHover: '#EBBCBA',
        shadow: 'rgba(0, 0, 0, 0.5)', bionic: '#E0DEF4',
        palette: ['#eb6f92', '#f6c177', '#31748f', '#9ccfd8', '#c4a7e7', '#ebbcba']
    },
    solarized: {
        name: 'Solarized Dark', group: 'dark',
        background: '#002B36', contentBg: '#073642',
        text: '#93A1A1', textSecondary: '#657B83',
        accent: '#268BD2', accentHover: '#2AA198',
        shadow: 'rgba(0, 0, 0, 0.4)', bionic: '#EEE8D5',
        palette: ['#dc322f', '#b58900', '#859900', '#2aa198', '#268bd2', '#d33682']
    },
    monokai: {
        name: 'Monokai', group: 'dark',
        background: '#1E1E1E', contentBg: '#272822',
        text: '#F8F8F2', textSecondary: '#A6A28C',
        accent: '#66D9EF', accentHover: '#A6E22E',
        shadow: 'rgba(0, 0, 0, 0.4)', bionic: '#F8F8F2',
        palette: ['#f92672', '#e6db74', '#a6e22e', '#66d9ef', '#fd971f', '#ae81ff']
    },
    ocean: {
        name: 'Ocean Blue', group: 'dark',
        background: '#0A1929', contentBg: '#0D2137',
        text: '#B2D4F5', textSecondary: '#6B9FD8',
        accent: '#4FC3F7', accentHover: '#29B6F6',
        shadow: 'rgba(0, 0, 0, 0.5)', bionic: '#B2D4F5',
        palette: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4fc3f7', '#4d96ff', '#b39ddb']
    },
    forest: {
        name: 'Forest', group: 'dark',
        background: '#0E1410', contentBg: '#141A16',
        text: '#A8C5A0', textSecondary: '#6B8A63',
        accent: '#76C893', accentHover: '#52B788',
        shadow: 'rgba(0, 0, 0, 0.5)', bionic: '#A8C5A0',
        palette: ['#e06c75', '#e5c07b', '#98c379', '#56b6c2', '#61afef', '#c678dd']
    },

    /* ---------------------------- TERMINAL --------------------------- */
    matrix: {
        name: 'Matrix', group: 'terminal',
        background: '#0D0D0D', contentBg: '#000000',
        text: '#00FF41', textSecondary: '#00A82B',
        accent: '#00FF41', accentHover: '#00CC33',
        shadow: 'rgba(0, 255, 65, 0.2)', bionic: '#7CFF9B',
        palette: ['#00ff41', '#6aff6a', '#00cc33', '#33ffaa', '#00ffcc', '#66ff99']
    },
    terminal: {
        name: 'Terminal Green', group: 'terminal',
        background: '#0A0E0A', contentBg: '#0D120D',
        text: '#33FF33', textSecondary: '#1FBF1F',
        accent: '#33FF33', accentHover: '#22CC22',
        shadow: 'rgba(51, 255, 51, 0.15)', bionic: '#9BFF9B',
        palette: ['#33ff33', '#66ff33', '#00cc00', '#33ffcc', '#33ff99', '#66ffaa']
    }
};

console.log('✅ THEMES loaded:', Object.keys(window.THEMES).length, 'themes');
