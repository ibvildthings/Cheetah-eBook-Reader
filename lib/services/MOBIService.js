/**
 * MOBIService v1.0.0
 * Service for managing MOBI file loading and parsing
 *
 * Uses jsebook library (MobiBook) for parsing MOBI files
 * Event-driven architecture matching EPUBService pattern
 *
 * @license MIT
 * @version 1.0.0
 */

class MOBIService {
    constructor(reader) {
        this.reader = reader;
        this.book = null;
        this.metadata = {};
        this.htmlContent = '';

        // Event system for decoupling
        this._callbacks = {};

        console.log('MOBIService v1.0.0 initialized (event-driven)');
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

    // ========================================
    // BOOK LOADING
    // ========================================

    /**
     * Load a MOBI file
     * @param {File} file - MOBI file to load
     */
    async loadBook(file) {
        console.log('Loading MOBI:', file.name);

        try {
            // Check if required libraries are loaded
            if (typeof BufferPack === 'undefined') {
                throw new Error('BufferPack library not loaded. Please refresh the page.');
            }
            if (typeof LocationMap === 'undefined') {
                throw new Error('LocationMap library not loaded. Please refresh the page.');
            }
            if (typeof MobiBook === 'undefined') {
                throw new Error('MobiBook library not loaded. Please refresh the page.');
            }

            // Clean up previous book
            this._cleanup();

            // Emit event instead of DOM manipulation
            this._emit('bookLoadStarted', { filename: file.name });

            // Read file as array buffer
            const arrayBuffer = await file.arrayBuffer();
            console.log('📦 File size:', arrayBuffer.byteLength, 'bytes');

            // Convert ArrayBuffer to regular Array of bytes (BufferPack needs numeric array)
            const uint8Array = new Uint8Array(arrayBuffer);
            console.log('📝 Uint8Array length:', uint8Array.length);

            // Verify minimum file size (MOBI files should be at least 78 bytes for header)
            if (uint8Array.length < 78) {
                throw new Error('File too small to be a valid MOBI file (minimum 78 bytes required)');
            }

            // Convert to regular array for BufferPack compatibility
            // BufferPack expects array with numeric indices
            const byteArray = Array.from(uint8Array);
            console.log('📊 Byte array created, length:', byteArray.length);

            // Convert byte array to binary string for MobiBook
            const binaryString = this._byteArrayToBinaryString(byteArray);

            // Parse MOBI using MobiBook library
            try {
                this.book = new MobiBook(binaryString);
                console.log('✅ MobiBook parsed successfully');
            } catch (error) {
                console.error('MobiBook parsing error:', error);
                console.error('Error stack:', error.stack);

                // Try direct byte array approach as fallback
                console.log('🔄 Trying direct byte array approach...');
                try {
                    this.book = new MobiBook(byteArray);
                    console.log('✅ MobiBook parsed with byte array');
                } catch (error2) {
                    console.error('Byte array approach also failed:', error2);
                    throw new Error('Invalid MOBI file format: ' + error.message);
                }
            }

            // Extract metadata
            this._extractMetadata();

            // Emit chapters event (MOBI has no chapters - single document)
            this._emit('chaptersExtracted', {
                chapters: [],
                isEmpty: true
            });

            // Get HTML content
            if (this.book.html) {
                this.htmlContent = this.book.html;
            } else {
                throw new Error('Failed to extract HTML content from MOBI file');
            }

            // Clean content with DOMPurify (same as EPUB)
            this.htmlContent = this._cleanContent(this.htmlContent);

            // Emit success event
            this._emit('bookLoaded', {
                filename: file.name,
                hasContent: !!this.htmlContent
            });

            // Load content into reader (matching EPUB pattern)
            if (this.reader && this.htmlContent) {
                const currentState = this.reader.getState();
                const shouldPlay = currentState?.playing;

                // Pause if playing
                if (shouldPlay) {
                    this.reader.pause();
                }

                // Load content
                this.reader.loadContent(this.htmlContent);

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

            // Attach link handlers for TOC navigation after content is rendered
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this._attachLinkHandlers();
                });
            });

            console.log('MOBI loaded successfully');
        } catch (error) {
            console.error('Failed to load MOBI:', error);

            // Emit error event instead of alert
            this._emit('mobiError', {
                code: 'LOAD_FAILED',
                message: 'Failed to load MOBI file. Please check the file format.',
                details: error.message
            });
        }
    }

    /**
     * Convert byte array to binary string
     * Creates a string where each character's char code equals the byte value
     * @private
     */
    _byteArrayToBinaryString(byteArray) {
        let binary = '';
        const len = byteArray.length;
        // Process in chunks to avoid call stack size exceeded
        const chunkSize = 8192;
        for (let i = 0; i < len; i += chunkSize) {
            const chunk = byteArray.slice(i, Math.min(i + chunkSize, len));
            binary += String.fromCharCode.apply(null, chunk);
        }
        return binary;
    }

    /**
     * Clean content with DOMPurify (same as EPUB)
     * @private
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
            ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style', 'role', 'name'],
            ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|blob|#):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
            KEEP_CONTENT: true
        });
    }

    /**
     * Extract and emit book metadata
     * @private
     */
    _extractMetadata() {
        // Extract metadata from MOBI book
        const title = this.book.pdfHdr?.name || 'Unknown Title';

        // Try to get author from EXTH metadata if available
        let author = 'Unknown Author';
        if (this.book.exthHdr && this.book.exthHdr.records) {
            // EXTH record type 100 is typically the author
            const authorRecord = this.book.exthHdr.records.find(r => r.type === 100);
            if (authorRecord && authorRecord.data) {
                author = authorRecord.data;
            }
        }

        this.metadata = {
            title: this._cleanString(title),
            author: this._cleanString(author),
            publisher: '',
            language: '',
            publicationDate: '',
            description: '',
            rights: ''
        };

        // Emit event for UI to handle
        this._emit('metadataUpdated', this.metadata);

        console.log('Metadata:', this.metadata);
    }

    /**
     * Clean string (remove null bytes and trim)
     * @private
     */
    _cleanString(str) {
        if (!str) return '';
        return str.replace(/\0/g, '').trim();
    }

    /**
     * Attach handlers to internal links (TOC navigation)
     * MOBI library converts filepos links to href="#offsetNNN" format
     * @private
     */
    _attachLinkHandlers() {
        const contentArea = document.querySelector('.ebook-text-content');
        if (!contentArea) {
            console.warn('Content area not found for link attachment');
            return;
        }

        // Query all internal anchor links (href starting with #)
        const links = contentArea.querySelectorAll('a[href^="#"]');
        console.log(`📎 Attaching handlers to ${links.length} internal links`);

        links.forEach((link, index) => {
            const href = link.getAttribute('href');

            if (href && href.startsWith('#')) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation(); // Prevent any other handlers from firing
                    console.log(`🔗 Internal link clicked [${index}]:`, href);

                    // Get the anchor name (remove the # prefix)
                    const anchorName = href.substring(1);

                    // Try to find the target element
                    // MOBI library creates anchors like <a name="offsetNNN"/>
                    let targetElement = contentArea.querySelector(`[name="${anchorName}"]`);

                    // Also try by ID as fallback
                    if (!targetElement) {
                        targetElement = contentArea.querySelector(`#${anchorName}`);
                    }

                    if (targetElement) {
                        console.log('✅ Found target element, scrolling...');

                        // Remember if we were playing
                        const wasPlaying = this.reader?.getState()?.playing;

                        // Pause if playing to prevent position jumping
                        if (wasPlaying) {
                            this.reader.pause();
                        }

                        // Scroll to target
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });

                        // After scrolling completes, update the word index and resume if needed
                        setTimeout(() => {
                            // Find the first visible word at the new scroll position
                            const visibleWords = contentArea.querySelectorAll('.ebook-word');
                            if (visibleWords.length > 0) {
                                const readerArea = document.querySelector('.ebook-reader-area');
                                if (readerArea) {
                                    const scrollTop = readerArea.scrollTop;
                                    const viewportTop = scrollTop;

                                    // Find first word that's in viewport
                                    for (let i = 0; i < visibleWords.length; i++) {
                                        const word = visibleWords[i];
                                        const rect = word.getBoundingClientRect();
                                        const wordTop = rect.top + scrollTop - readerArea.getBoundingClientRect().top;

                                        if (wordTop >= viewportTop) {
                                            // Update reader's word index to this word
                                            const wordIndex = parseInt(word.dataset.index, 10);
                                            if (!isNaN(wordIndex) && this.reader) {
                                                console.log(`📍 Updating word index to ${wordIndex} after link navigation`);
                                                // Use the reader's jump method if available
                                                if (this.reader.jumpToWord) {
                                                    this.reader.jumpToWord(wordIndex);
                                                }
                                            }
                                            break;
                                        }
                                    }
                                }
                            }

                            // Resume playback if it was playing
                            if (wasPlaying && this.reader) {
                                setTimeout(() => {
                                    this.reader.play();
                                }, 100);
                            }
                        }, 500); // Wait for smooth scroll to complete

                    } else {
                        console.warn('❌ Target element not found:', anchorName);
                    }
                }, true); // Use capture phase to intercept before other handlers
            }
        });

        console.log('✅ Link handlers attached');
    }

    /**
     * Full cleanup
     * @private
     */
    _cleanup() {
        this.book = null;
        this.metadata = {};
        this.htmlContent = '';
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
    module.exports = MOBIService;
}
if (typeof window !== 'undefined') {
    window.MOBIService = MOBIService;
}
