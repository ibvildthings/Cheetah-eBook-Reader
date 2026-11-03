/**
 * FlowDial
 * The Flow control, after the iOS app's FlowArcBar: a play / pause button,
 * a speed dial drawn as a fan of rays whose bright cluster marks the current
 * speed, and a cat's ear either side for previous / next chapter.
 *
 * Slower speeds lie to the left, faster to the right. Dragging the dial
 * scrubs speed with the same velocity-sensitive gain as the page gesture.
 *
 * @license MIT
 */

class FlowDial {
    static NS = 'http://www.w3.org/2000/svg';
    static W = 400;
    static H = 140;
    static CX = 200;
    static CY = 140;
    static RAYS = 41;

    constructor(host, app) {
        this.host = host;
        this.app = app;
        this.playing = false;
        this.rays = [];
        this._build();
        this._bind();
        this.sync();
    }

    // ---- build -----------------------------------------------------------

    _el(name, attrs = {}, parent) {
        const e = document.createElementNS(FlowDial.NS, name);
        for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
        if (parent) parent.appendChild(e);
        return e;
    }

    _build() {
        const { W, H, CX, CY, RAYS } = FlowDial;
        this.host.classList.add('flow-dial');
        this.host.innerHTML = '';
        const svg = this._el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'flow-dial-svg', role: 'group',
                                      'aria-label': 'Flow controls' }, this.host);
        this.svg = svg;

        // Ears (chapter turns)
        const ear = (side) => {
            const dir = side === 'prev' ? -1 : 1;
            const x = (dx) => CX + dir * dx;
            const g = this._el('g', { class: `fd-ear fd-ear-${side}`, role: 'button', tabindex: '0',
                'aria-label': side === 'prev' ? 'Previous chapter' : 'Next chapter' }, svg);
            this._el('path', {
                d: `M${x(100)} ${CY - 4} L${x(146)} ${CY - 4} L${x(160)} ${CY - 62} Z`,
                class: 'fd-ear-shape'
            }, g);
            // The chevron sits toward the screen edge, where a thumb lands.
            this._el('path', {
                d: `M${x(124)} ${CY - 40} L${x(137)} ${CY - 27} L${x(124)} ${CY - 14}`,
                class: 'fd-ear-chevron'
            }, g);
            // Generous invisible target
            this._el('rect', { x: dir < 0 ? x(174) : x(86), y: CY - 76, width: 88, height: 76, fill: 'transparent' }, g);
            return g;
        };
        this.earPrev = ear('prev');
        this.earNext = ear('next');

        // Dial: invisible hit area + rays + labels
        this.dial = this._el('g', { class: 'fd-dial' }, svg);
        this._el('path', { d: `M${CX - 98} ${CY} A98 98 0 0 1 ${CX + 98} ${CY} Z`, fill: 'transparent' }, this.dial);
        for (let i = 0; i < RAYS; i++) {
            const a = this._angle(i / (RAYS - 1));
            const r1 = 66, r2 = 84;
            const ray = this._el('line', {
                x1: CX + r1 * Math.cos(a), y1: CY - r1 * Math.sin(a),
                x2: CX + r2 * Math.cos(a), y2: CY - r2 * Math.sin(a),
                class: 'fd-ray'
            }, this.dial);
            this.rays.push(ray);
        }
        const tortoise = this._el('text', { class: 'fd-animal', 'aria-hidden': 'true',
            x: CX - 100, y: CY - 22, 'text-anchor': 'middle' }, this.dial);
        tortoise.textContent = '🐢';
        const hare = this._el('text', { class: 'fd-animal', 'aria-hidden': 'true',
            x: CX + 100, y: CY - 22, 'text-anchor': 'middle' }, this.dial);
        hare.textContent = '🐇';

        // Button
        this.button = this._el('g', { class: 'fd-button', role: 'button', tabindex: '0',
            'aria-label': 'Play Flow' }, svg);
        this._el('path', { d: `M${CX - 54} ${CY} A54 54 0 0 1 ${CX + 54} ${CY} Z`, class: 'fd-button-shape' }, this.button);
        this.play = this._el('path', { d: `M${CX - 9} ${CY - 44} L${CX + 13} ${CY - 31} L${CX - 9} ${CY - 18} Z`,
            class: 'fd-icon' }, this.button);
        this.pause = this._el('g', { class: 'fd-icon fd-pause' }, this.button);
        this._el('rect', { x: CX - 11, y: CY - 45, width: 7, height: 27, rx: 2 }, this.pause);
        this._el('rect', { x: CX + 4, y: CY - 45, width: 7, height: 27, rx: 2 }, this.pause);

        // Readout
        this.readout = this._el('text', { class: 'fd-readout', x: CX, y: CY - 106, 'text-anchor': 'middle' }, svg);
        this.readout.textContent = '';
    }

    /** Fraction 0...1 along the dial to an angle (radians from +x, left → right). */
    _angle(u) {
        return Math.PI * (1 - (0.07 + 0.86 * u));
    }

    // ---- behaviour -------------------------------------------------------

    _bind() {
        const app = this.app;

        // Button: tap toggles Flow / play.
        const toggle = () => {
            const st = app.getReaderState();
            if (st && st.mode === 'flow') app.togglePlay();
            else app.startFlow();
        };
        this._activate(this.button, toggle);
        this._activate(this.earPrev, () => app.previousChapter());
        this._activate(this.earNext, () => app.nextChapter());

        // Dial: drag to scrub speed.
        let scrub = null;
        this.dial.addEventListener('pointerdown', (e) => {
            if (e.button > 0) return;
            const f = app.getCurrentSettings().flow;
            scrub = { id: e.pointerId, s: new SpeedScrub(f.speed, e.clientX, e.timeStamp, f.speedMin, f.speedMax) };
            this.dial.setPointerCapture(e.pointerId);
            this.host.classList.add('scrubbing');
            e.preventDefault();
        });
        this.dial.addEventListener('pointermove', (e) => {
            if (!scrub || e.pointerId !== scrub.id) return;
            e.preventDefault();
            app.setSpeed(scrub.s.update(e.clientX, e.timeStamp));
        });
        const end = (e) => {
            if (!scrub || (e && e.pointerId !== scrub.id)) return;
            try { this.dial.releasePointerCapture(scrub.id); } catch (err) { /* already released */ }
            this.host.classList.remove('scrubbing');
            scrub = null;
        };
        this.dial.addEventListener('pointerup', end);
        this.dial.addEventListener('pointercancel', end);
        // Mouse wheel over the dial nudges speed (5 WPM a notch).
        this.dial.addEventListener('wheel', (e) => {
            e.preventDefault();
            app.setSpeed(app.getCurrentSettings().flow.speed + (e.deltaY < 0 ? 5 : -5));
        }, { passive: false });

        app.onSettingChange(['flow.speed', 'flow.speedMin', 'flow.speedMax'], () => this.sync());
        app.on('onPlayChange', (p) => this.setPlaying(!!p));
        app.on('onModeChange', (m) => { if (m !== 'flow') this.setPlaying(false); });
    }

    _activate(node, fn) {
        node.addEventListener('click', (e) => {
            if (node.classList.contains('disabled')) return;
            e.stopPropagation();
            fn();
        });
        node.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); node.click(); }
        });
    }

    setPlaying(p) {
        this.playing = p;
        this.host.classList.toggle('playing', p);
        this.play.style.display = p ? 'none' : '';
        this.pause.style.display = p ? '' : 'none';
        this.button.setAttribute('aria-label', p ? 'Pause Flow' : 'Play Flow');
    }

    /** Chapter availability from the EPUB navigation event. */
    setNavigation({ hasPrev, hasNext, visible }) {
        this.earPrev.classList.toggle('disabled', !hasPrev);
        this.earNext.classList.toggle('disabled', !hasNext);
        this.host.classList.toggle('has-chapters', !!visible);
    }

    sync() {
        const f = this.app.getCurrentSettings().flow;
        const t = (f.speed - f.speedMin) / (f.speedMax - f.speedMin);
        this.rays.forEach((ray, i) => {
            const u = i / (FlowDial.RAYS - 1);
            const lit = Math.exp(-Math.pow((u - t) / 0.07, 2));
            ray.style.opacity = (0.22 + 0.78 * lit).toFixed(3);
            ray.style.strokeWidth = (2.2 + 2.4 * lit).toFixed(2);
            ray.classList.toggle('lit', lit > 0.55);
        });
        this.readout.textContent = `${Math.round(f.speed)} WPM`;
        if (this.playing === undefined) this.setPlaying(false);
    }
}

if (typeof window !== 'undefined') window.FlowDial = FlowDial;
