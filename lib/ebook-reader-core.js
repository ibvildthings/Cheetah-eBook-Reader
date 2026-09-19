/**
 * EBook Reader Core Utilities v2.4.0
 * Error classes, constants, managers, and utilities
 * 
 * @license MIT
 * @version 2.4.0
 */

// ============================================================================
// ERROR CLASSES
// ============================================================================

class EBookReaderError extends Error {
    constructor(message) {
        super(message);
        this.name = 'EBookReaderError';
    }
}

class ConfigurationError extends EBookReaderError {
    constructor(message) {
        super(message);
        this.name = 'ConfigurationError';
    }
}

class ContentError extends EBookReaderError {
    constructor(message) {
        super(message);
        this.name = 'ContentError';
    }
}

class StateError extends EBookReaderError {
    constructor(message) {
        super(message);
        this.name = 'StateError';
    }
}

class FontError extends EBookReaderError {
    constructor(message) {
        super(message);
        this.name = 'FontError';
    }
}

// ============================================================================
// FONT REGISTRY - MOVED TO config/fonts.js
// ============================================================================

// STEP 17E: FONTS now loaded from config/fonts.js
// Import FONTS from window.FONTS (loaded by config/fonts.js)
const FONTS = window.FONTS || {};

// ============================================================================
// THEME SYSTEM - MOVED TO config/themes.js
// ============================================================================

// STEP 17E: THEMES now loaded from config/themes.js
// Import THEMES from window.THEMES (loaded by config/themes.js)
const THEMES = window.THEMES || {};

// ============================================================================
// CONSTANTS
// ============================================================================

const LINE_BREAK_THRESHOLD = 5; // pixels

// Focus-zone sizing: the highlighted "spotlight" is a fixed physical band
// (in pixels), positioned at the current reading point and swept smoothly
// across the line as playback advances. A word is active for as long as any
// part of it overlaps the band, and drops out only once it has moved
// completely outside the band's edges - it does NOT get recomputed as a
// per-word budget around a "center word." The band's width scales with
// reading speed on a logistic curve: each word transition gives the eye
// (60000 / wpm) ms to reacquire the target, and that window shrinks as
// speed rises, so a fixed-size target gets proportionally harder to hit
// (Fitts's Law) - widening the band compensates. Because it's a physical
// pixel span rather than a word count, its visual size stays consistent
// regardless of whether nearby words are short or long.
const FOCUS_SPEED_MIN = 100;       // must match #speed-slider min in index.html
const FOCUS_SPEED_MAX = 650;       // must match #speed-slider max in index.html
const FOCUS_WIDTH_BREAKPOINT = 0.6; // fraction of the speed range where widening kicks in
const FOCUS_WIDTH_STEEPNESS = 8;    // how sharply it ramps around the breakpoint
const AVG_CHARS_PER_WORD = 6;       // ~avg English word length + 1 space
const MIN_BAND_WORDS = 1;           // band width at slow speed, in "average words"
const MAX_BAND_WORDS_PER_UNIT = 2.5; // band width at top speed, in "average words" per
                                      // unit of the Focus-width slider (so the default
                                      // setting of 2 saturates at ~5 average words wide)

// ============================================================================
// WORD INDEX MANAGER (with IntersectionObserver)
// ============================================================================

class WordIndexManager {
    constructor() {
        this.words = [];
        this.wordNodes = null;
        this.dirty = true;
        this.visibleIndices = new Set();
        this.observer = null;
        this.observerEnabled = false;
    }

    setupObserver(readerElement) {
        // Clean up existing observer
        if (this.observer) {
            this.observer.disconnect();
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const idx = parseInt(entry.target.dataset.wordIndex);
                if (!isNaN(idx)) {
                    if (entry.isIntersecting) {
                        this.visibleIndices.add(idx);
                    } else {
                        this.visibleIndices.delete(idx);
                    }
                }
            });
        }, {
            root: readerElement,
            rootMargin: '200px',
            threshold: 0
        });

        this.observerEnabled = true;
    }

    observeWords(wordElements) {
        if (!this.observer || !this.observerEnabled) return;

        wordElements.forEach(el => {
            this.observer.observe(el);
        });
    }

    disconnectObserver() {
        if (this.observer) {
            this.observer.disconnect();
            this.visibleIndices.clear();
            this.observer = null;  // ADD THIS LINE - fully release the observer
        }
        this.observerEnabled = false;
    }

    enableObserver() {
        this.observerEnabled = true;
    }

    disableObserver() {
        this.observerEnabled = false;
    }

    rebuild() {
        try {
            this.words = [];
            
            const wordElements = this.wordNodes || document.querySelectorAll('.flow-word');
            
            if (!wordElements.length) {
                this.dirty = false;
                return;
            }

            const rects = [];
            wordElements.forEach(el => {
                rects.push(el.getBoundingClientRect());
            });

            let prevTop = -1;
            wordElements.forEach((el, idx) => {
                const rect = rects[idx];
                const isNewline = prevTop !== -1 && rect.top > prevTop + LINE_BREAK_THRESHOLD;
                
                this.words.push({
                    el,
                    rect: {
                        left: rect.left,
                        right: rect.right,
                        top: rect.top,
                        bottom: rect.bottom,
                        width: rect.width,
                        height: rect.height
                    },
                    isNewline,
                    text: el.textContent,
                    index: idx
                });
                
                prevTop = rect.top;
            });
            
            this.dirty = false;
        } catch (error) {
            throw new StateError(`Failed to rebuild word index: ${error.message}`);
        }
    }

    getWord(index) {
        if (typeof index !== 'number' || isNaN(index)) {
            throw new TypeError('Word index must be a valid number');
        }
        
        if (this.dirty) this.rebuild();
        const idx = Math.floor(index);
        return this.words[idx] || null;
    }

    /**
     * Estimate real pixel width per character near an index, by measuring
     * actually-rendered word rects (adapts to font size/family/zoom instead
     * of assuming a fixed pixel value).
     * @private
     */
    _estimateAvgCharWidth(centerIdx) {
        let totalWidth = 0;
        let totalChars = 0;
        for (let i = Math.max(0, centerIdx - 2); i <= Math.min(this.words.length - 1, centerIdx + 2); i++) {
            const w = this.words[i];
            if (w && w.text && w.text.length > 0) {
                totalWidth += w.rect.width;
                totalChars += w.text.length;
            }
        }
        return totalChars > 0 ? totalWidth / totalChars : 9; // ~9px fallback (18px sans-serif)
    }

    getActiveRange(centerIndex, focusWidth, speedWpm) {
        if (typeof centerIndex !== 'number' || isNaN(centerIndex)) {
            throw new TypeError('Center index must be a valid number');
        }
        if (typeof focusWidth !== 'number' || focusWidth <= 0) {
            throw new TypeError('Focus width must be a positive number');
        }

        if (this.dirty) this.rebuild();

        const lowIdx = Math.floor(centerIndex);
        const lowWord = this.words[lowIdx];
        if (!lowWord) return { start: 0, end: 0 };

        const highIdx = Math.min(this.words.length - 1, Math.ceil(centerIndex));
        const highWord = this.words[highIdx] || lowWord;
        const sameLine = Math.abs(highWord.rect.top - lowWord.rect.top) <= LINE_BREAK_THRESHOLD;

        // Interpolate a continuous pixel anchor between the two words the
        // current (possibly fractional) reading position sits between, so
        // the band sweeps smoothly rather than jumping word-to-word.
        let anchorX;
        if (highWord !== lowWord && sameLine) {
            const frac = centerIndex - lowIdx;
            const lowCenter = (lowWord.rect.left + lowWord.rect.right) / 2;
            const highCenter = (highWord.rect.left + highWord.rect.right) / 2;
            anchorX = lowCenter + (highCenter - lowCenter) * frac;
        } else {
            anchorX = (lowWord.rect.left + lowWord.rect.right) / 2;
        }
        const anchorTop = lowWord.rect.top;

        // Map current speed to a position on the logistic curve (0..1),
        // then to a band width in pixels between one word's worth (widthMin)
        // and the Focus-width slider's ceiling (widthMax). Below the
        // breakpoint the band stays near widthMin; above it, it ramps up
        // toward widthMax and saturates there. This is a fixed physical
        // span - it does not shrink or grow based on which specific words
        // happen to be nearby.
        const speed = typeof speedWpm === 'number' && speedWpm > 0 ? speedWpm : 400;
        const s = Math.min(1, Math.max(0, (speed - FOCUS_SPEED_MIN) / (FOCUS_SPEED_MAX - FOCUS_SPEED_MIN)));
        const sigmoid = 1 / (1 + Math.exp(-FOCUS_WIDTH_STEEPNESS * (s - FOCUS_WIDTH_BREAKPOINT)));

        const avgWordPx = AVG_CHARS_PER_WORD * this._estimateAvgCharWidth(lowIdx);
        const widthMin = MIN_BAND_WORDS * avgWordPx;
        const widthMax = Math.max(widthMin, focusWidth * MAX_BAND_WORDS_PER_UNIT * avgWordPx);
        const halfBand = (widthMin + (widthMax - widthMin) * sigmoid) / 2;

        const bandLeft = anchorX - halfBand;
        const bandRight = anchorX + halfBand;

        // Sweep outward from the current position in each direction. A word
        // stays active as long as it overlaps the band at all; it stops
        // only once it has moved completely outside the band's edge.
        let start = lowIdx;
        while (start > 0) {
            const candidate = this.words[start - 1];
            if (!candidate || Math.abs(candidate.rect.top - anchorTop) > LINE_BREAK_THRESHOLD) break;
            if (candidate.rect.right <= bandLeft) break; // fully outside -> stop
            start--;
        }

        let end = lowIdx;
        while (end < this.words.length - 1) {
            const candidate = this.words[end + 1];
            if (!candidate || Math.abs(candidate.rect.top - anchorTop) > LINE_BREAK_THRESHOLD) break;
            if (candidate.rect.left >= bandRight) break; // fully outside -> stop
            end++;
        }

        return { start, end };
    }

    getTotalWords() {
        if (this.dirty) this.rebuild();
        return this.words.length;
    }

    isVisible(index) {
        return this.visibleIndices.has(index);
    }

    invalidate() {
        this.dirty = true;
        this.wordNodes = null;
    }

    cacheNodes(nodes) {
        this.wordNodes = nodes;
        this.dirty = true;
    }
}

// ============================================================================
// FONT LOADER
// ============================================================================


// ============================================================================
// FONT LOADER - REMOVED (Step 18B)
// ============================================================================
// FontLoader has been replaced by FontService.js
// See FontService.js for font loading functionality


// ============================================================================
// EXPOSE UTILITIES
// ============================================================================

window.EBookReaderCore = {
    FONTS,
    THEMES,
    LINE_BREAK_THRESHOLD,
    FOCUS_SPEED_MIN,
    FOCUS_SPEED_MAX,
    FOCUS_WIDTH_BREAKPOINT,
    FOCUS_WIDTH_STEEPNESS,
    AVG_CHARS_PER_WORD,
    MIN_BAND_WORDS,
    MAX_BAND_WORDS_PER_UNIT,
    WordIndexManager,
    // FontLoader removed in Step 18B - use FontService.js instead
    EBookReaderError,
    ConfigurationError,
    ContentError,
    StateError,
    FontError
};