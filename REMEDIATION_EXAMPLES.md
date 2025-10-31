# Coupling Issues - Remediation Examples

This document shows specific before/after code examples for fixing coupling issues.

---

## 1. EPUBService - Remove Direct DOM Manipulation

### Issue: _updateMetadata() directly updates outer app DOM
**File**: EPUBService.js, Lines 68-87

**BEFORE** (HIGH coupling):
```javascript
_updateMetadata() {
    const metadata = this.book.packaging.metadata;
    
    const titleEl = document.getElementById('book-title');
    const authorEl = document.getElementById('book-author');

    if (titleEl) {
        titleEl.textContent = metadata.title || 'Unknown Title';
    }

    if (authorEl) {
        const author = metadata.creator || 'Unknown Author';
        authorEl.textContent = author;
    }
}
```

**AFTER** (Event-based):
```javascript
_updateMetadata() {
    const metadata = this.book.packaging.metadata;
    
    // Emit event instead of updating DOM
    this._emitEvent('metadataLoaded', {
        title: metadata.title || 'Unknown Title',
        author: metadata.creator || 'Unknown Author'
    });
}
```

**Consumer (app.js)**:
```javascript
// Listen for events
app.reader.on('metadataLoaded', (data) => {
    const titleEl = document.getElementById('book-title');
    const authorEl = document.getElementById('book-author');
    
    if (titleEl) titleEl.textContent = data.title;
    if (authorEl) authorEl.textContent = data.author;
});
```

---

## 2. EPUBService - Extract Chapter List Building

### Issue: _extractChapters() manipulates sidebar DOM
**File**: EPUBService.js, Lines 92-133

**BEFORE** (HIGH coupling):
```javascript
async _extractChapters() {
    const chaptersList = document.getElementById('chapters-list');
    if (!chaptersList) {
        console.warn('Chapters list element not found');
        return;
    }

    chaptersList.innerHTML = '';
    this.chapters = [];
    
    // Reset scroll position
    chaptersList.scrollTop = 0;

    const toc = await this.book.loaded.navigation.then(nav => nav.toc);

    if (!toc || toc.length === 0) {
        chaptersList.innerHTML = '<div class="chapters-list-empty">No chapters found</div>';
        return;
    }

    for (let i = 0; i < toc.length; i++) {
        const item = toc[i];
        
        this.chapters.push({
            id: item.id,
            href: item.href,
            label: item.label,
            index: i
        });

        const chapterElement = this._createChapterElement(i, item.label);
        chaptersList.appendChild(chapterElement);
    }

    this._updateChapterNavBar();
}
```

**AFTER** (Data-only):
```javascript
async _extractChapters() {
    this.chapters = [];

    const toc = await this.book.loaded.navigation.then(nav => nav.toc);

    if (!toc || toc.length === 0) {
        // Emit empty event
        this._emitEvent('chaptersUpdated', { chapters: [] });
        return;
    }

    for (let i = 0; i < toc.length; i++) {
        const item = toc[i];
        
        this.chapters.push({
            id: item.id,
            href: item.href,
            label: item.label,
            index: i
        });
    }

    // Emit chapters data (no DOM manipulation)
    this._emitEvent('chaptersUpdated', { 
        chapters: this.chapters 
    });
}
```

**Consumer (app.js)**:
```javascript
app.reader.on('chaptersUpdated', (data) => {
    const chaptersList = document.getElementById('chapters-list');
    
    if (!chaptersList) return;
    
    chaptersList.innerHTML = '';
    
    if (data.chapters.length === 0) {
        chaptersList.innerHTML = '<div class="chapters-list-empty">No chapters found</div>';
        return;
    }
    
    data.chapters.forEach((chapter, index) => {
        const div = document.createElement('div');
        div.className = 'chapter-item';
        div.dataset.index = index;
        div.innerHTML = `
            <span class="chapter-number">${index + 1}</span>
            <span class="chapter-title">${truncateText(chapter.label, 60)}</span>
        `;
        
        div.addEventListener('click', () => {
            app.loadChapter(index);
        });
        
        chaptersList.appendChild(div);
    });
});
```

---

## 3. FontService - Move Style Injection to App Layer

### Issue: FontService directly appends to document.head
**File**: FontService.js, Lines 110-168

**BEFORE** (HIGH coupling):
```javascript
async _loadCDNFont(fontKey, font) {
    return new Promise((resolve, reject) => {
        const existingStyle = document.querySelector(`style[data-font="${fontKey}"]`);
        if (existingStyle) {
            resolve();
            return;
        }

        // Create @font-face style
        const style = document.createElement('style');
        style.setAttribute('data-font', fontKey);
        style.textContent = `...`;

        const timeout = setTimeout(() => {
            reject(new Error('Font load timeout'));
        }, 5000);

        // DIRECTLY APPEND TO HEAD
        document.head.appendChild(style);
        
        // ... rest of logic
    });
}
```

**AFTER** (Return styles, let app inject):
```javascript
async _loadCDNFont(fontKey, font) {
    // Return the CSS content, not the injected style
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Font load timeout'));
        }, 5000);

        // Return the CSS content
        const css = `
            @font-face {
                font-family: 'OpenDyslexic';
                src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Regular.woff') format('woff');
                font-weight: 400;
                font-style: normal;
            }
            @font-face {
                font-family: 'OpenDyslexic';
                src: url('https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/woff/OpenDyslexic-Bold.woff') format('woff');
                font-weight: 700;
                font-style: normal;
            }
        `;

        // Emit event with CSS - let app layer inject it
        this._emitEvent('fontCSSReady', { fontKey, css });

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
                clearTimeout(timeout);
                resolve();
            }).catch(error => {
                clearTimeout(timeout);
                reject(error);
            });
        } else {
            setTimeout(() => {
                clearTimeout(timeout);
                resolve();
            }, 500);
        }
    });
}
```

**Consumer (app.js)**:
```javascript
// Listen for font CSS ready
fontService.on('fontCSSReady', (data) => {
    const existingStyle = document.querySelector(`style[data-font="${data.fontKey}"]`);
    if (existingStyle) return;
    
    const style = document.createElement('style');
    style.setAttribute('data-font', data.fontKey);
    style.textContent = data.css;
    
    // Now APP layer injects it
    document.head.appendChild(style);
});
```

---

## 4. ThemeService - Dependency Injection

### Issue: ThemeService hard-codes class selectors
**File**: ThemeService.js, Lines 51-85

**BEFORE** (HIGH coupling):
```javascript
applyTheme(themeName) {
    if (!this.container) return;
    
    const THEMES = window.EBookReaderCore?.THEMES || {};
    const theme = THEMES[themeName];
    
    if (!theme) return;
    
    // Hard-coded class selectors
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
}
```

**AFTER** (Dependency injection):
```javascript
class ThemeService {
    constructor(stateManager, container, elements = {}) {
        this.stateManager = stateManager;
        this.container = container;
        
        // Receive elements as dependencies
        this.elements = {
            root: elements.root || container?.querySelector('.ebook-reader-root'),
            reader: elements.reader || container?.querySelector('.ebook-reader-area'),
            content: elements.content || container?.querySelector('.ebook-text-content'),
            bionicList: elements.bionicList || container?.querySelectorAll('.bionic')
        };
        
        // Subscribe to changes...
    }
    
    applyTheme(themeName) {
        const THEMES = window.EBookReaderCore?.THEMES || {};
        const theme = THEMES[themeName];
        
        if (!theme) return;
        
        // Use injected elements
        if (this.elements.root) {
            this.elements.root.style.background = theme.background;
        }
        
        if (this.elements.reader) {
            this.elements.reader.style.background = theme.contentBg;
            this.elements.reader.style.boxShadow = `0 4px 20px ${theme.shadow}`;
        }
        
        if (this.elements.content) {
            this.elements.content.style.color = theme.text;
        }
    }
}
```

**Usage in CheetahReaderApp.js**:
```javascript
// Pass elements to service
const themeService = new ThemeService(this.state, this.container, {
    root: this.reader.el.root,
    reader: this.reader.el.reader,
    content: this.reader.el.content,
    bionicList: this.reader.el.content?.querySelectorAll('.bionic')
});
```

---

## 5. app.js - Replace Direct State Access with Public API

### Issue: app.js directly accesses app.state and app.reader internals

**BEFORE** (HIGH coupling):
```javascript
// In app.js - syncUIWithState()
function syncUIWithState() {
    const fontSelect = document.getElementById('font-select');
    if (fontSelect) fontSelect.value = app.state.get('font');
    
    const fontSize = app.state.get('fontSize');
    const fontSizeSlider = document.getElementById('fontsize-slider');
    if (fontSizeSlider) {
        fontSizeSlider.value = fontSize;
    }
    
    // ... 30+ more state accesses
}

// Direct reader access
document.getElementById('drag-left').addEventListener('click', () => {
    app.reader.updateLayout();  // Calling private method
});
```

**AFTER** (Public API only):
```javascript
// CheetahReaderApp.js - Add public getters
class CheetahReaderApp {
    // ... existing code ...
    
    // New public API methods
    getState() {
        return this.state.getAll();
    }
    
    getFontSize() {
        return this.state.get('fontSize');
    }
    
    getFont() {
        return this.state.get('font');
    }
    
    getTheme() {
        return this.state.get('theme');
    }
    
    getMargins() {
        return {
            left: this.state.get('marginL'),
            right: this.state.get('marginR')
        };
    }
    
    updateLayout() {
        if (this.reader) {
            this.reader.updateLayout();
        }
    }
    
    // ... etc for all other accessors
}
```

**In app.js**:
```javascript
// Use public API instead
function syncUIWithState() {
    const fontSelect = document.getElementById('font-select');
    if (fontSelect) fontSelect.value = app.getFont();
    
    const fontSize = app.getFontSize();
    const fontSizeSlider = document.getElementById('fontsize-slider');
    if (fontSizeSlider) {
        fontSizeSlider.value = fontSize;
    }
    
    // ... etc
}

// Use public method instead of private
document.getElementById('drag-left').addEventListener('click', () => {
    app.updateLayout();  // Now it's a public API
});
```

---

## 6. EPUBService - Remove Chapter Navigation Bar Manipulation

### Issue: _updateChapterNavBar() directly manages outer app element
**File**: EPUBService.js, Lines 614-631

**BEFORE** (HIGH coupling):
```javascript
_updateChapterNavBar() {
    const navBar = document.getElementById('chapter-nav-bar');
    const prevBtn = document.getElementById('prev-chapter-btn');
    const nextBtn = document.getElementById('next-chapter-btn');
    
    if (!navBar || !prevBtn || !nextBtn) return;
    
    if (this.chapters.length > 0) {
        navBar.style.display = 'flex';
        
        prevBtn.disabled = this.currentChapterIndex <= 0;
        nextBtn.disabled = this.currentChapterIndex >= this.chapters.length - 1;
    } else {
        navBar.style.display = 'none';
    }
}
```

**AFTER** (Event-based):
```javascript
_updateChapterNavBar() {
    // Just emit event with state
    this._emitEvent('chapterNavigationStateChanged', {
        hasChapters: this.chapters.length > 0,
        currentIndex: this.currentChapterIndex,
        totalChapters: this.chapters.length,
        canGoNext: this.currentChapterIndex < this.chapters.length - 1,
        canGoPrev: this.currentChapterIndex > 0
    });
}
```

**Consumer (app.js)**:
```javascript
app.reader.on('chapterNavigationStateChanged', (state) => {
    const navBar = document.getElementById('chapter-nav-bar');
    const prevBtn = document.getElementById('prev-chapter-btn');
    const nextBtn = document.getElementById('next-chapter-btn');
    
    if (!navBar || !prevBtn || !nextBtn) return;
    
    if (state.hasChapters) {
        navBar.style.display = 'flex';
        prevBtn.disabled = !state.canGoPrev;
        nextBtn.disabled = !state.canGoNext;
    } else {
        navBar.style.display = 'none';
    }
});
```

---

## Summary of Patterns

### Pattern 1: DOM Queries → Events
Replace service DOM queries with event emissions:
```
OLD: service.querySelector() → update DOM
NEW: service.emit('event', data) → app.js listens and updates DOM
```

### Pattern 2: Direct Injection → Constructor Parameters
Replace hard-coded class selectors with injected elements:
```
OLD: this.container.querySelector('.class-name')
NEW: this.elements.targetElement (passed in constructor)
```

### Pattern 3: Internal Property Access → Public API
Replace direct property access with public methods:
```
OLD: app.state.get('value')
NEW: app.getValue()
```

### Pattern 4: Head Manipulation → Return Values
Replace direct document.head manipulation with returned data:
```
OLD: document.head.appendChild(style)
NEW: return { css, ... } and let app.js inject
```

