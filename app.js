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

app.loadContent(sampleText);

// ============================================================================
// SYNC UI WITH LOADED SETTINGS
// ============================================================================
// After settings are loaded, update UI controls to match
function syncUIWithState() {
    // Font selector
    const fontSelect = document.getElementById('font-select');
    if (fontSelect) fontSelect.value = app.state.get('font');
    
    // Font size
    const fontsizeSlider = document.getElementById('fontsize-slider');
    const fontsizeValue = document.getElementById('fontsize-value');
    if (fontsizeSlider) {
        const fontSize = app.state.get('fontSize');
        fontsizeSlider.value = fontSize;
        if (fontsizeValue) fontsizeValue.textContent = `${fontSize}px`;
    }
    
    // Line height
    const lineheightSlider = document.getElementById('lineheight-slider');
    const lineheightValue = document.getElementById('lineheight-value');
    if (lineheightSlider) {
        const lineHeight = app.state.get('lineHeight');
        lineheightSlider.value = lineHeight;
        if (lineheightValue) lineheightValue.textContent = lineHeight.toFixed(1);
    }
    
    // Theme
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = app.state.get('theme');
    
    const themeAuto = document.getElementById('theme-auto');
    if (themeAuto) {
        themeAuto.checked = app.state.get('autoTheme');
        if (themeSelect) themeSelect.disabled = app.state.get('autoTheme');
    }
    
    // Margins
    const marginLeftSlider = document.getElementById('margin-left-slider');
    const marginLeftValue = document.getElementById('margin-left-value');
    if (marginLeftSlider) {
        const marginL = app.state.get('marginL');
        marginLeftSlider.value = marginL;
        if (marginLeftValue) marginLeftValue.textContent = `${marginL}px`;
    }
    
    const marginRightSlider = document.getElementById('margin-right-slider');
    const marginRightValue = document.getElementById('margin-right-value');
    if (marginRightSlider) {
        const marginR = app.state.get('marginR');
        marginRightSlider.value = marginR;
        if (marginRightValue) marginRightValue.textContent = `${marginR}px`;
    }
    
    // Bionic
    const bionicBtn = document.getElementById('btn-bionic');
    if (bionicBtn && app.state.get('bionic')) {
        bionicBtn.classList.add('active');
    }
    
    // Bionic strength
    const bionicStrengthSlider = document.getElementById('bionic-strength-slider');
    const bionicStrengthValue = document.getElementById('bionic-strength-value');
    if (bionicStrengthSlider) {
        const strength = Math.round(app.state.get('bionicStrength') * 100);
        bionicStrengthSlider.value = strength;
        if (bionicStrengthValue) bionicStrengthValue.textContent = `${strength}%`;
    }
    
    // Flow speed
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    if (speedSlider) {
        const speed = app.state.get('flow.speed');
        speedSlider.value = speed;
        if (speedValue) speedValue.textContent = `${speed} WPM`;
    }
    
    // Flow focus width
    const focusSlider = document.getElementById('focus-slider');
    const focusValue = document.getElementById('focus-value');
    if (focusSlider) {
        const focus = app.state.get('flow.focusWidth');
        focusSlider.value = focus;
        if (focusValue) focusValue.textContent = focus;
    }
    
    // Flow scroll level
    const scrollSlider = document.getElementById('scroll-slider');
    const scrollValue = document.getElementById('scroll-value');
    if (scrollSlider) {
        const scroll = app.state.get('flow.scrollLevel');
        scrollSlider.value = scroll;
        if (scrollValue) scrollValue.textContent = scroll;
    }
    
    updateBionicSliderState();
    console.log('✅ UI synced with loaded settings');
}

// Sync UI after a short delay to ensure everything is initialized
setTimeout(syncUIWithState, 200);

// ============================================================================
// CONTENT LOADING - EPUB Upload
// ============================================================================
document.getElementById('upload-btn')?.addEventListener('click', () => {
    document.getElementById('epub-upload').click();
});

document.getElementById('epub-upload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) app.loadEPUB(file);
});

// ============================================================================
// CONTENT LOADING - Paste Text
// ============================================================================
document.getElementById('paste-btn')?.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        
        if (!text || text.trim().length === 0) {
            alert('Clipboard is empty or contains no text.');
            return;
        }
        
        app.loadPastedText(text);
        
        // Update UI
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
// UI - Sidebar Toggles
// ============================================================================
document.getElementById('chapters-toggle')?.addEventListener('click', () => {
    document.getElementById('chapters-sidebar')?.classList.toggle('collapsed');
});

document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
});

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
// UI - Chapter Navigation Buttons
// ============================================================================
document.getElementById('prev-chapter-btn')?.addEventListener('click', () => {
    app.previousChapter();
});

document.getElementById('next-chapter-btn')?.addEventListener('click', () => {
    app.nextChapter();
});

// ============================================================================
// UI - Margins (Drag & Sliders)
// ============================================================================
const marginState = { dragging: false, side: null, initX: 0, initMargin: 0 };

function updateMarginsUI() {
    const left = app.state.get('marginL');
    const right = app.state.get('marginR');
    
    // Update content padding
    const content = document.querySelector('.ebook-text-content');
    if (content) {
        content.style.paddingLeft = `${left}px`;
        content.style.paddingRight = `${right}px`;
    }

    // Update drag zones
    document.getElementById('drag-left').style.width = `${Math.max(60, left)}px`;
    document.getElementById('drag-right').style.width = `${Math.max(60, right)}px`;

    // Update labels
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
    marginState.initMargin = app.state.get(side === 'left' ? 'marginL' : 'marginR');
    document.getElementById(`drag-${side}`)?.classList.add('dragging');
}

function handleDrag(e) {
    if (!marginState.dragging) return;
    const x = e.touches?.[0]?.clientX ?? e.clientX;
    const delta = x - marginState.initX;
    const multiplier = marginState.side === 'left' ? 1 : -1;
    const newValue = Math.max(10, Math.min(400, marginState.initMargin + (delta * multiplier)));
    
    app.setMargins(
        marginState.side === 'left' ? newValue : undefined,
        marginState.side === 'right' ? newValue : undefined
    );
}

function stopDrag() {
    if (marginState.dragging) {
        document.getElementById(`drag-${marginState.side}`)?.classList.remove('dragging');
        marginState.dragging = false;
    }
}

// Attach drag events
['left', 'right'].forEach(side => {
    const el = document.getElementById(`drag-${side}`);
    ['mousedown', 'touchstart'].forEach(ev => 
        el?.addEventListener(ev, e => startDrag(e, side))
    );
});
['mousemove', 'touchmove'].forEach(ev => document.addEventListener(ev, handleDrag));
['mouseup', 'touchend'].forEach(ev => document.addEventListener(ev, stopDrag));

// Margin sliders
['left', 'right'].forEach(side => {
    document.getElementById(`margin-${side}-slider`)?.addEventListener('input', e => {
        const value = parseInt(e.target.value, 10);
        app.setMargins(
            side === 'left' ? value : undefined,
            side === 'right' ? value : undefined
        );
    });
});

// Subscribe to margin changes
app.state.subscribe('marginL', updateMarginsUI);
app.state.subscribe('marginR', updateMarginsUI);

// ============================================================================
// READING MODES - Flow Mode
// ============================================================================
document.getElementById('btn-flow')?.addEventListener('click', () => {
    const isFlow = app.reader.getState().mode === 'flow';
    isFlow ? app.stopFlow() : app.startFlow();
});

app.on('onModeChange', (mode) => {
    const btn = document.getElementById('btn-flow');
    if (btn) {
        btn.classList.toggle('active', mode === 'flow');
        btn.textContent = mode === 'flow' ? '⏸ Stop Flow' : '▶ Start Flow';
    }
});

// ============================================================================
// READING MODES - Bionic Mode
// ============================================================================
const bionicStrengthSlider = document.getElementById('bionic-strength-slider');

// Update slider enabled/disabled state based on bionic mode
function updateBionicSliderState() {
    const bionicEnabled = app.state.get('bionic');
    if (bionicStrengthSlider) {
        bionicStrengthSlider.disabled = !bionicEnabled;
        bionicStrengthSlider.style.opacity = bionicEnabled ? '1' : '0.5';
    }
}

document.getElementById('btn-bionic')?.addEventListener('click', function() {
    app.toggleBionic();
    this.classList.toggle('active');
    updateBionicSliderState();
});

// Bionic Strength Slider
bionicStrengthSlider?.addEventListener('input', e => {
    const value = parseInt(e.target.value, 10);
    const valueEl = document.getElementById('bionic-strength-value');
    if (valueEl) valueEl.textContent = `${value}%`;
    
    // Convert percentage to decimal (20-70% -> 0.2-0.7)
    app.setBionicStrength(value / 100);
});

// Initialize slider state
updateBionicSliderState();

// ============================================================================
// CONTROLS - Sliders
// ============================================================================
[
    { id: 'speed', action: v => app.setSpeed(v), label: v => `${v} WPM` },
    { id: 'focus', action: v => app.setFocusWidth(v), label: v => v },
    { id: 'scroll', action: v => app.setScrollLevel(v), label: v => v },
    { id: 'fontsize', action: v => app.setFontSize(v), label: v => `${v}px` },
    { id: 'lineheight', action: v => app.setLineHeight(v), label: v => v.toFixed(1) }
].forEach(({ id, action, label }) => {
    const slider = document.getElementById(`${id}-slider`);
    const valueEl = document.getElementById(`${id}-value`);
    slider?.addEventListener('input', e => {
        const val = parseFloat(e.target.value);
        action(val);
        if (valueEl) valueEl.textContent = label(val);
    });
});

// ============================================================================
// CONTROLS - Font Selector
// ============================================================================
document.getElementById('font-select')?.addEventListener('change', e => {
    app.setFont(e.target.value);
});

// ============================================================================
// CONTROLS - Theme
// ============================================================================
document.getElementById('theme-select')?.addEventListener('change', e => {
    const autoCheckbox = document.getElementById('theme-auto');
    if (autoCheckbox) autoCheckbox.checked = false;
    app.setTheme(e.target.value);
});

document.getElementById('theme-auto')?.addEventListener('change', function(e) {
    const themeSelect = document.getElementById('theme-select');
    app.setAutoTheme(e.target.checked);
    if (themeSelect) themeSelect.disabled = e.target.checked;
});

// ============================================================================
// INITIALIZE
// ============================================================================
setTimeout(updateMarginsUI, 100);
