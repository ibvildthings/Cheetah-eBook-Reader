# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cheetah Reader is a vanilla JavaScript speed-reading web app with EPUB support, "Flow Mode" (auto-scrolling word highlighting), Bionic Reading mode, and extensive customization. **No build tools, no frameworks** — just HTML, CSS, and JS with epub.js and DOMPurify as dependencies.

## Development

**No build step needed.** Open `index.html` in a browser or use a local dev server:

```bash
# Python 3
python -m http.server 8000

# Node.js (if you have http-server installed)
npx http-server -p 8000
```

Then open http://localhost:8000

## Architecture

### Core Engine (3-Layer Split)

The reader engine is split across three files for separation of concerns:

1. **ebook-reader-core.js** - Constants, utilities, state classes
   - `WordIndexManager` - Tracks word positions, handles viewport intersection
   - `FONTS` and `THEMES` registries (loaded from config/)
   - Error classes

2. **ebook-reader-engine.js** - Rendering, animation, gestures
   - DOM manipulation and word state updates
   - Flow mode animation loop (delegates to `Animator.js`)
   - Touch/wheel gesture handlers
   - Rendering logic (delegates to `Renderer.js`)

3. **ebook-reader-api.js** - Public API, event system
   - `EBookReader` class (extends `EBookReaderEngine`)
   - Public methods: `setFont()`, `setTheme()`, `play()`, `pause()`, etc.
   - Event emitter: `on()`, `off()`, `_emit()`

### State Management

**StateManager.js** is the single source of truth for application state:
- Reactive Observer pattern with subscriptions
- Supports dot notation: `state.get('flow.speed')`, `state.set('flow.speed', 400)`
- Services and UI subscribe to state changes
- **SettingsPersistence.js** auto-saves settings to localStorage

### Services

Services are stateless coordinators that react to StateManager changes:

- **FontService.js** - Font loading, application, and web font management
- **ThemeService.js** - Theme application, auto-theme (light/dark), CSS variable injection
- **EPUBService.js** - EPUB parsing, chapter navigation, image extraction, internal link handling

### Modules

Extracted for single-responsibility:

- **Renderer.js** - DOM rendering, bionic text generation, word wrapping
- **Animator.js** - Flow mode animation loop with newline pause logic
- **WordTracker.js** - Word position tracking and focus indicator

### Application Layer

**CheetahReaderApp.js** coordinates everything:
- Initializes reader, state, and services
- Loads persisted settings on startup
- Provides high-level API: `startFlow()`, `toggleBionic()`, `loadEPUB()`, etc.
- Handles chapter-end events (auto-advances to next chapter in flow mode)

**app.js** is the UI glue layer:
- Event listeners for buttons, sliders, file uploads
- DOM manipulation for sidebars and controls
- Syncs UI controls with state

## Critical Patterns

### Bug Fix Pattern (Race Conditions)

Several bugs involved race conditions during chapter changes or play/pause:

- **BUG #4**: Scroll invalidated cached word rects → `wordIndexManager.invalidate()` after scroll
- **BUG #5**: Speed change during playback → `animator.jumpTo()` to recalculate timeline
- **BUG #6**: Double-tap word jump → `animator.jumpTo()` instead of direct state mutation
- **BUG #9**: Chapter-end event fired for wrong chapter → validate `currentChapterIndex` matches finished chapter

**Pattern**: When state changes during animation, notify the Animator so it recalculates its internal timeline.

### Bionic Reading Rendering

Bionic mode bolds the first N characters of each word:
- Strength slider (0.2-0.7) controls fraction of word to bold
- Implemented in `Renderer.js` via `<strong class="bionic">` tags
- Re-renders entire content when toggled

### Flow Mode Word States

Three states: `active`, `inactive`, and default (no class):
- **Active words**: within `focusWidth` of current word, on same line
- **Inactive words**: all other visible words (opacity: 0.2)
- Uses IntersectionObserver to only update visible words for performance

### EPUB Image Handling

Images are extracted from EPUB archive using epub.js:
- `archive.request(resolvedUrl, 'blob')` fetches image as Blob
- Create blob URL with `URL.createObjectURL()`
- Cache blob URLs in `imageCache` Map
- Revoke URLs on cleanup to prevent memory leaks

### Event Flow

1. User interacts with UI (app.js)
2. UI calls CheetahReaderApp API method
3. CheetahReaderApp updates StateManager
4. StateManager notifies subscribers (services)
5. Services apply changes (DOM, CSS, etc.)
6. Renderer/Animator handle visual updates

## State Persistence

Settings are auto-saved to localStorage on every change:
- `SettingsPersistence.js` subscribes to all state changes
- Debounces saves to avoid thrashing (500ms)
- Loads on app init (priority: saved > options > defaults)
- Export/import settings as JSON

## Common Tasks

### Adding a New Theme

1. Edit `config/themes.js` - add theme object to `THEMES`
2. Add `<option>` to theme selector in `index.html`
3. Theme will auto-apply via ThemeService

### Adding a New Font

1. Edit `config/fonts.js` - add font config to `FONTS`
2. If web font: include `url` property for CDN or local file
3. FontService handles loading and application
4. Add `<option>` to font selector in `index.html`

### Debugging Flow Mode Issues

Enable console logging:
- Look for `🐆` prefixed logs (engine lifecycle)
- Check `Animator.js` logs for timeline calculations
- Verify `WordIndexManager.rebuild()` is called after DOM changes
- Use `app.reader.getState()` to inspect current state

### Testing EPUB Files

Place EPUB in root directory and upload via UI, or:
```javascript
// In browser console
const file = await fetch('test.epub').then(r => r.blob());
app.loadEPUB(new File([file], 'test.epub'));
```

## Code Style

- ES6+ features OK (no transpilation)
- Prefer `const`/`let` over `var`
- Class-based architecture, not functional components
- No JSDoc for every function, but document complex logic
- Use `console.log()` with emoji prefixes for debugging (🐆 for core, ✅ for success, ❌ for errors)
