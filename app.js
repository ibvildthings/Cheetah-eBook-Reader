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
// STEP 1: Initialize StateManager (will replace reader.state eventually)
// ============================================================================
const stateManager = new StateManager({
    fontSize: 18,
    font: 'opendyslexic',
    lineHeight: 1.8,
    theme: 'sepia',
    autoTheme: false,
    marginL: 60,
    marginR: 60,
    mode: 'normal',
    bionic: false,
    flow: {
        playing: false,
        speed: 400,
        currentWordIndex: 0,
        focusWidth: 2,
        scrollLevel: 1
    }
});

// Initialize reader and EPUB handler
const reader = new EBookReader('#reader');
reader.loadContent(sampleText);
EPUBHandler.init(reader);

// Sidebar toggle
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');
toggleBtn?.addEventListener('click', () => sidebar?.classList.toggle('collapsed'));

// Collapsible sections
document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
        const section = header.dataset.section;
        const content = document.querySelector(`[data-content="${section}"]`);
        
        if (content) {
            content.classList.toggle('collapsed');
            header.classList.toggle('collapsed');
        }
    });
});

// Margin state
const marginState = { left: 60, right: 60, dragging: false, side: null, initX: 0, initMargin: 0 };

function updateMargins() {
    const content = document.querySelector('.ebook-text-content');
    if (content) {
        content.style.paddingLeft = `${marginState.left}px`;
        content.style.paddingRight = `${marginState.right}px`;
    }

    const leftDrag = document.getElementById('drag-left');
    const rightDrag = document.getElementById('drag-right');

    leftDrag.style.width = `${Math.max(60, marginState.left)}px`;
    rightDrag.style.width = `${Math.max(60, marginState.right)}px`;

    document.getElementById('margin-left-value').textContent = `${marginState.left}px`;
    document.getElementById('margin-right-value').textContent = `${marginState.right}px`;

    reader.updateLayout();
}

function startDrag(e, side) {
    e.preventDefault();
    const x = e.touches?.[0]?.clientX ?? e.clientX;
    marginState.dragging = true;
    marginState.side = side;
    marginState.initX = x;
    marginState.initMargin = marginState[side];
    document.getElementById(`drag-${side}`)?.classList.add('dragging');
}

function handleDrag(e) {
    if (!marginState.dragging) return;
    const x = e.touches?.[0]?.clientX ?? e.clientX;
    const delta = x - marginState.initX;
    const side = marginState.side;
    marginState[side] = Math.max(10, Math.min(400, marginState.initMargin + (side === 'left' ? delta : -delta)));
    updateMargins();
}

function stopDrag() {
    if (marginState.dragging) {
        document.getElementById(`drag-${marginState.side}`)?.classList.remove('dragging');
        marginState.dragging = false;
    }
}

// Attach margin drag events efficiently
['left', 'right'].forEach(side => {
    const el = document.getElementById(`drag-${side}`);
    if (el) {
        ['mousedown', 'touchstart'].forEach(ev => el.addEventListener(ev, e => startDrag(e, side)));
    }
});
['mousemove', 'touchmove'].forEach(ev => document.addEventListener(ev, handleDrag));
['mouseup', 'touchend'].forEach(ev => document.addEventListener(ev, stopDrag));

// Margin sliders
['left', 'right'].forEach(side => {
    const slider = document.getElementById(`margin-${side}-slider`);
    slider?.addEventListener('input', e => {
        marginState[side] = parseInt(e.target.value, 10);
        updateMargins();
    });
});

// Flow mode
const flowBtn = document.getElementById('btn-flow');
flowBtn?.addEventListener('click', () => {
    const state = reader.getState();
    const isFlow = state.mode === 'flow';

    if (isFlow) {
        // Stop flow - go back to normal
        reader.setMode('normal');
    } else {
        // Start flow - enter flow mode and auto-play
        reader.setMode('flow');
        setTimeout(() => reader.play(), 300);
    }
});

// Listen for mode changes to update button
reader.on('onModeChange', (mode) => {
    const flowBtn = document.getElementById('btn-flow');
    if (flowBtn) {
        const isFlow = mode === 'flow';
        flowBtn.classList.toggle('active', isFlow);
        flowBtn.textContent = isFlow ? '⏹ Stop Flow' : '▶ Start Flow';
    }
});

// Bionic mode
document.getElementById('btn-bionic')?.addEventListener('click', function () {
    reader.setBionic(!reader.getState().bionic);
    this.classList.toggle('active');
});

// Sliders for speed, focus, scroll, font size, line height
const sliders = [
    { id: 'speed', action: v => reader.setSpeed(v), label: v => `${v} WPM` },
    { id: 'focus', action: v => reader.setFocusWidth(v), label: v => v },
    { id: 'scroll', action: v => reader.setScrollLevel(v), label: v => v },
    // STEP 2: Font size now updates StateManager (reader subscribes to it)
    { id: 'fontsize', action: v => stateManager.set('fontSize', v), label: v => `${v}px` },
    // STEP 3: Line height now updates StateManager (reader subscribes to it)
    { id: 'lineheight', action: v => stateManager.set('lineHeight', v), label: v => v.toFixed(1) }
];

sliders.forEach(({ id, action, label }) => {
    const slider = document.getElementById(`${id}-slider`);
    const valueEl = document.getElementById(`${id}-value`);
    slider?.addEventListener('input', e => {
        const val = parseFloat(e.target.value);
        action(val);
        valueEl.textContent = label(val);
    });
});

// Font selector
document.getElementById('font-select')?.addEventListener('change', e => {
    reader.setFont(e.target.value);
});

// Themes dropdown
document.getElementById('theme-select')?.addEventListener('change', e => {
    const themeValue = e.target.value;
    const autoCheckbox = document.getElementById('theme-auto');
    
    if (autoCheckbox) {
        autoCheckbox.checked = false;
    }
    
    reader.setTheme(themeValue);
});

// Auto theme checkbox
document.getElementById('theme-auto')?.addEventListener('change', function(e) {
    const themeSelect = document.getElementById('theme-select');
    
    if (e.target.checked) {
        reader.setAutoTheme(true);
        if (themeSelect) {
            themeSelect.disabled = true;
        }
    } else {
        reader.setAutoTheme(false);
        if (themeSelect) {
            themeSelect.disabled = false;
        }
    }
});

// Paste text button
const pasteBtn = document.getElementById('paste-btn');
pasteBtn?.addEventListener('click', async () => {
    try {
        // Read text from clipboard
        const text = await navigator.clipboard.readText();
        
        if (!text || text.trim().length === 0) {
            alert('Clipboard is empty or contains no text.');
            return;
        }
        
        // Wrap text in paragraph tags if it's plain text
        let formattedText = text;
        if (!text.includes('<p>') && !text.includes('<div>')) {
            // Split by double newlines to create paragraphs
            const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
            formattedText = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
        }
        
        // Load the pasted content into the reader
        reader.loadContent(formattedText);
        
        // Update book metadata to show it's pasted content
        document.getElementById('book-title').textContent = 'Pasted Text';
        document.getElementById('book-author').textContent = `${text.length} characters`;
        
        // Clear chapters list since this isn't an EPUB
        document.getElementById('chapters-list').innerHTML = 
            '<div class="chapters-list-empty">No chapters (pasted text)</div>';
        
    } catch (error) {
        console.error('Failed to read clipboard:', error);
        alert('Failed to read clipboard. Make sure you granted clipboard permissions.');
    }
});

// Initialize layout after render
setTimeout(updateMargins, 100);

reader.setFont('opendyslexic');

// ============================================================================
// STEP 2: Reader subscribes to StateManager for fontSize
// ============================================================================
stateManager.subscribe('fontSize', (newSize) => {
    reader.state.fontSize = newSize;
    reader.updateStyles();
});

// ============================================================================
// STEP 3: Reader subscribes to StateManager for lineHeight
// ============================================================================
stateManager.subscribe('lineHeight', (newHeight) => {
    reader.state.lineHeight = newHeight;
    reader.updateStyles();
});
