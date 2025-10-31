/**
 * EPUBService v2.0.0
 * Service for managing EPUB file loading, parsing, and navigation
 *
 * REFACTORED: Now event-driven, no direct DOM manipulation
 * FIXED: Internal link handling (footnotes, TOC, etc.)
 *
 * @license MIT
 * @version 2.0.0
 */

class EPUBService {
    constructor(reader) {
        this.reader = reader;
        this.book = null;
        this.chapters = [];
        this.currentChapterIndex = -1;
        this.imageCache = new Map();

        // ✅ NEW: Event system for decoupling
        this._callbacks = {};

        console.log('EPUBService v2.0.0 initialized (event-driven)');
    }

    // ========================================
    // EVENT SYSTEM
    // ========================================

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this._callbacks[event]) {
            this._callbacks[event] = [];
        }
        this._callbacks[event].push(callback);

        // Return unsubscribe function
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
        if (!this._callbacks[event]) return;
        const index = this._callbacks[event].indexOf(callback);
        if (index > -1) {
            this._callbacks[event].splice(index, 1);
        }
    }

    /**
     * Emit an event
     * @private
     */
    _emit(event, data) {
        if (this._callbacks[event]) {
            this._callbacks[event].forEach(cb => {
                try {
                    cb(data);
                } catch (error) {
                    console.error(`Error in ${event} callback:`, error);
                }
            });
        }
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

            // ✅ Emit event instead of DOM manipulation
            this._emit('bookLoadStarted', { filename: file.name });

            // Read file as array buffer
            const arrayBuffer = await file.arrayBuffer();

            // Parse EPUB using ePub.js
            this.book = ePub(arrayBuffer);

            await this.book.ready;

            // Update metadata (now emits events)
            this._updateMetadata();

            // Extract chapters (now emits events)
            await this._extractChapters();

            // ✅ Emit success event
            this._emit('bookLoaded', {
                filename: file.name,
                chapterCount: this.chapters.length
            });

            // Load first chapter
            if (this.chapters.length > 0) {
                await this.loadChapter(0);
            }

            console.log('EPUB loaded successfully');
        } catch (error) {
            console.error('Failed to load EPUB:', error);

            // ✅ Emit error event instead of alert
            this._emit('epubError', {
                code: 'LOAD_FAILED',
                message: 'Failed to load EPUB file. Please check the file format.',
                details: error.message
            });
        }
    }

    /**
     * Extract and emit book metadata
     * ✅ REFACTORED: No DOM manipulation, emits event instead
     */
    _updateMetadata() {
        const metadata = this.book.packaging.metadata;

        const metadataData = {
            title: metadata.title || 'Unknown Title',
            author: metadata.creator || 'Unknown Author',
            publisher: metadata.publisher || '',
            language: metadata.language || '',
            publicationDate: metadata.pubdate || '',
            description: metadata.description || '',
            rights: metadata.rights || ''
        };

        // ✅ Emit event for UI to handle
        this._emit('metadataUpdated', metadataData);

        console.log('Metadata:', metadataData);
    }

    /**
     * Extract chapters from EPUB table of contents
     * ✅ REFACTORED: No DOM manipulation, emits event instead
     */
    async _extractChapters() {
        this.chapters = [];

        const toc = await this.book.loaded.navigation.then(nav => nav.toc);

        if (!toc || toc.length === 0) {
            console.warn('No chapters found in EPUB');

            // ✅ Emit event for empty chapters
            this._emit('chaptersExtracted', {
                chapters: [],
                isEmpty: true
            });
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
        }

        console.log(`Extracted ${this.chapters.length} chapters`);

        // ✅ Emit event with chapters data
        this._emit('chaptersExtracted', {
            chapters: this.chapters.map(ch => ({ ...ch })), // Return copy
            isEmpty: false
        });
    }

    /**
     * ✅ REMOVED: _createChapterElement - UI layer handles DOM creation now
     * The UI will subscribe to 'chaptersExtracted' event and create elements
     */

    /**
     * Load a specific chapter by index
     */
    async loadChapter(index, wasPlaying) {
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

            // Extract HTML content
            let content = this._extractContent(section);

            // Process images
            content = await this._processImages(content, chapter.href);

            // Clean content
            content = this._cleanContent(content);

            // Update current chapter
            this.currentChapterIndex = index;
            this._updateActiveChapter(index);
            
            // Update navigation bar buttons
            this._updateChapterNavBar();

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

            // FIXED: Attach link handlers after content is fully rendered
            // Wait for the next animation frame to ensure DOM is ready
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this._attachLinkHandlers();
                });
            });

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
     * Process images in content - use section URL and archive.request()
     */
    async _processImages(html, currentHref) {
        console.log('🖼️ _processImages called:', { currentHref, htmlLength: html.length });
        
        if (!this.book || !this.book.archive) {
            console.warn('❌ No book or archive available');
            return html;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const images = doc.querySelectorAll('img[src]');
        
        console.log(`🖼️ Found ${images.length} images to process`);

        for (const img of images) {
            const src = img.getAttribute('src');
            console.log('🔍 Processing image:', src);
            
            if (!src || src.startsWith('data:') || src.startsWith('http') || src.startsWith('blob:')) {
                console.log('⏭️ Skipping image (data/http/blob):', src);
                continue;
            }

            try {
                // Check cache first
                if (this.imageCache.has(src)) {
                    const cachedUrl = this.imageCache.get(src);
                    console.log('✅ Using cached URL for:', src);
                    img.setAttribute('src', cachedUrl);

                    // Apply styling to cached images as well
                    if (!img.getAttribute('style')) {
                        img.setAttribute('style', 'max-width: 100%; height: auto; display: block; margin: 1em auto;');
                    }

                    continue;
                }

                // Get section to find its base URL
                const section = this.book.spine.get(currentHref);
                let resolvedUrl;
                
                if (section && section.url) {
                    // Section URL is like "/OEBPS/xhtml/001_cvi_Cover.xhtml"
                    // We need to resolve "../images/cover.jpg" relative to it
                    const baseUrl = section.url;
                    console.log('📍 Base URL:', baseUrl);
                    
                    // Manually resolve the relative path
                    const baseParts = baseUrl.split('/');
                    baseParts.pop(); // Remove filename, keep directory
                    
                    const srcParts = src.split('/');
                    for (const part of srcParts) {
                        if (part === '..') {
                            baseParts.pop();
                        } else if (part !== '.') {
                            baseParts.push(part);
                        }
                    }
                    
                    resolvedUrl = baseParts.join('/');
                    console.log('✅ Resolved URL:', src, '→', resolvedUrl);
                } else {
                    // Fallback
                    resolvedUrl = '/' + this._resolveHref(src, currentHref);
                    console.log('⚠️ Fallback resolution:', resolvedUrl);
                }
                
                // Now use archive.request() with type 'blob' - this is the proper API
                console.log('🔧 Calling archive.request() for:', resolvedUrl);
                const blob = await this.book.archive.request(resolvedUrl, 'blob');
                console.log('📦 Got blob:', blob?.constructor?.name, 'Type:', blob?.type, 'Size:', blob?.size);
                
                if (blob && blob instanceof Blob) {
                    // Ensure proper MIME type
                    const mimeType = this._getMimeType(src);
                    const typedBlob = blob.type ? blob : new Blob([blob], { type: mimeType });
                    
                    // Create blob URL
                    const blobUrl = URL.createObjectURL(typedBlob);
                    console.log('✅ Created blobUrl:', blobUrl);
                    
                    // Cache it
                    this.imageCache.set(src, blobUrl);
                    
                    // Update the image src
                    img.setAttribute('src', blobUrl);
                    
                    // Add responsive styles
                    if (!img.getAttribute('style')) {
                        img.setAttribute('style', 'max-width: 100%; height: auto; display: block; margin: 1em auto;');
                    }
                } else {
                    console.warn('❌ archive.request() did not return a valid blob for:', resolvedUrl);
                    img.remove();
                }
            } catch (error) {
                console.error('❌ Failed to load image:', src, error);
                console.error('Error details:', error.message);
                img.remove();
            }
        }

        const finalHtml = doc.body.innerHTML;
        console.log('✅ _processImages complete. Output length:', finalHtml.length);
        return finalHtml;
    }

    /**
     * Get MIME type from file extension
     */
    _getMimeType(path) {
        const ext = path.split('.').pop().toLowerCase();
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
                           'span', 'div', 'img', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
                           'table', 'thead', 'tbody', 'tr', 'td', 'th', 'figure', 'figcaption'],
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style', 'role'],
            ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
            KEEP_CONTENT: true
        });
    }

    /**
     * Update active chapter
     * ✅ REFACTORED: No DOM manipulation, emits event instead
     */
    _updateActiveChapter(index) {
        // ✅ Emit event with chapter change data
        this._emit('chapterChanged', {
            index: index,
            title: this.chapters[index]?.label || '',
            isFirst: index === 0,
            isLast: index >= this.chapters.length - 1,
            totalChapters: this.chapters.length
        });

        // Update navigation state (also emits event)
        this._updateChapterNavBar();
    }

    /**
     * FIXED: Attach handlers to internal links
     * Simplified approach - query all links fresh each time, no manual tracking
     */
    _attachLinkHandlers() {
        const contentArea = document.querySelector('.ebook-text-content');
        if (!contentArea) {
            console.warn('Content area not found for link attachment');
            return;
        }

        // Query all links in the content
        const links = contentArea.querySelectorAll('a[href]');
        console.log(`📎 Attaching handlers to ${links.length} links`);
        
        // Simply attach click handler to each link
        // Since loadChapter() re-renders content, old event listeners are naturally removed
        links.forEach((link, index) => {
            const href = link.getAttribute('href');
            
            // Only handle internal links (not http://, https://, mailto:, etc.)
            if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🔗 Internal link clicked [${index}]:`, href);
                    this._handleInternalLink(href);
                });
            }
        });
        
        console.log('✅ Link handlers attached');
    }

    /**
     * FIXED: Handle internal link navigation
     * Improved to handle more href variations
     */
    _handleInternalLink(href) {
        console.log('🔍 Processing internal link:', href);

        // Split into path and anchor
        const [path, anchor] = href.split('#');
        
        // Case 1: Link has a path - find and load that chapter
        if (path && path.length > 0) {
            console.log('Looking for chapter with path:', path);
            
            // Try multiple matching strategies to find the chapter
            let chapterIndex = -1;
            
            // Strategy 1: Exact match
            chapterIndex = this.chapters.findIndex(ch => ch.href === path);
            
            // Strategy 2: Match with .xhtml extension
            if (chapterIndex === -1) {
                chapterIndex = this.chapters.findIndex(ch => ch.href === path + '.xhtml');
            }
            
            // Strategy 3: Match with .html extension
            if (chapterIndex === -1) {
                chapterIndex = this.chapters.findIndex(ch => ch.href === path + '.html');
            }
            
            // Strategy 4: Match without leading directory
            if (chapterIndex === -1) {
                const pathFilename = path.split('/').pop();
                chapterIndex = this.chapters.findIndex(ch => {
                    const chapterFilename = ch.href.split('/').pop();
                    return chapterFilename === pathFilename;
                });
            }
            
            // Strategy 5: Match chapter href ends with path
            if (chapterIndex === -1) {
                chapterIndex = this.chapters.findIndex(ch => ch.href.endsWith(path));
            }
            
            // Strategy 6: Match path ends with chapter href
            if (chapterIndex === -1) {
                chapterIndex = this.chapters.findIndex(ch => path.endsWith(ch.href));
            }
            
            if (chapterIndex !== -1) {
                console.log(`✅ Found chapter at index ${chapterIndex}`);
                // Store anchor to scroll to after chapter loads
                if (anchor) {
                    // Scroll to anchor after chapter loads
                    this.loadChapter(chapterIndex).then(() => {
                        setTimeout(() => {
                            this._scrollToAnchor(anchor);
                        }, 300);
                    });
                } else {
                    this.loadChapter(chapterIndex);
                }
                return;
            } else {
                console.warn('❌ No matching chapter found for path:', path);
            }
        }

        // Case 2: No path, just anchor - scroll within current chapter
        if (anchor) {
            console.log('Scrolling to anchor within current chapter:', anchor);
            this._scrollToAnchor(anchor);
        }
    }

    /**
     * Scroll to an anchor element
     * @param {string} anchor - ID of element to scroll to
     */
    _scrollToAnchor(anchor) {
        console.log('Attempting to scroll to anchor:', anchor);
        
        // Try finding by ID
        let element = document.getElementById(anchor);
        
        // If not found by ID, try finding by name attribute (older HTML)
        if (!element) {
            element = document.querySelector(`[name="${anchor}"]`);
        }
        
        // If still not found, try finding within the content area
        if (!element) {
            const contentArea = document.querySelector('.ebook-text-content');
            if (contentArea) {
                element = contentArea.querySelector(`#${anchor}, [name="${anchor}"]`);
            }
        }
        
        if (element) {
            console.log('✅ Found anchor element, scrolling...');
            element.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        } else {
            console.warn('❌ Anchor element not found:', anchor);
        }
    }

    /**
     * Update chapter navigation state
     * ✅ REFACTORED: No DOM manipulation, emits event instead
     */
    _updateChapterNavBar() {
        // ✅ Emit event with navigation state
        this._emit('navigationStateChanged', {
            visible: this.chapters.length > 0,
            hasPrev: this.currentChapterIndex > 0,
            hasNext: this.currentChapterIndex < this.chapters.length - 1,
            currentIndex: this.currentChapterIndex,
            totalChapters: this.chapters.length
        });
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
     * Full cleanup
     */
    _cleanup() {
        this.imageCache.forEach(url => URL.revokeObjectURL(url));
        this.imageCache.clear();
        
        this.book = null;
        this.chapters = [];
        this.currentChapterIndex = -1;
        
        // Hide chapter navigation bar
        const navBar = document.getElementById('chapter-nav-bar');
        if (navBar) {
            navBar.style.display = 'none';
        }
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
