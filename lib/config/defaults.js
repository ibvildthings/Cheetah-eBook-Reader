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
    letterSpacing: 0,      // em, added on top of the font's own spacing
    wordSpacing: 0,        // em
    justify: false,
    invertLineArt: false,  // turn black-on-white diagrams light on dark themes

    // Theme
    theme: 'twilight',
    autoTheme: false,
    autoLightTheme: 'sepia',  // themes "match system" switches between
    autoDarkTheme: 'dark',

    // Library
    limitShelf: true,         // a few books in rotation keeps a reader reading
    homeStyle: 'editorial',   // welcome screen: 'editorial' (list) or 'shelf'

    // Layout
    marginL: 60,
    marginR: 60,

    // Reading modes
    mode: 'normal',
    bionic: true,
    bionicStrength: 0.5,  // 50% of word bolded (range: 0.2 to 0.7)

    // Flow mode
    flow: {
        playing: false,
        speed: 300,          // WPM
        speedMin: 100,       // the dial's slowest / fastest (user adjustable)
        speedMax: 650,
        currentWordIndex: 0,
        focusWidth: 2,       // Number of words in focus
        focusStrength: 1,    // 0.1-2.5: how strongly the band is lit
        focusUnderline: true,
        focusBackground: true,
        scrollLevel: 1,      // 1-5 scroll aggressiveness
        newlinePause: 1.5    // Pause multiplier at newlines
    },

    // Scroll behavior
    scroll: {
        comfortZoneTop: 0.15,
        comfortZoneBottom: 0.70,
        gap: 0.1
    },

    // Slider bounds shared by the engine, API and UI
    ranges: {
        fontSize: [12, 48],
        lineHeight: [1.0, 3.0],
        letterSpacing: [-0.05, 0.25],
        wordSpacing: [-0.15, 0.5],
        margin: [10, 400],
        speed: [100, 650],
        speedLimits: [20, 1500],   // the most a custom speed range may span
        minimumSpeedSpan: 50,
        focusWidth: [1, 5],
        focusStrength: [0.1, 2.5],
        scrollLevel: [1, 5],
        bionicStrength: [0.2, 0.7]
    }
};

console.log('✅ DEFAULT_CONFIG loaded');
