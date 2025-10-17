const sampleText = `<h1>Chapter One: The Beginning</h1>
    <p>In the heart of Silicon Valley, where innovation breathed life into dreams and ambition fueled the relentless pursuit of progress, there existed a small startup that dared to challenge the giants. The morning sun cast long shadows through the floor-to-ceiling windows of their modest office, illuminating screens filled with code and whiteboards covered in sketches of impossible ideas.</p>
    <p>Sarah had always believed that the best products were born from frustration. It was a Tuesday afternoon when she threw her e-reader across the room—not hard enough to break it, but with enough force to express her complete dissatisfaction with the experience. "Why," she asked her co-founder Marcus, "does every reading app feel like it was designed in 2010?"</p>
    <p>Marcus looked up from his laptop, his fingers still hovering over the keyboard. He'd been wrestling with the same question for months. The reading experience hadn't evolved. Sure, screens got sharper and devices got thinner, but the fundamental interaction between human and text remained stubbornly unchanged.</p>
    <p>They spent the next six months in a frenzy of prototyping. Coffee cups multiplied across their desks. Whiteboards filled with user flow diagrams. They interviewed hundreds of readers—commuters on trains, students in libraries, professionals in coffee shops. What they discovered was simple: people didn't just want to read faster. They wanted to read better.</p>
    <p>The breakthrough came on a rainy November evening. Sarah was testing their latest prototype when something clicked. The text moved with her eyes, not against them. Words highlighted in rhythm with her reading speed. It felt like the book was reading her mind.</p>
    <p>"This is it," she whispered, looking up at Marcus with wide eyes. "This is what we've been searching for."</p>
    <p>Marcus leaned over her shoulder, watching the prototype in action. For the first time in months, he smiled. Really smiled. Not the forced grin of another failed demo, but the genuine expression of someone who knew they'd created something special.</p>
    <p>They called it Flow Mode. The name came naturally—it was exactly how reading felt when everything worked perfectly. No friction. No distraction. Just you and the words, moving together in perfect harmony.</p>`;

// Initialize reader and EPUB handler
const reader = new EBookReader('#reader');
reader.loadContent(sampleText);
EPUBHandler.init(reader);

// Sidebar toggle
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');
toggleBtn?.addEventListener('click', () => sidebar?.classList.toggle('collapsed'));

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
[['left', 'right']].forEach(([side]) => {
    const el = document.getElementById(`drag-${side}`);
    ['mousedown', 'touchstart'].forEach(ev => el.addEventListener(ev, e => startDrag(e, side)));
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

    reader.setMode(isFlow ? 'normal' : 'flow');
    flowBtn.classList.toggle('active', !isFlow);
    flowBtn.textContent = isFlow ? '▶ Start Flow' : '⏹ Stop Flow';

    if (!isFlow) setTimeout(() => reader.play(), 300);
});

// Bionic mode
document.getElementById('btn-bionic')?.addEventListener('click', function () {
    reader.setBionic(!reader.getState().bionic);
    this.classList.toggle('active');
});

// Sliders for speed, focus, scroll, font size
const sliders = [
    { id: 'speed', action: v => reader.setSpeed(v), label: v => `${v} WPM` },
    { id: 'focus', action: v => reader.setFocusWidth(v), label: v => v },
    { id: 'scroll', action: v => reader.setScrollLevel(v), label: v => v },
    { id: 'fontsize', action: v => { reader.state.fontSize = v; reader.updateStyles(); }, label: v => `${v}px` }
];

sliders.forEach(({ id, action, label }) => {
    const slider = document.getElementById(`${id}-slider`);
    const valueEl = document.getElementById(`${id}-value`);
    slider?.addEventListener('input', e => {
        const val = parseInt(e.target.value, 10);
        action(val);
        valueEl.textContent = label(val);
    });
});

// Font selector
document.getElementById('font-select')?.addEventListener('change', e => {
    reader.setFont(e.target.value);
});

// Themes
const themeButtons = ['light', 'dark', 'sepia', 'gray'];
themeButtons.forEach(theme => {
    const btn = document.getElementById(`theme-${theme}`);
    btn?.addEventListener('click', function () {
        reader.setTheme(theme);
        themeButtons.forEach(t => document.getElementById(`theme-${t}`)?.classList.remove('active'));
        this.classList.add('active');
    });
});

// Auto theme
document.getElementById('theme-auto')?.addEventListener('click', function () {
    reader.setAutoTheme(true);
    [...themeButtons, 'auto'].forEach(t => document.getElementById(`theme-${t}`)?.classList.remove('active'));
    this.classList.add('active');
});

// Initialize layout after render
setTimeout(updateMargins, 100);