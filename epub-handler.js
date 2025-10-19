/**
 * EPUB Handler
 * Handles EPUB file uploads, parsing, and chapter navigation
 */

(function() {
    'use strict';

    class EPUBHandler {
        constructor() {
            this.reader = null;
            this.book = null;
            this.chapters = [];
            this.currentChapterIndex = -1;
            this.isInitialized = false;
            this.imageCache = new Map(); // Cache blob URLs
            this._linkHandlers = [];
        }

        /**
         * Initialize the EPUB handler with a reader instance
         */
        init(readerInstance) {
            this.reader = readerInstance;
            this.isInitialized = true;
            this._attachEventListeners();
            console.log('EPUB Handler initialized');
        }

        /**
         * Attach event listeners to UI elements
         */
        _attachEventListeners() {
            // Upload button click
            const uploadBtn = document.getElementById('upload-btn');
            const fileInput = document.getElementById('epub-upload');

            uploadBtn.addEventListener('click', () => {
                fileInput.click();
            });

            // File input change
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.loadBook(file);
                }
            });

            // Chapters sidebar toggle
            const chaptersToggle = document.getElementById('chapters-toggle');
            const chaptersSidebar = document.getElementById('chapters-sidebar');

            chaptersToggle.addEventListener('click', () => {
                chaptersSidebar.classList.toggle('collapsed');
            });
        }

        /**
         * Attach click handlers to internal links
         */
        _attachLinkHandlers() {
            const contentArea = document.querySelector('.ebook-text-content');
            if (!contentArea) {
                console.warn('Content area not found for link handlers');
                return;
            }

            const links = contentArea.querySelectorAll('a[href]');
            
            console.log(`Attaching handlers to ${links.length} links`);
            
            // Remove all existing link event listeners first
            if (this._linkHandlers) {
                this._linkHandlers.forEach(({element, handler}) => {
                    element.removeEventListener('click', handler);
                });
            }
            this._linkHandlers = [];
            
            links.forEach(link => {
                const hasFlowWords = link.querySelector('.flow-word');
                
                const handler = (e) => {
                    const href = link.getAttribute('href');
                    
                    if (href && !href.startsWith('http') && !href.startsWith('mailto:')) {
                        e.preventDefault();
                        console.log('Internal link clicked:', href);
                        this._handleInternalLink(href);
                    }
                };
                
                if (hasFlowWords) {
                    // Don't clone - just add event listener directly to preserve flow-words
                    link.addEventListener('click', handler);
                    this._linkHandlers.push({element: link, handler});
                } else {
                    // No flow words - safe to clone to remove any existing listeners
                    const newLink = link.cloneNode(true);
                    link.parentNode.replaceChild(newLink, link);
                    
                    newLink.addEventListener('click', handler);
                    this._linkHandlers.push({element: newLink, handler});
                }
            });
        }

        /**
         * Load and parse an EPUB file
         */
        async loadBook(file) {
            try {
                console.log('Loading EPUB file:', file.name);

                // Clear previous image cache
                this._clearImageCache();

                // Show loading state
                this._updateMetadata('Loading...', 'Please wait');

                // Read file as ArrayBuffer
                const arrayBuffer = await this._readFileAsArrayBuffer(file);

                // Parse EPUB using epub.js
                this.book = ePub(arrayBuffer);

                // Load the book
                await this.book.opened;

                // Extract metadata
                const metadata = await this.book.loaded.metadata;
                const navigation = await this.book.loaded.navigation;

                console.log('Book metadata:', metadata);
                console.log('Navigation:', navigation);

                // Log available resources in archive for debugging
                if (this.book.archive) {
                    console.log('Archive resources:', Object.keys(this.book.archive.urlCache || {}));
                }

                // Update UI with metadata
                this._updateMetadata(
                    metadata.title || 'Unknown Title',
                    metadata.creator || 'Unknown Author'
                );

                // Extract chapters
                await this._extractChapters(navigation);

                // Load first chapter
                if (this.chapters.length > 0) {
                    await this.loadChapter(0);
                }

            } catch (error) {
                console.error('Error loading EPUB:', error);
                this._updateMetadata('Error Loading Book', error.message);
                alert('Failed to load EPUB file. Please try another file.');
            }
        }

        /**
         * Extract chapters from EPUB navigation
         */
        async _extractChapters(navigation) {
            this.chapters = [];
            const chaptersList = document.getElementById('chapters-list');
            chaptersList.innerHTML = '';
            
            // Reset scroll position
            chaptersList.scrollTop = 0;

            // Get table of contents
            const toc = navigation.toc;

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
        async loadChapter(index) {
            if (!this.book || index < 0 || index >= this.chapters.length) {
                console.error('Invalid chapter index:', index);
                return;
            }

            try {
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

                // Extract HTML content as string
                let content = '';
                
                if (section.contents) {
                    const doc = section.contents;
                    
                    // Try to get body content first (most reliable)
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

                // Ensure content is a string
                if (typeof content !== 'string') {
                    console.error('Could not extract content as string');
                    content = '';
                }

                console.log('Raw content sample:', content.substring(0, 500));

                // Process images BEFORE cleaning - replace src with blob URLs
                content = await this._processImages(content, chapter.href);

                // Clean up content with DOMPurify
                content = this._cleanContent(content);
                
                console.log('Cleaned content sample:', content.substring(0, 500));

                // Update current chapter index
                this.currentChapterIndex = index;

                // Update active state in UI
                this._updateActiveChapter(index);

                // Load content into reader
                if (this.reader && this.isInitialized) {
                    const wasPlaying = this.reader.getState().isPlaying;
                    const isFlowMode = this.reader.getState().mode === 'flow';
                    
                    // Stop playing before loading new content
                    if (wasPlaying) {
                        this.reader.pause();
                    }
                    
                    this.reader.loadContent(content);
                    
                    // Reset scroll position to top
                    setTimeout(() => {
                        const readerArea = document.querySelector('.ebook-reader-area');
                        if (readerArea) {
                            readerArea.scrollTop = 0;
                        }
                    }, 50);
                    
                    // IMPORTANT: Attach link handlers after content is loaded
                    setTimeout(() => {
                        this._attachLinkHandlers();
                    }, 100);
                    
                    // Reset to beginning if in flow mode
                    if (isFlowMode) {
                        setTimeout(() => {
                            this.reader.jumpToWord(0);
                            
                            // Force visual update even if not playing
                            if (this.reader.wordIndexManager) {
                                this.reader.wordIndexManager.rebuild();
                                this.reader._updateWordStates(0);
                            }
                            
                            if (wasPlaying) {
                                this.reader.play();
                            }
                        }, 300);
                    }
                }

                console.log('Chapter loaded successfully');

            } catch (error) {
                console.error('Error loading chapter:', error);
                alert('Failed to load chapter. Please try another chapter.');
            }
        }

        /**
         * Clean HTML content from EPUB using DOMPurify
         */
        _cleanContent(html) {
            // Ensure we have a string
            if (typeof html !== 'string') {
                console.error('_cleanContent received non-string:', typeof html);
                return '';
            }

            // Check if DOMPurify is available
            if (typeof DOMPurify === 'undefined') {
                console.error('DOMPurify not loaded! Please include DOMPurify in your HTML.');
                return html;
            }

            // Use DOMPurify with proper configuration to keep blob URLs
            const clean = DOMPurify.sanitize(html, {
                ALLOWED_TAGS: ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                               'strong', 'em', 'b', 'i', 'u', 's', 'sub', 'sup',
                               'a', 'img', 'br', 'hr', 
                               'ul', 'ol', 'li', 'dl', 'dt', 'dd',
                               'table', 'thead', 'tbody', 'tr', 'td', 'th',
                               'blockquote', 'pre', 'code',
                               'figure', 'figcaption', 'cite', 'q',
                               'aside', 'section', 'article', 'header', 'footer', 'nav'],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style', 'role'],
                ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
                KEEP_CONTENT: true,
                RETURN_DOM: false,
                RETURN_DOM_FRAGMENT: false
            });
            
            return clean;
        }

        /**
         * Process images in HTML content - replace src with blob URLs
         */
        async _processImages(html, currentHref) {
            if (!this.book || !this.book.archive || !this.book.archive.zip) {
                return html;
            }

            const zipFiles = this.book.archive.zip.files;
            
            // Use regex to find and replace image sources
            const imgRegex = /<img([^>]+)src=["']([^"']+)["']([^>]*)>/gi;
            
            const matches = [...html.matchAll(imgRegex)];
            
            for (const match of matches) {
                const fullTag = match[0];
                const beforeSrc = match[1];
                const imgSrc = match[2];
                const afterSrc = match[3];

                try {
                    let blobUrl;
                    
                    // Check cache first
                    if (this.imageCache.has(imgSrc)) {
                        blobUrl = this.imageCache.get(imgSrc);
                    } else {
                        // Extract filename
                        const filename = imgSrc.split('/').pop();
                        
                        // Search for the image in the zip files
                        let foundPath = null;
                        
                        for (const path in zipFiles) {
                            if (path.endsWith(filename) || path === imgSrc || path.endsWith('/' + imgSrc)) {
                                foundPath = path;
                                break;
                            }
                        }
                        
                        if (foundPath && zipFiles[foundPath]) {
                            // Get the blob from the zip file
                            const blob = await zipFiles[foundPath].async('blob');
                            
                            // Create a blob URL with proper type
                            const mimeType = this._getImageMimeType(filename);
                            const typedBlob = new Blob([blob], { type: mimeType });
                            blobUrl = URL.createObjectURL(typedBlob);
                            
                            // Cache it
                            this.imageCache.set(imgSrc, blobUrl);
                        } else {
                            // Remove the image tag if not found
                            html = html.replace(fullTag, '');
                            continue;
                        }
                    }
                    
                    // Always apply responsive styles (whether cached or newly loaded)
                    let newTag = `<img${beforeSrc}src="${blobUrl}"${afterSrc}>`;
                    
                    // Add responsive styles if not present
                    if (!newTag.includes('style=')) {
                        newTag = newTag.replace('<img', '<img style="max-width: 100%; height: auto; display: block; margin: 1em auto;"');
                    }
                    
                    html = html.replace(fullTag, newTag);
                } catch (error) {
                    console.warn('Failed to process image:', imgSrc, error);
                    // Remove the broken image tag
                    html = html.replace(fullTag, '');
                }
            }

            return html;
        }
        
        /**
         * Get MIME type for image based on extension
         */
        _getImageMimeType(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            const mimeTypes = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'svg': 'image/svg+xml',
                'webp': 'image/webp'
            };
            return mimeTypes[ext] || 'image/jpeg';
        }

        /**
         * Clear image cache and revoke blob URLs
         */
        _clearImageCache() {
            for (const blobUrl of this.imageCache.values()) {
                URL.revokeObjectURL(blobUrl);
            }
            this.imageCache.clear();
        }

        /**
         * Attach click handlers to internal links
         */
        _attachLinkHandlers() {
            const contentArea = document.querySelector('.ebook-text-content');
            if (!contentArea) {
                console.warn('Content area not found for link handlers');
                return;
            }

            const links = contentArea.querySelectorAll('a[href]');
            
            console.log(`Attaching handlers to ${links.length} links`);
            
            links.forEach(link => {
                // Check if link has flow-word spans inside
                const hasFlowWords = link.querySelector('.flow-word');
                
                if (hasFlowWords) {
                    // Don't clone - just add event listener directly to preserve flow-words
                    link.addEventListener('click', (e) => {
                        const href = link.getAttribute('href');
                        
                        // Check if it's an internal link (not external URL)
                        if (href && !href.startsWith('http') && !href.startsWith('mailto:')) {
                            e.preventDefault();
                            console.log('Internal link clicked:', href);
                            this._handleInternalLink(href);
                        }
                    });
                } else {
                    // No flow words - safe to clone to remove any existing listeners
                    const newLink = link.cloneNode(true);
                    link.parentNode.replaceChild(newLink, link);
                    
                    newLink.addEventListener('click', (e) => {
                        const href = newLink.getAttribute('href');
                        
                        // Check if it's an internal link (not external URL)
                        if (href && !href.startsWith('http') && !href.startsWith('mailto:')) {
                            e.preventDefault();
                            console.log('Internal link clicked:', href);
                            this._handleInternalLink(href);
                        }
                    });
                }
            });
        }

        /**
         * Handle internal chapter links
         */
        _handleInternalLink(href) {
            console.log('Handling internal link:', href);
            
            // Remove fragment identifier if present
            const [path, fragment] = href.split('#');
            
            // Find chapter by href
            const chapterIndex = this.chapters.findIndex(ch => {
                return ch.href === href || 
                       ch.href === path || 
                       ch.href.endsWith(href) ||
                       ch.href.endsWith(path);
            });

            if (chapterIndex !== -1) {
                console.log('Loading linked chapter:', chapterIndex);
                this.loadChapter(chapterIndex);
            } else {
                console.warn('Chapter not found for link:', href);
                
                // If it's just a fragment (anchor link in same chapter)
                if (href.startsWith('#') && fragment) {
                    const targetElement = document.getElementById(fragment);
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth' });
                    } else {
                        console.warn('Anchor element not found:', fragment);
                    }
                }
            }
        }

        /**
         * Update active chapter in UI
         */
        _updateActiveChapter(index) {
            const allChapters = document.querySelectorAll('.chapter-item');
            allChapters.forEach((el, i) => {
                if (i === index) {
                    el.classList.add('active');
                } else {
                    el.classList.remove('active');
                }
            });
        }

        /**
         * Update book metadata in UI
         */
        _updateMetadata(title, author) {
            document.getElementById('book-title').textContent = title;
            document.getElementById('book-author').textContent = author;
        }

        /**
         * Read file as ArrayBuffer
         */
        _readFileAsArrayBuffer(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsArrayBuffer(file);
            });
        }

        /**
         * Truncate text with ellipsis
         */
        _truncateText(text, maxLength) {
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        }

        /**
         * Load the next chapter (used for auto-advance in flow mode)
         */
        loadNextChapter() {
            if (!this.book || this.currentChapterIndex < 0) {
                return false;
            }

            const nextIndex = this.currentChapterIndex + 1;
            
            if (nextIndex >= this.chapters.length) {
                // No more chapters
                return false;
            }

            // Load the next chapter
            this.loadChapter(nextIndex);
            return true;
        }

        /**
         * Load the previous chapter
         */
        loadPreviousChapter() {
            if (!this.book || this.currentChapterIndex <= 0) {
                return false;
            }

            const prevIndex = this.currentChapterIndex - 1;
            this.loadChapter(prevIndex);
            return true;
        }

        /**
         * Get current book info
         */
        getCurrentBook() {
            if (!this.book) return null;
            
            return {
                chapters: this.chapters,
                currentChapterIndex: this.currentChapterIndex,
                totalChapters: this.chapters.length
            };
        }
    }

    // Expose to global scope
    window.EPUBHandler = new EPUBHandler();

})();