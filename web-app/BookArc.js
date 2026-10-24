/**
 * BookArc
 * The whole book as one arc across the top of the page, after the iOS app:
 * a segment per chapter, as long as the chapter. Chapters behind you are
 * filled softly, the one you're in fills with your progress through it, the
 * rest are faint. Without chapters it is a single segment for the page.
 *
 * @license MIT
 */

class BookArc {
    static NS = 'http://www.w3.org/2000/svg';
    static W = 600;
    static H = 40;

    constructor(host) {
        this.host = host;
        this.svg = document.createElementNS(BookArc.NS, 'svg');
        this.svg.setAttribute('viewBox', `0 0 ${BookArc.W} ${BookArc.H}`);
        this.svg.setAttribute('preserveAspectRatio', 'none');
        this.svg.setAttribute('class', 'book-arc-svg');
        this.svg.setAttribute('aria-hidden', 'true');
        host.prepend(this.svg);
        this.weights = [1];
        this.index = 0;
        this.fraction = 0;
        this.segs = [];
        this._layout();
    }

    /** Point on the arc (a shallow curve dipping toward the middle) at u in 0...1. */
    static point(u) {
        const x = 12 + u * (BookArc.W - 24);
        const y = 8 + 14 * Math.sin(Math.PI * u);
        return [x, y];
    }

    /** @param weights relative length of each chapter (any positive numbers) */
    setChapters(weights) {
        this.weights = weights && weights.length ? weights.map((w) => Math.max(1, w)) : [1];
        this._layout();
        this.update(this.index, this.fraction);
    }

    _layout() {
        this.svg.replaceChildren();
        this.segs = [];
        const total = this.weights.reduce((a, b) => a + b, 0);
        const gap = this.weights.length > 1 ? 0.004 : 0;
        let start = 0;
        this.weights.forEach((w) => {
            const a = start + gap, b = start + w / total - gap;
            start += w / total;
            const path = (u0, u1) => {
                const n = Math.max(2, Math.ceil((u1 - u0) * 60));
                let d = '';
                for (let i = 0; i <= n; i++) {
                    const [x, y] = BookArc.point(u0 + (u1 - u0) * (i / n));
                    d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(2);
                }
                return d;
            };
            const track = document.createElementNS(BookArc.NS, 'path');
            track.setAttribute('d', path(a, b));
            track.setAttribute('class', 'ba-track');
            const fill = document.createElementNS(BookArc.NS, 'path');
            fill.setAttribute('d', path(a, b));
            fill.setAttribute('class', 'ba-fill');
            this.svg.append(track, fill);
            this.segs.push({ fill, length: 0 });
        });
        // Dash lengths need real geometry.
        requestAnimationFrame(() => {
            this.segs.forEach((s) => {
                s.length = s.fill.getTotalLength ? s.fill.getTotalLength() : 0;
                s.fill.style.strokeDasharray = s.length;
            });
            this.update(this.index, this.fraction);
        });
    }

    update(index, fraction) {
        this.index = Math.max(0, index);
        this.fraction = Math.min(1, Math.max(0, fraction));
        this.segs.forEach((s, i) => {
            const f = i < this.index ? 1 : i === this.index ? this.fraction : 0;
            s.fill.style.strokeDashoffset = s.length * (1 - f);
            s.fill.classList.toggle('behind', i < this.index);
        });
    }
}

if (typeof window !== 'undefined') window.BookArc = BookArc;
