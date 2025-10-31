# Refactoring Plan: Clean Reader Engine Separation

**Goal**: Create a clean "bubble" architecture where the core reader engine is completely decoupled from the outer UI, enabling any frontend framework (React, Vue, Svelte, vanilla JS) to consume it seamlessly.

**Vision**: The reader engine should work like a headless library - it manages state, renders content, and emits events. The outer UI just listens and displays.

---

## Executive Summary

**Current State**: 40+ coupling points between engine and UI
**Target State**: Zero coupling - Pure event-driven API
**Estimated Effort**: 25-30 hours over 2-3 weeks
**Risk Level**: Medium (extensive changes, but well-understood patterns)

**Success Criteria**:
- [ ] No `document.getElementById()` calls in any service or engine file
- [ ] No hardcoded CSS class names in services
- [ ] app.js uses ONLY public API methods and events
- [ ] Demo: Swap index.html with React app using same engine (< 2 hours work)

---

## Phase 0: Preparation (2 hours)

**Goal**: Set up safety nets before making changes

### Step 0.1: Create Integration Test Suite (1 hour)

Create `tests/integration-tests.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Reader Engine Integration Tests</title>
</head>
<body>
    <div id="test-results"></div>
    <div id="reader-test-container"></div>

    <script src="../ebook-reader-core.js"></script>
    <script src="../ebook-reader-engine.js"></script>
    <script src="../ebook-reader-api.js"></script>
    <script src="../StateManager.js"></script>
    <script src="../CheetahReaderApp.js"></script>

    <script>
        // Test 1: Can initialize reader
        const app = new CheetahReaderApp('#reader-test-container');
        console.assert(app !== null, 'Reader initialization');

        // Test 2: Can load content
        app.loadContent('<p>Test content</p>');
        console.assert(app.getState().mode === 'normal', 'Normal mode');

        // Test 3: Can enter flow mode
        app.startFlow();
        setTimeout(() => {
            console.assert(app.getReaderState().mode === 'flow', 'Flow mode');
        }, 500);

        // Test 4: Event emission works
        let eventFired = false;
        app.on('onModeChange', () => { eventFired = true; });
        app.stopFlow();
        setTimeout(() => {
            console.assert(eventFired, 'Events working');
        }, 100);

        // Add more tests...
        document.getElementById('test-results').innerHTML =
            '<h2>All tests passed ✅</h2>';
    </script>
</body>
</html>
```

**Deliverable**: Tests pass before and after each phase

### Step 0.2: Document Current Public API (1 hour)

Create `API_REFERENCE.md` documenting:
- All public methods of CheetahReaderApp
- All events emitted
- Expected data structures
- Usage examples

**Why**: This becomes our contract - nothing in this file should break

---

## Phase 1: EPUBService Decoupling (8 hours)

**Priority**: CRITICAL
**Impact**: HIGH - This is the worst offender (13 coupling points)

### Step 1.1: Design Event-Based API (1 hour)

Define new events EPUBService should emit:

```javascript
// NEW: Events EPUBService will emit
const EPUB_EVENTS = {
    BOOK_LOADED: 'epubLoaded',           // { title, author, chapterCount }
    CHAPTERS_EXTRACTED: 'chaptersExtracted', // { chapters: [...] }
    CHAPTER_LOADED: 'chapterLoaded',     // { index, title, content, htmlContent }
    CHAPTER_CHANGED: 'chapterChanged',   // { from, to, title }
    METADATA_UPDATED: 'metadataUpdated', // { title, author, publisher }
    IMAGE_PROCESSED: 'imageProcessed',   // { src, blobUrl }
    ERROR: 'epubError'                   // { code, message, details }
};
```

**Deliverable**: Event contract document

### Step 1.2: Remove Direct DOM Manipulation (3 hours)

**Current** (EPUBService.js:68-86):
```javascript
_updateMetadata() {
    const metadata = this.book.packaging.metadata;

    const titleEl = document.getElementById('book-title');
    const authorEl = document.getElementById('book-author');

    if (titleEl) {
        titleEl.textContent = metadata.title || 'Unknown Title';
    }
    // ... ❌ Service touching DOM directly
}
```

**Refactored**:
```javascript
_updateMetadata() {
    const metadata = this.book.packaging.metadata;

    // ✅ Just emit data, let UI decide what to do
    this._emit('metadataUpdated', {
        title: metadata.title || 'Unknown Title',
        author: metadata.creator || 'Unknown Author',
        publisher: metadata.publisher,
        language: metadata.language,
        publicationDate: metadata.pubdate
    });
}
```

**Files to modify**:
- `EPUBService.js:68-86` - _updateMetadata()
- `EPUBService.js:92-133` - _extractChapters()
- `EPUBService.js:439-466` - _updateActiveChapter()
- `EPUBService.js:614-631` - _updateChapterNavBar()

**Testing**:
```javascript
// In app.js
app.epubService.on('metadataUpdated', (data) => {
    document.getElementById('book-title').textContent = data.title;
    document.getElementById('book-author').textContent = data.author;
});
```

### Step 1.3: Return Data Instead of Side Effects (2 hours)

Make these methods pure:

```javascript
// BEFORE
async _extractChapters() {
    // ... does stuff
    chaptersList.innerHTML = ''; // ❌ DOM manipulation
    // ... more stuff
}

// AFTER
async _extractChapters() {
    const chapters = []; // ✅ Just return data
    const toc = await this.book.loaded.navigation.then(nav => nav.toc);

    for (let i = 0; i < toc.length; i++) {
        chapters.push({
            id: toc[i].id,
            href: toc[i].href,
            label: toc[i].label,
            index: i
        });
    }

    this._emit('chaptersExtracted', { chapters });
    return chapters;
}
```

**Files to modify**:
- `EPUBService.js:92-133` - _extractChapters()
- `EPUBService.js:158-234` - loadChapter()

### Step 1.4: Add Event Emitter to EPUBService (2 hours)

```javascript
class EPUBService {
    constructor(reader) {
        this.reader = reader;
        this.book = null;
        this.chapters = [];
        this.currentChapterIndex = -1;
        this.imageCache = new Map();

        // ✅ NEW: Event system
        this._callbacks = {};
    }

    on(event, callback) {
        if (!this._callbacks[event]) {
            this._callbacks[event] = [];
        }
        this._callbacks[event].push(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this._callbacks[event]) return;
        const index = this._callbacks[event].indexOf(callback);
        if (index > -1) {
            this._callbacks[event].splice(index, 1);
        }
    }

    _emit(event, data) {
        if (this._callbacks[event]) {
            this._callbacks[event].forEach(cb => {
                try {
                    cb(data);
                } catch (error) {
                    console.error(`Error in ${event} callback:`, error);
                }
            });
        }
    }
}
```

**Testing**: Verify all EPUB events fire correctly

---

## Phase 2: FontService & ThemeService (4 hours)

### Step 2.1: FontService - Remove Direct Head Injection (2 hours)

**Current** (FontService.js:60-70):
```javascript
_injectFontFace(fontKey, fontConfig) {
    const styleId = `font-${fontKey}`;
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `@font-face { ... }`;
    document.head.appendChild(style); // ❌ Directly modifying document
}
```

**Refactored**:
```javascript
// Option A: Return CSS string, let consumer inject
getFontCSS(fontKey) {
    const font = FONTS[fontKey];
    if (!font || !font.url) return null;

    return {
        id: `font-${fontKey}`,
        css: `
            @font-face {
                font-family: '${font.family}';
                src: url('${font.url}');
                font-display: swap;
            }
        `
    };
}

// Option B: Accept injection function (Dependency Injection)
constructor(stateManager, contentElement, reader, options = {}) {
    this.injectStyle = options.injectStyle || this._defaultInjectStyle;
}

_defaultInjectStyle(id, css) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
}
```

**Choose Option B** (Dependency Injection) - more flexible

**Files to modify**:
- `FontService.js:60-70` - _injectFontFace()
- `FontService.js` constructor
- `CheetahReaderApp.js:84` - Pass injection function

### Step 2.2: ThemeService - Remove Hardcoded Selectors (2 hours)

**Current** (ThemeService.js:39-44):
```javascript
applyTheme(themeName) {
    // ...
    const container = document.querySelector('.ebook-reader-root'); // ❌ Hardcoded
    if (container) {
        Object.entries(colors).forEach(([key, value]) => {
            container.style.setProperty(`--theme-${key}`, value);
        });
    }
}
```

**Refactored**:
```javascript
// Pass container in constructor
constructor(stateManager, container, options = {}) {
    this.stateManager = stateManager;
    this.container = container; // ✅ Dependency injection
    // ...
}

applyTheme(themeName) {
    // ...
    if (this.container) {
        Object.entries(colors).forEach(([key, value]) => {
            this.container.style.setProperty(`--theme-${key}`, value);
        });
    }
}
```

**Files to modify**:
- `ThemeService.js:39-44` - applyTheme()
- `ThemeService.js` constructor
- `CheetahReaderApp.js:92-96` - Pass container explicitly

---

## Phase 3: CheetahReaderApp API Hardening (5 hours)

### Step 3.1: Make Internal Properties Private (2 hours)

**Current**:
```javascript
class CheetahReaderApp {
    constructor(selector, options = {}) {
        this.state = new StateManager({...}); // ❌ Public
        this.reader = new EBookReader(...);   // ❌ Public
        this.fontService = new FontService(...); // ❌ Public
    }
}
```

**Refactored**:
```javascript
class CheetahReaderApp {
    constructor(selector, options = {}) {
        // ✅ Private (convention - use # for true private in modern JS)
        this._state = new StateManager({...});
        this._reader = new EBookReader(...);
        this._fontService = new FontService(...);
    }

    // ✅ Expose ONLY what's needed via getters
    get currentTheme() {
        return this._state.get('theme');
    }

    get currentFont() {
        return this._state.get('font');
    }

    // ❌ DO NOT expose entire state or reader
}
```

**Files to modify**:
- `CheetahReaderApp.js` - Rename all internal properties to `_propertyName`
- `app.js` - Update all references

### Step 3.2: Add Proper Getters for Read-Only Access (1 hour)

```javascript
// ✅ Safe getters that return copies, not references
getCurrentSettings() {
    return {
        fontSize: this._state.get('fontSize'),
        font: this._state.get('font'),
        theme: this._state.get('theme'),
        bionic: this._state.get('bionic'),
        // ... return primitives or copies only
    };
}

getChapters() {
    // Return copy so UI can't mutate internal state
    return this._epubService.chapters.map(ch => ({...ch}));
}

getCurrentChapterIndex() {
    return this._epubService.currentChapterIndex;
}
```

### Step 3.3: Expose EPUBService Events (2 hours)

**Current**: app.js has no way to listen to EPUB events

**Add delegation**:
```javascript
class CheetahReaderApp {
    // ...

    /**
     * Subscribe to EPUB events
     * @param {string} event - Event name (see EPUB_EVENTS)
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    onEPUB(event, callback) {
        if (this._epubService) {
            return this._epubService.on(event, callback);
        }
        return () => {};
    }

    offEPUB(event, callback) {
        if (this._epubService) {
            this._epubService.off(event, callback);
        }
    }
}
```

**Usage in app.js**:
```javascript
// ✅ Clean event-driven UI updates
app.onEPUB('metadataUpdated', (data) => {
    document.getElementById('book-title').textContent = data.title;
    document.getElementById('book-author').textContent = data.author;
});

app.onEPUB('chaptersExtracted', (data) => {
    const list = document.getElementById('chapters-list');
    list.innerHTML = '';
    data.chapters.forEach(ch => {
        const div = document.createElement('div');
        div.className = 'chapter-item';
        div.textContent = ch.label;
        div.onclick = () => app.loadChapter(ch.index);
        list.appendChild(div);
    });
});

app.onEPUB('chapterChanged', (data) => {
    updateChapterNavButtons(data.to);
});
```

---

## Phase 4: app.js Refactoring (6 hours)

### Step 4.1: Remove Direct State Access (2 hours)

**Find and replace pattern**:
```javascript
// ❌ BEFORE
app.state.get('fontSize')
app.state.get('theme')
app.state.subscribe('marginL', callback)

// ✅ AFTER
app.getCurrentSettings().fontSize
app.currentTheme
// For subscriptions, use dedicated methods:
app.onSettingChange('marginL', callback)
```

**Add to CheetahReaderApp**:
```javascript
onSettingChange(key, callback) {
    return this._state.subscribe(key, callback);
}
```

### Step 4.2: Create UI Controller Pattern (2 hours)

Organize app.js into a controller:

```javascript
// app.js - NEW STRUCTURE

class UIController {
    constructor(readerApp) {
        this.app = readerApp;
        this._initializeEventListeners();
        this._subscribeToReaderEvents();
        this._subscribeToEPUBEvents();
        this._syncUIWithSettings();
    }

    _initializeEventListeners() {
        // All DOM event listeners here
        document.getElementById('upload-btn')?.addEventListener('click', () => {
            document.getElementById('epub-upload').click();
        });
        // ...
    }

    _subscribeToReaderEvents() {
        // All reader event subscriptions
        this.app.on('onModeChange', (mode) => {
            this._updateFlowButton(mode);
        });
        // ...
    }

    _subscribeToEPUBEvents() {
        // All EPUB event subscriptions
        this.app.onEPUB('metadataUpdated', (data) => {
            this._updateMetadataUI(data);
        });
        // ...
    }

    _updateMetadataUI(data) {
        document.getElementById('book-title').textContent = data.title;
        document.getElementById('book-author').textContent = data.author;
    }

    _updateFlowButton(mode) {
        const btn = document.getElementById('btn-flow');
        if (btn) {
            btn.classList.toggle('active', mode === 'flow');
            btn.textContent = mode === 'flow' ? '⏸ Stop Flow' : '▶ Start Flow';
        }
    }

    _syncUIWithSettings() {
        const settings = this.app.getCurrentSettings();
        // Update all UI controls to match settings
        // ...
    }
}

// Initialize
const app = new CheetahReaderApp('#reader', {...});
const ui = new UIController(app);

app.loadContent(sampleText);
```

### Step 4.3: Remove All getElementById from Engine Files (2 hours)

Scan and verify:
```bash
# Should return ZERO results:
grep -r "getElementById" ebook-reader*.js
grep -r "getElementById" *Service.js
grep -r "getElementById" StateManager.js
grep -r "getElementById" CheetahReaderApp.js
grep -r "querySelector" ebook-reader*.js
grep -r "querySelector" *Service.js
```

**Fix any violations found**

---

## Phase 5: CSS Separation (3 hours)

### Step 5.1: Extract Reader Styles (1 hour)

Create `reader-engine.css`:

```css
/* reader-engine.css - All reader engine styles */
.ebook-reader-root {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f5f5f5;
    overflow: hidden;
    touch-action: none;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: background 0.3s ease;
    contain: layout style;
}

.ebook-reader-area { /* ... */ }
.ebook-text-content { /* ... */ }
.bionic { /* ... */ }
.flow-word { /* ... */ }
.ebook-focus-indicator { /* ... */ }

/* Theme variables */
:root {
    --theme-bg: #fff;
    --theme-text: #1f2937;
    --theme-focus: rgba(59,130,246,.08);
}
```

**Move from**:
- `ebook-reader-engine.js` (_injectStyles method)
- `styles.css` (reader-specific styles)

**Result**:
- `reader-engine.css` - Only reader engine styles
- `app-ui.css` - Only outer app styles (sidebars, controls, buttons)

### Step 5.2: Update HTML Links (30 min)

```html
<!-- index.html -->
<link rel="stylesheet" href="reader-engine.css">
<link rel="stylesheet" href="app-ui.css">
```

### Step 5.3: Remove Style Injection from Engine (1.5 hours)

**Current**: `ebook-reader-engine.js:60-133` injects styles

**Refactored**: Require styles to be loaded externally

```javascript
// ebook-reader-engine.js
_injectStyles() {
    // Check if styles are loaded
    if (!document.querySelector('link[href*="reader-engine.css"]') &&
        !document.getElementById('ebook-reader-styles')) {
        console.warn('⚠️ reader-engine.css not loaded. Reader styles may be missing.');
    }
    // Don't inject - expect consumer to load CSS
}
```

---

## Phase 6: Documentation & Examples (2 hours)

### Step 6.1: Update API_REFERENCE.md (1 hour)

Document the new clean API:

```markdown
# CheetahReaderApp Public API

## Constructor
```javascript
const app = new CheetahReaderApp(selector, options)
```

## Content Methods
- `loadContent(html)` - Load HTML content
- `loadEPUB(file)` - Load EPUB file
- `loadPastedText(text)` - Load plain text

## Reader Control
- `startFlow()` - Start flow mode
- `stopFlow()` - Stop flow mode
- `play()` - Resume flow
- `pause()` - Pause flow
- `togglePlay()` - Toggle play/pause

## Settings
- `setFont(fontKey)` - Change font
- `setFontSize(size)` - Set font size (12-48px)
- `setTheme(themeName)` - Set theme
- `setSpeed(wpm)` - Set reading speed (100-650 WPM)
- `setBionic(enabled)` - Toggle bionic reading
- `setBionicStrength(strength)` - Set bionic strength (0.2-0.7)

## EPUB Navigation
- `nextChapter()` - Go to next chapter
- `previousChapter()` - Go to previous chapter
- `loadChapter(index)` - Load specific chapter

## Read-Only Access
- `getCurrentSettings()` - Get all settings
- `getChapters()` - Get chapter list
- `getCurrentChapterIndex()` - Get current chapter index
- `getState()` - Get reader state (mode, playing, word index, etc.)

## Events

### Reader Events
Subscribe with `app.on(event, callback)`:
- `onModeChange` - Mode changed (normal/flow)
- `onPlayChange` - Play state changed
- `onBionicChange` - Bionic mode changed
- `onSpeedChange` - Speed changed
- `onThemeChange` - Theme changed
- `onFontChange` - Font changed
- `onChapterEnd` - Chapter finished

### EPUB Events
Subscribe with `app.onEPUB(event, callback)`:
- `epubLoaded` - EPUB loaded successfully
- `chaptersExtracted` - Chapter list ready
- `chapterLoaded` - Chapter content loaded
- `chapterChanged` - Active chapter changed
- `metadataUpdated` - Book metadata available
- `epubError` - Error occurred

## Example: React Integration
```jsx
import React, { useEffect, useState } from 'react';

function ReaderApp() {
    const [app, setApp] = useState(null);
    const [chapters, setChapters] = useState([]);

    useEffect(() => {
        const reader = new CheetahReaderApp('#reader', {
            theme: 'sepia',
            fontSize: 18
        });

        reader.onEPUB('chaptersExtracted', (data) => {
            setChapters(data.chapters);
        });

        setApp(reader);

        return () => reader.destroy();
    }, []);

    return (
        <div>
            <div id="reader" />
            <ChapterList chapters={chapters} onSelect={app?.loadChapter} />
        </div>
    );
}
```
```

### Step 6.2: Create React Example (1 hour)

Create `examples/react-integration/`:

```
examples/
└── react-integration/
    ├── package.json
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── Reader.jsx
    │   │   ├── Sidebar.jsx
    │   │   └── Controls.jsx
    │   └── index.js
    └── README.md
```

**App.jsx**:
```jsx
import React, { useState, useEffect } from 'react';
import Reader from './components/Reader';
import Sidebar from './components/Sidebar';
import Controls from './components/Controls';

function App() {
    const [app, setApp] = useState(null);
    const [settings, setSettings] = useState({});
    const [chapters, setChapters] = useState([]);

    useEffect(() => {
        // Initialize reader
        const reader = new CheetahReaderApp('#reader-container', {
            theme: 'sepia',
            fontSize: 18,
            speed: 400
        });

        // Listen to events
        reader.onEPUB('chaptersExtracted', (data) => {
            setChapters(data.chapters);
        });

        reader.onSettingChange('*', () => {
            setSettings(reader.getCurrentSettings());
        });

        setApp(reader);
        setSettings(reader.getCurrentSettings());

        return () => reader.destroy();
    }, []);

    return (
        <div className="app">
            <Sidebar chapters={chapters} onChapterSelect={app?.loadChapter} />
            <div id="reader-container" />
            <Controls app={app} settings={settings} />
        </div>
    );
}

export default App;
```

---

## Phase 7: Validation & Testing (2 hours)

### Step 7.1: Coupling Audit (1 hour)

Run checks:

```bash
# 1. No getElementById in engine files
grep -r "getElementById" ebook-reader*.js *Service.js StateManager.js CheetahReaderApp.js
# Expected: 0 results

# 2. No querySelector in engine files (except in _buildDOM)
grep -r "querySelector" ebook-reader*.js *Service.js StateManager.js
# Expected: Only in ebook-reader-engine.js _buildDOM method

# 3. No document.head in services
grep -r "document\.head" *Service.js
# Expected: 0 results

# 4. No hardcoded class names in services
grep -r "\.ebook-reader-" *Service.js
# Expected: 0 results
```

### Step 7.2: Integration Testing (1 hour)

Test scenarios:
1. ✅ Vanilla JS app (existing index.html) works
2. ✅ React example works
3. ✅ All events fire correctly
4. ✅ Settings persist
5. ✅ EPUB loading works
6. ✅ Flow mode works
7. ✅ Theme switching works
8. ✅ Font loading works

---

## Rollout Strategy

### Week 1 (12-14 hours)
- [ ] Phase 0: Preparation
- [ ] Phase 1: EPUBService decoupling
- [ ] Phase 2: FontService & ThemeService

**Checkpoint**: EPUBService emits events, services don't touch DOM

### Week 2 (10-12 hours)
- [ ] Phase 3: CheetahReaderApp API hardening
- [ ] Phase 4: app.js refactoring
- [ ] Phase 5: CSS separation

**Checkpoint**: No coupling violations, app.js uses only public API

### Week 3 (3-4 hours)
- [ ] Phase 6: Documentation & examples
- [ ] Phase 7: Validation & testing

**Checkpoint**: React example works, all tests pass

---

## Risk Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation**:
- Run integration tests after each phase
- Keep git commits small and focused
- Feature flag new event-driven code alongside old code temporarily

### Risk 2: Performance Regression
**Mitigation**:
- Profile before/after with Chrome DevTools
- Event emission is cheap - measure to confirm
- Keep rendering paths identical

### Risk 3: API Churn
**Mitigation**:
- Deprecate old API methods instead of removing immediately
- Add console warnings: `console.warn('app.state is deprecated, use getCurrentSettings()')`
- Provide migration guide

---

## Success Metrics

### Quantitative
- [ ] Zero `getElementById` calls in engine/services (currently: 15+)
- [ ] Zero hardcoded CSS classes in services (currently: 8+)
- [ ] Zero direct `app.state` accesses in app.js (currently: 50+)
- [ ] 100% event coverage for EPUB operations
- [ ] React example buildable in < 2 hours

### Qualitative
- [ ] New developer can integrate reader in any framework in < 1 day
- [ ] API documentation is complete and clear
- [ ] No confusion about what's public vs private
- [ ] UI and engine can be developed independently

---

## Post-Refactoring Benefits

1. **Framework Agnostic**: Drop into React, Vue, Svelte, Angular with zero modifications to engine
2. **Testability**: Engine can be tested in isolation without DOM
3. **Multiple Instances**: Can run multiple readers on same page
4. **Web Components**: Can wrap as a custom element `<cheetah-reader>`
5. **NPM Package**: Can publish engine as standalone package
6. **Mobile Apps**: Can use in React Native, Capacitor, Electron
7. **SSR Compatible**: No document access on initialization

---

## Future Enhancements (Post-Refactoring)

Once the bubble is clean, these become easy:

1. **TypeScript Definitions** - Add .d.ts files for type safety
2. **Headless Mode** - Run engine in Node.js for testing/automation
3. **Plugin System** - Allow extensions without modifying core
4. **Web Component** - Wrap as `<cheetah-reader>` custom element
5. **NPM Package** - Publish as `@cheetah/reader-engine`
6. **Multiple Skins** - Community can build alternate UIs
7. **Mobile SDKs** - iOS/Android native wrappers

---

## Questions for Product/Architecture Review

1. **API Stability**: Are we committing to this API surface for v1.0? Any methods we want to add now?
2. **Event Naming**: Do event names make sense? Any missing events?
3. **Breaking Changes**: OK to require consumers to load CSS separately?
4. **Browser Support**: Any IE11/older browser requirements?
5. **Bundle Size**: Should we split into modules or keep monolithic?
6. **Distribution**: NPM package? CDN? Both?

---

## Appendix A: Before/After Comparison

### Before: Tightly Coupled
```javascript
// app.js - BAD
const fontSize = app.state.get('fontSize');
app.reader.updateStyles();
document.getElementById('book-title').textContent = 'My Book';
```

```javascript
// EPUBService.js - BAD
_updateMetadata() {
    document.getElementById('book-title').textContent = this.book.title;
}
```

### After: Clean Separation
```javascript
// app.js - GOOD
const fontSize = app.getCurrentSettings().fontSize;
app.setFontSize(20); // Public API only

app.onEPUB('metadataUpdated', (data) => {
    document.getElementById('book-title').textContent = data.title;
});
```

```javascript
// EPUBService.js - GOOD
_updateMetadata() {
    this._emit('metadataUpdated', {
        title: this.book.title,
        author: this.book.author
    });
}
```

---

## Appendix B: Reference Coupling Audit

See `COUPLING_ANALYSIS.md` for complete breakdown of current issues.

**High Priority Issues** (26 total):
- EPUBService: 13 issues
- app.js: 11 issues
- ThemeService: 4 issues
- FontService: 2 issues

**Target**: 0 issues after refactoring
