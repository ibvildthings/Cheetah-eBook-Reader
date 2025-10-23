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
// STEP 14C: Initialize CheetahReaderApp (replaces all old initialization)
// ============================================================================
const app = new CheetahReaderApp('#reader', {
    fontSize: 18,
    font: 'opendyslexic',
    lineHeight: 1.8,
    theme: 'sepia',
    autoTheme: false,
    marginL: 60,
    marginR: 60,
    bionic: false,
    speed: 400,
    focusWidth: 2,
    scrollLevel: 1
});

// Load sample content
app.loadContent(sampleText);

// ============================================================================
// EPUB UPLOAD
// ============================================================================
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('epub-upload');

uploadBtn?.addEventListener('click', () => {
    fileInput.click();
});

fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        app.loadEPUB(file);
    }
});

// ============================================================================
// PASTE TEXT
// ============================================================================
const pasteBtn = document.getElementById('paste-btn');
pasteBtn?.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        
        if (!text || text.trim().length === 0) {
            alert('Clipboard is empty or contains no text.');
            return;
        }
        
        let formattedText = text;
        if (!text.includes('<p>') && !text.includes('<div>')) {
            const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
            formattedText = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
        }
        
        app.loadContent(formattedText);
        
        document.getElementById('book-title').textContent = 'Pasted Text';
        document.getElementById('book-author').textContent = `${text.length} characters`;
        document.getElementById('chapters-list').innerHTML = 
            '<div class="chapters-list-empty">No chapters (pasted text)</div>';
        
    } catch (error) {
        console.error('Failed to read clipboard:', error);
        alert('Failed to read clipboard. Make sure you granted clipboard permissions.');
    }
});

// ============================================================================
// SIDEBAR TOGGLES
// ============================================================================
const chaptersToggle = document.getElementById('chapters-toggle');
const chaptersSidebar = document.getElementById('chapters-sidebar');
chaptersToggle?.addEventListener('click', () => chaptersSidebar?.classList.toggle('collapsed'));

const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');
toggleBtn?.addEventListener('click', () => sidebar?.classList.toggle('collapsed'));

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

// ============================================================================
// MARGINS
// ============================================================================
const marginState = { dragging: false, side: null, initX: 0, initMargin: 0 };

function updateMargins() {
    const left = app.state.get('marginL');
    const right = app.state.get('marginR');
    
    const content = document.querySelector('.ebook-text-content');
    if (content) {
        content.style.paddingLeft = `${left}px`;
        content.style.paddingRight = `${right}px`;
    }

    const leftDrag = document.getElementById('drag-left');
    const rightDrag = document.getElementById('drag-right');
    leftDrag.style.width = `${Math.max(60, left)}px`;
    rightDrag.style.width = `${Math.max(60, right)}px`;

    document.getElementById('margin-left-value').textContent = `${left}px`;
    document.getElementById('margin-right-value').textContent = `${right}px`;

    app.reader.updateLayout();
}

function startDrag(e, side) {
    e.preventDefault();
    const x = e.touches?.[0]?.clientX ?? e.clientX;
    marginState.dragging = true;
    marginState.side = side;
    marginState.initX = x;
    const marginKey = side === 'left' ? 'marginL' : 'marginR';
    marginState.initMargin = app.state.get(marginKey);
    document.getElementById(`drag-${side}`)?.classList.add('dragging');
}

function handleDrag(e) {
    if (!marginState.dragging) return;
    const x = e.touches?.[0]?.clientX ?? e.clientX;
    const delta = x - marginState.initX;
    const side = marginState.side;
    const newValue = Math.max(10, Math.min(400, marginState.initMargin + (side === 'left' ? delta : -delta)));
    
    if (side === 'left') {
        app.setMargins(newValue, undefined);
    } else {
        app.setMargins(undefined, newValue);
    }
}

function stopDrag() {
    if (marginState.dragging) {
        document.getElementById(`drag-${marginState.side}`)?.classList.remove('dragging');
        marginState.dragging = false;
    }
}

['left', 'right'].forEach(side => {
    const el = document.getElementById(`drag-${side}`);
    if (el) {
        ['mousedown', 'touchstart'].forEach(ev => el.addEventListener(ev, e => startDrag(e, side)));
    }
});
['mousemove', 'touchmove'].forEach(ev => document.addEventListener(ev, handleDrag));
['mouseup', 'touchend'].forEach(ev => document.addEventListener(ev, stopDrag));

['left', 'right'].forEach(side => {
    const slider = document.getElementById(`margin-${side}-slider`);
    slider?.addEventListener('input', e => {
        const value = parseInt(e.target.value, 10);
        if (side === 'left') {
            app.setMargins(value, undefined);
        } else {
            app.setMargins(undefined, value);
        }
    });
});

app.state.subscribe('marginL', updateMargins);
app.state.subscribe('marginR', updateMargins);

// ============================================================================
// FLOW MODE
// ============================================================================
const flowBtn = document.getElementById('btn-flow');
flowBtn?.addEventListener('click', () => {
    const state = app.reader.getState();
    const isFlow = state.mode === 'flow';
    if (isFlow) {
        app.stopFlow();
    } else {
        app.startFlow();
    }
});

app.on('onModeChange', (mode) => {
    const flowBtn = document.getElementById('btn-flow');
    if (flowBtn) {
        const isFlow = mode === 'flow';
        flowBtn.classList.toggle('active', isFlow);
        flowBtn.textContent = isFlow ? '⏹ Stop Flow' : '▶ Start Flow';
    }
});

// ============================================================================
// BIONIC MODE
// ============================================================================
document.getElementById('btn-bionic')?.addEventListener('click', function () {
    app.toggleBionic();
    this.classList.toggle('active');
});

// ============================================================================
// SLIDERS
// ============================================================================
const sliders = [
    { id: 'speed', action: v => app.setSpeed(v), label: v => `${v} WPM` },
    { id: 'focus', action: v => app.setFocusWidth(v), label: v => v },
    { id: 'scroll', action: v => app.setScrollLevel(v), label: v => v },
    { id: 'fontsize', action: v => app.setFontSize(v), label: v => `${v}px` },
    { id: 'lineheight', action: v => app.setLineHeight(v), label: v => v.toFixed(1) }
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

// ============================================================================
// FONT SELECTOR
// ============================================================================
document.getElementById('font-select')?.addEventListener('change', e => {
    app.setFont(e.target.value);
});

// ============================================================================
// THEME
// ============================================================================
document.getElementById('theme-select')?.addEventListener('change', e => {
    const themeValue = e.target.value;
    const autoCheckbox = document.getElementById('theme-auto');
    if (autoCheckbox) {
        autoCheckbox.checked = false;
    }
    app.setTheme(themeValue);
});

document.getElementById('theme-auto')?.addEventListener('change', function(e) {
    const themeSelect = document.getElementById('theme-select');
    if (e.target.checked) {
        app.setAutoTheme(true);
        if (themeSelect) themeSelect.disabled = true;
    } else {
        app.setAutoTheme(false);
        if (themeSelect) themeSelect.disabled = false;
    }
});

// ============================================================================
// INITIALIZE LAYOUT
// ============================================================================
setTimeout(updateMargins, 100);
