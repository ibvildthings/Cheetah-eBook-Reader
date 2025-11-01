/**
 * Font Configuration
 * Defines all available fonts for the reader
 * 
 * STEP 17: Extracted from ebook-reader-core.js
 * 
 * @license MIT
 */

// STEP 17E: Fixed to use window namespace instead of ES6 export
window.FONTS = {
    // SERIF
    georgia: {
        name: 'Georgia',
        family: 'Georgia, serif',
        category: 'serif',
        lineHeight: 1.7,
        source: 'system',
        weights: [400, 700]
    },
    merriweather: {
        name: 'Merriweather',
        family: "'Merriweather', serif",
        category: 'serif',
        lineHeight: 1.8,
        source: 'google',
        googleFont: 'Merriweather:wght@400;700',
        weights: [400, 700]
    },
    lora: {
        name: 'Lora',
        family: "'Lora', serif",
        category: 'serif',
        lineHeight: 1.75,
        source: 'google',
        googleFont: 'Lora:wght@400;700',
        weights: [400, 700]
    },
    crimson: {
        name: 'Crimson Pro',
        family: "'Crimson Pro', serif",
        category: 'serif',
        lineHeight: 1.7,
        source: 'google',
        googleFont: 'Crimson+Pro:wght@400;700',
        weights: [400, 700]
    },
    baskerville: {
        name: 'Libre Baskerville',
        family: "'Libre Baskerville', serif",
        category: 'serif',
        lineHeight: 1.8,
        source: 'google',
        googleFont: 'Libre+Baskerville:wght@400;700',
        weights: [400, 700]
    },
    
    // SANS SERIF
    inter: {
        name: 'Inter',
        family: "'Inter', sans-serif",
        category: 'sans',
        lineHeight: 1.6,
        source: 'google',
        googleFont: 'Inter:wght@400;700',
        weights: [400, 700]
    },
    opensans: {
        name: 'Open Sans',
        family: "'Open Sans', sans-serif",
        category: 'sans',
        lineHeight: 1.65,
        source: 'google',
        googleFont: 'Open+Sans:wght@400;700',
        weights: [400, 700]
    },
    sourcesans: {
        name: 'Source Sans 3',
        family: "'Source Sans 3', sans-serif",
        category: 'sans',
        lineHeight: 1.6,
        source: 'google',
        googleFont: 'Source+Sans+3:wght@400;700',
        weights: [400, 700]
    },
    nunito: {
        name: 'Nunito Sans',
        family: "'Nunito Sans', sans-serif",
        category: 'sans',
        lineHeight: 1.65,
        source: 'google',
        googleFont: 'Nunito+Sans:wght@400;700',
        weights: [400, 700]
    },
    
    // MONOSPACE
    jetbrains: {
        name: 'JetBrains Mono',
        family: "'JetBrains Mono', monospace",
        category: 'mono',
        lineHeight: 1.7,
        source: 'google',
        googleFont: 'JetBrains+Mono:wght@400;700',
        weights: [400, 700]
    },
    fira: {
        name: 'Fira Mono',
        family: "'Fira Mono', monospace",
        category: 'mono',
        lineHeight: 1.7,
        source: 'google',
        googleFont: 'Fira+Mono:wght@400;700',
        weights: [400, 700]
    },
    
    // SLAB
    robotoslab: {
        name: 'Roboto Slab',
        family: "'Roboto Slab', serif",
        category: 'slab',
        lineHeight: 1.7,
        source: 'google',
        googleFont: 'Roboto+Slab:wght@400;700',
        weights: [400, 700]
    },
    
    // ACCESSIBILITY
    lexend: {
        name: 'Lexend',
        family: "'Lexend', sans-serif",
        category: 'accessibility',
        lineHeight: 1.8,
        source: 'google',
        googleFont: 'Lexend:wght@400;700',
        weights: [400, 700]
    },
    opendyslexic: {
        name: 'OpenDyslexic',
        family: "'OpenDyslexic', sans-serif",
        category: 'accessibility',
        lineHeight: 1.8,
        source: 'cdn',
        cdnUrl: 'https://cdn.jsdelivr.net/npm/opendyslexic@3.0.1/opendyslexic-regular.woff2',
        weights: [400, 700]
    }
};

console.log('✅ FONTS loaded:', Object.keys(window.FONTS).length, 'fonts');
