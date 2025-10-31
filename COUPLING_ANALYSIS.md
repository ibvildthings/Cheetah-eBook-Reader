# eBook Reader - Core Engine & UI Layer Coupling Analysis

## Executive Summary
The codebase has significant coupling between the core reader engine (the "bubble") and the outer app's DOM and UI layer. The analysis identified **38+ coupling points** across 6 key areas. While some coupling is acceptable (like the reader rendering into its container), many issues require abstraction.

---

## 1. DIRECT DOM QUERIES IN SERVICE FILES

### 1.1 EPUBService - Extensive DOM Coupling
**File**: `/Users/priteshdesai/Developer/eBook-Reader/EPUBService.js`

| Line(s) | Issue | Severity | Details |
|---------|-------|----------|---------|
| 34-36 | `document.getElementById('chapters-list')` | HIGH | Direct DOM query in loadBook(). Should use injected elements or callbacks |
| 71-75 | `document.getElementById('book-title')` and `'book-author'` | HIGH | Updates UI metadata directly in _updateMetadata(). Service shouldn't touch outer app DOM |
| 93-99 | `document.getElementById('chapters-list')` | HIGH | Manipulates chapters sidebar in _extractChapters(). Clears and rebuilds UI |
| 104-109 | `document.getElementById('chapters-list')` | HIGH | Sets innerHTML directly for empty state |
| 125-126 | Creates chapter elements and appends to DOM | HIGH | _createChapterElement() generates UI but appends to specific container |
| 139-152 | `div.addEventListener('click')` | MEDIUM | Event binding in _createChapterElement(). Tight coupling to chapter selection |
| 208-211 | `document.querySelector('.ebook-reader-area')` | HIGH | Direct query for reader element in loadChapter() for scroll reset |
| 441-462 | `document.querySelectorAll('.chapter-item')` | HIGH | _updateActiveChapter() directly manipulates chapter-item classes |
| 447-456 | `document.getElementById('chapters-list')` | HIGH | Updates sidebar scroll position from service |
| 473-480 | `document.querySelector('.ebook-text-content')` | HIGH | _attachLinkHandlers() queries content area to attach link handlers |
| 585-597 | `document.getElementById(anchor)`, `document.querySelector()` | MEDIUM | _scrollToAnchor() assumes specific DOM structure |
| 615-630 | `document.getElementById('chapter-nav-bar')`, `'prev-chapter-btn'`, `'next-chapter-btn'` | HIGH | _updateChapterNavBar() directly manipulates chapter navigation bar visibility/state |
| 671-673 | `document.getElementById('chapter-nav-bar')` | HIGH | _cleanup() hides nav bar directly |

**Problem**: EPUBService acts as both content service AND UI controller. It should only manage EPUB data, delegating UI updates to callbacks or events.

---

### 1.2 FontService - Document Head Manipulation
**File**: `/Users/priteshdesai/Developer/eBook-Reader/FontService.js`

| Line(s) | Issue | Severity | Details |
|---------|-------|----------|---------|
| 113 | `document.querySelector(\`style[data-font="${fontKey}"]\`)` | MEDIUM | Direct DOM query to check if font style exists |
| 120-135, 144 | `document.head.appendChild(style)` | HIGH | Directly appends style tags to document head. Hard to test, manage, or override |
| 176 | `document.querySelector(\`link[data-font="${fontKey}"]\`)` | MEDIUM | Direct DOM query for link elements |
| 182-217 | `document.head.appendChild(link)` | HIGH | Appends font link tags directly to head |
| 196 | `document.fonts.ready` | MEDIUM | Assumes browser FontAPI, no fallback abstraction |

**Problem**: FontService couples font loading directly to DOM operations. Should defer style injection to app layer or use event notifications.

---

### 1.3 ThemeService - Container Element Manipulation
**File**: `/Users/priteshdesai/Developer/eBook-Reader/ThemeService.js`

| Line(s) | Issue | Severity | Details |
|---------|-------|----------|---------|
| 59-74 | `querySelector('.ebook-reader-root')`, `'.ebook-reader-area'`, `'.ebook-text-content'` | HIGH | Direct DOM queries to apply theme styles |
| 76-79 | `querySelectorAll('.bionic')` | HIGH | Queries and updates bionic element styles directly |
| 82-83 | `setProperty('--theme-accent')`, `'--theme-focus'` | MEDIUM | Sets CSS variables directly on container. Assumes container exists |

**Problem**: ThemeService knows about specific class names and DOM structure of reader. Should receive style targets as constructor params.

---

## 2. DIRECT DOM MANIPULATION BY APP.JS

### 2.1 UI Synchronization - Hardcoded Element IDs
**File**: `/Users/priteshdesai/Developer/eBook-Reader/app.js`

| Line(s) | Element ID | Issue | Severity |
|---------|-----------|-------|----------|
| 40-49 | `#font-select`, `#fontsize-slider`, `#fontsize-value` | syncUIWithState() reads hardcoded IDs | HIGH |
| 53-59 | `#lineheight-slider`, `#lineheight-value` | Updates UI values directly | HIGH |
| 62-68 | `#theme-select`, `#theme-auto` | Couples to specific UI control names | HIGH |
| 72-85 | `#margin-left-slider`, `#margin-left-value`, `#margin-right-slider`, `#margin-right-value` | Margin UI sync | HIGH |
| 89-101 | `#btn-bionic`, `#bionic-strength-slider`, `#bionic-strength-value` | Bionic UI sync | HIGH |
| 104-127 | `#speed-slider`, `#speed-value`, `#focus-slider`, `#focus-value`, `#scroll-slider`, `#scroll-value` | Flow mode UI sync | HIGH |
| 140-147 | `#upload-btn`, `#epub-upload` | Event binding with specific IDs | MEDIUM |
| 152-173 | `#paste-btn`, `#book-title`, `#book-author`, `#chapters-list` | Paste handler updates UI directly | HIGH |
| 178-184 | `#chapters-toggle`, `#chapters-sidebar`, `#sidebar-toggle`, `#sidebar` | Sidebar toggle logic | MEDIUM |
| 186-195 | `.section-header` with `data-section` selectors | Section collapse logic | MEDIUM |
| 200-206 | `#prev-chapter-btn`, `#next-chapter-btn` | Chapter navigation binding | MEDIUM |
| 218-232 | `#drag-left`, `#drag-right` | Margin drag zone updates | HIGH |
| 225-230 | Updates margin drag zones and labels directly | Updates `.ebook-text-content` padding directly | HIGH |
| 232 | `app.reader.updateLayout()` | Calls private reader method from app layer | HIGH |
| 241-274 | Drag and drop event handlers with DOM manipulation | Multiple direct DOM updates | HIGH |
| 287-288 | `app.state.subscribe()` | Subscribes to state changes | MEDIUM |
| 293-304 | `#btn-flow` button logic | Updates button appearance based on mode | MEDIUM |
| 299-303 | Updates button text and class directly | Direct DOM manipulation based on state | MEDIUM |
| 309-337 | Bionic strength slider handling | Updates opacity and disabled state directly | HIGH |
| 342-356 | Slider event handlers in loop | All 5 sliders with direct ID queries | HIGH |
| 361-363 | `#font-select` change event | Direct app method calls | MEDIUM |
| 368-378 | `#theme-select`, `#theme-auto` change events | Direct state manipulation | MEDIUM |
| 383-408 | `#reset-settings-btn` with `location.reload()` | Page reload on reset | MEDIUM |

**Problem**: app.js has 50+ `document.getElementById()` calls and 30+ direct DOM updates. This is a heavy coupling to the HTML structure. If element IDs change, app.js breaks.

---

## 3. INTERNAL PROPERTY ACCESS

### 3.1 CheetahReaderApp accessing internal reader properties
**File**: `/Users/priteshdesai/Developer/eBook-Reader/CheetahReaderApp.js`

| Line(s) | Access | Severity | Details |
|---------|--------|----------|---------|
| 76 | `this.reader.container` | MEDIUM | Accesses internal property directly |
| 81 | `this.reader.el?.content` | MEDIUM | Accesses internal `el` property to get content element |

**Problem**: These are implementation details. CheetahReaderApp shouldn't know about reader's internal structure.

---

### 3.2 app.js accessing CheetahReaderApp internals
**File**: `/Users/priteshdesai/Developer/eBook-Reader/app.js`

| Line(s) | Access | Severity | Details |
|---------|--------|----------|---------|
| 41-127 | `app.state.get()` | HIGH | Direct state access throughout syncUIWithState() |
| 214 | `app.state.get()` | HIGH | In updateMarginsUI() |
| 232 | `app.reader.updateLayout()` | HIGH | Calls reader method directly |
| 241-254 | `app.state.get()` | HIGH | In startDrag() |
| 287-288 | `app.state.subscribe()` | HIGH | Subscribes to state manager's events |
| 294 | `app.reader.getState().mode` | HIGH | Accesses reader internal state |

**Problem**: app.js directly accesses app.state and app.reader, which are implementation details of CheetahReaderApp. Should use public API only.

---

## 4. CSS COUPLING

### 4.1 Hard-Coded Class Names in Services
**File**: `/Users/priteshdesai/Developer/eBook-Reader/ThemeService.js`

| Line(s) | Class Name | Severity | Details |
|---------|-----------|----------|---------|
| 59 | `.ebook-reader-root` | MEDIUM | Hard-coded class name for root element |
| 60 | `.ebook-reader-area` | MEDIUM | Hard-coded for reader area |
| 61 | `.ebook-text-content` | MEDIUM | Hard-coded for content area |
| 76 | `.bionic` | MEDIUM | Hard-coded for bionic reading elements |

---

### 4.2 CSS Variables as Internal API
**File**: `/Users/priteshdesai/Developer/eBook-Reader/ThemeService.js`

| Line(s) | Variable | Severity | Details |
|---------|----------|----------|---------|
| 82-83 | `--theme-accent`, `--theme-focus` | MEDIUM | Sets CSS variables on container. Couples to CSS implementation |

**File**: `/Users/priteshdesai/Developer/eBook-Reader/ebook-reader-engine.js`

| Line(s) | Variable | Severity | Details |
|---------|----------|----------|---------|
| CSS rule | `var(--theme-focus, rgba(59,130,246,.08))` | MEDIUM | Reader CSS depends on ThemeService variables |

---

### 4.3 Hard-Coded Scroll and Style Properties
**File**: `/Users/priteshdesai/Developer/eBook-Reader/EPUBService.js`

| Line(s) | Issue | Severity | Details |
|---------|-------|----------|---------|
| 34-36, 103, 210 | `scrollTop = 0` | MEDIUM | Direct scroll manipulation |
| 455 | `scrollIntoView()` | MEDIUM | Uses browser API directly |
| 602-605 | `scrollIntoView()` with options | MEDIUM | Assumes smooth scroll support |
| 362 | `style='max-width: 100%; height: auto; display: block; margin: 1em auto;'` | MEDIUM | Hard-coded image styling |

---

## 5. SCROLL AND LAYOUT MANAGEMENT

### 5.1 Direct scroll manipulation
**File**: `/Users/priteshdesai/Developer/eBook-Reader/Renderer.js`

| Line(s) | Issue | Severity | Details |
|---------|-------|----------|---------|
| 204 | `this.el.reader.scrollTop` | MEDIUM | Reads scroll position directly from reader element |
| 208 | `this.el.focus.style.top = absoluteTop` | MEDIUM | Positions focus indicator based on scroll |

**File**: `/Users/priteshdesai/Developer/eBook-Reader/ebook-reader-engine.js`

| Line(s) | Issue | Severity | Details |
|---------|-------|----------|---------|
| Unspecified | `this.el.reader.scrollTop` | MEDIUM | Multiple references to reader scroll state |

---

## 6. ARCHITECTURE VIOLATIONS

### 6.1 Services Mixing Concerns

**EPUBService** (File: `/Users/priteshdesai/Developer/eBook-Reader/EPUBService.js`)
- Content loading ✓ (legitimate)
- EPUB parsing ✓ (legitimate)
- UI updates for chapters list ✗ (should delegate)
- Sidebar state management ✗ (should delegate)
- Navigation bar visibility ✗ (should delegate)
- Link attachment and handling ✗ (should be in content renderer)

---

### 6.2 Missing Abstraction Boundaries

```
IDEAL ARCHITECTURE:
┌────────────────────────────────────┐
│  app.js (UI Controller)            │
│  - Listen to reader events         │
│  - Update DOM directly             │
│  - Handle user input               │
└────────────────────────────────────┘
              ↓ (Public API)
┌────────────────────────────────────┐
│  CheetahReaderApp (Public API)     │
│  - Expose only public methods      │
│  - Manage services internally      │
└────────────────────────────────────┘
              ↓ (Public API)
┌────────────────────────────────────┐
│  Reader Engine (Core)              │
│  - No DOM access (except own)      │
│  - Emit events for changes         │
│  - Pure data processing            │
└────────────────────────────────────┘

CURRENT ARCHITECTURE:
┌────────────────────────────────────┐
│  app.js                            │
│  - Direct DOM queries: 50+         │
│  - Direct state access: 30+        │
│  - Direct reader access: 5+        │
└────────────────────────────────────┘
     ↓ ↓ ↓ (Tangled Access)
┌────────────────────────────────────┐
│  CheetahReaderApp                  │
│  - Exposes .state, .reader, .el    │
│  - Services access DOM directly    │
└────────────────────────────────────┘
     ↓ ↓ ↓ (Tangled Access)
┌────────────────────────────────────┐
│  Reader Engine                     │
│  - Services query its DOM          │
│  - Direct class manipulations      │
└────────────────────────────────────┘
```

---

## SUMMARY: COUPLING HOTSPOTS

### HIGH SEVERITY (Must Fix)
1. **EPUBService DOM access** (13 issues)
   - Updates chapters list, book metadata, nav bar
   - Should emit events instead

2. **FontService head manipulation** (2 issues)
   - Directly appends styles to document.head
   - Should provide styles to caller or use events

3. **app.js direct DOM queries** (50+ issues)
   - Every control update queries by ID
   - Should use CheetahReaderApp public API only

4. **app.js internal property access** (6 issues)
   - Accesses app.state, app.reader internals
   - Should use only public API methods

5. **ThemeService DOM queries** (4 issues)
   - Hard-coded class selectors
   - Should receive elements as constructor params

### MEDIUM SEVERITY (Improve)
1. **Direct scroll manipulation** (multiple locations)
2. **Hard-coded element styling** (EPUBService)
3. **Class name coupling** (ThemeService)
4. **Direct event binding in services** (EPUBService)

### DEPENDENCIES
- **EPUBService depends on**: `#chapters-list`, `#book-title`, `#book-author`, `.ebook-reader-area`, `.ebook-text-content`, `#chapter-nav-bar`, `.chapter-item`, `[name]` attributes
- **FontService depends on**: `document.head`
- **ThemeService depends on**: `.ebook-reader-root`, `.ebook-reader-area`, `.ebook-text-content`, `.bionic`
- **Renderer depends on**: `.flow-word`, `.ebook-text-content`, `.ebook-reader-area`, scroll API
- **app.js depends on**: 50+ hardcoded element IDs

