/**
 * LibraryStore v1.0.0
 * The reader's shelf: books kept in IndexedDB so they reopen at the place
 * the reader left them. Mirrors the iOS app's LibraryStore.
 *
 * Each record: { id, title, author, file (Blob), cover (Blob|null),
 *   coverCustom (bool), chapterIndex, chapterCount, scrollRatio,
 *   addedAt, openedAt }
 *
 * Cheetah Reader is not a library app: a few books in rotation keeps a reader
 * reading. With the limit on, adding one more replaces the book opened
 * longest ago (the caller asks first - see `replacementFor`).
 *
 * @license MIT
 */

class LibraryStore {
    static DB_NAME = 'cheetah-library';
    static STORE = 'books';
    static SHELF_LIMIT = 3;

    constructor() {
        this._dbPromise = null;
        this._listeners = new Set();
        this._cache = null;
    }

    /** Whether IndexedDB is usable at all (private windows may refuse). */
    static isSupported() {
        return typeof indexedDB !== 'undefined';
    }

    _db() {
        if (!this._dbPromise) {
            this._dbPromise = new Promise((resolve, reject) => {
                if (!LibraryStore.isSupported()) return reject(new Error('IndexedDB unavailable'));
                const req = indexedDB.open(LibraryStore.DB_NAME, 1);
                req.onupgradeneeded = () => {
                    req.result.createObjectStore(LibraryStore.STORE, { keyPath: 'id' });
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            }).catch((err) => {
                console.warn('📚 Library unavailable:', err.message);
                return null;
            });
        }
        return this._dbPromise;
    }

    async _tx(mode, fn) {
        const db = await this._db();
        if (!db) return undefined;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(LibraryStore.STORE, mode);
            const store = tx.objectStore(LibraryStore.STORE);
            let result;
            const req = fn(store);
            if (req) req.onsuccess = () => { result = req.result; };
            tx.oncomplete = () => resolve(result);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    onChange(fn) {
        this._listeners.add(fn);
        return () => this._listeners.delete(fn);
    }

    _changed() {
        this._cache = null;
        this._listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    }

    /** All books, most recently opened first. */
    async list() {
        if (this._cache) return this._cache;
        const all = (await this._tx('readonly', (s) => s.getAll())) || [];
        all.sort((a, b) => (b.openedAt || 0) - (a.openedAt || 0));
        this._cache = all;
        return all;
    }

    async get(id) {
        return this._tx('readonly', (s) => s.get(id));
    }

    /** Add or refresh a book. Keeps the reading place of one already shelved. */
    async put(record) {
        const existing = await this.get(record.id);
        const now = Date.now();
        const merged = {
            chapterIndex: 0, scrollRatio: 0, chapterCount: 0, coverCustom: false, cover: null,
            addedAt: now, ...existing, ...record, openedAt: now
        };
        // A cover the reader chose is never replaced by the book's own art.
        if (existing && existing.coverCustom) merged.cover = existing.cover;
        await this._tx('readwrite', (s) => s.put(merged));
        this._changed();
        return merged;
    }

    async update(id, patch) {
        const rec = await this.get(id);
        if (!rec) return null;
        const next = { ...rec, ...patch };
        await this._tx('readwrite', (s) => s.put(next));
        this._changed();
        return next;
    }

    /** Record the reading place without bumping the list order each time. */
    async savePosition(id, chapterIndex, scrollRatio, chapterCount) {
        const rec = await this.get(id);
        if (!rec) return;
        rec.chapterIndex = chapterIndex;
        rec.scrollRatio = scrollRatio;
        if (chapterCount) rec.chapterCount = chapterCount;
        await this._tx('readwrite', (s) => s.put(rec));
        this._cache = null; // quiet: no listener churn on every scroll save
    }

    async touch(id) {
        return this.update(id, { openedAt: Date.now() });
    }

    async remove(id) {
        await this._tx('readwrite', (s) => s.delete(id));
        this._changed();
    }

    /** If shelving a new book would exceed the limit, the one it would replace. */
    async replacementFor(id, limitOn) {
        if (!limitOn) return null;
        const books = await this.list();
        if (books.some((b) => b.id === id)) return null;
        if (books.length < LibraryStore.SHELF_LIMIT) return null;
        return books[books.length - 1]; // opened longest ago
    }
}

if (typeof module !== 'undefined' && module.exports) module.exports = LibraryStore;
if (typeof window !== 'undefined') window.LibraryStore = LibraryStore;
