/**
 * WelcomeScreen
 * The shelf and the screen shown before a book is open, after the iOS app:
 * a masthead set as type, the books in rotation (as a list, or as covers on a
 * shelf with the room tinted by the one in focus), and one call to action.
 * Also keeps the library in step with what is being read: shelving a book
 * when it opens, its cover, and the place the reader got to.
 *
 * @license MIT
 */

class WelcomeScreen {
    constructor({ app, ui, library, sampleHtml }) {
        this.app = app;
        this.ui = ui;
        this.library = library;
        this.sampleHtml = sampleHtml;
        this.root = document.getElementById('welcome');
        this.appRoot = document.getElementById('app');
        this.current = null;      // { id, file, meta } of the book being read
        this.urls = [];           // object URLs to revoke on re-render
        this.focusedId = null;
        this.books = [];

        this._wireLibrary();
        this._wireDetails();
        document.getElementById('library-btn')?.addEventListener('click', () => this.show());
        this.library.onChange(() => { if (this.visible) this.render(); });
        this.app.onSettingChange(['homeStyle', 'flow.speed', 'theme', 'autoTheme'], () => { if (this.visible) this.render(); });

        this.show();
    }

    get visible() { return this.appRoot.classList.contains('welcome-open'); }

    // ---- showing ---------------------------------------------------------

    async show() {
        this.app.pause?.();
        this.appRoot.classList.add('welcome-open');
        this.root.hidden = false;
        await this.render();
    }

    hide() {
        this.appRoot.classList.remove('welcome-open');
        this.root.hidden = true;
    }

    // ---- library upkeep --------------------------------------------------

    _wireLibrary() {
        this.app.onBookOpen((file) => {
            this.current = { file, id: null, meta: null };
            this.hide();
        });

        // The EPUB service is created a beat after the app (see CheetahReaderApp).
        setTimeout(() => this._wireEpubEvents(), 250);

        this.ui.onProgress = ({ bookId, chapterIndex, scrollRatio }) => {
            if (!this.current || this.current.id !== bookId) return;
            const count = this.app.getChapters().length;
            this.library.savePosition(bookId, chapterIndex, scrollRatio, count);
        };
    }

    _wireEpubEvents() {
        this.app.onEPUB('metadataUpdated', (meta) => {
            if (!this.current) return;
            this.current.meta = meta;
            this.current.id = this.ui._makeBookId(meta);
            document.getElementById('edit-details-btn').hidden = true;
        });

        this.app.onEPUB('bookLoaded', async (data) => {
            const cur = this.current;
            if (!cur || !cur.id) return;
            const settings = this.app.getCurrentSettings();
            const replace = await this.library.replacementFor(cur.id, settings.limitShelf);
            if (replace) {
                const ok = confirm(
                    `Your shelf holds three books.\n\nAdding “${cur.meta.title}” replaces “${replace.title}”, ` +
                    `the one you opened longest ago, and your place in it.\n\nReplace it?`);
                if (!ok) { cur.id = null; return; }   // still readable, just not shelved
                await this.library.remove(replace.id);
            }
            const cover = await this.app.getCoverBlob();
            const rec = await this.library.put({
                id: cur.id, title: cur.meta.title, author: cur.meta.author,
                file: cur.file, cover, chapterCount: data.chapterCount
            });
            this._applyBookChrome(rec);
        });
    }

    /** Sidebar cover + the pen, for a shelved book. */
    _applyBookChrome(rec) {
        const coverEl = document.getElementById('book-cover');
        if (coverEl) {
            if (rec.cover) {
                const url = URL.createObjectURL(rec.cover);
                if (this._chromeUrl) URL.revokeObjectURL(this._chromeUrl);
                this._chromeUrl = url;
                coverEl.style.backgroundImage = `url("${url}")`;
                coverEl.classList.add('has-art');
                coverEl.textContent = '';
            } else {
                coverEl.style.backgroundImage = '';
                coverEl.classList.remove('has-art');
                coverEl.textContent = '🐆';
            }
        }
        document.getElementById('book-title').textContent = rec.title;
        document.getElementById('book-author').textContent = rec.author;
        document.getElementById('edit-details-btn').hidden = false;
    }

    // ---- opening ---------------------------------------------------------

    open(rec) {
        this.ui.seedProgress(rec.id, rec.chapterIndex || 0, rec.scrollRatio || 0);
        this.library.touch(rec.id);
        this.app.loadEPUB(rec.file);
    }

    async remove(rec) {
        const ok = confirm(`Delete “${rec.title}” and your place in it from this device?\n\nThis can’t be undone.`);
        if (ok) await this.library.remove(rec.id);
    }

    // ---- rendering -------------------------------------------------------

    _release() {
        this.urls.forEach((u) => URL.revokeObjectURL(u));
        this.urls = [];
    }

    _coverUrl(rec) {
        if (!rec.cover) return null;
        const u = URL.createObjectURL(rec.cover);
        this.urls.push(u);
        return u;
    }

    /** A deterministic pair of colours for books with no art. */
    static palette(id) {
        let h = 0;
        for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
        const a = h % 360, b = (a + 38 + (h >> 8) % 40) % 360;
        return [`hsl(${a} 45% 34%)`, `hsl(${b} 50% 18%)`];
    }

    _el(tag, cls, text) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text != null) e.textContent = text;
        return e;
    }

    _progress(rec) {
        if (!rec.chapterCount) return 0;
        return Math.min(1, ((rec.chapterIndex || 0) + (rec.scrollRatio || 0)) / rec.chapterCount);
    }

    _cover(rec, big) {
        const box = this._el('div', 'wl-cover' + (big ? ' big' : ''));
        const url = this._coverUrl(rec);
        if (url) {
            box.style.backgroundImage = `url("${url}")`;
        } else {
            const [c1, c2] = WelcomeScreen.palette(rec.id);
            box.style.background = `linear-gradient(160deg, ${c1}, ${c2})`;
            box.classList.add('typeset');
            box.append(this._el('span', 'wl-cover-title', rec.title), this._el('span', 'wl-cover-author', rec.author));
        }
        return box;
    }

    async render() {
        this._release();
        this.books = await this.library.list();
        const style = this.app.getCurrentSettings().homeStyle;
        this.root.className = `welcome style-${style}`;
        this.root.replaceChildren();

        const scroller = this._el('div', 'wl-scroll');
        this.root.append(scroller);

        // Style switch
        const sw = this._el('div', 'wl-switch');
        sw.setAttribute('role', 'group');
        sw.setAttribute('aria-label', 'Home screen style');
        [['editorial', 'List'], ['shelf', 'Shelf']].forEach(([key, label]) => {
            const b = this._el('button', key === style ? 'on' : '', label);
            b.type = 'button';
            b.setAttribute('aria-pressed', String(key === style));
            b.addEventListener('click', () => this.app.setHomeStyle(key));
            sw.append(b);
        });
        this.root.append(sw);

        if (this.books.length && this.current && this.current.id) {
            const back = this._el('button', 'wl-back', 'Back to reading ›');
            back.type = 'button';
            back.addEventListener('click', () => this.hide());
            this.root.append(back);
        }

        if (style === 'shelf') this._renderShelf(scroller);
        else this._renderList(scroller);

        this._renderFooter();
    }

    _hero(host) {
        const speed = Math.round(this.app.getCurrentSettings().flow.speed);
        const hero = this._el('header', 'wl-hero');
        hero.append(this._el('div', 'wl-ghost', String(speed)));
        hero.append(this._el('p', 'wl-pace', `${speed} WORDS A MINUTE`));
        const h = this._el('h1', 'wl-title');
        h.append(this._el('span', 'wl-title-roman', 'Cheetah'), this._el('span', 'wl-title-italic', 'Reader'));
        hero.append(h, this._el('hr', 'wl-rule'));
        const p = this._el('p', 'wl-pull');
        p.append('Built for readers who want to ', this._el('em', '', 'finish'), ' books. Read at the speed of thought.');
        hero.append(p);
        host.append(hero);
    }

    _renderList(host) {
        this._hero(host);
        if (!this.books.length) {
            host.append(this._el('p', 'wl-empty', 'No books yet. Open an EPUB to begin.'));
            return;
        }
        host.append(this._el('h2', 'wl-label', 'CONTINUE READING'));
        const list = this._el('ul', 'wl-list');
        this.books.forEach((rec) => {
            const li = this._el('li', 'wl-row');
            const open = this._el('button', 'wl-row-main');
            open.type = 'button';
            open.setAttribute('aria-label', `Open ${rec.title}`);
            open.append(this._cover(rec, false));
            const text = this._el('span', 'wl-row-text');
            text.append(this._el('span', 'wl-row-title', rec.title),
                        this._el('span', 'wl-row-author', (rec.author || '').toUpperCase()));
            const bar = this._el('span', 'wl-bar');
            const fill = this._el('i');
            fill.style.width = `${Math.round(this._progress(rec) * 100)}%`;
            bar.append(fill);
            text.append(bar);
            open.append(text);
            open.addEventListener('click', () => this.open(rec));
            const del = this._el('button', 'wl-row-del', '×');
            del.type = 'button';
            del.setAttribute('aria-label', `Delete ${rec.title}`);
            del.addEventListener('click', () => this.remove(rec));
            li.append(open, del);
            list.append(li);
        });
        host.append(list);
    }

    _renderShelf(host) {
        const ambient = this._el('div', 'wl-ambient');
        this.root.prepend(ambient);
        host.append(this._el('p', 'wl-masthead', 'CHEETAH READER'));
        if (!this.books.length) {
            this._hero(host);
            host.append(this._el('p', 'wl-empty', 'Your shelf is empty. Open an EPUB to begin.'));
            return;
        }
        const track = this._el('div', 'wl-shelf');
        track.setAttribute('role', 'listbox');
        track.setAttribute('aria-label', 'Books');
        const tiles = this.books.map((rec) => {
            const t = this._el('button', 'wl-tile');
            t.type = 'button';
            t.setAttribute('role', 'option');
            t.dataset.id = rec.id;
            t.append(this._cover(rec, true));
            t.addEventListener('click', () => {
                if (this.focusedId === rec.id) this.open(rec);
                else t.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            });
            track.append(t);
            return t;
        });
        const detail = this._el('div', 'wl-detail');
        host.append(track, detail);

        const focus = (id) => {
            this.focusedId = id;
            const rec = this.books.find((b) => b.id === id) || this.books[0];
            tiles.forEach((t) => {
                const on = t.dataset.id === rec.id;
                t.classList.toggle('focused', on);
                t.setAttribute('aria-selected', String(on));
            });
            const url = rec.cover ? this._coverUrl(rec) : null;
            if (url) {
                ambient.style.background = `center / cover url("${url}")`;
            } else {
                const [c1, c2] = WelcomeScreen.palette(rec.id);
                ambient.style.background = `linear-gradient(${c1}, ${c2})`;
            }
            detail.replaceChildren(
                this._el('h2', 'wl-detail-title', rec.title),
                this._el('p', 'wl-detail-author', (rec.author || '').toUpperCase()),
                this._el('p', 'wl-detail-progress',
                    rec.chapterCount
                        ? `Chapter ${Math.min(rec.chapterCount, (rec.chapterIndex || 0) + 1)} of ${rec.chapterCount} · ${Math.round(this._progress(rec) * 100)}%`
                        : 'Not started'));
            const go = this._el('button', 'wl-go', 'Continue reading');
            go.type = 'button';
            go.addEventListener('click', () => this.open(rec));
            const del = this._el('button', 'wl-link', 'Delete');
            del.type = 'button';
            del.addEventListener('click', () => this.remove(rec));
            const row = this._el('div', 'wl-detail-actions');
            row.append(go, del);
            detail.append(row);
        };

        let ticking = false;
        const nearest = () => {
            const mid = track.scrollLeft + track.clientWidth / 2;
            let best = tiles[0], d = Infinity;
            tiles.forEach((t) => {
                const dist = Math.abs(t.offsetLeft + t.offsetWidth / 2 - mid);
                if (dist < d) { d = dist; best = t; }
            });
            if (best.dataset.id !== this.focusedId) focus(best.dataset.id);
        };
        track.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => { ticking = false; nearest(); });
        }, { passive: true });
        track.addEventListener('keydown', (e) => {
            const i = tiles.findIndex((t) => t.dataset.id === this.focusedId);
            const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
            if (n != null && tiles[n]) { e.preventDefault(); tiles[n].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); tiles[n].focus({ preventScroll: true }); }
        });

        const start = this.books.find((b) => b.id === this.focusedId) || this.books[0];
        focus(start.id);
        requestAnimationFrame(() => {
            const t = tiles.find((x) => x.dataset.id === start.id);
            track.scrollLeft = t.offsetLeft + t.offsetWidth / 2 - track.clientWidth / 2;
        });
    }

    _renderFooter() {
        const foot = this._el('footer', 'wl-footer');
        const links = this._el('div', 'wl-links');
        const sample = this._el('button', 'wl-link', 'Try the sample');
        sample.type = 'button';
        sample.addEventListener('click', () => {
            this.current = null;
            this.hide();
            this.app.loadContent(this.sampleHtml);
            document.getElementById('book-title').textContent = 'Sample';
            document.getElementById('book-author').textContent = 'Press Space to try Flow';
        });
        const paste = this._el('button', 'wl-link', 'Paste text');
        paste.type = 'button';
        paste.addEventListener('click', () => { this.current = null; document.getElementById('paste-btn')?.click(); this.hide(); });
        links.append(sample, paste);

        const open = this._el('button', 'wl-open');
        open.type = 'button';
        open.setAttribute('aria-label', 'Open an EPUB');
        open.innerHTML = '<svg viewBox="0 0 220 84" aria-hidden="true"><path d="M6 84 A104 78 0 0 1 214 84 Z"/></svg><span>Open an EPUB</span>';
        open.addEventListener('click', () => document.getElementById('epub-upload')?.click());
        foot.append(links, open);
        this.root.append(foot);
    }

    // ---- details dialog --------------------------------------------------

    _wireDetails() {
        const dlg = document.getElementById('details-dialog');
        if (!dlg) return;
        const title = document.getElementById('details-title');
        const author = document.getElementById('details-author');
        const file = document.getElementById('details-cover-file');
        const preview = document.getElementById('details-cover-preview');
        let pickedCover, resetCover, previewUrl;

        const setPreview = (blob) => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            previewUrl = blob ? URL.createObjectURL(blob) : null;
            preview.style.backgroundImage = previewUrl ? `url("${previewUrl}")` : '';
        };

        document.getElementById('edit-details-btn')?.addEventListener('click', async () => {
            if (!this.current || !this.current.id) return;
            const rec = await this.library.get(this.current.id);
            if (!rec) return;
            title.value = rec.title;
            author.value = rec.author;
            pickedCover = undefined; resetCover = false;
            setPreview(rec.cover);
            dlg.showModal();
        });
        document.getElementById('details-cover-pick')?.addEventListener('click', () => file.click());
        file.addEventListener('change', () => {
            if (file.files[0]) { pickedCover = file.files[0]; resetCover = false; setPreview(pickedCover); }
        });
        document.getElementById('details-cover-reset')?.addEventListener('click', async () => {
            resetCover = true; pickedCover = undefined;
            setPreview(await this.app.getCoverBlob());
        });
        document.getElementById('details-cancel')?.addEventListener('click', () => dlg.close());
        document.getElementById('details-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const patch = { title: title.value.trim() || 'Untitled', author: author.value.trim() };
            if (pickedCover) { patch.cover = pickedCover; patch.coverCustom = true; }
            else if (resetCover) { patch.cover = await this.app.getCoverBlob(); patch.coverCustom = false; }
            const rec = await this.library.update(this.current.id, patch);
            if (rec) this._applyBookChrome(rec);
            dlg.close();
        });
    }
}

if (typeof window !== 'undefined') window.WelcomeScreen = WelcomeScreen;
