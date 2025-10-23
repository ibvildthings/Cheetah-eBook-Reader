/**
 * CheetahReaderApp v1.0.0
 * Main application coordinator that manages reader, state, and services
 * 
 * STEP 14: Application Controller Layer
 * 
 * @license MIT
 * @version 1.0.0
 */

class CheetahReaderApp {
    constructor(selector, options = {}) {
        console.log('🐆 CheetahReaderApp initializing...');
        
        // STEP 14A: Initialize StateManager with default state
        this.state = new StateManager({
            fontSize: options.fontSize || 18,
            font: options.font || 'opendyslexic',
            lineHeight: options.lineHeight || 1.8,
            theme: options.theme || 'sepia',
            autoTheme: options.autoTheme || false,
            marginL: options.marginL || 60,
            marginR: options.marginR || 60,
            mode: 'normal',
            bionic: options.bionic || false,
            flow: {
                playing: false,
                speed: options.speed || 400,
                currentWordIndex: 0,
                focusWidth: options.focusWidth || 2,
                scrollLevel: options.scrollLevel || 1
            }
        });
        
        // STEP 14A: Initialize reader with StateManager
        this.reader = new EBookReader(selector, {
            stateManager: this.state
        });
        
        // Store container reference for services
        this.container = this.reader.container;
        
        // STEP 14A: Initialize services
        // Wait for DOM to be ready before initializing services
        setTimeout(() => {
            const contentElement = this.reader.el?.content;
            
            if (contentElement) {
                this.fontService = new FontService(this.state, contentElement);
                
                // Load initial font
                this.fontService.loadFont(this.state.get('font')).then(() => {
                    this.fontService.applyFont(this.state.get('font'));
                });
            }
            
            if (this.container) {
                this.themeService = new ThemeService(this.state, this.container);
                // Apply initial theme
                this.themeService.applyTheme(this.state.get('theme'));
            }
            
            this.epubService = new EPUBService(this.reader);
            
            console.log('✅ CheetahReaderApp initialized');
        }, 100);
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - TYPOGRAPHY
    // ========================================
    
    setFontSize(size) {
        this.state.set('fontSize', size);
        if (this.reader) {
            this.reader.updateStyles();
        }
    }
    
    setFont(fontKey) {
        this.state.set('font', fontKey);
    }
    
    setLineHeight(height) {
        this.state.set('lineHeight', height);
        if (this.reader) {
            this.reader.updateStyles();
        }
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - THEME
    // ========================================
    
    setTheme(themeName) {
        this.state.set('theme', themeName);
        this.state.set('autoTheme', false);
    }
    
    setAutoTheme(enabled) {
        this.state.set('autoTheme', enabled);
    }
    
    getTheme() {
        return this.themeService ? this.themeService.getCurrentTheme() : this.state.get('theme');
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - LAYOUT
    // ========================================
    
    setMargins(left, right) {
        if (left !== undefined) {
            this.state.set('marginL', Math.max(10, Math.min(400, left)));
        }
        if (right !== undefined) {
            this.state.set('marginR', Math.max(10, Math.min(400, right)));
        }
        if (this.reader) {
            this.reader.updateLayout();
        }
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - BIONIC
    // ========================================
    
    setBionic(enabled) {
        this.state.set('bionic', enabled);
    }
    
    toggleBionic() {
        const current = this.state.get('bionic');
        this.setBionic(!current);
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - FLOW MODE
    // ========================================
    
    setSpeed(wpm) {
        const clamped = Math.max(100, Math.min(650, wpm));
        this.state.set('flow.speed', clamped);
    }
    
    setFocusWidth(width) {
        const clamped = Math.max(1, Math.min(5, width));
        this.state.set('flow.focusWidth', clamped);
    }
    
    setScrollLevel(level) {
        const clamped = Math.max(1, Math.min(5, level));
        this.state.set('flow.scrollLevel', clamped);
    }
    
    startFlow() {
        if (this.reader) {
            this.reader.setMode('flow');
            setTimeout(() => {
                if (this.reader) {
                    this.reader.play();
                }
            }, 300);
        }
    }
    
    stopFlow() {
        if (this.reader) {
            this.reader.setMode('normal');
        }
    }
    
    play() {
        if (this.reader) {
            this.reader.play();
        }
    }
    
    pause() {
        if (this.reader) {
            this.reader.pause();
        }
    }
    
    togglePlay() {
        if (this.reader) {
            this.reader.togglePlay();
        }
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - CONTENT
    // ========================================
    
    loadContent(html) {
        if (this.reader) {
            this.reader.loadContent(html);
        }
    }
    
    // STEP 15B: Text formatting logic moved to CheetahReaderApp
    loadPastedText(text) {
        if (!text || text.trim().length === 0) {
            throw new Error('Text is empty');
        }
        
        // Format plain text as HTML
        let formattedText = text;
        if (!text.includes('<p>') && !text.includes('<div>')) {
            const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
            formattedText = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
        }
        
        this.loadContent(formattedText);
        return formattedText;
    }
    
    loadEPUB(file) {
        if (this.epubService) {
            this.epubService.loadBook(file);
        } else {
            console.error('EPUBService not initialized yet');
        }
    }
    
    // ========================================
    // STEP 14B: PUBLIC API - EPUB NAVIGATION
    // ========================================
    
    nextChapter() {
        if (this.epubService) {
            this.epubService.nextChapter();
        }
    }
    
    previousChapter() {
        if (this.epubService) {
            this.epubService.previousChapter();
        }
    }
    
    loadChapter(index) {
        if (this.epubService) {
            this.epubService.loadChapter(index);
        }
    }
    
    // ========================================
    // PUBLIC API - STATE ACCESS
    // ========================================
    
    getState() {
        return this.state.getAll();
    }
    
    getReaderState() {
        return this.reader ? this.reader.getState() : null;
    }
    
    // ========================================
    // PUBLIC API - EVENT SYSTEM
    // ========================================
    
    on(event, callback) {
        if (this.reader) {
            return this.reader.on(event, callback);
        }
    }
    
    off(event, callback) {
        if (this.reader) {
            this.reader.off(event, callback);
        }
    }
    
    // ========================================
    // LIFECYCLE
    // ========================================
    
    destroy() {
        if (this.epubService) {
            this.epubService.destroy();
        }
        if (this.themeService) {
            this.themeService.destroy();
        }
        if (this.reader) {
            this.reader.destroy();
        }
        console.log('CheetahReaderApp destroyed');
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CheetahReaderApp;
}
if (typeof window !== 'undefined') {
    window.CheetahReaderApp = CheetahReaderApp;
}
