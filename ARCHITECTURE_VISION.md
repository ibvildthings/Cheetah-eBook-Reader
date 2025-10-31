# Architecture Vision: The Clean Bubble

## Current Architecture (Tangled)

```
┌─────────────────────────────────────────────────────────────┐
│                         index.html                           │
│                         styles.css                           │
│                         app.js                               │
├─────────────────────────────────────────────────────────────┤
│  ❌ Directly accesses: app.state.get()                      │
│  ❌ Directly accesses: app.reader.updateStyles()            │
│  ❌ Directly accesses: app.fontService                      │
│  ❌ 50+ getElementById() calls scattered                    │
└──────────────┬──────────────────────────────────────────────┘
               │ Tight coupling
               ↓
┌─────────────────────────────────────────────────────────────┐
│                   CheetahReaderApp                           │
│                                                              │
│  ⚠️  Public properties: state, reader, services             │
│  ⚠️  No encapsulation                                        │
└──────────────┬──────────────────────────────────────────────┘
               │
     ┌─────────┼──────────┬───────────┐
     ↓         ↓          ↓           ↓
┌─────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐
│EPUBSvc  │ │FontSvc │ │ThemeSvc │ │ Reader   │
│         │ │        │ │         │ │ Engine   │
├─────────┤ ├────────┤ ├─────────┤ ├──────────┤
│❌ Direct│ │❌Direct│ │❌Direct │ │✅ Good   │
│DOM manip│ │head    │ │query    │ │isolation │
│13 issues│ │inject  │ │selector │ │          │
└─────────┘ └────────┘ └─────────┘ └──────────┘
```

**Problems**:
- UI can reach into internals and break things
- Services directly manipulate DOM
- Hard to use with other frameworks
- Can't run multiple instances
- Tight coupling everywhere

---

## Target Architecture (Clean Bubble)

```
┌─────────────────────────────────────────────────────────────┐
│                    ANY UI FRAMEWORK                          │
│              React / Vue / Svelte / Vanilla                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ Uses only: app.loadEPUB()                               │
│  ✅ Listens to: app.on('eventName', callback)               │
│  ✅ Updates: app.setTheme(), app.startFlow()                │
│  ✅ Zero direct DOM access to reader internals              │
│                                                              │
└──────────────────────────┬──────────────────────────────────┘
                           │ Clean API boundary
                           │ Events only
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                                                               │
│                    THE BUBBLE                                 │
│                CheetahReaderApp                               │
│                                                               │
│  Public API Surface (Methods)                                │
│  ├─ loadContent(html)                                        │
│  ├─ loadEPUB(file)                                           │
│  ├─ startFlow() / stopFlow()                                 │
│  ├─ setTheme(name) / setFont(key)                            │
│  ├─ setSpeed(wpm) / setBionic(enabled)                       │
│  ├─ nextChapter() / previousChapter()                        │
│  └─ getCurrentSettings() ← Read-only                         │
│                                                               │
│  Event System (One-way data flow)                            │
│  ├─ on('onModeChange', callback)                             │
│  ├─ on('onPlayChange', callback)                             │
│  ├─ onEPUB('chaptersExtracted', callback)                    │
│  ├─ onEPUB('metadataUpdated', callback)                      │
│  └─ onEPUB('chapterChanged', callback)                       │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│                     PRIVATE INTERNALS                         │
│                  (Not accessible from outside)                │
│                                                               │
│  _state: StateManager ← Single source of truth               │
│  _reader: EBookReader ← Engine core                          │
│  _epubService: EPUBService ← Data only, emits events         │
│  _fontService: FontService ← Returns CSS, no injection       │
│  _themeService: ThemeService ← Uses DI for container         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Benefits**:
- ✅ Framework agnostic - works anywhere
- ✅ Services are pure - no side effects
- ✅ Events provide clean data flow
- ✅ Can run multiple instances
- ✅ Testable in isolation
- ✅ Can be packaged as NPM module

---

## Data Flow: Before vs After

### Before: Two-way chaos

```
┌──────────┐                  ┌─────────────┐
│  app.js  │ ────reads────→   │ app.state   │
│          │ ←───writes───    │             │
└──────────┘                  └─────────────┘
     │                              ↑
     │                              │
     └────directly modifies─────────┘

┌──────────────┐
│ EPUBService  │ ──────→ document.getElementById()
└──────────────┘         (Bypasses app.js completely!)

Result: Hard to track what changes what
```

### After: One-way data flow

```
┌──────────┐                  ┌──────────────────┐
│  UI      │ ──commands────→  │ CheetahReaderApp │
│ (app.js) │                  │                  │
│          │ ←──events───     │  ┌────────────┐  │
└──────────┘                  │  │ StateManager│ │
                              │  └────────────┘  │
                              │        ↕         │
                              │  ┌────────────┐  │
                              │  │ Services   │  │
                              │  │ (emit only)│  │
                              │  └────────────┘  │
                              └──────────────────┘

Result: Predictable, debuggable, testable
```

---

## Service Communication Pattern

### Before: Services touch DOM directly

```javascript
// EPUBService.js - BAD ❌
_updateMetadata() {
    const titleEl = document.getElementById('book-title');
    titleEl.textContent = this.book.title; // Direct DOM manipulation!
}

// Problem: Service knows about UI structure
// Problem: Can't use this service in Node.js or testing
// Problem: Multiple UIs can't share one service
```

### After: Services emit events

```javascript
// EPUBService.js - GOOD ✅
_updateMetadata() {
    this._emit('metadataUpdated', {
        title: this.book.title,
        author: this.book.author,
        publisher: this.book.publisher,
        language: this.book.language
    });
}

// UI decides what to do with the data
app.onEPUB('metadataUpdated', (data) => {
    document.getElementById('book-title').textContent = data.title;
    document.getElementById('book-author').textContent = data.author;
});

// Benefits:
// ✅ Service is pure - returns/emits data only
// ✅ Can be tested without DOM
// ✅ Multiple UIs can listen to same events
// ✅ React can use same events:
//    useEffect(() => {
//        app.onEPUB('metadataUpdated', setMetadata)
//    }, [])
```

---

## React Integration Example

### What It Looks Like After Refactoring

```jsx
// App.jsx
import React, { useState, useEffect } from 'react';
import CheetahReaderApp from './lib/CheetahReaderApp';

function App() {
    const [app, setApp] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [metadata, setMetadata] = useState({});
    const [isPlaying, setIsPlaying] = useState(false);
    const [settings, setSettings] = useState({});

    useEffect(() => {
        // Initialize the bubble
        const reader = new CheetahReaderApp('#reader', {
            theme: 'sepia',
            fontSize: 18,
            speed: 400
        });

        // Listen to EPUB events
        reader.onEPUB('metadataUpdated', (data) => {
            setMetadata(data);
        });

        reader.onEPUB('chaptersExtracted', (data) => {
            setChapters(data.chapters);
        });

        // Listen to reader events
        reader.on('onPlayChange', (playing) => {
            setIsPlaying(playing);
        });

        reader.onSettingChange('*', () => {
            setSettings(reader.getCurrentSettings());
        });

        setApp(reader);
        setSettings(reader.getCurrentSettings());

        // Cleanup
        return () => reader.destroy();
    }, []);

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) app?.loadEPUB(file);
    };

    return (
        <div className="app">
            {/* Your custom React UI */}
            <Sidebar>
                <BookMetadata {...metadata} />
                <ChapterList
                    chapters={chapters}
                    onSelect={(idx) => app?.loadChapter(idx)}
                />
            </Sidebar>

            {/* The bubble renders here */}
            <div id="reader" />

            {/* Your custom controls */}
            <Controls
                isPlaying={isPlaying}
                settings={settings}
                onPlay={() => app?.play()}
                onPause={() => app?.pause()}
                onSpeedChange={(wpm) => app?.setSpeed(wpm)}
                onThemeChange={(theme) => app?.setTheme(theme)}
            />

            {/* File upload */}
            <input
                type="file"
                accept=".epub"
                onChange={handleFileUpload}
            />
        </div>
    );
}

export default App;
```

**That's it!** The reader engine is completely decoupled. React just:
1. Creates an instance
2. Listens to events
3. Calls public methods
4. Never touches internals

Same pattern works for Vue, Svelte, Angular, or vanilla JS.

---

## Multi-Instance Support

After refactoring, you can run multiple readers on one page:

```javascript
// Two readers on same page
const reader1 = new CheetahReaderApp('#reader-1', { theme: 'light' });
const reader2 = new CheetahReaderApp('#reader-2', { theme: 'dark' });

reader1.loadEPUB(book1);
reader2.loadEPUB(book2);

// They're completely independent!
reader1.setSpeed(300);
reader2.setSpeed(500);
```

**Use cases**:
- Compare two translations side-by-side
- Educational app showing example + exercise
- Book club app with shared annotations

---

## Web Component Wrapper

Once the bubble is clean, wrapping as a Web Component is trivial:

```javascript
// cheetah-reader.js
class CheetahReader extends HTMLElement {
    connectedCallback() {
        // Create container
        const container = document.createElement('div');
        container.id = 'reader-' + Math.random();
        this.appendChild(container);

        // Initialize reader
        this.app = new CheetahReaderApp('#' + container.id, {
            theme: this.getAttribute('theme') || 'sepia',
            fontSize: parseInt(this.getAttribute('font-size')) || 18,
            speed: parseInt(this.getAttribute('speed')) || 400
        });

        // Forward events
        this.app.on('onModeChange', (mode) => {
            this.dispatchEvent(new CustomEvent('mode-change', { detail: mode }));
        });
    }

    disconnectedCallback() {
        this.app?.destroy();
    }

    // Public methods
    loadEPUB(file) {
        this.app?.loadEPUB(file);
    }

    startFlow() {
        this.app?.startFlow();
    }
}

customElements.define('cheetah-reader', CheetahReader);
```

**Usage**:
```html
<cheetah-reader theme="dark" font-size="20" speed="450"></cheetah-reader>

<script>
const reader = document.querySelector('cheetah-reader');
reader.loadEPUB(myFile);
reader.addEventListener('mode-change', (e) => {
    console.log('Mode changed to:', e.detail);
});
</script>
```

---

## NPM Package Structure

After refactoring, you can publish to NPM:

```
@cheetah/reader-engine/
├── dist/
│   ├── cheetah-reader.js         (UMD bundle)
│   ├── cheetah-reader.esm.js     (ES module)
│   ├── cheetah-reader.min.js     (Minified)
│   └── cheetah-reader.css        (Required styles)
├── types/
│   └── index.d.ts                (TypeScript definitions)
├── examples/
│   ├── vanilla/
│   ├── react/
│   ├── vue/
│   └── web-component/
└── README.md

Installation:
npm install @cheetah/reader-engine

Usage:
import CheetahReaderApp from '@cheetah/reader-engine';
import '@cheetah/reader-engine/dist/cheetah-reader.css';

const app = new CheetahReaderApp('#reader');
```

---

## Testing Strategy

### Before: Hard to test

```javascript
// Can't test EPUBService without DOM
// Can't test without a real EPUB file
// Can't test UI separately from engine
```

### After: Easy to test

```javascript
// Unit test: Services emit events
describe('EPUBService', () => {
    it('emits metadataUpdated when book loads', async () => {
        const service = new EPUBService();
        let emittedData;

        service.on('metadataUpdated', (data) => {
            emittedData = data;
        });

        await service.loadBook(mockEPUBFile);

        expect(emittedData.title).toBe('Test Book');
        expect(emittedData.author).toBe('Test Author');
    });
});

// Integration test: Full app
describe('CheetahReaderApp', () => {
    it('loads EPUB and emits events', async () => {
        const container = document.createElement('div');
        const app = new CheetahReaderApp(container);

        const events = [];
        app.onEPUB('*', (data) => events.push(data));

        await app.loadEPUB(mockFile);

        expect(events).toContainEqual(
            expect.objectContaining({ type: 'metadataUpdated' })
        );
    });
});

// UI test: React component
describe('ReaderComponent', () => {
    it('displays chapters when EPUB loads', async () => {
        const { getByText } = render(<ReaderComponent />);

        // Upload mock EPUB
        const file = new File(['...'], 'test.epub');
        fireEvent.change(screen.getByLabelText('Upload'), {
            target: { files: [file] }
        });

        // Wait for chapters to appear
        await waitFor(() => {
            expect(getByText('Chapter 1')).toBeInTheDocument();
        });
    });
});
```

---

## Migration Path for Existing Code

Don't rewrite everything at once. Add new API alongside old:

```javascript
// Step 1: Add new event-based API
class EPUBService {
    _updateMetadata() {
        // OLD: Direct DOM manipulation (deprecated)
        const titleEl = document.getElementById('book-title');
        if (titleEl) {
            titleEl.textContent = this.book.title;
        }

        // NEW: Emit event (preferred)
        this._emit('metadataUpdated', {
            title: this.book.title,
            author: this.book.author
        });

        console.warn('[DEPRECATED] EPUBService direct DOM updates will be removed in v2.0');
    }
}

// Step 2: Update consumers to use events
app.onEPUB('metadataUpdated', (data) => {
    document.getElementById('book-title').textContent = data.title;
});

// Step 3: Remove old DOM manipulation code (next major version)
```

---

## Comparison: Framework Integration Effort

### Current State (Coupled)
- **Vanilla JS**: ✅ 0 hours (already built)
- **React**: ❌ 40+ hours (need to refactor everything)
- **Vue**: ❌ 40+ hours (need to refactor everything)
- **Svelte**: ❌ 40+ hours (need to refactor everything)

### After Refactoring (Clean Bubble)
- **Vanilla JS**: ✅ 2 hours (rewrite app.js to use new API)
- **React**: ✅ 2 hours (see example above)
- **Vue**: ✅ 2 hours (same pattern as React)
- **Svelte**: ✅ 2 hours (same pattern as React)
- **Web Component**: ✅ 1 hour (wrapper only)
- **React Native**: ✅ 4 hours (render to WebView)
- **Electron**: ✅ 1 hour (already works in web context)

**Investment**: 25-30 hours once
**Return**: Save 35+ hours per framework integration

---

## Key Principles

### 1. Services are Data Providers, Not Controllers

```javascript
// ❌ Service should NOT control UI
class Service {
    doThing() {
        document.getElementById('status').textContent = 'Done';
    }
}

// ✅ Service should emit data
class Service {
    doThing() {
        this._emit('thingDone', { status: 'success', timestamp: Date.now() });
    }
}
```

### 2. One-Way Data Flow

```
Commands flow down:
UI → CheetahReaderApp → Services → Engine

Events flow up:
Engine → Services → CheetahReaderApp → UI

Never sideways or circular!
```

### 3. Public API is a Contract

```javascript
// This is a contract with consumers
class CheetahReaderApp {
    // ✅ Public - documented, stable
    loadEPUB(file) { ... }

    // ❌ Internal - not exposed, can change
    _internal() { ... }

    // ⚠️ Deprecated - warn before removing
    /** @deprecated Use getCurrentSettings() instead */
    get state() {
        console.warn('app.state is deprecated');
        return this._state;
    }
}
```

### 4. Dependency Injection Over Hardcoding

```javascript
// ❌ Hardcoded dependency
class Service {
    doThing() {
        document.getElementById('my-element').textContent = 'Hi';
    }
}

// ✅ Dependency injected
class Service {
    constructor(options = {}) {
        this.updateElement = options.updateElement || this._defaultUpdate;
    }

    doThing() {
        this.updateElement('my-element', 'Hi');
    }
}
```

---

## Success Story: What This Enables

After refactoring, here's what becomes possible:

### Scenario 1: Mobile App
Build a React Native reading app:
```jsx
import { WebView } from 'react-native-webview';

function ReaderScreen() {
    return (
        <WebView
            source={{ html: readerHTML }}
            onMessage={(event) => {
                const { type, data } = JSON.parse(event.nativeEvent.data);
                if (type === 'chapterEnd') {
                    // Track reading progress
                    analytics.track('chapter_completed', data);
                }
            }}
        />
    );
}
```

### Scenario 2: Chrome Extension
```javascript
// background.js
chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => {
            // Inject reader into any webpage
            const reader = new CheetahReaderApp('#content');
            reader.loadContent(document.body.innerHTML);
            reader.startFlow();
        }
    });
});
```

### Scenario 3: VS Code Extension
```typescript
// extension.ts
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
        'ebookReader',
        'Cheetah Reader',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = getWebviewContent();

    // Listen to messages from reader
    panel.webview.onDidReceiveMessage((message) => {
        if (message.type === 'saveProgress') {
            context.globalState.update('progress', message.data);
        }
    });
}
```

### Scenario 4: Headless Testing/Automation
```javascript
// Can run in Node.js with JSDOM
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><div id="reader"></div>');
global.document = dom.window.document;

const reader = new CheetahReaderApp('#reader');
reader.loadEPUB(testFile);

// Automated testing, content extraction, analysis
reader.onEPUB('chapterLoaded', (data) => {
    // Extract text for analysis
    analyzeReadability(data.content);
});
```

---

## Next Steps

1. **Review this plan** with team - any concerns?
2. **Approve API surface** - what's public, what's internal?
3. **Set timeline** - 2-3 weeks realistic?
4. **Assign ownership** - who owns each phase?
5. **Create tracking** - GitHub project board?
6. **Start Phase 0** - tests and documentation first

---

## Questions?

- **Q: Will this break existing users?**
  A: No. We'll deprecate gradually, maintain backwards compatibility during transition.

- **Q: Can we do this incrementally?**
  A: Yes. Each phase is independently shippable. Services can be refactored one at a time.

- **Q: What if we need to revert?**
  A: Git commits will be small and focused. Easy to revert individual changes.

- **Q: How do we prevent regression?**
  A: Integration tests + linting rules + code review checklist.

- **Q: When can we ship this?**
  A: Phase 1 can ship in Week 1. Full refactoring done by Week 3.

---

**Bottom Line**: This refactoring transforms Cheetah Reader from a monolithic app into a flexible, reusable library that works anywhere JavaScript runs. The one-time investment pays dividends in every future integration.
