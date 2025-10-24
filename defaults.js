/**
 * Default Configuration
 * Default settings for CheetahReader initialization
 * 
 * STEP 17: Extracted configuration defaults
 * 
 * @license MIT
 */

export const DEFAULT_CONFIG = {
    // Typography
    fontSize: 18,
    font: 'opendyslexic',
    lineHeight: 1.8,
    
    // Theme
    theme: 'sepia',
    autoTheme: false,
    
    // Layout
    marginL: 60,
    marginR: 60,
    
    // Reading modes
    mode: 'normal',
    bionic: false,
    
    // Flow mode
    flow: {
        playing: false,
        speed: 400,          // WPM
        currentWordIndex: 0,
        focusWidth: 2,       // Number of words in focus
        scrollLevel: 1,      // 1-5 scroll aggressiveness
        newlinePause: 1.5    // Pause multiplier at newlines
    },
    
    // Scroll behavior
    scroll: {
        comfortZoneTop: 0.25,
        comfortZoneBottom: 0.75,
        gap: 0.35
    }
};

// For non-module usage
if (typeof window !== 'undefined') {
    window.DEFAULT_CONFIG = DEFAULT_CONFIG;
}
