/**
 * EPUB Handler
 * Handles EPUB file uploads, parsing, and chapter navigation
 */
(() => {
    'use strict';

    class EPUBHandler {
        constructor() {
            this.reader = null;
            this.book = null;
            this.chapters = [];
            this.currentChapterIndex = -1;
            this.isInitialized = false;
        }

        /** Initialize the EPUB handler with a reader instance */
        init(readerInstance) {
            if (this.isInitialized) return;
            this.reader = readerInstance;
            this.isInitialized = true;
            this._attachEventListeners();
            console.log('EPUB Handler initialized');
        }

        /** Attach event listeners to UI elements */
        _attachEventListeners() {
            const uploadBtn = document.getElementById('upload-btn');
            const fileInput = document.getElementById('epub-upload');
            const chaptersToggle = document.getElementById('chapters-toggle');
            const chaptersSidebar = document.getElementById('chapters-sidebar');

            uploadBtn?.addEventListener('click', () => fileInput?.click());
            fileInput?.addEventListener('change', e => {
                const file = e.target.files?.[0];
                if (file) this.loadBook(file);
            });
            chaptersToggle?.addEventListener('click', () => chaptersSidebar?.classList.toggle('collapsed'));
        }

        /** Load and parse an EPUB file */
        async loadBook(file) {
            console.log('Loading EPUB file:', file.name);
            this._updateMetadata('Loading...', 'Please wait');

            try {
                const arrayBuffer = await this._readFileAsArrayBuffer(file);
                this.book = ePub(arrayBuffer);
                await this.book.opened;

                const [metadata, navigation] = await Promise.all([
                    this.book.loaded.metadata,
                    this.book.loaded.navigation
                ]);

                console.log('Book metadata:', metadata);
                console.log('Navigation:', navigation);

                if (this.book.archive)
                    console.log('Archive resources:', Object.keys(this.book.archive.urlCache || {}));

                this._updateMetadata(metadata.title || 'Unknown Title', metadata.creator || 'Unknown Author');

                await this._extractChapters(navigation);

                if (this.chapters.length) await this.loadChapter(0);
            } catch (error) {
                console.error('Error loading EPUB:', error);
                this._updateMetadata('Error Loading Book', error.message);
                alert('Failed to load EPUB file. Please try another file.');
            }
        }

        /** Extract chapters from EPUB navigation */
        async _extractChapters(navigation) {
            const chaptersList = document.getElementById('chapters-list');
            chaptersList.innerHTML = '';
            const toc = navigation?.toc || [];

            if (!toc.length) {
                console.warn('No chapters found in EPUB');
                chaptersList.innerHTML = '<div class="chapters-list-empty">No chapters found</div>';
                this.chapters = [];
                return;
            }

            this.chapters = toc.map((item, i) => ({
                id: item.id,
                href: item.href,
                label: item.label,
                index: i
            }));

            const fragment = document.createDocumentFragment();
            this.chapters.forEach((ch, i) => fragment.appendChild(this._createChapterElement(i, ch.label)));
            chaptersList.appendChild(fragment);

            console.log(`Extracted ${this.chapters.length} chapters`);
        }

        /** Create a chapter list item element */
        _createChapterElement(index, title) {
            const div = document.createElement('div');
            div.className = 'chapter-item';
            div.dataset.index = index;
            div.innerHTML = `
                <span class="chapter-number">${index + 1}</span>
                <span class="chapter-title">${this._truncateText(title, 60)}</span>
            `;
            div.addEventListener('click', () => this.loadChapter(index));
            return div;
        }

        /** Load a specific chapter by index */
        async loadChapter(index) {
            if (!this.book || index < 0 || index >= this.chapters.length) {
                console.error('Invalid chapter index:', index);
                return;
            }

            try {
                const chapter = this.chapters[index];
                console.log('Loading chapter:', index, chapter.label);

                const section = this.book.spine.get(chapter.href);
                if (!section) return console.error('Chapter section not found:', chapter.href);

                await section.load(this.book.load.bind(this.book));

                const doc = section.contents;
                let content = this._extractContent(doc);
                content = await this._processImages(content, chapter.href);
                content = this._cleanContent(content);

                this.currentChapterIndex = index;
                this._updateActiveChapter(index);

                if (this.reader && this.isInitialized) {
                    const { isPlaying, mode } = this.reader.getState();
                    this.reader.loadContent(content);

                    if (mode === 'flow') {
                        setTimeout(() => {
                            this.reader.jumpToWord(0);
                            if (isPlaying) this.reader.play();
                        }, 300);
                    }
                }

                console.log('Chapter loaded successfully');
            } catch (error) {
                console.error('Error loading chapter:', error);
                alert('Failed to load chapter. Please try another chapter.');
            }
        }

        /** Extract HTML content safely */
        _extractContent(doc) {
            if (!doc) return '';
            if (typeof doc === 'string') return doc;
            if (doc.body) return doc.body.innerHTML;
            if (doc.documentElement) return doc.documentElement.innerHTML;

            try {
                return new XMLSerializer().serializeToString(doc);
            } catch {
                return '';
            }
        }

        /** Clean HTML content from EPUB */
        _cleanContent(html) {
            if (typeof html !== 'string') return '';
            return html
                .replace(/<link[^>]*>|<style[^>]*>[\s\S]*?<\/style>|<script[^>]*>[\s\S]*?<\/script>|<meta[^>]*>/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
        }

        /** Process images in HTML content */
        async _processImages(html) {
            if (!this.book?.archive?.zip) return html;

            const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
            const matches = [...html.matchAll(imgRegex)];
            const zipFiles = this.book.archive.zip.files;

            for (const [fullTag, imgSrc] of matches) {
                try {
                    const filename = imgSrc.split('/').pop();
                    const foundPath = Object.keys(zipFiles).find(
                        path => path.endsWith(filename) || path === imgSrc || path.endsWith(imgSrc)
                    );
                    if (!foundPath) {
                        html = html.replace(fullTag, '');
                        continue;
                    }

                    const blob = await zipFiles[foundPath].async('blob');
                    const blobUrl = URL.createObjectURL(blob);
                    let newTag = fullTag.replace(imgSrc, blobUrl);
                    newTag = newTag.includes('style=')
                        ? newTag.replace('style="', 'style="max-width:100%;height:auto;display:block;margin:1em auto; ')
                        : newTag.replace('<img', '<img style="max-width:100%;height:auto;display:block;margin:1em auto;"');
                    html = html.replace(fullTag, newTag);
                } catch {
                    html = html.replace(fullTag, '');
                }
            }
            return html;
        }

        /** Update active chapter in UI */
        _updateActiveChapter(index) {
            document.querySelectorAll('.chapter-item').forEach((el, i) =>
                el.classList.toggle('active', i === index)
            );
        }

        /** Update book metadata in UI */
        _updateMetadata(title, author) {
            document.getElementById('book-title').textContent = title;
            document.getElementById('book-author').textContent = author;
        }

        /** Read file as ArrayBuffer */
        _readFileAsArrayBuffer(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            });
        }

        /** Truncate text with ellipsis */
        _truncateText(text, maxLength) {
            return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
        }

        /** Get current book info */
        getCurrentBook() {
            return this.book
                ? {
                      chapters: this.chapters,
                      currentChapterIndex: this.currentChapterIndex,
                      totalChapters: this.chapters.length
                  }
                : null;
        }
    }

    window.EPUBHandler = new EPUBHandler();
})();