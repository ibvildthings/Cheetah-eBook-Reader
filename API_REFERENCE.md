# CheetahReaderApp API Reference

**Version**: 1.0.0 (Pre-Refactoring Baseline)
**Last Updated**: 2025-10-31

This document serves as the contract for the CheetahReaderApp public API. During refactoring, this API surface must remain stable and backwards-compatible.

---

## Table of Contents

- [Constructor](#constructor)
- [Content Methods](#content-methods)
- [Reader Control](#reader-control)
- [Typography Settings](#typography-settings)
- [Theme Settings](#theme-settings)
- [Layout Settings](#layout-settings)
- [Bionic Reading](#bionic-reading)
- [Flow Mode Settings](#flow-mode-settings)
- [EPUB Navigation](#epub-navigation)
- [State Access](#state-access)
- [Event System](#event-system)
- [Settings Persistence](#settings-persistence)
- [Lifecycle](#lifecycle)

---

## Constructor

### `new CheetahReaderApp(selector, options)`

Creates a new reader instance.

**Parameters:**
- `selector` (string|HTMLElement) - CSS selector or DOM element for the reader container
- `options` (Object) - Configuration options (optional)

**Options:**
```javascript
{
    // Typography
    fontSize: 18,              // Font size in pixels (12-48)
    font: 'opendyslexic',      // Font key from FONTS registry
    lineHeight: 1.8,           // Line height multiplier (1.0-3.0)

    // Theme
    theme: 'sepia',            // Theme name from THEMES registry
    autoTheme: false,          // Auto-switch based on system preference

    // Layout
    marginL: 60,               // Left margin in pixels (10-400)
    marginR: 60,               // Right margin in pixels (10-400)

    // Bionic Reading
    bionic: false,             // Enable bionic reading mode
    bionicStrength: 0.5,       // Bionic strength (0.2-0.7)

    // Flow Mode
    speed: 400,                // Reading speed in WPM (100-650)
    focusWidth: 2,             // Number of words to highlight (1-5)
    scrollLevel: 1             // Scroll aggressiveness (1-5)
}
```

**Returns:** CheetahReaderApp instance

**Example:**
```javascript
const app = new CheetahReaderApp('#reader', {
    fontSize: 20,
    theme: 'dark',
    speed: 450,
    bionic: true
});
```

---

## Content Methods

### `loadContent(html)`

Load HTML content into the reader.

**Parameters:**
- `html` (string) - HTML content to display

**Returns:** void

**Example:**
```javascript
app.loadContent('<h1>Chapter 1</h1><p>Content here...</p>');
```

---

### `loadPastedText(text)`

Load plain text content (auto-formatted to HTML).

**Parameters:**
- `text` (string) - Plain text content

**Returns:** string - Formatted HTML

**Example:**
```javascript
const html = app.loadPastedText('Plain text\n\nSecond paragraph');
```

---

### `loadEPUB(file)`

Load an EPUB file.

**Parameters:**
- `file` (File) - EPUB file object from file input

**Returns:** void

**Example:**
```javascript
const fileInput = document.getElementById('epub-upload');
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    app.loadEPUB(file);
});
```

---

## Reader Control

### `startFlow()`

Start flow mode (auto-scrolling speed reading).

**Returns:** void

**Example:**
```javascript
app.startFlow();
```

---

### `stopFlow()`

Stop flow mode and return to normal reading.

**Returns:** void

**Example:**
```javascript
app.stopFlow();
```

---

### `play()`

Resume flow mode playback.

**Returns:** void

**Example:**
```javascript
app.play();
```

---

### `pause()`

Pause flow mode playback.

**Returns:** void

**Example:**
```javascript
app.pause();
```

---

### `togglePlay()`

Toggle between play and pause.

**Returns:** void

**Example:**
```javascript
app.togglePlay();
```

---

## Typography Settings

### `setFontSize(size)`

Set font size.

**Parameters:**
- `size` (number) - Font size in pixels (12-48)

**Returns:** void

**Example:**
```javascript
app.setFontSize(22);
```

---

### `setFont(fontKey)`

Change the font family.

**Parameters:**
- `fontKey` (string) - Font identifier from FONTS registry

**Available fonts:**
- Accessibility: `'opendyslexic'`, `'lexend'`
- Serif: `'merriweather'`, `'crimson'`, `'lora'`, `'ebgaramond'`
- Sans: `'inter'`, `'opensans'`, `'sourcesans'`, `'worksans'`
- Slab: `'robotoslab'`, `'bitter'`, `'arvo'`
- Mono: `'robotomono'`, `'sourcecodepro'`, `'jetbrains'`

**Returns:** void

**Example:**
```javascript
app.setFont('merriweather');
```

---

### `setLineHeight(height)`

Set line height.

**Parameters:**
- `height` (number) - Line height multiplier (1.0-3.0)

**Returns:** void

**Example:**
```javascript
app.setLineHeight(1.6);
```

---

## Theme Settings

### `setTheme(themeName)`

Set the color theme.

**Parameters:**
- `themeName` (string) - Theme identifier

**Available themes:**
- `'light'`, `'dark'`, `'sepia'`, `'nord'`, `'solarized'`, `'dracula'`,
  `'monokai'`, `'gruvbox'`, `'tokyonight'`, `'catppuccin'`, `'onedark'`,
  `'paper'`, `'matrix'`

**Returns:** void

**Example:**
```javascript
app.setTheme('nord');
```

---

### `setAutoTheme(enabled)`

Enable/disable automatic theme switching based on system preference.

**Parameters:**
- `enabled` (boolean) - Whether to auto-switch themes

**Returns:** void

**Example:**
```javascript
app.setAutoTheme(true);
```

---

### `getTheme()`

Get current theme information.

**Returns:** string - Current theme name

**Example:**
```javascript
const theme = app.getTheme();
console.log(theme); // 'sepia'
```

---

## Layout Settings

### `setMargins(left, right)`

Set left and/or right content margins.

**Parameters:**
- `left` (number|undefined) - Left margin in pixels (10-400)
- `right` (number|undefined) - Right margin in pixels (10-400)

**Returns:** void

**Example:**
```javascript
app.setMargins(100, 100);  // Set both
app.setMargins(80, undefined);  // Set left only
app.setMargins(undefined, 120);  // Set right only
```

---

## Bionic Reading

### `setBionic(enabled)`

Enable or disable bionic reading mode.

**Parameters:**
- `enabled` (boolean) - Whether to enable bionic mode

**Returns:** void

**Example:**
```javascript
app.setBionic(true);
```

---

### `toggleBionic()`

Toggle bionic reading mode on/off.

**Returns:** void

**Example:**
```javascript
app.toggleBionic();
```

---

### `setBionicStrength(strength)`

Set the strength of bionic highlighting.

**Parameters:**
- `strength` (number) - Strength value (0.2-0.7)

**Returns:** void

**Example:**
```javascript
app.setBionicStrength(0.6);
```

---

## Flow Mode Settings

### `setSpeed(wpm)`

Set reading speed in words per minute.

**Parameters:**
- `wpm` (number) - Speed in WPM (100-650)

**Returns:** void

**Example:**
```javascript
app.setSpeed(500);
```

---

### `setFocusWidth(width)`

Set number of words to highlight simultaneously.

**Parameters:**
- `width` (number) - Number of words (1-5)

**Returns:** void

**Example:**
```javascript
app.setFocusWidth(3);
```

---

### `setScrollLevel(level)`

Set scroll aggressiveness.

**Parameters:**
- `level` (number) - Scroll level (1-5)

**Returns:** void

**Example:**
```javascript
app.setScrollLevel(2);
```

---

## EPUB Navigation

### `nextChapter()`

Navigate to the next chapter.

**Returns:** void

**Example:**
```javascript
app.nextChapter();
```

---

### `previousChapter()`

Navigate to the previous chapter.

**Returns:** void

**Example:**
```javascript
app.previousChapter();
```

---

### `loadChapter(index)`

Load a specific chapter by index.

**Parameters:**
- `index` (number) - Zero-based chapter index

**Returns:** void

**Example:**
```javascript
app.loadChapter(3);  // Load chapter 4
```

---

## State Access

### `getState()`

Get the current application state (read-only).

**Returns:** Object

**Structure:**
```javascript
{
    fontSize: 18,
    font: 'opendyslexic',
    lineHeight: 1.8,
    theme: 'sepia',
    autoTheme: false,
    marginL: 60,
    marginR: 60,
    bionic: false,
    bionicStrength: 0.5,
    flow: {
        speed: 400,
        focusWidth: 2,
        scrollLevel: 1
    }
}
```

**Example:**
```javascript
const state = app.getState();
console.log(`Current font size: ${state.fontSize}px`);
```

---

### `getReaderState()`

Get the internal reader engine state (read-only).

**Returns:** Object

**Structure:**
```javascript
{
    version: '2.4.0',
    mode: 'normal',          // 'normal' | 'flow'
    bionic: false,
    fontSize: 18,
    lineHeight: 1.8,
    font: {...},             // Font object
    theme: {...},            // Theme object
    playing: false,
    speed: 400,
    currentWordIndex: 0,
    totalWords: 250,
    focusWidth: 2,
    scrollLevel: 1
}
```

**Example:**
```javascript
const readerState = app.getReaderState();
console.log(`Reading progress: ${readerState.currentWordIndex}/${readerState.totalWords}`);
```

---

## Event System

### `on(event, callback)`

Subscribe to an event.

**Parameters:**
- `event` (string) - Event name
- `callback` (Function) - Callback function

**Returns:** Function - Unsubscribe function

**Available Events:**

| Event | Data | Description |
|-------|------|-------------|
| `onModeChange` | `mode: string` | Reader mode changed (normal/flow) |
| `onPlayChange` | `playing: boolean` | Play state changed |
| `onBionicChange` | `enabled: boolean` | Bionic mode changed |
| `onSpeedChange` | `wpm: number` | Speed changed |
| `onThemeChange` | `theme: string` | Theme changed |
| `onFontChange` | `font: string` | Font changed |
| `onChapterEnd` | `void` | Current chapter finished |

**Example:**
```javascript
const unsubscribe = app.on('onModeChange', (mode) => {
    console.log('Mode changed to:', mode);
    if (mode === 'flow') {
        document.getElementById('flow-btn').textContent = 'Stop Flow';
    }
});

// Later: unsubscribe
unsubscribe();
```

---

### `off(event, callback)`

Unsubscribe from an event.

**Parameters:**
- `event` (string) - Event name
- `callback` (Function) - Callback function to remove

**Returns:** void

**Example:**
```javascript
function handleModeChange(mode) {
    console.log('Mode:', mode);
}

app.on('onModeChange', handleModeChange);

// Later...
app.off('onModeChange', handleModeChange);
```

---

## Settings Persistence

### `clearSettings()`

Clear all saved settings from localStorage.

**Returns:** void

**Example:**
```javascript
app.clearSettings();
```

---

### `exportSettings()`

Export current settings as JSON string.

**Returns:** string - JSON string

**Example:**
```javascript
const json = app.exportSettings();
localStorage.setItem('backup', json);
```

---

### `importSettings(jsonString)`

Import settings from JSON string.

**Parameters:**
- `jsonString` (string) - JSON settings string

**Returns:** boolean - Success status

**Example:**
```javascript
const json = localStorage.getItem('backup');
const success = app.importSettings(json);
```

---

## Lifecycle

### `destroy()`

Destroy the reader instance and clean up resources.

**Returns:** void

**Example:**
```javascript
app.destroy();
```

---

## Complete Usage Example

```javascript
// Initialize
const app = new CheetahReaderApp('#reader', {
    fontSize: 20,
    theme: 'nord',
    speed: 450,
    bionic: true,
    bionicStrength: 0.6
});

// Load content
app.loadContent('<h1>Chapter 1</h1><p>Content here...</p>');

// Or load EPUB
document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) app.loadEPUB(file);
});

// Subscribe to events
app.on('onModeChange', (mode) => {
    updateUI(mode);
});

app.on('onChapterEnd', () => {
    console.log('Chapter finished!');
    app.nextChapter();
});

// Control playback
document.getElementById('flow-btn').addEventListener('click', () => {
    const state = app.getReaderState();
    if (state.mode === 'flow') {
        app.stopFlow();
    } else {
        app.startFlow();
    }
});

// Adjust settings
document.getElementById('speed-slider').addEventListener('input', (e) => {
    app.setSpeed(parseInt(e.target.value));
});

document.getElementById('theme-select').addEventListener('change', (e) => {
    app.setTheme(e.target.value);
});

// Cleanup
window.addEventListener('beforeunload', () => {
    app.destroy();
});
```

---

## Notes for Refactoring

During refactoring, the following principles must be maintained:

1. **Backwards Compatibility**: All existing method signatures must work
2. **Event Contracts**: Event names and data structures must remain stable
3. **State Structures**: getState() and getReaderState() return shapes must not change
4. **Error Handling**: Method errors should be consistent with current behavior

**Deprecation Strategy**: If a method needs to change, mark it as deprecated with console.warn() and provide migration path in documentation.

**Version**: This API reference represents the baseline (v1.0.0) before refactoring begins.
