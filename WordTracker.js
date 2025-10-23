/**
 * WordTracker Module v1.0.0
 * Manages word indexing, tracking, and positioning for flow mode
 * 
 * STEP 16: Extracted from engine for modularity
 * 
 * @license MIT
 * @version 1.0.0
 */

class WordTracker {
    constructor() {
        // Use existing WordIndexManager from core
        this.indexManager = new window.EBookReaderCore.WordIndexManager();
        this.observer = null;
        this.observedNodes = [];
    }

    // ========================================
    // PUBLIC API - WORD INDEXING
    // ========================================

    /**
     * Rebuild word index from DOM
     */
    rebuild() {
        this.indexManager.rebuild();
    }

    /**
     * Get word at specific index
     * @param {number} index - Word index
     * @returns {Object|null} Word object with el, rect, isNewline, text, index
     */
    getWord(index) {
        return this.indexManager.getWord(index);
    }

    /**
     * Get active range of words around center
     * @param {number} centerIndex - Center word index
     * @param {number} focusWidth - Number of words in focus
     * @returns {Object} {start, end} indices
     */
    getActiveRange(centerIndex, focusWidth) {
        return this.indexManager.getActiveRange(centerIndex, focusWidth);
    }

    /**
     * Get total number of words
     * @returns {number}
     */
    getTotalWords() {
        return this.indexManager.getTotalWords();
    }

    /**
     * Check if word is visible in viewport
     * @param {number} index - Word index
     * @returns {boolean}
     */
    isVisible(index) {
        return this.indexManager.isVisible(index);
    }

    /**
     * Mark index as needing rebuild
     */
    invalidate() {
        this.indexManager.invalidate();
    }

    /**
     * Cache word nodes for faster rebuilding
     * @param {NodeList|Array} nodes - Word elements
     */
    cacheNodes(nodes) {
        this.indexManager.cacheNodes(nodes);
    }

    // ========================================
    // PUBLIC API - INTERSECTION OBSERVER
    // ========================================

    /**
     * Setup intersection observer for viewport tracking
     * @param {HTMLElement} container - Container element to observe within
     */
    setupObserver(container) {
        this.indexManager.setupObserver(container);
    }

    /**
     * Observe word elements for visibility
     * @param {NodeList|Array} wordElements - Word elements to observe
     */
    observeWords(wordElements) {
        this.indexManager.observeWords(wordElements);
    }

    /**
     * Disconnect and cleanup observer
     */
    disconnectObserver() {
        this.indexManager.disconnectObserver();
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    /**
     * Find word index by DOM element
     * @param {HTMLElement} element - Word element
     * @returns {number} Index or -1 if not found
     */
    findIndexByElement(element) {
        const words = this.indexManager.words;
        for (let i = 0; i < words.length; i++) {
            if (words[i].el === element) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Get words in a range
     * @param {number} startIndex - Start index
     * @param {number} endIndex - End index
     * @returns {Array} Array of word objects
     */
    getWordsInRange(startIndex, endIndex) {
        const words = [];
        const start = Math.max(0, Math.floor(startIndex));
        const end = Math.min(this.getTotalWords() - 1, Math.floor(endIndex));
        
        for (let i = start; i <= end; i++) {
            const word = this.getWord(i);
            if (word) words.push(word);
        }
        
        return words;
    }

    /**
     * Check if index needs rebuild
     * @returns {boolean}
     */
    isDirty() {
        return this.indexManager.dirty;
    }

    // ========================================
    // CLEANUP
    // ========================================

    /**
     * Cleanup and destroy tracker
     */
    destroy() {
        this.disconnectObserver();
        this.indexManager = null;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WordTracker;
}
if (typeof window !== 'undefined') {
    window.WordTracker = WordTracker;
}
