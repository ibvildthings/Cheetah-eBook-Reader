/**
 * UIController v1.0.0
 * Manages all UI interactions and synchronization with CheetahReaderApp
 *
 * This class provides clean separation between the reader engine and UI:
 * - Listens to app events and updates UI
 * - Captures UI events and calls app methods
 * - No direct state manipulation (uses public API only)
 *
 * REFACTORED: Phase 4 - Organized app.js into a clean controller pattern
 *
 * @license MIT
 * @version 1.0.0
 */

class UIController {
    constructor(readerApp) {
        this.app = readerApp;

        // Cache DOM elements for better performance
        this.elements = this._cacheElements();

        // Initialize margin drag state
        this.marginState = { dragging: false, side: null, initX: 0, initMargin: 0 };

        // Setup (order matters - sync after listeners are attached)
        this._initializeEventListeners();
        this._subscribeToReaderEvents();

        // Wait for services to initialize before subscribing to EPUB/MOBI events
        setTimeout(() => {
            this._subscribeToEPUBEvents();
            this._subscribeToMOBIEvents();
        }, 200);

        // Sync UI with current settings after a delay
        setTimeout(() => {
            this._syncUIWithSettings();
            this._updateMarginsUI();
        }, 200);

        console.log('✅ UIController initialized');
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    /**
     * Cache all DOM elements for better performance
     * @private
     */
    _cacheElements() {
        return {
            // Content loading
            uploadBtn: document.getElementById('upload-btn'),
            epubUpload: document.getElementById('epub-upload'),
            pasteBtn: document.getElementById('paste-btn'),

            // Metadata
            bookTitle: document.getElementById('book-title'),
            bookAuthor: document.getElementById('book-author'),

            // Chapters
            chaptersList: document.getElementById('chapters-list'),
            chapterNavBar: document.getElementById('chapter-nav-bar'),
            prevChapterBtn: document.getElementById('prev-chapter-btn'),
            nextChapterBtn: document.getElementById('next-chapter-btn'),

            // Sidebar toggles
            chaptersToggle: document.getElementById('chapters-toggle'),
            chaptersSidebar: document.getElementById('chapters-sidebar'),
            sidebarToggle: document.getElementById('sidebar-toggle'),
            sidebar: document.getElementById('sidebar'),

            // Reading modes
            flowBtn: document.getElementById('btn-flow'),
            bionicBtn: document.getElementById('btn-bionic'),

            // Sliders
            speedSlider: document.getElementById('speed-slider'),
            speedValue: document.getElementById('speed-value'),
            focusSlider: document.getElementById('focus-slider'),
            focusValue: document.getElementById('focus-value'),
            scrollSlider: document.getElementById('scroll-slider'),
            scrollValue: document.getElementById('scroll-value'),
            fontsizeSlider: document.getElementById('fontsize-slider'),
            fontsizeValue: document.getElementById('fontsize-value'),
            lineheightSlider: document.getElementById('lineheight-slider'),
            lineheightValue: document.getElementById('lineheight-value'),
            bionicStrengthSlider: document.getElementById('bionic-strength-slider'),
            bionicStrengthValue: document.getElementById('bionic-strength-value'),

            // Margins
            marginLeftSlider: document.getElementById('margin-left-slider'),
            marginLeftValue: document.getElementById('margin-left-value'),
            marginRightSlider: document.getElementById('margin-right-slider'),
            marginRightValue: document.getElementById('margin-right-value'),
            dragLeft: document.getElementById('drag-left'),
            dragRight: document.getElementById('drag-right'),

            // Font and theme
            fontSelect: document.getElementById('font-select'),
            themeSelect: document.getElementById('theme-select'),
            themeAuto: document.getElementById('theme-auto'),

            // Reset
            resetBtn: document.getElementById('reset-settings-btn')
        };
    }

    // ========================================
    // EVENT LISTENERS (DOM → App)
    // ========================================

    /**
     * Initialize all DOM event listeners
     * @private
     */
    _initializeEventListeners() {
        // Content loading
        this._setupContentLoadingListeners();

        // UI toggles
        this._setupUIToggleListeners();

        // Chapter navigation
        this._setupChapterNavigationListeners();

        // Margins
        this._setupMarginListeners();

        // Reading modes
        this._setupReadingModeListeners();

        // Controls (sliders, selectors)
        this._setupControlListeners();

        // Reset settings
        this._setupResetListener();
    }

    /**
     * Setup content loading listeners (EPUB upload, paste text)
     * @private
     */
    _setupContentLoadingListeners() {
        this.elements.uploadBtn?.addEventListener('click', () => {
            this.elements.epubUpload?.click();
        });

        this.elements.epubUpload?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Determine file type and load accordingly
                const fileName = file.name.toLowerCase();
                if (fileName.endsWith('.mobi')) {
                    this.app.loadMOBI(file);
                } else if (fileName.endsWith('.epub')) {
                    this.app.loadEPUB(file);
                } else {
                    alert('Unsupported file type. Please upload a .epub or .mobi file.');
                }
            }
        });

        this.elements.pasteBtn?.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();

                if (!text || text.trim().length === 0) {
                    alert('Clipboard is empty or contains no text.');
                    return;
                }

                this.app.loadPastedText(text);

                // Update UI
                if (this.elements.bookTitle) {
                    this.elements.bookTitle.textContent = 'Pasted Text';
                }
                if (this.elements.bookAuthor) {
                    this.elements.bookAuthor.textContent = `${text.length} characters`;
                }
                if (this.elements.chaptersList) {
                    this.elements.chaptersList.innerHTML =
                        '<div class="chapters-list-empty">No chapters (pasted text)</div>';
                }

            } catch (error) {
                console.error('Failed to read clipboard:', error);
                alert('Failed to read clipboard. Make sure you granted clipboard permissions.');
            }
        });
    }

    /**
     * Setup UI toggle listeners (sidebars, sections)
     * @private
     */
    _setupUIToggleListeners() {
        this.elements.chaptersToggle?.addEventListener('click', () => {
            this.elements.chaptersSidebar?.classList.toggle('collapsed');
        });

        this.elements.sidebarToggle?.addEventListener('click', () => {
            this.elements.sidebar?.classList.toggle('collapsed');
        });

        // Collapsible sections
        document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.dataset.section;
                const content = document.querySelector(`[data-content="${section}"]`);
                if (content) {
                    content.classList.toggle('collapsed');
                    header.classList.toggle('collapsed');
                }
            });
        });
    }

    /**
     * Setup chapter navigation listeners
     * @private
     */
    _setupChapterNavigationListeners() {
        this.elements.prevChapterBtn?.addEventListener('click', () => {
            this.app.previousChapter();
        });

        this.elements.nextChapterBtn?.addEventListener('click', () => {
            this.app.nextChapter();
        });
    }

    /**
     * Setup margin control listeners (drag zones and sliders)
     * @private
     */
    _setupMarginListeners() {
        // Drag zones
        ['left', 'right'].forEach(side => {
            const el = document.getElementById(`drag-${side}`);
            ['mousedown', 'touchstart'].forEach(ev =>
                el?.addEventListener(ev, e => this._startMarginDrag(e, side))
            );
        });

        ['mousemove', 'touchmove'].forEach(ev =>
            document.addEventListener(ev, (e) => this._handleMarginDrag(e))
        );

        ['mouseup', 'touchend'].forEach(ev =>
            document.addEventListener(ev, () => this._stopMarginDrag())
        );

        // Margin sliders
        this.elements.marginLeftSlider?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value, 10);
            this.app.setMargins(value, undefined);
        });

        this.elements.marginRightSlider?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value, 10);
            this.app.setMargins(undefined, value);
        });

        // Subscribe to margin changes from app
        this.app.onSettingChange(['marginL', 'marginR'], () => {
            this._updateMarginsUI();
        });
    }

    /**
     * Setup reading mode listeners (flow, bionic)
     * @private
     */
    _setupReadingModeListeners() {
        // Flow mode
        this.elements.flowBtn?.addEventListener('click', () => {
            const currentState = this.app.getReaderState();
            const isFlow = currentState?.mode === 'flow';
            isFlow ? this.app.stopFlow() : this.app.startFlow();
        });

        // Bionic mode
        this.elements.bionicBtn?.addEventListener('click', () => {
            this.app.toggleBionic();
            this.elements.bionicBtn?.classList.toggle('active');
            this._updateBionicSliderState();
        });

        // Bionic strength slider
        this.elements.bionicStrengthSlider?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value, 10);
            if (this.elements.bionicStrengthValue) {
                this.elements.bionicStrengthValue.textContent = `${value}%`;
            }
            // Convert percentage to decimal (20-70% -> 0.2-0.7)
            this.app.setBionicStrength(value / 100);
        });
    }

    /**
     * Setup control listeners (sliders, font, theme)
     * @private
     */
    _setupControlListeners() {
        // Sliders
        const sliders = [
            {
                slider: this.elements.speedSlider,
                value: this.elements.speedValue,
                action: v => this.app.setSpeed(v),
                label: v => `${v} WPM`
            },
            {
                slider: this.elements.focusSlider,
                value: this.elements.focusValue,
                action: v => this.app.setFocusWidth(v),
                label: v => v
            },
            {
                slider: this.elements.scrollSlider,
                value: this.elements.scrollValue,
                action: v => this.app.setScrollLevel(v),
                label: v => v
            },
            {
                slider: this.elements.fontsizeSlider,
                value: this.elements.fontsizeValue,
                action: v => this.app.setFontSize(v),
                label: v => `${v}px`
            },
            {
                slider: this.elements.lineheightSlider,
                value: this.elements.lineheightValue,
                action: v => this.app.setLineHeight(v),
                label: v => v.toFixed(1)
            }
        ];

        sliders.forEach(({ slider, value, action, label }) => {
            slider?.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                action(val);
                if (value) value.textContent = label(val);
            });
        });

        // Font selector
        this.elements.fontSelect?.addEventListener('change', (e) => {
            this.app.setFont(e.target.value);
        });

        // Theme selector
        this.elements.themeSelect?.addEventListener('change', (e) => {
            if (this.elements.themeAuto) {
                this.elements.themeAuto.checked = false;
            }
            this.app.setTheme(e.target.value);
        });

        // Auto theme checkbox
        this.elements.themeAuto?.addEventListener('change', (e) => {
            this.app.setAutoTheme(e.target.checked);
            if (this.elements.themeSelect) {
                this.elements.themeSelect.disabled = e.target.checked;
            }
        });
    }

    /**
     * Setup reset settings listener
     * @private
     */
    _setupResetListener() {
        this.elements.resetBtn?.addEventListener('click', () => {
            const confirmed = confirm(
                'Reset all settings to defaults?\n\n' +
                'This will clear:\n' +
                '• Font, size, and line height\n' +
                '• Theme preferences\n' +
                '• Margins\n' +
                '• Bionic settings\n' +
                '• Flow mode preferences\n\n' +
                'The page will reload with default settings.'
            );

            if (confirmed) {
                this.app.clearSettings();
                console.log('✅ Settings reset to defaults');
                setTimeout(() => location.reload(), 100);
            }
        });
    }

    // ========================================
    // READER EVENTS (App → UI)
    // ========================================

    /**
     * Subscribe to reader events
     * @private
     */
    _subscribeToReaderEvents() {
        // Mode changes (flow/normal)
        this.app.on('onModeChange', (mode) => {
            this._updateFlowButton(mode);
        });
    }

    /**
     * Update flow button based on mode
     * @private
     */
    _updateFlowButton(mode) {
        if (this.elements.flowBtn) {
            this.elements.flowBtn.classList.toggle('active', mode === 'flow');
            this.elements.flowBtn.textContent = mode === 'flow' ? '⏸ Stop Flow' : '▶ Start Flow';
        }
    }

    // ========================================
    // EPUB EVENTS (App → UI)
    // ========================================

    /**
     * Subscribe to EPUB events
     * @private
     */
    _subscribeToEPUBEvents() {
        console.log('🔌 Setting up EPUB event listeners...');

        this.app.onEPUB('metadataUpdated', (data) => {
            this._updateMetadataUI(data);
        });

        this.app.onEPUB('chaptersExtracted', (data) => {
            this._renderChaptersList(data);
        });

        this.app.onEPUB('chapterChanged', (data) => {
            this._updateActiveChapter(data);
        });

        this.app.onEPUB('navigationStateChanged', (data) => {
            this._updateNavigationBar(data);
        });

        this.app.onEPUB('epubError', (data) => {
            console.error('❌ EPUB error:', data);
            alert(data.message);
        });

        this.app.onEPUB('bookLoadStarted', (data) => {
            console.log('⏳ Loading EPUB:', data.filename);
        });

        this.app.onEPUB('bookLoaded', (data) => {
            console.log('✅ EPUB loaded:', data);
        });

        console.log('✅ EPUB event listeners set up successfully');
    }

    /**
     * Subscribe to MOBI events
     * @private
     */
    _subscribeToMOBIEvents() {
        console.log('🔌 Setting up MOBI event listeners...');

        this.app.onMOBI('metadataUpdated', (data) => {
            this._updateMetadataUI(data);
            // Clear chapters list for MOBI (no chapter support)
            if (this.elements.chaptersList) {
                this.elements.chaptersList.innerHTML =
                    '<div class="chapters-list-empty">No chapters (MOBI format)</div>';
            }
            // Hide chapter navigation
            if (this.elements.chapterNavBar) {
                this.elements.chapterNavBar.style.display = 'none';
            }
        });

        this.app.onMOBI('mobiError', (data) => {
            console.error('❌ MOBI error:', data);
            alert(data.message);
        });

        this.app.onMOBI('bookLoadStarted', (data) => {
            console.log('⏳ Loading MOBI:', data.filename);
        });

        this.app.onMOBI('bookLoaded', (data) => {
            console.log('✅ MOBI loaded:', data);
        });

        console.log('✅ MOBI event listeners set up successfully');
    }

    /**
     * Update metadata UI (book title, author)
     * @private
     */
    _updateMetadataUI(data) {
        console.log('📖 Metadata updated:', data);

        if (this.elements.bookTitle) {
            this.elements.bookTitle.textContent = data.title;
        }
        if (this.elements.bookAuthor) {
            this.elements.bookAuthor.textContent = data.author;
        }
    }

    /**
     * Render chapters list in sidebar
     * @private
     */
    _renderChaptersList(data) {
        console.log('📚 Chapters extracted:', data);

        if (!this.elements.chaptersList) return;

        // Reset scroll position
        this.elements.chaptersList.scrollTop = 0;

        if (data.isEmpty) {
            this.elements.chaptersList.innerHTML = '<div class="chapters-list-empty">No chapters found</div>';
            return;
        }

        this.elements.chaptersList.innerHTML = '';

        data.chapters.forEach((chapter) => {
            const div = document.createElement('div');
            div.className = 'chapter-item';
            div.dataset.index = chapter.index;

            div.innerHTML = `
                <span class="chapter-number">${chapter.index + 1}</span>
                <span class="chapter-title">${this._truncateText(chapter.label, 60)}</span>
            `;

            div.addEventListener('click', () => {
                this.app.loadChapter(chapter.index);
            });

            this.elements.chaptersList.appendChild(div);
        });
    }

    /**
     * Update active chapter in sidebar
     * @private
     */
    _updateActiveChapter(data) {
        console.log('📄 Chapter changed:', data);

        const items = document.querySelectorAll('.chapter-item');
        items.forEach((item, i) => {
            if (i === data.index) {
                item.classList.add('active');

                // Scroll sidebar to show active chapter
                if (this.elements.chaptersList && item) {
                    if (data.isFirst) {
                        this.elements.chaptersList.scrollTop = 0;
                    } else {
                        requestAnimationFrame(() => {
                            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        });
                    }
                }
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * Update navigation bar (show/hide, enable/disable buttons)
     * @private
     */
    _updateNavigationBar(data) {
        console.log('🧭 Navigation state changed:', data);

        if (!this.elements.chapterNavBar || !this.elements.prevChapterBtn || !this.elements.nextChapterBtn) {
            console.error('❌ Navigation elements not found!');
            return;
        }

        // Show/hide navigation bar
        const shouldShow = data.visible;
        console.log(`🧭 Setting nav bar display to: ${shouldShow ? 'flex' : 'none'}`);
        this.elements.chapterNavBar.style.display = shouldShow ? 'flex' : 'none';

        // Update button states
        this.elements.prevChapterBtn.disabled = !data.hasPrev;
        this.elements.nextChapterBtn.disabled = !data.hasNext;
        console.log(`🧭 Prev button: ${!data.hasPrev ? 'disabled' : 'enabled'}, Next button: ${!data.hasNext ? 'disabled' : 'enabled'}`);
    }

    // ========================================
    // UI UPDATES
    // ========================================

    /**
     * Sync all UI controls with current settings
     * @private
     */
    _syncUIWithSettings() {
        const settings = this.app.getCurrentSettings();

        // Font selector
        if (this.elements.fontSelect) {
            this.elements.fontSelect.value = settings.font;
        }

        // Font size
        if (this.elements.fontsizeSlider) {
            this.elements.fontsizeSlider.value = settings.fontSize;
            if (this.elements.fontsizeValue) {
                this.elements.fontsizeValue.textContent = `${settings.fontSize}px`;
            }
        }

        // Line height
        if (this.elements.lineheightSlider) {
            this.elements.lineheightSlider.value = settings.lineHeight;
            if (this.elements.lineheightValue) {
                this.elements.lineheightValue.textContent = settings.lineHeight.toFixed(1);
            }
        }

        // Theme
        if (this.elements.themeSelect) {
            this.elements.themeSelect.value = settings.theme;
        }

        if (this.elements.themeAuto) {
            this.elements.themeAuto.checked = settings.autoTheme;
            if (this.elements.themeSelect) {
                this.elements.themeSelect.disabled = settings.autoTheme;
            }
        }

        // Margins
        if (this.elements.marginLeftSlider) {
            this.elements.marginLeftSlider.value = settings.marginL;
            if (this.elements.marginLeftValue) {
                this.elements.marginLeftValue.textContent = `${settings.marginL}px`;
            }
        }

        if (this.elements.marginRightSlider) {
            this.elements.marginRightSlider.value = settings.marginR;
            if (this.elements.marginRightValue) {
                this.elements.marginRightValue.textContent = `${settings.marginR}px`;
            }
        }

        // Bionic
        if (this.elements.bionicBtn && settings.bionic) {
            this.elements.bionicBtn.classList.add('active');
        }

        // Bionic strength
        if (this.elements.bionicStrengthSlider) {
            const strength = Math.round(settings.bionicStrength * 100);
            this.elements.bionicStrengthSlider.value = strength;
            if (this.elements.bionicStrengthValue) {
                this.elements.bionicStrengthValue.textContent = `${strength}%`;
            }
        }

        // Flow speed
        if (this.elements.speedSlider) {
            this.elements.speedSlider.value = settings.flow.speed;
            if (this.elements.speedValue) {
                this.elements.speedValue.textContent = `${settings.flow.speed} WPM`;
            }
        }

        // Flow focus width
        if (this.elements.focusSlider) {
            this.elements.focusSlider.value = settings.flow.focusWidth;
            if (this.elements.focusValue) {
                this.elements.focusValue.textContent = settings.flow.focusWidth;
            }
        }

        // Flow scroll level
        if (this.elements.scrollSlider) {
            this.elements.scrollSlider.value = settings.flow.scrollLevel;
            if (this.elements.scrollValue) {
                this.elements.scrollValue.textContent = settings.flow.scrollLevel;
            }
        }

        this._updateBionicSliderState();
        console.log('✅ UI synced with loaded settings');
    }

    /**
     * Update bionic slider enabled/disabled state
     * @private
     */
    _updateBionicSliderState() {
        const settings = this.app.getCurrentSettings();
        const bionicEnabled = settings.bionic;

        if (this.elements.bionicStrengthSlider) {
            this.elements.bionicStrengthSlider.disabled = !bionicEnabled;
            this.elements.bionicStrengthSlider.style.opacity = bionicEnabled ? '1' : '0.5';
        }
    }

    /**
     * Update margins UI (content padding, drag zones, labels)
     * @private
     */
    _updateMarginsUI() {
        const settings = this.app.getCurrentSettings();
        const left = settings.marginL;
        const right = settings.marginR;

        // Update content padding
        const content = document.querySelector('.ebook-text-content');
        if (content) {
            content.style.paddingLeft = `${left}px`;
            content.style.paddingRight = `${right}px`;
        }

        // Update drag zones
        if (this.elements.dragLeft) {
            this.elements.dragLeft.style.width = `${Math.max(60, left)}px`;
        }
        if (this.elements.dragRight) {
            this.elements.dragRight.style.width = `${Math.max(60, right)}px`;
        }

        // Update labels
        if (this.elements.marginLeftValue) {
            this.elements.marginLeftValue.textContent = `${left}px`;
        }
        if (this.elements.marginRightValue) {
            this.elements.marginRightValue.textContent = `${right}px`;
        }
    }

    // ========================================
    // MARGIN DRAG HANDLERS
    // ========================================

    /**
     * Start margin drag
     * @private
     */
    _startMarginDrag(e, side) {
        e.preventDefault();
        const x = e.touches?.[0]?.clientX ?? e.clientX;
        const settings = this.app.getCurrentSettings();

        this.marginState.dragging = true;
        this.marginState.side = side;
        this.marginState.initX = x;
        this.marginState.initMargin = side === 'left' ? settings.marginL : settings.marginR;

        document.getElementById(`drag-${side}`)?.classList.add('dragging');
    }

    /**
     * Handle margin drag
     * @private
     */
    _handleMarginDrag(e) {
        if (!this.marginState.dragging) return;

        const x = e.touches?.[0]?.clientX ?? e.clientX;
        const delta = x - this.marginState.initX;
        const multiplier = this.marginState.side === 'left' ? 1 : -1;
        const newValue = Math.max(10, Math.min(400, this.marginState.initMargin + (delta * multiplier)));

        this.app.setMargins(
            this.marginState.side === 'left' ? newValue : undefined,
            this.marginState.side === 'right' ? newValue : undefined
        );
    }

    /**
     * Stop margin drag
     * @private
     */
    _stopMarginDrag() {
        if (this.marginState.dragging) {
            document.getElementById(`drag-${this.marginState.side}`)?.classList.remove('dragging');
            this.marginState.dragging = false;
        }
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    /**
     * Truncate text to max length
     * @private
     */
    _truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIController;
}
if (typeof window !== 'undefined') {
    window.UIController = UIController;
}
