/**
 * EBookReader Engine v2.4.1-autoflow-fix
 * Flow mode engine, rendering logic, and gesture handling
 * Requires: ebook-reader-core.js to be loaded first
 * 
 * VERSION: 2.4.1-autoflow-fix (2024-10-21)
 * FIX: Captures wasPlaying state BEFORE stopping animation
 * 
 * @license MIT
 * @version 2.4.1
 */

(function() {
    'use strict';
    
    console.log('🐆 EBookReader Engine v2.4.1-autoflow-fix loaded');

    // Import from core
    const {
        FONTS,
        THEMES,
        LINE_BREAK_THRESHOLD
    } = window.EBookReaderCore;

    // ============================================================================
    // EBOOK READER ENGINE CLASS
    // ============================================================================

    class EBookReaderEngine {
        // This class contains all the heavy lifting:
        // - DOM rendering and manipulation
        // - Flow mode animation loop
        // - Word state management
        // - Scroll handling
        // - Gesture recognition
        // - Theme application

        // ========================================
        // PRIVATE - UTILITIES
        // ========================================

        _clamp(v, min, max) {
            return Math.max(min, Math.min(max, v));
        }

        _dist(t1, t2) {
            return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        }

        // ========================================
        // PRIVATE METHODS - THEME
        // ========================================
        
        // STEP 11E: Theme methods removed - ThemeService handles all theme logic

        // ========================================
        // PRIVATE METHODS - DOM SETUP
        // ========================================

        _injectStyles() {
            if (document.getElementById('ebook-reader-styles')) return;

            const style = document.createElement('style');
            style.id = 'ebook-reader-styles';
            style.textContent = `
                .ebook-reader-root {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: #f5f5f5;
                    overflow: hidden;
                    touch-action: none;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    transition: background 0.3s ease;
                    contain: layout style;
                }
                .ebook-reader-area {
                    position: relative;
                    background: #fff;
                    box-shadow: 0 4px 20px rgba(0,0,0,.1);
                    overflow-y: auto;
                    transition: all .3s ease;
                    max-height: 100vh;
                    padding: 30px 0;
                    contain: layout style;
                }
                .ebook-text-content {
                    transition: padding .1s ease-out, opacity .2s ease-in-out, color .3s ease, font-family .2s ease;
                    position: relative;
                    min-height: 100%;
                    padding: 0 60px;
                    padding-bottom: 60vh;
                    contain: layout style paint;
                }
                .ebook-text-content.transitioning { opacity: .4; }
                .bionic { 
                    font-weight: 700;
                    transition: color 0.3s ease;
                    contain: style;
                }
                .flow-word {
                    font-weight: 400;
                    cursor: pointer;
                    display: inline;
                    position: relative;
                    transition: opacity 0.2s ease;
                    will-change: opacity;
                    contain: layout style;
                }
                .flow-word:hover { opacity: .7; }
                .flow-word.active {
                    opacity: 1;
                }
                .flow-word.inactive { opacity: .2; }
                .ebook-focus-indicator {
                    position: absolute;
                    top: 0;
                    left: 0;
                    pointer-events: none;
                    z-index: 50;
                    background: var(--theme-focus, rgba(59,130,246,.08));
                    display: none;
                    border-radius: 3px;
                    transition: background 0.3s ease;
                    will-change: transform;
                    contain: layout style paint;
                }
                .ebook-focus-indicator.visible { display: block; }
            `;
            document.head.appendChild(style);
        }

        _buildDOM() {
            this.container.innerHTML = '';
            this.container.className = 'ebook-reader-root';

            const html = `
               <div class="ebook-reader-area">
                   <div class="ebook-focus-indicator"></div>
                   <div class="ebook-text-content"></div>
               </div>
           `;

            this.container.innerHTML = html;

            this.el = {
               root: this.container,
               reader: this.container.querySelector('.ebook-reader-area'),
               content: this.container.querySelector('.ebook-text-content'),
               focus: this.container.querySelector('.ebook-focus-indicator')
           };
           
           // STEP 16F: Initialize Renderer module
           this.renderer = new Renderer(this.el, this.stateManager);
        }

        _attachEventListeners() {
            this.el.reader.addEventListener('touchstart', e => this._handleTouchStart(e));
            this.el.reader.addEventListener('touchmove', e => this._handleTouchMove(e));
            this.el.reader.addEventListener('wheel', e => this._handleWheel(e));
            this.el.reader.addEventListener('scroll', this._scrollHandler);

            this.el.content.addEventListener('click', this._wordClickHandler);

            window.addEventListener('resize', this._resizeHandler);
        }

        // ========================================
        // PRIVATE METHODS - EVENT HANDLERS
        // ========================================

        _handleWordClick(e) {
            if (this._destroyed) return;
            
            const state = this.state;
            
            // Handle double-tap for jump functionality
            const now = Date.now();
            const wordEl = e.target.closest('.flow-word');
            
            if (wordEl) {
                const idx = parseInt(wordEl.dataset.wordIndex);
                
                // Check if this is a double-tap on the same word
                if (this._lastTapTime && 
                    now - this._lastTapTime < 300 && 
                    this._lastTapWordIndex === idx &&
                    state.mode === 'flow') {
                    
                    // Double-tap detected - prevent text selection AND prevent single-tap behavior
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Jump to word and keep playing state
                    if (!isNaN(idx)) {
                        const wasPlaying = this.state.flow.playing;
                        this._jumpToWord(idx);
                        
                        // If it was paused, start playing from new position
                        if (!wasPlaying) {
                            setTimeout(() => {
                                if (!this._destroyed) {
                                    this.play();
                                }
                            }, 100);
                        }
                    }
                    
                    // Reset tap tracking
                    this._lastTapTime = null;
                    this._lastTapWordIndex = null;
                    return; // EXIT HERE - don't run single-tap logic
                }
                
                // Record this tap for double-tap detection
                this._lastTapTime = now;
                this._lastTapWordIndex = idx;
                
                // Delay single-tap action to allow time for potential second tap
                setTimeout(() => {
                    // Only execute single-tap if no second tap came within 300ms
                    if (this._lastTapTime === now && this._lastTapWordIndex === idx) {
                        // Prevent text selection in flow mode
                        if (state.mode === 'flow') {
                            e.preventDefault();
                        }
                        
                        // Single tap behavior - toggle flow mode
                        if (state.mode === 'flow') {
                            // In flow mode: tap stops flow (exit to normal mode)
                            this.setMode('normal');
                            this._emit('onModeChange', 'normal');
                        } else {
                            // In normal mode: tap starts flow
                            this.setMode('flow');
                            this._emit('onModeChange', 'flow');
                            setTimeout(() => {
                                if (!this._destroyed) {
                                    this.play();
                                }
                            }, 300);
                        }
                    }
                }, 310); // Wait slightly longer than double-tap threshold
                
                return; // Exit after setting up delayed single-tap
            }
            
            // Clicked outside a word - treat as single tap immediately
            if (state.mode === 'flow') {
                e.preventDefault();
                this.setMode('normal');
                this._emit('onModeChange', 'normal');
            } else {
                this.setMode('flow');
                this._emit('onModeChange', 'flow');
                setTimeout(() => {
                    if (!this._destroyed) {
                        this.play();
                    }
                }, 300);
            }
        }

        // ========================================
        // PRIVATE METHODS - RENDERING
        // ========================================

        updateStyles() {
            // STEP 16F: Delegate to Renderer
            if (this.renderer) {
                this.renderer.updateStyles(() => {
                    if (this.state.mode === 'flow' && this.wordIndexManager) {
                        this.wordIndexManager.invalidate();
                        requestAnimationFrame(() => {
                            if (!this._destroyed && this.wordIndexManager) {
                                this._updateWordStates(this.state.flow.currentWordIndex);
                            }
                        });
                    }
                });
            }
        }

        async _render() {
            if (this._destroyed || !this.el || !this.el.content) return;
            
            if (this.wordIndexManager) {
                this.wordIndexManager.disconnectObserver();
            }
            
            // STEP 16F: Delegate to Renderer
            const bionic = this.stateManager ? this.stateManager.get('bionic') : false;
            await this.renderer.renderContent(this.state.content, this.state.mode, bionic);
            
            if (this.state.mode === 'flow') {
                if (!this.state.saved) {
                    this.state.flow.currentWordIndex = 0;
                }
            }
            
            if (this.wordIndexManager) {
                this.wordIndexManager.invalidate();
            }

            if (this.state.mode === 'flow') {
                setTimeout(() => {
                    if (this._destroyed || !this.el || !this.el.content || !this.wordIndexManager) return;
                    
                    const wordNodes = this.el.content.querySelectorAll('.flow-word');
                    this.wordIndexManager.cacheNodes(wordNodes);
                    
                    this.wordIndexManager.setupObserver(this.el.reader);
                    this.wordIndexManager.observeWords(wordNodes);
                    
                    this._initialVisibilityCheck(wordNodes);
                    
                    this.wordIndexManager.rebuild();
                }, 50);
            }
        }

        _initialVisibilityCheck(wordNodes) {
            if (!this.el || !this.el.reader) return;
            
            const readerRect = this.el.reader.getBoundingClientRect();
            const buffer = 200;
            
            wordNodes.forEach((el, idx) => {
                const rect = el.getBoundingClientRect();
                const isVisible = (
                    rect.bottom >= readerRect.top - buffer &&
                    rect.top <= readerRect.bottom + buffer
                );
                
                if (isVisible && this.wordIndexManager) {
                    this.wordIndexManager.visibleIndices.add(idx);
                }
            });
        }

        // ========================================
        // PRIVATE METHODS - FLOW MODE
        // ========================================

        _updateWordStates(centerIndex) {
            // STEP 16F: Delegate to Renderer
            if (this._destroyed || !this.wordIndexManager || !this.renderer) return;
            
            const allWords = this.wordIndexManager.wordNodes || this.el.content.querySelectorAll('.flow-word');
            const visibleIndices = this.wordIndexManager.observerEnabled 
                ? this.wordIndexManager.visibleIndices 
                : new Set(Array.from({length: allWords.length}, (_, i) => i));
            
            this.renderer.updateWordStates(centerIndex, this.wordIndexManager, visibleIndices);
        }

        _scrollToWordIfNeeded(wordIndex) {
            if (this._destroyed || !this.wordIndexManager || this.state.flow.userScroll) return;
            if (!this.el || !this.el.reader) return;

            const currentIdx = Math.floor(wordIndex);
            const nextIdx = currentIdx + 1;
            const fraction = wordIndex - currentIdx;

            const currentWord = this.wordIndexManager.getWord(currentIdx);
            const nextWord = this.wordIndexManager.getWord(nextIdx);
            
            if (!currentWord) return;

            let wordTop = currentWord.el.getBoundingClientRect().top;
            if (nextWord && fraction > 0) {
                const nextTop = nextWord.el.getBoundingClientRect().top;
                wordTop = wordTop + (nextTop - wordTop) * fraction;
            }

            const readerRect = this.el.reader.getBoundingClientRect();
            const viewportHeight = readerRect.height;
            
            const comfortZoneTop = readerRect.top + (viewportHeight * this.config.scroll.comfortZoneTop);
            const comfortZoneBottom = readerRect.top + (viewportHeight * this.config.scroll.comfortZoneBottom);
            
            if (wordTop < comfortZoneTop || wordTop > comfortZoneBottom) {
                // STEP 9F: Read from StateManager
                const scrollLevel = this.stateManager ? this.stateManager.get('flow.scrollLevel') : 1;
                const targetRatio = this.config.scroll.gap + (scrollLevel - 1) * 0.2;
                const targetY = readerRect.top + (viewportHeight * targetRatio);
                
                const scrollAdjustment = wordTop - targetY;
                const targetScroll = this.el.reader.scrollTop + scrollAdjustment;
                
                this.el.reader.scrollTo({
                    top: targetScroll,
                    behavior: 'smooth'
                });
            }
        }

        _animate() {
            const frame = (t) => {
                if (!this.state.flow.playing || this._destroyed || !this.wordIndexManager) return;

                if (this.state.flow.pauseUntil > 0) {
                    if (t < this.state.flow.pauseUntil) {
                        this.state.flow.rafId = requestAnimationFrame(frame);
                        return;
                    }
                    // STEP 9F: Read from StateManager
                    const speed = this.stateManager ? this.stateManager.get('flow.speed') : 400;
                    this.state.flow.startTime = t - (this.state.flow.currentWordIndex / (speed / 60)) * 1000;
                    this.state.flow.pauseUntil = 0;
                }

                const elapsed = t - this.state.flow.startTime;
                // STEP 9F: Read from StateManager
                const speed = this.stateManager ? this.stateManager.get('flow.speed') : 400;
                const wordsPerSecond = speed / 60;
                const wordIndex = (elapsed / 1000) * wordsPerSecond;

                this.state.flow.currentWordIndex = wordIndex;

                const totalWords = this.wordIndexManager.getTotalWords();
                if (wordIndex >= totalWords) {
                    // Chapter finished - try to load next chapter
                    if (window.EPUBHandler && typeof window.EPUBHandler.loadNextChapter === 'function') {
                        // IMPORTANT: Capture playing state BEFORE we stop the animation
                        const wasPlayingBeforeStop = this.state.flow.playing;
                        console.log('📖 Chapter end - wasPlaying:', wasPlayingBeforeStop);
                        
                        // Stop current animation
                        this.state.flow.playing = false;
                        if (this.state.flow.rafId) {
                            cancelAnimationFrame(this.state.flow.rafId);
                            this.state.flow.rafId = null;
                        }
                        
                        const hasNext = window.EPUBHandler.loadNextChapter(() => {
                            // This callback fires when chapter is fully loaded and ready
                            // Just reset state - EPUB handler will call play() after a delay
                            console.log('Engine callback: Chapter transition complete, resetting state');
                            if (!this._destroyed && this.wordIndexManager) {
                                this.state.flow.currentWordIndex = 0;
                                this.state.flow.pauseUntil = 0;
                                this.state.flow.lastPausedWord = -1;
                                console.log('Engine callback: State reset complete');
                            } else {
                                console.warn('Engine callback: Reader destroyed or no word manager');
                            }
                        }, wasPlayingBeforeStop); // Pass the captured state
                        
                        if (hasNext) {
                            return;
                        }
                    }
                    
                    // No next chapter or no EPUB handler - restart current chapter
                    this.state.flow.currentWordIndex = 0;
                    this.state.flow.startTime = t;
                    this.state.flow.pauseUntil = 0;
                    this.state.flow.lastPausedWord = -1;
                }

                const currentWordIdx = Math.floor(wordIndex);
                const currentWord = this.wordIndexManager.getWord(currentWordIdx);

                this._scrollToWordIfNeeded(wordIndex);
                this._updateWordStates(wordIndex);

                if (currentWord && currentWord.isNewline && 
                    this.state.flow.pauseUntil === 0 && 
                    this.state.flow.lastPausedWord !== currentWordIdx) {
                    // STEP 9F: Read from StateManager
                    const speed = this.stateManager ? this.stateManager.get('flow.speed') : 400;
                    const pauseDuration = (60000 / speed) * this.config.newlinePause;
                    this.state.flow.pauseUntil = t + pauseDuration;
                    this.state.flow.lastPausedWord = currentWordIdx;
                }

                this.state.flow.rafId = requestAnimationFrame(frame);
            };

            this.state.flow.rafId = requestAnimationFrame(frame);
        }

        _togglePlay() {
            if (this._destroyed || !this.wordIndexManager) return;
            
            if (this.state.flow.playing) {
                // Cancel animation frame
                if (this.state.flow.rafId) {
                    cancelAnimationFrame(this.state.flow.rafId);
                    this.state.flow.rafId = null;
                }
                this.state.flow.playing = false;
            } else {
                this.wordIndexManager.rebuild();
                const totalWords = this.wordIndexManager.getTotalWords();
                if (!totalWords) return;

                this.state.flow.playing = true;
                
                // STEP 9F: Read from StateManager
                const speed = this.stateManager ? this.stateManager.get('flow.speed') : 400;
                const wordsPerSecond = speed / 60;
                this.state.flow.startTime = performance.now() - 
                    (this.state.flow.currentWordIndex / wordsPerSecond) * 1000;
                this.state.flow.pauseUntil = 0;
                this.state.flow.lastPausedWord = -1;
                
                this._animate();
            }
            this._emit('onPlayChange', this.state.flow.playing);
        }

        _jumpToWord(idx) {
            if (this._destroyed || !this.wordIndexManager) return;
            
            this.state.flow.currentWordIndex = idx;
            
            const word = this.wordIndexManager.getWord(idx);
            if (word && this.el && this.el.reader) {
                const rr = this.el.reader.getBoundingClientRect();
                const vhh = rr.height;
                // STEP 9F: Read from StateManager
                const scrollLevel = this.stateManager ? this.stateManager.get('flow.scrollLevel') : 1;
                const targetRatio = this.config.scroll.gap + (scrollLevel - 1) * 0.2;
                const idealY = rr.top + (vhh * targetRatio);
                const wordTop = word.el.getBoundingClientRect().top;
                const diff = wordTop - idealY;
                
                this.el.reader.scrollTop = this.el.reader.scrollTop + diff;
            }
            
            if (!this.state.flow.playing) {
                this._updateWordStates(idx);
            } else {
                const wordsPerSecond = this.state.flow.speed / 60;
                this.state.flow.startTime = performance.now() - (idx / wordsPerSecond) * 1000;
                this.state.flow.pauseUntil = 0;
                this.state.flow.lastPausedWord = -1;
                this._updateWordStates(idx);
            }
        }

        _setMode(mode, preserve = false) {
            if (this._destroyed) return;
            
            const wasPlaying = this.state.flow.playing;
            
            if (this.state.mode === 'flow' && mode !== 'flow') {
                this.state.saved = {
                    wordIndex: this.state.flow.currentWordIndex,
                    playing: wasPlaying
                };
            }

            this.state.mode = mode;
            
            // Add/remove flow-mode class to prevent text selection
            if (this.el && this.el.content) {
                if (mode === 'flow') {
                    this.el.content.classList.add('flow-mode');
                } else {
                    this.el.content.classList.remove('flow-mode');
                }
            }
            
            if (this.state.flow.playing) this._togglePlay();

            this._render();

            if (mode === 'flow' && this.state.saved && preserve) {
                setTimeout(() => {
                    if (this._destroyed || !this.wordIndexManager) return;
                    
                    this.state.flow.currentWordIndex = this.state.saved.wordIndex || 0;
                    this._updateWordStates(this.state.flow.currentWordIndex);
                    if (this.state.saved.playing) {
                        setTimeout(() => {
                            if (!this._destroyed && this.wordIndexManager) this._togglePlay();
                        }, 100);
                    }
                }, 100);
            } else if (mode === 'flow') {
                setTimeout(() => {
                    if (!this._destroyed && this.wordIndexManager) {
                        this._updateWordStates(this.state.flow.currentWordIndex);
                    }
                }, 100);
            }

            if (mode !== 'flow') {
                this.el.focus.classList.remove('visible');
            }
        }

        _toggleBionic() {
            if (this._destroyed) return;
            
            const wasPlaying = this.state.flow.playing;
            const savedIdx = this.state.flow.currentWordIndex;
            
            // STEP 9E: Toggle in StateManager
            const currentBionic = this.stateManager ? this.stateManager.get('bionic') : false;
            if (this.stateManager) {
                this.stateManager.set('bionic', !currentBionic, true);
            }
            
            if (wasPlaying) this._togglePlay();
            
            this._render();
            
            if (this.state.mode === 'flow') {
                setTimeout(() => {
                    if (this._destroyed || !this.wordIndexManager) return;
                    
                    this.state.flow.currentWordIndex = savedIdx;
                    this._updateWordStates(savedIdx);
                    if (wasPlaying) {
                        setTimeout(() => {
                            if (!this._destroyed && this.wordIndexManager) this._togglePlay();
                        }, 100);
                    }
                }, 100);
            }
        }

        // ========================================
        // PRIVATE METHODS - GESTURE HANDLING
        // ========================================

        _handleTouchStart(e) {
            if (this.state.gesture.dragging) return;
            this.state.gesture.touches = [...e.touches];
            
            if (e.touches.length === 2) {
                e.preventDefault();
                this.state.gesture.initDist = this._dist(e.touches[0], e.touches[1]);
                // STEP 9B: Read from StateManager
                this.state.gesture.initSize = this.stateManager ? this.stateManager.get('fontSize') : 18;
            }
        }

        _handleTouchMove(e) {
            if (this.state.gesture.dragging || e.touches.length !== 2) return;
            e.preventDefault();

            const curDist = this._dist(e.touches[0], e.touches[1]);
            const distChange = Math.abs(curDist - this.state.gesture.initDist);

            const mid1 = {
                x: (this.state.gesture.touches[0].clientX + this.state.gesture.touches[1].clientX) / 2,
                y: (this.state.gesture.touches[0].clientY + this.state.gesture.touches[1].clientY) / 2
            };
            const mid2 = {
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2
            };
            const midDelta = {
                x: Math.abs(mid2.x - mid1.x),
                y: Math.abs(mid2.y - mid1.y)
            };

            if (distChange > 10 && distChange > midDelta.x && distChange > midDelta.y) {
                const scale = curDist / this.state.gesture.initDist;
                const newSize = this._clamp(
                    this.state.gesture.initSize * scale,
                    this.config.fontSize.min,
                    this.config.fontSize.max
                );
                // STEP 9B: Write to StateManager
                if (this.stateManager) {
                    this.stateManager.set('fontSize', newSize, true);
                }
                this.updateStyles();
            }
        }

        _handleWheel(e) {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                // STEP 9B: Read from StateManager and write back
                const currentSize = this.stateManager ? this.stateManager.get('fontSize') : 18;
                const newSize = this._clamp(
                    currentSize - e.deltaY * 0.1,
                    this.config.fontSize.min,
                    this.config.fontSize.max
                );
                if (this.stateManager) {
                    this.stateManager.set('fontSize', newSize, true);
                }
                this.updateStyles();
            }
        }

        _handleScroll() {
            this.state.flow.userScroll = true;
            clearTimeout(this._scrollTimeout);
            this._scrollTimeout = setTimeout(() => {
                this.state.flow.userScroll = false;
            }, this.config.scroll.timeout);
        }
    }

    // ============================================================================
    // EXPOSE ENGINE
    // ============================================================================

    window.EBookReaderEngine = EBookReaderEngine;

})();
