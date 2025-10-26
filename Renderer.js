/**
 * Renderer Module v1.0.0
 * Handles all DOM rendering, styling, and word state updates
 * 
 * STEP 16: Extracted from engine for modularity
 * 
 * @license MIT
 * @version 1.0.0
 */

class Renderer {
    constructor(elements, stateManager) {
        this.el = elements; // { root, reader, content, focus, dragZoneL, dragZoneR }
        this.stateManager = stateManager;
        this._pendingStyleUpdate = null;
        this._destroyed = false;
    }

    // ========================================
    // PUBLIC API - STYLING
    // ========================================

    /**
     * Update typography styles (font, size, line height)
     * @param {Function} onComplete - Callback after styles applied
     */
    updateStyles(onComplete) {
        if (this._destroyed || !this.el || !this.el.content) return;
        
        if (this._pendingStyleUpdate) {
            cancelAnimationFrame(this._pendingStyleUpdate);
        }
        
        this._pendingStyleUpdate = requestAnimationFrame(() => {
            if (this._destroyed || !this.el || !this.el.content) return;
            
            const FONTS = window.EBookReaderCore?.FONTS || {};
            const fontKey = this.stateManager ? this.stateManager.get('font') : 'opendyslexic';
            const font = FONTS[fontKey] || FONTS['opendyslexic'];
            const fontSize = this.stateManager ? this.stateManager.get('fontSize') : 18;
            const lineHeight = this.stateManager ? this.stateManager.get('lineHeight') : 1.7;
            
            this.el.content.style.fontFamily = font.family;
            this.el.content.style.fontSize = fontSize + 'px';
            this.el.content.style.lineHeight = lineHeight;
            
            this._pendingStyleUpdate = null;
            
            if (onComplete) onComplete();
        });
    }

    // ========================================
    // PUBLIC API - CONTENT RENDERING
    // ========================================

    /**
     * Render HTML content
     * @param {string} html - HTML content to render
     * @param {string} mode - 'normal' or 'flow'
     * @param {boolean} bionic - Apply bionic reading
     * @returns {Promise} Resolves when render complete
     */
    async renderContent(html, mode, bionic) {
        if (this._destroyed || !this.el || !this.el.content) return;
        
        this.el.content.classList.add('transitioning');
        
        // Process HTML based on mode
        let processedHtml = html;
        if (mode === 'flow') {
            processedHtml = this._makeFlow(html, bionic);
        } else if (bionic) {
            processedHtml = this._makeBionic(html);
        }

        // Update DOM
        this.el.content.innerHTML = processedHtml;
        
        // Wait for transition
        await new Promise(resolve => setTimeout(resolve, 200));
        
        if (!this._destroyed && this.el && this.el.content) {
            this.el.content.classList.remove('transitioning');
            
            // Update drag zone heights
            const contentHeight = this.el.content.scrollHeight;
            if (this.el.dragZoneL && this.el.dragZoneR) {
                this.el.dragZoneL.style.height = contentHeight + 'px';
                this.el.dragZoneR.style.height = contentHeight + 'px';
            }
        }
        
        return processedHtml;
    }

    /**
     * Get word nodes from content
     * @returns {NodeList} Flow word elements
     */
    getWordNodes() {
        if (!this.el || !this.el.content) return [];
        return this.el.content.querySelectorAll('.flow-word');
    }

    // ========================================
    // PUBLIC API - WORD STATE UPDATES
    // ========================================

    /**
     * Update visual state of words (active/inactive)
     * @param {number} centerIndex - Center word index
     * @param {Object} wordTracker - WordTracker instance
     * @param {Set} visibleIndices - Set of visible word indices
     */
    updateWordStates(centerIndex, wordTracker, visibleIndices) {
        if (this._destroyed || !wordTracker || !this.el || !this.el.content) return;
        
        const allWords = this.getWordNodes();
        
        requestAnimationFrame(() => {
            if (this._destroyed) return;
            
            const focusWidth = this.stateManager ? this.stateManager.get('flow.focusWidth') : 2;
            const range = wordTracker.getActiveRange(centerIndex, focusWidth);
            const centerIdx = Math.floor(centerIndex);
            
            // Determine which indices to update
            const indicesToUpdate = new Set(visibleIndices);
            for (let i = range.start; i <= range.end; i++) {
                indicesToUpdate.add(i);
            }
            indicesToUpdate.add(centerIdx);
            
            const activeElements = [];
            
            // Update word classes
            indicesToUpdate.forEach(idx => {
                const word = wordTracker.getWord(idx);
                if (word && word.el) {
                    const isActive = idx >= range.start && idx <= range.end;
                    
                    if (isActive) {
                        word.el.classList.remove('inactive');
                        word.el.classList.add('active');
                        activeElements.push(word.el);
                    } else {
                        word.el.classList.remove('active');
                        word.el.classList.add('inactive');
                    }
                }
            });

            // Update focus indicator
            this._updateFocusIndicator(activeElements);
        });
    }

    /**
     * Update focus indicator position
     * @private
     */
    _updateFocusIndicator(activeElements) {
        if (!this.el || !this.el.focus) return;
        
        if (activeElements.length === 0) {
            this.el.focus.classList.remove('visible');
            return;
        }

        const activeRects = activeElements.map(el => el.getBoundingClientRect());
        const byLine = {};
        activeRects.forEach(r => {
            const k = Math.round(r.top);
            (byLine[k] = byLine[k] || []).push(r);
        });

        const lines = Object.keys(byLine).map(k => byLine[k]);
        if (lines.length === 0) return;

        const bounds = lines.reduce((acc, rects) => {
            const lineLeft = Math.min(...rects.map(r => r.left));
            const lineRight = Math.max(...rects.map(r => r.right));
            const lineTop = rects[0].top;
            const lineBottom = rects[0].bottom;
            return {
                left: Math.min(acc.left, lineLeft),
                right: Math.max(acc.right, lineRight),
                top: Math.min(acc.top, lineTop),
                bottom: Math.max(acc.bottom, lineBottom)
            };
        }, { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });

        const readerRect = this.el.reader.getBoundingClientRect();
        const relLeft = bounds.left - readerRect.left;
        const relTop = bounds.top - readerRect.top;
        const width = bounds.right - bounds.left;
        const height = bounds.bottom - bounds.top;

        // Correct calculation relative to the scroll container
        const absoluteTop = relTop + this.el.reader.scrollTop;

        this.el.focus.style.left = relLeft + 'px';
        // FIXED BUG #7: Add scrollTop for correct positioning within the scrollable area
        this.el.focus.style.top = absoluteTop + 'px';
        this.el.focus.style.width = width + 'px';
        this.el.focus.style.height = height + 'px';
        this.el.focus.classList.add('visible');
    }

    // ========================================
    // PRIVATE - TEXT PROCESSING
    // ========================================

    /**
     * Apply bionic reading to text
     * @private
     */
    _bionicWord(w) {
        if (w.length <= 2) return w;
        const n = Math.ceil(w.length / 2);
        return `<span class="bionic">${w.slice(0, n)}</span>${w.slice(n)}`;
    }

    /**
     * Convert HTML to bionic reading format
     * @private
     */
    _makeBionic(text) {
        const temp = document.createElement('div');
        temp.innerHTML = text;
        
        const processNode = (node) => {
            if (node.nodeType === 3) { // Text node
                const text = node.textContent;
                const processedText = text.replace(/\b(\w+)\b/g, this._bionicWord.bind(this));
                
                if (processedText !== text) {
                    const span = document.createElement('span');
                    span.innerHTML = processedText;
                    node.replaceWith(...span.childNodes);
                }
            } else if (node.nodeType === 1 && node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
                [...node.childNodes].forEach(processNode);
            }
        };
        
        [...temp.childNodes].forEach(processNode);
        return temp.innerHTML;
    }

    /**
     * Convert HTML to flow mode format with wrapped words
     * @private
     */
    _makeFlow(html, useBionic) {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        let wordIndex = 0;
        const wrap = text => text.replace(/(\S+)/g, word => {
            const parts = word.match(/[^-]+-?/g) || [word];
            
            return parts.map(part => {
                let content = part;
                if (useBionic && /\w{3,}/.test(part)) {
                    const match = part.match(/\w+/);
                    if (match) {
                        content = part.replace(match[0], this._bionicWord(match[0]));
                    }
                }
                const idx = wordIndex++;
                return `<span class="flow-word inactive" data-word-index="${idx}">${content}</span>`;
            }).join('');
        });

        const process = node => {
            if (node.nodeType === 3) {
                const t = document.createElement('span');
                t.innerHTML = wrap(node.textContent);
                node.replaceWith(...t.childNodes);
            } else if (node.nodeType === 1) {
                [...node.childNodes].forEach(process);
            }
        };

        [...temp.childNodes].forEach(process);
        return temp.innerHTML;
    }

    // ========================================
    // CLEANUP
    // ========================================

    /**
     * Cleanup and destroy renderer
     */
    destroy() {
        if (this._pendingStyleUpdate) {
            cancelAnimationFrame(this._pendingStyleUpdate);
        }
        this._destroyed = true;
        this.el = null;
        this.stateManager = null;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Renderer;
}
if (typeof window !== 'undefined') {
    window.Renderer = Renderer;
}
