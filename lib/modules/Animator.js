/**
 * Animator Module v1.0.0
 * Handles animation loop timing for flow mode
 * 
 * STEP 16: Extracted from engine for modularity
 * 
 * @license MIT
 * @version 1.0.0
 */

class Animator {
    constructor(stateManager, config = {}) {
        this.stateManager = stateManager;
        this.config = {
            newlinePause: config.newlinePause || 1.5,
            ...config
        };
        
        this.rafId = null;
        this.playing = false;
        this.startTime = 0;
        this.currentWordIndex = 0;
        this.pauseUntil = 0;
        this.lastPausedWord = -1;
        
        // Callbacks
        this.onTick = null;
        this.onComplete = null;
        this._destroyed = false;
    }

    // ========================================
    // PUBLIC API - PLAYBACK CONTROL
    // ========================================

    /**
     * Start animation loop
     * @param {number} fromIndex - Starting word index
     * @param {Function} onTick - Callback for each frame (wordIndex)
     * @param {Function} onComplete - Callback when animation completes
     */
    start(fromIndex = 0, onTick, onComplete) {
        if (this._destroyed || this.playing) return;
        
        this.playing = true;
        this.currentWordIndex = fromIndex;
        this.onTick = onTick;
        this.onComplete = onComplete;
        
        const speed = this.stateManager ? this.stateManager.get('flow.speed') : 400;
        const wordsPerSecond = speed / 60;
        this.startTime = performance.now() - (fromIndex / wordsPerSecond) * 1000;
        this.pauseUntil = 0;
        this.lastPausedWord = -1;
        
        this._animate();
    }

    /**
     * Stop animation loop
     */
    stop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.playing = false;
    }

    /**
     * Toggle play/pause
     * @param {number} currentIndex - Current word index when resuming
     * @param {Function} onTick - Tick callback
     * @param {Function} onComplete - Complete callback
     */
    toggle(currentIndex, onTick, onComplete) {
        if (this.playing) {
            this.stop();
        } else {
            this.start(currentIndex, onTick, onComplete);
        }
    }

    /**
     * Jump to specific word
     * @param {number} index - Word index to jump to
     */
    jumpTo(index) {
        if (this._destroyed) return;
        
        this.currentWordIndex = index;
        
        if (this.playing) {
            const speed = this.stateManager ? this.stateManager.get('flow.speed') : 400;
            const wordsPerSecond = speed / 60;
            this.startTime = performance.now() - (index / wordsPerSecond) * 1000;
            this.pauseUntil = 0;
            this.lastPausedWord = -1;
        }
    }

    // ========================================
    // PUBLIC API - STATE
    // ========================================

    /**
     * Get current animation state
     */
    getState() {
        return {
            playing: this.playing,
            currentWordIndex: this.currentWordIndex,
            startTime: this.startTime,
            pauseUntil: this.pauseUntil
        };
    }

    /**
     * Check if currently playing
     */
    isPlaying() {
        return this.playing;
    }

    // ========================================
    // PRIVATE - ANIMATION LOOP
    // ========================================

    _animate() {
        if (this._destroyed || !this.playing) return;

        const frame = (t) => {
            if (this._destroyed || !this.playing) return;

            // Handle pause at newlines
            if (this.pauseUntil > 0) {
                if (t < this.pauseUntil) {
                    this.rafId = requestAnimationFrame(frame);
                    return;
                }
                
                const speed = this.stateManager ? this.stateManager.get('flow.speed') : 400;
                this.startTime = t - (this.currentWordIndex / (speed / 60)) * 1000;
                this.pauseUntil = 0;
            }

            // Calculate current word index based on time
            const elapsed = t - this.startTime;
            const speed = this.stateManager ? this.stateManager.get('flow.speed') : 400;
            const wordsPerSecond = speed / 60;
            const wordIndex = (elapsed / 1000) * wordsPerSecond;

            this.currentWordIndex = wordIndex;

            // Call tick callback with current state
            if (this.onTick) {
                console.log('🎯 Calling onTick with wordIndex:', wordIndex.toFixed(2));
                const result = this.onTick(wordIndex, t);
                console.log('🎯 onTick returned:', result);
                
                // Check if tick wants to pause at newline
                if (result && result.pauseAtNewline) {
                    const pauseDuration = (60000 / speed) * this.config.newlinePause;
                    this.pauseUntil = t + pauseDuration;
                    this.lastPausedWord = Math.floor(wordIndex);
                }
                
                // Check if tick signals completion
                if (result && result.complete) {
                    this.stop();
                    if (this.onComplete) {
                        this.onComplete();
                    }
                    return;
                }
            }

            this.rafId = requestAnimationFrame(frame);
        };

        this.rafId = requestAnimationFrame(frame);
    }

    // ========================================
    // CLEANUP
    // ========================================

    /**
     * Cleanup and destroy animator
     */
    destroy() {
        this.stop();
        this._destroyed = true;
        this.onTick = null;
        this.onComplete = null;
        this.stateManager = null;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Animator;
}
if (typeof window !== 'undefined') {
    window.Animator = Animator;
}
