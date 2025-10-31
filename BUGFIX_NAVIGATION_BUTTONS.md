# Bug Fix: Chapter Navigation Buttons Not Showing

**Issue**: Chapter navigation buttons (Previous/Next) not appearing after loading EPUB

**Root Cause**: Event listener timing issue

## The Problem

The EPUB event listeners in `app.js` were being set up **immediately** when the script loaded, but the `EPUBService` wasn't created until **100ms later** (inside a `setTimeout` in `CheetahReaderApp.js`).

When `app.onEPUB()` was called, it tried to delegate to `this._epubService.on()`, but `_epubService` was still `undefined`, so the event listeners never got attached.

## The Fix

Wrapped all EPUB event listener setup in a `setTimeout(..., 200)` to ensure they're registered **after** the services are initialized:

```javascript
// BEFORE (broken)
app.onEPUB('metadataUpdated', (data) => { ... });
app.onEPUB('chaptersExtracted', (data) => { ... });
app.onEPUB('navigationStateChanged', (data) => { ... });
// ... etc

// AFTER (fixed)
setTimeout(() => {
    console.log('🔌 Setting up EPUB event listeners...');

    app.onEPUB('metadataUpdated', (data) => { ... });
    app.onEPUB('chaptersExtracted', (data) => { ... });
    app.onEPUB('navigationStateChanged', (data) => { ... });
    // ... etc

    console.log('✅ EPUB event listeners set up successfully');
}, 200); // Wait for services to initialize
```

## Timeline

1. **0ms**: App initializes, services = null
2. **100ms**: Services created (EPUBService, FontService, ThemeService)
3. **200ms**: Event listeners set up (now EPUBService exists!)
4. **User uploads EPUB**: Events fire correctly → buttons appear ✅

## Testing

Now when you load an EPUB, you should see these console logs in order:

1. `🔌 Setting up EPUB event listeners...`
2. `✅ EPUB event listeners set up successfully`
3. `📚 Chapters extracted: {...}`
4. `🧭 Navigation state changed: {visible: true, ...}`
5. `🧭 Setting nav bar display to: flex`

And the chapter navigation buttons should appear at the bottom of the reader! 🎉

## Files Modified

- `app.js` - Wrapped EPUB event listeners in setTimeout
