# Coupling Analysis - Quick Reference

## By Severity

### 🔴 HIGH - 26+ Issues
**Must fix for clean architecture**

#### EPUBService (13 issues)
- Lines 34-36: Queries `#chapters-list` for sidebar operations
- Lines 71-75: Updates `#book-title`, `#book-author` metadata
- Lines 93-109: Manipulates `#chapters-list` (clear, populate, empty state)
- Lines 125-152: Creates chapter items and attaches click listeners
- Lines 208-211: Queries `.ebook-reader-area` for scroll reset
- Lines 441-462: Updates `.chapter-item` active states directly
- Lines 447-456: Scrolls `#chapters-list` within sidebar
- Lines 473-480: Queries `.ebook-text-content` for link attachment
- Lines 615-630: Manages `#chapter-nav-bar`, `#prev-chapter-btn`, `#next-chapter-btn`
- Lines 671-673: Hides nav bar in cleanup

#### FontService (2 issues)
- Lines 120-144: Appends `<style>` tag to `document.head`
- Lines 182-217: Appends `<link>` tag to `document.head`

#### app.js (11+ issues)
- Lines 40-127: Direct state access for UI sync in `syncUIWithState()`
- Lines 164-167: Sets `#book-title`, `#book-author` directly
- Lines 225-230: Updates `#drag-left`, `#drag-right` width and padding
- Lines 232: Calls `app.reader.updateLayout()` (internal method)
- Lines 218-222: Updates `.ebook-text-content` padding directly
- Multiple slider handlers with `document.getElementById()` queries

#### ThemeService (4 issues)
- Lines 59-74: Queries `.ebook-reader-root`, `.ebook-reader-area`, `.ebook-text-content`
- Lines 76-79: Queries and updates `.bionic` elements

---

### 🟡 MEDIUM - 15+ Issues
**Improve for maintainability**

#### FontService
- Line 113: Query for existing font styles
- Line 176: Query for existing font links
- Line 196: Direct document.fonts.ready API

#### EPUBService
- Lines 148-150: Event binding in _createChapterElement
- Lines 585-597: _scrollToAnchor DOM queries and scrollIntoView
- Lines 362: Hard-coded image styles
- Lines 34-36, 103, 210: Direct scrollTop manipulation

#### ThemeService
- Lines 82-83: Sets CSS variables `--theme-accent`, `--theme-focus`

#### Renderer
- Lines 204, 208: Reads/writes scroll position and focus indicator position

#### app.js
- Direct event binding to 50+ element IDs
- Direct state subscription (lines 287-288)
- Direct reader state access (line 294)

---

## By Layer

### Reader Engine Internal
Files: `ebook-reader-api.js`, `ebook-reader-engine.js`, `ebook-reader-core.js`
- ✓ Can manipulate own DOM (within `#reader` container)
- ✗ Should NOT query outer app elements
- ✗ Should NOT access document.head
- Status: MOSTLY CLEAN (some services violate this)

### Services Layer
Files: `EPUBService.js`, `FontService.js`, `ThemeService.js`
- ✓ Can subscribe to state changes
- ✓ Can emit events
- ✓ Can return data
- ✗ Should NOT query outer app DOM
- ✗ Should NOT manipulate DOM outside reader
- Status: HIGHLY COUPLED

### CheetahReaderApp Controller
File: `CheetahReaderApp.js`
- ✓ Can access reader.container (internal)
- ✓ Can access reader.el.content (internal)
- ✗ Should NOT expose these as public API
- Status: PARTIALLY CLEAN

### app.js - UI Layer
File: `app.js`
- ✓ Can query and manipulate outer app DOM
- ✓ Can listen to events
- ✓ Can call public API methods
- ✗ Should NOT directly access app.state
- ✗ Should NOT directly access app.reader internals
- ✗ Should NOT call private methods
- Status: TIGHTLY COUPLED

---

## Dependency Graph

```
┌─────────────────────────────┐
│  app.js (UI Layer)          │
├─────────────────────────────┤
│ Depends on (correctly):     │
│  - CheetahReaderApp public  │
│                             │
│ Depends on (WRONG):         │
│  - app.state.get()          │
│  - app.state.subscribe()    │
│  - app.reader.updateLayout()│
│  - app.reader.getState()    │
│  - #font-select (50+ IDs)   │
│  - Document.head indirectly │
└─────────────────────────────┘
          ↑ ↑ ↑ (WRONG)
┌─────────────────────────────┐
│ CheetahReaderApp            │
├─────────────────────────────┤
│ Should expose:              │
│  - loadContent()            │
│  - setFont(), setTheme()    │
│  - setMargins(), etc.       │
│  - Events/callbacks         │
│                             │
│ Should NOT expose:          │
│  - .state                   │
│  - .reader                  │
│  - .container               │
│  - .el                      │
└─────────────────────────────┘
          ↑ ↑ ↑ (WRONG)
┌─────────────────────────────┐
│ Services & Reader Engine    │
├─────────────────────────────┤
│ EPUBService touches:        │
│  - #chapters-list           │
│  - #book-title, #book-author
│  - #chapter-nav-bar         │
│  - .ebook-reader-area       │
│  - .ebook-text-content      │
│  - .chapter-item            │
│                             │
│ FontService touches:        │
│  - document.head            │
│  - style[data-font]         │
│  - link[data-font]          │
│                             │
│ ThemeService touches:       │
│  - .ebook-reader-root       │
│  - .ebook-reader-area       │
│  - .ebook-text-content      │
│  - .bionic                  │
│  - CSS variables            │
└─────────────────────────────┘
```

---

## Fix Priority

### Phase 1 (Critical)
1. Refactor EPUBService to emit events instead of manipulating DOM
   - NEW: `onChaptersUpdated`, `onChapterSelected`, `onMetadataLoaded`
   - app.js listens and updates DOM accordingly
   
2. Move font style injection to app layer
   - FontService returns `{ css, link }` objects
   - app.js injects into document.head

3. Refactor ThemeService constructor to accept elements
   - ThemeService(stateManager, { root, reader, content, bionic })

### Phase 2 (Important)
4. Create public-only API for CheetahReaderApp
   - Hide .state, .reader, .el, .container
   - Expose: getFontSize(), setFontSize(), getTheme(), setTheme(), etc.

5. Refactor app.js to use public API only
   - Replace `app.state.get()` with `app.getState()`
   - Replace direct DOM queries with data binding

### Phase 3 (Nice-to-have)
6. Extract scroll management into separate module
7. Implement observer pattern for layout changes
8. Replace hard-coded CSS variables with configuration

---

## Testing Impact

### Current
- Services require real DOM to test
- EPUBService cannot be unit tested without HTML
- FontService cannot be mocked for testing
- app.js is integration-only testable

### After Refactoring
- Services become unit-testable
- Can mock DOM elements
- Can test logic independently
- app.js becomes easier to test with event-based architecture

