const sampleText = `<h1>Chapter One: The Beginning</h1>
    <p>In the heart of Silicon Valley, where innovation breathed life into dreams and ambition fueled the relentless pursuit of progress, there existed a small startup that dared to challenge the giants. The morning sun cast long shadows through the floor-to-ceiling windows of their modest office, illuminating screens filled with code and whiteboards covered in sketches of impossible ideas.</p>
    <p>Sarah had always believed that the best products were born from frustration. It was a Tuesday afternoon when she threw her e-reader across the room—not hard enough to break it, but with enough force to express her complete dissatisfaction with the experience. "Why," she asked her co-founder Marcus, "does every reading app feel like it was designed in 2010?"</p>
    <p>Marcus looked up from his laptop, his fingers still hovering over the keyboard. He'd been wrestling with the same question for months. The reading experience hadn't evolved. Sure, screens got sharper and devices got thinner, but the fundamental interaction between human and text remained stubbornly unchanged.</p>
    <p>They spent the next six months in a frenzy of prototyping. Coffee cups multiplied across their desks. Whiteboards filled with user flow diagrams. They interviewed hundreds of readers—commuters on trains, students in libraries, professionals in coffee shops. What they discovered was simple: people didn't just want to read faster. They wanted to read better.</p>
    <p>The breakthrough came on a rainy November evening. Sarah was testing their latest prototype when something clicked. The text moved with her eyes, not against them. Words highlighted in rhythm with her reading speed. It felt like the book was reading her mind.</p>
    <p>"This is it," she whispered, looking up at Marcus with wide eyes. "This is what we've been searching for."</p>
    <p>Marcus leaned over her shoulder, watching the prototype in action. For the first time in months, he smiled. Really smiled. Not the forced grin of another failed demo, but the genuine expression of someone who knew they'd created something special.</p>
    <p>They called it Flow Mode. The name came naturally—it was exactly how reading felt when everything worked perfectly. No friction. No distraction. Just you and the words, moving together in perfect harmony.</p>`;

const reader = new EBookReader('#reader');
reader.loadContent(sampleText);

// Initialize EPUB handler
EPUBHandler.init(reader);

// Sidebar toggle functionality
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebar-toggle');

toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
});

// Margin state management
let marginState = { left: 60, right: 60, dragging: false, side: null, initX: 0, initMargin: 0 };

function updateMargins() {
    const content = document.querySelector('.ebook-text-content');
    if (content) {
        content.style.paddingLeft = marginState.left + 'px';
        content.style.paddingRight = marginState.right + 'px';
    }

    document.getElementById('drag-left').style.width = Math.max(60, marginState.left) + 'px';
    document.getElementById('drag-right').style.width = Math.max(60, marginState.right) + 'px';
    document.getElementById('margin-left-value').textContent = marginState.left + 'px';
    document.getElementById('margin-right-value').textContent = marginState.right + 'px';

    reader.updateLayout();
}

function startDrag(e, side) {
    e.preventDefault();
    marginState.dragging = true;
    marginState.side = side;
    marginState.initX = e.touches?.[0]?.clientX || e.clientX;
    marginState.initMargin = side === 'left' ? marginState.left : marginState.right;
    document.getElementById(`drag-${side}`).classList.add('dragging');
}

function handleDrag(e) {
    if (!marginState.dragging) return;
    const x = e.touches?.[0]?.clientX || e.clientX;
    const delta = x - marginState.initX;
    let val = marginState.initMargin + (marginState.side === 'left' ? delta : -delta);
    val = Math.max(10, Math.min(400, val));
    marginState[marginState.side] = val;
    updateMargins();
}

function stopDrag() {
    if (marginState.dragging) {
        document.getElementById(`drag-${marginState.side}`)?.classList.remove('dragging');
    }
    marginState.dragging = false;
}

['mousedown', 'touchstart'].forEach(e => {
    document.getElementById('drag-left').addEventListener(e, ev => startDrag(ev, 'left'));
    document.getElementById('drag-right').addEventListener(e, ev => startDrag(ev, 'right'));
});
['mousemove', 'touchmove'].forEach(e => document.addEventListener(e, handleDrag));
['mouseup', 'touchend'].forEach(e => document.addEventListener(e, stopDrag));

document.getElementById('margin-left-slider').addEventListener('input', e => {
    marginState.left = parseInt(e.target.value);
    updateMargins();
});
document.getElementById('margin-right-slider').addEventListener('input', e => {
    marginState.right = parseInt(e.target.value);
    updateMargins();
});

// Flow toggle button
document.getElementById('btn-flow').addEventListener('click', () => {
    const state = reader.getState();
    const flowBtn = document.getElementById('btn-flow');

    if (state.mode === 'flow') {
        reader.setMode('normal');
        flowBtn.classList.remove('active');
        flowBtn.textContent = '▶ Start Flow';
    } else {
        reader.setMode('flow');
        setTimeout(() => reader.play(), 150);
        flowBtn.classList.add('active');
        flowBtn.textContent = '⏹ Stop Flow';
    }
});

document.getElementById('btn-bionic').addEventListener('click', function() {
    reader.setBionic(!reader.getState().bionic);
    this.classList.toggle('active');
});

document.getElementById('speed-slider').addEventListener('input', e => {
    reader.setSpeed(parseInt(e.target.value));
    document.getElementById('speed-value').textContent = e.target.value + ' WPM';
});

document.getElementById('focus-slider').addEventListener('input', e => {
    reader.setFocusWidth(parseInt(e.target.value));
    document.getElementById('focus-value').textContent = e.target.value;
});

document.getElementById('scroll-slider').addEventListener('input', e => {
    reader.setScrollLevel(parseInt(e.target.value));
    document.getElementById('scroll-value').textContent = e.target.value;
});

document.getElementById('font-select').addEventListener('change', e => {
    reader.setFont(e.target.value);
});

document.getElementById('fontsize-slider').addEventListener('input', e => {
    reader.state.fontSize = parseInt(e.target.value);
    reader.updateStyles();
    document.getElementById('fontsize-value').textContent = e.target.value + 'px';
});

['light', 'dark', 'sepia', 'gray'].forEach(theme => {
    document.getElementById(`theme-${theme}`).addEventListener('click', function() {
        reader.setTheme(theme);
        document.querySelectorAll('[id^="theme-"]').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

document.getElementById('theme-auto').addEventListener('click', function() {
    reader.setAutoTheme(true);
    document.querySelectorAll('[id^="theme-"]').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
});

setTimeout(updateMargins, 100);