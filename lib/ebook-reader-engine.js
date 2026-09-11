/**
 * EBookReader Engine v2.4.5-pause-fix
 * Flow mode engine, rendering logic, and gesture handling
 * Requires: ebook-reader-core.js to be loaded first
 * 
 * VERSION: 2.4.4-restart-fix (2024-10-21)
 * FIX: Fixed infinite pause loop + restart behavior
 * 
 * @license MIT
 * @version 2.4.4
 */

(function() {
    'use strict';
    
    console.log('🐆 EBookReader Engine v2.4.5-pause-fix loaded');

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

        // STEP: CSS Separation - _injectStyles() removed
        // Styles now loaded via reader-engine.css in index.html

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
           
           // STEP 16I: Initialize Animator module
           this.animator = new Animator(this.stateManager, {
               newlinePause: this.config.newlinePause
           });
        }

        _attachEventListeners() {
            this.el.reader.addEventListener('touchstart', e => this._handleTouchStart(e));
            this.el.reader.addEventListener('touchmove', e => this._handleTouchMove(e));
            this.el.reader.addEventListener('wheel', e => this._handleWheel(e), { passive: false });
            this.el.reader.addEventListener('scroll', this._scrollHandler);

            // Speed scrubbing: a horizontal drag on the reading surface while
            // Flow is running tunes WPM. touch-action: pan-y means the browser
            // still owns vertical scrolling, so only sideways drags reach us.
            this.el.reader.addEventListener('pointerdown', e => this._speedPointerDown(e));
            this.el.reader.addEventListener('pointermove', e => this._speedPointerMove(e));
            this.el.reader.addEventListener('pointerup', e => this._speedPointerUp(e));
            this.el.reader.addEventListener('pointercancel', e => this._speedPointerUp(e));

            this.el.content.addEventListener('click', this._wordClickHandler);

            window.addEventListener('resize', this._resizeHandler);
        }

        // ========================================
        // PRIVATE METHODS - SPEED SCRUBBING
        // ========================================

        /**
         * Set Flow speed to an absolute value (clamped). Unlike the public
         * setSpeed() this never throws, keeps the animator timeline coherent
         * mid-playback, and emits onSpeedChange so the UI HUD/pill can react.
         */
        _setSpeedValue(wpm) {
            const clamped = this._clamp(Math.round(wpm), this.config.speed.min, this.config.speed.max);
            const current = this.stateManager ? this.stateManager.get('flow.speed') : 400;
            if (clamped === current) return clamped;

            if (this.stateManager) {
                // Non-silent: persistence + UI (HUD, pill, panel slider) react.
                this.stateManager.set('flow.speed', clamped);
            }
            // Recalculate the animator's internal timeline for the new rate so
            // the highlight doesn't jump (same idea as the BUG #5 fix).
            if (this.state.flow.playing && this.animator) {
                this.animator.jumpTo(this.state.flow.currentWordIndex);
            }
            this._emit('onSpeedChange', clamped);
            return clamped;
        }

        _nudgeSpeed(deltaWpm) {
            const current = this.stateManager ? this.stateManager.get('flow.speed') : 400;
            return this._setSpeedValue(current + deltaWpm);
        }

        _speedPointerDown(e) {
            if (this._destroyed || this.state.mode !== 'flow') return;
            if (!e.isPrimary || e.button > 0) return;
            // Ignore when a second finger is (or might be) down - that's pinch.
            if (this.state.gesture.touches && this.state.gesture.touches.length > 1) return;

            this._speedDrag = {
                id: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                startSpeed: this.stateManager ? this.stateManager.get('flow.speed') : 400,
                active: false
            };
        }

        _speedPointerMove(e) {
            const d = this._speedDrag;
            if (!d || e.pointerId !== d.id) return;

            // A second finger arrived: this is a pinch, not a speed scrub.
            if (this.state.gesture.touches && this.state.gesture.touches.length > 1) {
                this._speedDrag = null;
                return;
            }

            const dx = e.clientX - d.startX;
            const dy = e.clientY - d.startY;

            if (!d.active) {
                // Engage only on a clearly horizontal intent
                if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.3) {
                    // A vertical drag: let it scroll, abandon the gesture
                    if (Math.abs(dy) > 12) this._speedDrag = null;
                    return;
                }
                d.active = true;
                try { this.el.reader.setPointerCapture(e.pointerId); } catch (err) {}
            }

            e.preventDefault();
            // ~1.6 WPM per pixel: full 100-650 range is a ~340px swipe, and a
            // 10px nudge is 16 WPM - fine enough to land exactly.
            this._setSpeedValue(d.startSpeed + dx * 1.6);
        }

        _speedPointerUp(e) {
            const d = this._speedDrag;
            if (!d) return;
            if (e && e.pointerId !== d.id) return;
            try { this.el.reader.releasePointerCapture(d.id); } catch (err) {}
            if (d.active) {
                // Swallow the click this drag would otherwise generate
                this._suppressNextClick = true;
                setTimeout(() => { this._suppressNextClick = false; }, 350);
            }
            this._speedDrag = null;
        }

        // ========================================
        // PRIVATE METHODS - EVENT HANDLERS
        // ========================================

        _handleWordClick(e) {
            if (this._destroyed) return;

            // A speed-scrub drag that just ended would otherwise fire a click
            // here (pause / jump). Swallow it.
            if (this._suppressNextClick) {
                this._suppressNextClick = false;
                e.preventDefault();
                e.stopPropagation();
                return;
            }

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
            
            // Note: currentWordIndex reset is now handled synchronously in loadContent()
            // to prevent race conditions with play() being called before render completes

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

                //
                // --- FIX BUG #4 ---
                //
                // The scroll just invalidated all cached rects.
                // Mark the index as dirty to force a rebuild on the next tick.
                if (this.wordIndexManager) {
                    this.wordIndexManager.invalidate();
                }
                // --- END OF FIX ---
            }
        }

        _animate() {
            // STEP 16I: Delegate to Animator module
            if (this._destroyed || !this.wordIndexManager || !this.animator) return;
            
            const totalWords = this.wordIndexManager.getTotalWords();
            
            this.animator.start(
                this.state.flow.currentWordIndex,
                // onTick callback
                (wordIndex, t) => {
                    if (this._destroyed) return { complete: true };
                    
                    this.state.flow.currentWordIndex = wordIndex;
                    
                    // Check if animation should complete
                    const centerIdx = Math.floor(wordIndex);
                    if (centerIdx >= totalWords) {
                        // Chapter finished - emit an event for the app to handle
                        this._emit('onChapterEnd');
                        
                        // Stop this animator instance
                        this.state.flow.playing = false;
                        this.animator.stop();
                        
                        // Signal to the Animator that this loop is complete
                        return { complete: true };
                    }
                    
                    // Update visuals
                    this._scrollToWordIfNeeded(wordIndex);
                    this._updateWordStates(wordIndex);
                    
                    // Check for newline pause
                    const currentWordIdx = Math.floor(wordIndex);
                    const currentWord = this.wordIndexManager.getWord(currentWordIdx);
                    
                    // Check Animator's state, not engine's state
                    if (currentWord && currentWord.isNewline && 
                        this.animator.pauseUntil === 0 && 
                        this.animator.lastPausedWord !== currentWordIdx) {
                        return { pauseAtNewline: true };
                    }
                    
                    return {};
                },
                // onComplete callback
                () => {
                    this.state.flow.playing = false;
                    this._emit('onPlayChange', false);
                }
            );
        }

        _togglePlay() {
            if (this._destroyed || !this.wordIndexManager) return;
            
            if (this.state.flow.playing) {
                // --- PAUSE LOGIC (REVISED) ---
                
                // Stop the main animator module
                if (this.animator) {
                    this.animator.stop();
                }
                
                // Also clear any pending "0-word" timeout timer
                // (clearTimeout and cancelAnimationFrame are safe to call on the wrong ID)
                if (this.state.flow.rafId) {
                    clearTimeout(this.state.flow.rafId);
                    this.state.flow.rafId = null;
                }
                
                this.state.flow.playing = false;
            } else {
                // --- PLAY LOGIC (REVISED) ---
                this.wordIndexManager.rebuild();
                const totalWords = this.wordIndexManager.getTotalWords();
                
                this.state.flow.playing = true; // Set state to playing *first*

                if (!totalWords) {
                    // --- 0-WORD (IMAGE CHAPTER) LOGIC ---
                    console.warn('Flow mode started on a chapter with 0 words. Pausing for 2s...');
                    
                    // Use rafId to store the TIMEOUT id (safe, as animator isn't running)
                    this.state.flow.rafId = setTimeout(() => {
                        this.state.flow.rafId = null; // Clear the ID
                        
                        // Check if user paused during the 2-second wait
                        if (!this.state.flow.playing) {
                            console.log('0-word pause cancelled by user.');
                            return; 
                        }
                        
                        console.log('Image chapter pause complete. Emitting onChapterEnd.');
                        this._emit('onChapterEnd');
                        
                        // This "play" session is over.
                        this.state.flow.playing = false; 
                        this._emit('onPlayChange', false); // Update UI

                    }, 2000); // 2-second pause for the image
                    
                    // Note: We DO NOT call _animate() here.
                    
                } else {
                    // --- NORMAL PLAY LOGIC (Text Chapter) ---
                    
                    // This logic correctly sets up the animator
                    const speed = this.stateManager ? this.stateManager.get('flow.speed') : 400;
                    const wordsPerSecond = speed / 60;
                    this.state.flow.startTime = performance.now() - 
                        (this.state.flow.currentWordIndex / wordsPerSecond) * 1000;
                    this.state.flow.pauseUntil = 0;
                    this.state.flow.lastPausedWord = -1;
                    
                    // Start the animator
                    this._animate(); 
                }
            }
            
            // Emit the final state
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
                //
                // --- FIX BUG #6 ---
                //
                // If playing, tell the Animator to jump to the new position.
                // It will handle recalculating its internal timeline.
                if (this.animator) {
                    this.animator.jumpTo(idx);
                }
                this.state.flow.pauseUntil = 0;
                this.state.flow.lastPausedWord = -1;
                this._updateWordStates(idx);
                // --- END OF FIX ---
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

        _handleBionicRender() {
            if (this._destroyed) return;
            
            console.log('Reacting to Bionic state change, re-rendering...');
            
            const wasPlaying = this.state.flow.playing;
            const savedIdx = this.state.flow.currentWordIndex;
            
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
                return;
            }

            // In Flow mode the page auto-scrolls, so a plain wheel/trackpad
            // gesture is free to mean "tune speed". Accumulate small deltas so
            // one trackpad "notch" is ~5 WPM.
            if (this.state.mode === 'flow' && !e.shiftKey) {
                e.preventDefault();
                this._speedWheelAcc = (this._speedWheelAcc || 0) + e.deltaY;
                const STEP_PX = 24;
                while (Math.abs(this._speedWheelAcc) >= STEP_PX) {
                    const dir = this._speedWheelAcc > 0 ? -1 : 1; // scroll up = faster
                    this._nudgeSpeed(dir * 5);
                    this._speedWheelAcc += dir * STEP_PX;
                }
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
