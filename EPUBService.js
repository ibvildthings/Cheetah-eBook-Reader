/**
 * EPUBService v1.0.0
 * Service for managing EPUB file loading, parsing, and navigation
 * 
 * @license MIT
 * @version 1.0.0
 */

class EPUBService {
    constructor(reader) {
        this.reader = reader;
        this.book = null;
        this.chapters = [];
        this.currentChapterIndex = -1;
        this.imageCache = new Map();
        this._linkHandlers = [];
        
        console.log('EPUBService initialized');
    }

    /**
     * Load an EPUB file
     * @param {File} file - EPUB file to load
     */
    async loadBook(file) {
        console.log('Loading EPUB:', file.name);

        try {
            // Clean up previous book
            this._cleanup();

            // Read file as array buffer
            const arrayBuffer = await file.arrayBuffer();

            // Parse EPUB using ePub.js
            this.book = ePub(arrayBuffer);
            
            await this.book.ready;

            // Update metadata
            this._updateMetadata();

            // Extract chapters
            await this._extractChapters();

            // Load first chapter
            if (this.chapters.length > 0) {
                await this.loadChapter(0);
            }

            console.log('EPUB loaded successfully');
        } catch (error) {
            console.error('Failed to load EPUB:', error);
            alert('Failed to load EPUB file. Please check the file format.');
        }
    }

    /**
     * Update book metadata in UI
     */
    _updateMetadata() {
        const metadata = this.book.packaging.metadata;
        
        const titleEl = document.getElementById('book-title');
        const authorEl = document.getElementById('book-author');

        if (titleEl) {
            titleEl.textContent = metadata.title || 'Unknown Title';
        }

        if (authorEl) {
            const author = metadata.creator || 'Unknown Author';
            authorEl.textContent = author;
        }

        console.log('Metadata:', {
            title: metadata.title,
            author: metadata.creator
        });
    }

    /**
     * Extract chapters from EPUB table of contents
     */
    async _extractChapters() {
        const chaptersList = document.getElementById('chapters-list');
        if (!chaptersList) {
            console.warn('Chapters list element not found');
            return;
        }

        chaptersList.innerHTML = '';
        this.chapters = [];

        const toc = await this.book.loaded.navigation.then(nav => nav.toc);

        if (!toc || toc.length === 0) {
            console.warn('No chapters found in EPUB');
            chaptersList.innerHTML = '<div class="chapters-list-empty">No chapters found</div>';
            return;
        }

        // Process each chapter
        for (let i = 0; i < toc.length; i++) {
            const item = toc[i];
            
            this.chapters.push({
                id: item.id,
                href: item.href,
                label: item.label,
                index: i
            });

            // Create chapter list item
            const chapterElement = this._createChapterElement(i, item.label);
            chaptersList.appendChild(chapterElement);
        }

        console.log(`Extracted ${this.chapters.length} chapters`);
    }

    /**
     * Create a chapter list item element
     */
    _createChapterElement(index, title) {
        const div = document.createElement('div');
        div.className = 'chapter-item';
        div.dataset.index = index;

        div.innerHTML = `
            <span class="chapter-number">${index + 1}</span>
            <span class="chapter-title">${this._truncateText(title, 60)}</span>
        `;

        div.addEventListener('click', () => {
            this.loadChapter(index);
        });

        return div;
    }

    /**
     * Load a specific chapter by index
     */
    async loadChapter(index, wasPlaying) {
        if (!this.book || index < 0 || index >= this.chapters.length) {
            console.error('Invalid chapter index:', index);
            return;
        }

        try {
            this._cleanupCurrentChapter();
            
            console.log('Loading chapter:', index, this.chapters[index].label);

            const chapter = this.chapters[index];

            // Get chapter section from spine
            const section = this.book.spine.get(chapter.href);
            if (!section) {
                console.error('Chapter section not found:', chapter.href);
                return;
            }

            // Load the section
            await section.load(this.book.load.bind(this.book));

            // Extract HTML content
            let content = this._extractContent(section);

            // Process images
            content = await this._processImages(content, chapter.href);

            // Clean content
            content = this._cleanContent(content);

            // Update current chapter
            this.currentChapterIndex = index;
            this._updateActiveChapter(index);

            // Load content into reader
            if (this.reader) {
                const currentState = this.reader.getState();
                const shouldPlay = wasPlaying !== undefined ? wasPlaying : currentState.playing;
                
                if (shouldPlay) {
                    this.reader.pause();
                }
                
                this.reader.loadContent(content);
                
                // Reset scroll
                setTimeout(() => {
                    const readerArea = document.querySelector('.ebook-reader-area');
                    if (readerArea) {
                        readerArea.scrollTop = 0;
                    }
                }, 50);
                
                // Resume if was playing
                if (shouldPlay && currentState.mode === 'flow') {
                    setTimeout(() => {
                        this.reader.play();
                    }, 300);
                }
            }

            // Attach link handlers
            setTimeout(() => {
                this._attachLinkHandlers();
            }, 100);

        } catch (error) {
            console.error('Failed to load chapter:', error);
            alert('Failed to load chapter. The file may be corrupted.');
        }
    }

    /**
     * Extract content from section
     */
    _extractContent(section) {
        let content = '';
        
        if (section.contents) {
            const doc = section.contents;
            
            if (doc.body) {
                content = doc.body.innerHTML;
            } else if (doc.querySelector && doc.querySelector('body')) {
                content = doc.querySelector('body').innerHTML;
            } else if (doc.documentElement) {
                const bodyEl = doc.documentElement.querySelector('body');
                if (bodyEl) {
                    content = bodyEl.innerHTML;
                } else {
                    const serializer = new XMLSerializer();
                    content = serializer.serializeToString(doc.documentElement);
                }
            } else if (typeof doc === 'string') {
                content = doc;
            } else {
                const serializer = new XMLSerializer();
                content = serializer.serializeToString(doc);
            }
        }

        return content;
    }

    /**
     * Process images in content
     */
    async _processImages(content, chapterHref) {
        if (!content || !this.book) return content;

        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const images = doc.querySelectorAll('img[src]');

        for (const img of images) {
            const src = img.getAttribute('src');
            if (!src || src.startsWith('data:') || src.startsWith('http')) continue;

            try {
                const resolvedPath = this._resolveHref(src, chapterHref);
                const blob = await this.book.load(resolvedPath);
                
                if (blob) {
                    const blobUrl = URL.createObjectURL(blob);
                    this.imageCache.set(src, blobUrl);
                    img.setAttribute('src', blobUrl);
                }
            } catch (error) {
                console.warn('Failed to load image:', src, error);
            }
        }

        return doc.body.innerHTML;
    }

    /**
     * Resolve relative href
     */
    _resolveHref(href, baseHref) {
        if (href.startsWith('/')) return href.substring(1);
        if (!baseHref) return href;

        const baseParts = baseHref.split('/');
        baseParts.pop();
        const hrefParts = href.split('/');

        for (const part of hrefParts) {
            if (part === '..') {
                baseParts.pop();
            } else if (part !== '.') {
                baseParts.push(part);
            }
        }

        return baseParts.join('/');
    }

    /**
     * Clean content with DOMPurify
     */
    _cleanContent(content) {
        if (typeof DOMPurify === 'undefined') {
            console.warn('DOMPurify not loaded');
            return content;
        }

        return DOMPurify.sanitize(content, {
            ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                           'span', 'div', 'img', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style'],
            KEEP_CONTENT: true
        });
    }

    /**
     * Update active chapter in UI
     */
    _updateActiveChapter(index) {
        const items = document.querySelectorAll('.chapter-item');
        items.forEach((item, i) => {
            if (i === index) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * Attach handlers to internal links
     */
    _attachLinkHandlers() {
        const contentArea = document.querySelector('.ebook-text-content');
        if (!contentArea) return;

        const links = contentArea.querySelectorAll('a[href]');
        
        // Remove existing handlers
        this._linkHandlers.forEach(({element, handler}) => {
            element.removeEventListener('click', handler);
        });
        this._linkHandlers = [];
        
        links.forEach(link => {
            const handler = (e) => {
                const href = link.getAttribute('href');
                
                if (href && !href.startsWith('http') && !href.startsWith('mailto:')) {
                    e.preventDefault();
                    this._handleInternalLink(href);
                }
            };
            
            link.addEventListener('click', handler);
            this._linkHandlers.push({ element: link, handler });
        });
    }

    /**
     * Handle internal link navigation
     */
    _handleInternalLink(href) {
        console.log('Internal link clicked:', href);

        const [path, anchor] = href.split('#');
        
        if (path) {
            const chapterIndex = this.chapters.findIndex(ch => 
                ch.href === path || ch.href === path + '.xhtml' || ch.href === path + '.html'
            );
            
            if (chapterIndex !== -1) {
                this.loadChapter(chapterIndex);
                return;
            }
        }

        if (anchor) {
            const element = document.getElementById(anchor);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }

    /**
     * Navigate to next chapter
     */
    nextChapter() {
        if (this.currentChapterIndex < this.chapters.length - 1) {
            return this.loadChapter(this.currentChapterIndex + 1, this.reader?.getState().playing);
        }
    }

    /**
     * Navigate to previous chapter
     */
    previousChapter() {
        if (this.currentChapterIndex > 0) {
            return this.loadChapter(this.currentChapterIndex - 1, this.reader?.getState().playing);
        }
    }

    /**
     * Truncate text
     */
    _truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * Cleanup current chapter
     */
    _cleanupCurrentChapter() {
        this._linkHandlers.forEach(({element, handler}) => {
            element.removeEventListener('click', handler);
        });
        this._linkHandlers = [];
    }

    /**
     * Full cleanup
     */
    _cleanup() {
        this._cleanupCurrentChapter();
        
        this.imageCache.forEach(url => URL.revokeObjectURL(url));
        this.imageCache.clear();
        
        this.book = null;
        this.chapters = [];
        this.currentChapterIndex = -1;
    }

    /**
     * Destroy service
     */
    destroy() {
        this._cleanup();
        this.reader = null;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EPUBService;
}
if (typeof window !== 'undefined') {
    window.EPUBService = EPUBService;
}
