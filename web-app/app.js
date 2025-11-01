/**
 * Cheetah Reader App Entry Point
 *
 * REFACTORED: Phase 4 - Simplified app.js using UIController pattern
 * All UI logic moved to UIController.js for better organization
 *
 * @version 2.0.0
 */

// ============================================================================
// SAMPLE CONTENT
// ============================================================================
const sampleText = `<h1>Tap text to get started</h1>
    <p>In the heart of Silicon Valley, where innovation breathed life into dreams and ambition fueled the relentless pursuit of progress, there existed a small startup that dared to challenge the giants. The morning sun cast long shadows through the floor-to-ceiling windows of their modest office, illuminating screens filled with code and whiteboards covered in sketches of impossible ideas.</p>
    <p>Sarah had always believed that the best products were born from frustration. It was a Tuesday afternoon when she threw her e-reader across the room—not hard enough to break it, but with enough force to express her complete dissatisfaction with the experience. "Why," she asked her co-founder Marcus, "does every reading app feel like it was designed in 2010?"</p>
    <p>Marcus looked up from his laptop, his fingers still hovering over the keyboard. He'd been wrestling with the same question for months. The reading experience hadn't evolved. Sure, screens got sharper and devices got thinner, but the fundamental interaction between human and text remained stubbornly unchanged.</p>
    <p>They spent the next six months in a frenzy of prototyping. Coffee cups multiplied across their desks. Whiteboards filled with user flow diagrams. They interviewed hundreds of readers—commuters on trains, students in libraries, professionals in coffee shops. What they discovered was simple: people didn't just want to read faster. They wanted to read better.</p>
    <p>The breakthrough came on a rainy November evening. Sarah was testing their latest prototype when something clicked. The text moved with her eyes, not against them. Words highlighted in rhythm with her reading speed. It felt like the book was reading her mind.</p>
    <p>"This is it," she whispered, looking up at Marcus with wide eyes. "This is what we've been searching for."</p>
    <p>Marcus leaned over her shoulder, watching the prototype in action. For the first time in months, he smiled. Really smiled. Not the forced grin of another failed demo, but the genuine expression of someone who knew they'd created something special.</p>
    <p>They called it Flow Mode. The name came naturally—it was exactly how reading felt when everything worked perfectly. No friction. No distraction. Just you and the words, moving together in perfect harmony.</p>`;

// ============================================================================
// APP INITIALIZATION
// ============================================================================

// Initialize the reader app with default settings
const app = new CheetahReaderApp('#reader', {
    fontSize: 18,
    font: 'opendyslexic',
    lineHeight: 1.8,
    theme: 'sepia',
    autoTheme: false,
    marginL: 60,
    marginR: 60,
    bionic: false,
    bionicStrength: 0.5,
    speed: 400,
    focusWidth: 2,
    scrollLevel: 1
});

// Initialize the UI controller (handles all UI interactions)
const ui = new UIController(app);

// Load initial content
app.loadContent(sampleText);

console.log('🐆 Cheetah Reader initialized');
