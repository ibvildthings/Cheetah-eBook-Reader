/**
 * Default Configuration
 * Default settings for CheetahReader initialization
 * 
 * STEP 17: Extracted configuration defaults
 * 
 * @license MIT
 */

// STEP 17E: Fixed to use window namespace instead of ES6 export
window.DEFAULT_CONFIG = {
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
    bionicStrength: 0.5,  // 50% of word bolded (range: 0.2 to 0.7)
    
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

console.log('✅ DEFAULT_CONFIG loaded');
