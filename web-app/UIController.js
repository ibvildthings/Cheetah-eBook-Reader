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

        // Reading-progress state
        this.PROGRESS_KEY = 'cheetah-reader-progress';
        this._bookId = null;
        this._pendingRestore = null;
        this._progressSaveTimer = null;
        this._labelTimer = null;

        // Setup (order matters - sync after listeners are attached)
        this._buildThemePicker();
        this._initializeEventListeners();
        this._subscribeToReaderEvents();
        this._setupKeyboardShortcuts();

        // Keep the picker highlight in sync if the theme changes elsewhere
        // (settings import, reset, etc.)
        this.app.onSettingChange('theme', (value) => this._setActiveSwatch(value));
        this.app.onSettingChange('autoTheme', () => {
            if (this.elements.themeAuto) {
                this.elements.themeAuto.checked = !!this.app.getCurrentSettings().autoTheme;
            }
            this._updateThemeAutoState();
        });
        this._setupDragAndDrop();
        this._setupResponsive();
        this._setupProgressTracking();

        // Wait for services to initialize before subscribing to EPUB events
        setTimeout(() => {
            this._subscribeToEPUBEvents();
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
            chapterNavStatus: document.getElementById('chapter-nav-status'),

            // Sidebar toggles
            chaptersToggle: document.getElementById('chapters-toggle'),
            chaptersSidebar: document.getElementById('chapters-sidebar'),
            sidebarToggle: document.getElementById('sidebar-toggle'),
            sidebar: document.getElementById('sidebar'),
            drawerScrim: document.getElementById('drawer-scrim'),

            // Reader + progress + drop
            readerContainer: document.getElementById('reader-container'),
            readingProgress: document.getElementById('reading-progress'),
            progressFill: document.getElementById('reading-progress-fill'),
            progressLabel: document.getElementById('progress-label'),
            dropOverlay: document.getElementById('drop-overlay'),

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
            themePicker: document.getElementById('theme-picker'),
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
            if (file) this.app.loadEPUB(file);
        });

        this.elements.pasteBtn?.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();

                if (!text || text.trim().length === 0) {
                    alert('Clipboard is empty or contains no text.');
                    return;
                }

                this.app.loadPastedText(text);
                this._bookId = null;
                this._pendingRestore = null;
                setTimeout(() => this._updateProgress(), 400);

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
            this._togglePanel('chapters');
        });

        this.elements.sidebarToggle?.addEventListener('click', () => {
            this._togglePanel('settings');
        });

        this.elements.drawerScrim?.addEventListener('click', () => this._closeDrawers());

        // Collapsible sections (make the header keyboard-operable)
        document.querySelectorAll('.section-header').forEach(header => {
            header.setAttribute('tabindex', '0');
            header.setAttribute('role', 'button');
            const toggle = () => {
                const section = header.dataset.section;
                const content = document.querySelector(`[data-content="${section}"]`);
                if (content) {
                    content.classList.toggle('collapsed');
                    header.classList.toggle('collapsed');
                    header.setAttribute('aria-expanded', String(!header.classList.contains('collapsed')));
                }
            };
            header.setAttribute('aria-expanded', String(!header.classList.contains('collapsed')));
            header.addEventListener('click', toggle);
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
            });
        });
    }

    // ========================================
    // PANEL / DRAWER MANAGEMENT
    // ========================================

    /** @private */
    _isMobile() {
        return window.matchMedia('(max-width: 900px)').matches;
    }

    /** @private */
    _togglePanel(which) {
        const sidebar = which === 'chapters' ? this.elements.chaptersSidebar : this.elements.sidebar;
        const toggleBtn = which === 'chapters' ? this.elements.chaptersToggle : this.elements.sidebarToggle;
        if (!sidebar) return;

        if (this._isMobile()) {
            const willOpen = !sidebar.classList.contains('drawer-open');
            // Only one drawer at a time
            this.elements.chaptersSidebar?.classList.remove('drawer-open');
            this.elements.sidebar?.classList.remove('drawer-open');
            if (willOpen) sidebar.classList.add('drawer-open');
            toggleBtn?.setAttribute('aria-expanded', String(willOpen));
            this._updateScrim();
        } else {
            sidebar.classList.toggle('collapsed');
            toggleBtn?.setAttribute('aria-expanded', String(!sidebar.classList.contains('collapsed')));
        }
    }

    /** @private */
    _closeDrawers() {
        this.elements.chaptersSidebar?.classList.remove('drawer-open');
        this.elements.sidebar?.classList.remove('drawer-open');
        this.elements.chaptersToggle?.setAttribute('aria-expanded', 'false');
        this.elements.sidebarToggle?.setAttribute('aria-expanded', 'false');
        this._updateScrim();
    }

    /** @private */
    _updateScrim() {
        const anyOpen = this.elements.chaptersSidebar?.classList.contains('drawer-open')
            || this.elements.sidebar?.classList.contains('drawer-open');
        if (this.elements.drawerScrim) {
            this.elements.drawerScrim.hidden = !(this._isMobile() && anyOpen);
        }
    }

    /** @private */
    _setupResponsive() {
        let wasMobile = this._isMobile();
        window.addEventListener('resize', () => {
            const isMobile = this._isMobile();
            if (isMobile === wasMobile) return;
            wasMobile = isMobile;
            // Only when growing to desktop: drop drawer state + scrim.
            // (Shrinking to mobile must NOT close a drawer the user just opened.)
            if (!isMobile) {
                this.elements.chaptersSidebar?.classList.remove('drawer-open');
                this.elements.sidebar?.classList.remove('drawer-open');
                this._updateScrim();
            }
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

        // Theme picker (built dynamically in _buildThemePicker)

        // Auto theme checkbox
        this.elements.themeAuto?.addEventListener('change', (e) => {
            this.app.setAutoTheme(e.target.checked);
            this._updateThemeAutoState();
        });
    }

    // ========================================
    // THEME PICKER
    // ========================================

    /**
     * Build the visual theme picker from the THEMES registry.
     * @private
     */
    _buildThemePicker() {
        const picker = this.elements.themePicker;
        const THEMES = (typeof window !== 'undefined' && window.THEMES) || {};
        if (!picker || !Object.keys(THEMES).length) return;

        picker.replaceChildren();
        this._swatches = [];

        const groups = [
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
            { key: 'terminal', label: 'Terminal' }
        ];

        groups.forEach((group) => {
            const entries = Object.entries(THEMES)
                .filter(([, t]) => (t.group || 'dark') === group.key);
            if (!entries.length) return;

            const label = document.createElement('div');
            label.className = 'theme-group-label';
            label.textContent = group.label;
            picker.appendChild(label);

            entries.forEach(([key, theme]) => {
                picker.appendChild(this._makeSwatch(key, theme));
            });
        });

        // Keyboard: arrow keys roam and select within the radiogroup
        picker.addEventListener('keydown', (e) => this._onSwatchKeydown(e));
    }

    /** @private */
    _makeSwatch(key, theme) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'theme-swatch';
        btn.dataset.theme = key;
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', 'false');
        btn.setAttribute('tabindex', '-1');
        btn.setAttribute('aria-label', theme.name || key);
        btn.style.setProperty('--sw-paper', theme.contentBg);
        btn.style.setProperty('--sw-ink', theme.text);
        btn.style.setProperty('--sw-accent', theme.accent);

        const preview = document.createElement('span');
        preview.className = 'tsw-preview';

        const top = document.createElement('span');
        top.className = 'tsw-top';
        top.textContent = 'Aa';

        const palette = document.createElement('span');
        palette.className = 'tsw-palette';
        (theme.palette && theme.palette.length ? theme.palette : [theme.accent])
            .slice(0, 6)
            .forEach((color) => {
                const band = document.createElement('i');
                band.style.background = color;
                palette.appendChild(band);
            });

        preview.append(top, palette);

        const name = document.createElement('span');
        name.className = 'tsw-name';
        name.textContent = theme.name || key;

        btn.append(preview, name);
        btn.addEventListener('click', () => this._selectTheme(key));

        this._swatches.push(btn);
        return btn;
    }

    /** @private */
    _selectTheme(key) {
        if (this.elements.themeAuto && this.elements.themeAuto.checked) {
            this.elements.themeAuto.checked = false;
            this.app.setAutoTheme(false);
        }
        this.app.setTheme(key);
        this._setActiveSwatch(key);
        this._updateThemeAutoState();
    }

    /** @private */
    _setActiveSwatch(key) {
        if (!this._swatches || !this._swatches.length) return;
        let matched = false;
        this._swatches.forEach((btn) => {
            const on = btn.dataset.theme === key;
            if (on) matched = true;
            btn.setAttribute('aria-checked', on ? 'true' : 'false');
            btn.setAttribute('tabindex', on ? '0' : '-1');
        });
        if (!matched) this._swatches[0].setAttribute('tabindex', '0');
    }

    /** @private */
    _onSwatchKeydown(e) {
        const list = this._swatches || [];
        const current = e.target.closest('.theme-swatch');
        if (!current) return;
        const idx = list.indexOf(current);
        if (idx === -1) return;

        let nextIdx = -1;
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown': nextIdx = (idx + 1) % list.length; break;
            case 'ArrowLeft':
            case 'ArrowUp': nextIdx = (idx - 1 + list.length) % list.length; break;
            case 'Home': nextIdx = 0; break;
            case 'End': nextIdx = list.length - 1; break;
            case ' ':
            case 'Enter':
                e.preventDefault();
                this._selectTheme(current.dataset.theme);
                return;
            default: return;
        }
        e.preventDefault();
        list[nextIdx].focus();
        this._selectTheme(list[nextIdx].dataset.theme);
    }

    /** @private */
    _updateThemeAutoState() {
        const auto = !!(this.elements.themeAuto && this.elements.themeAuto.checked);
        this.elements.themePicker?.classList.toggle('is-auto', auto);
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
            this._bookId = this._makeBookId(data);
            this._pendingRestore = this._loadProgress(this._bookId);
        });

        this.app.onEPUB('chaptersExtracted', (data) => {
            this._renderChaptersList(data);
        });

        this.app.onEPUB('chapterChanged', (data) => {
            this._updateActiveChapter(data);
            this._onChapterChanged(data);
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

        this.elements.chaptersList.replaceChildren();

        data.chapters.forEach((chapter) => {
            const div = document.createElement('div');
            div.className = 'chapter-item';
            div.dataset.index = chapter.index;
            div.setAttribute('role', 'button');
            div.setAttribute('tabindex', '0');

            const num = document.createElement('span');
            num.className = 'chapter-number';
            num.textContent = chapter.index + 1;

            const title = document.createElement('span');
            title.className = 'chapter-title';
            title.textContent = this._truncateText(chapter.label, 60);

            div.append(num, title);

            const go = () => {
                this.app.loadChapter(chapter.index);
                if (this._isMobile()) this._closeDrawers();
            };
            div.addEventListener('click', go);
            div.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
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

        // "3 / 12" position readout
        if (this.elements.chapterNavStatus) {
            this.elements.chapterNavStatus.textContent =
                data.totalChapters && data.currentIndex >= 0
                    ? `${data.currentIndex + 1} / ${data.totalChapters}`
                    : '';
        }
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
        this._setActiveSwatch(settings.theme);
        if (this.elements.themeAuto) {
            this.elements.themeAuto.checked = settings.autoTheme;
        }
        this._updateThemeAutoState();

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

        // Update content padding. On narrow screens the stored margin (up to
        // 400px) would swallow the reading column, so cap what actually gets
        // applied while keeping the user's setting intact.
        const content = document.querySelector('.ebook-text-content');
        if (content) {
            const vw = window.innerWidth || 1280;
            const cap = vw <= 768 ? 24 : Math.max(24, (vw - 320) / 2);
            content.style.paddingLeft = `${Math.min(left, cap)}px`;
            content.style.paddingRight = `${Math.min(right, cap)}px`;
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
    // KEYBOARD SHORTCUTS
    // ========================================

    /** @private */
    _setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const tag = (e.target.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'select' || tag === 'textarea' || e.target.isContentEditable) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;

            const area = document.querySelector('.ebook-reader-area');

            switch (e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    this._toggleFlowOrPlay();
                    break;
                case 'ArrowRight':
                case 'n':
                    e.preventDefault();
                    this.app.nextChapter();
                    break;
                case 'ArrowLeft':
                case 'p':
                    e.preventDefault();
                    this.app.previousChapter();
                    break;
                case 'ArrowDown':
                    if (area) { e.preventDefault(); area.scrollBy({ top: 120, behavior: 'smooth' }); }
                    break;
                case 'ArrowUp':
                    if (area) { e.preventDefault(); area.scrollBy({ top: -120, behavior: 'smooth' }); }
                    break;
                case 'PageDown':
                    if (area) { e.preventDefault(); area.scrollBy({ top: area.clientHeight * 0.9, behavior: 'smooth' }); }
                    break;
                case 'PageUp':
                    if (area) { e.preventDefault(); area.scrollBy({ top: -area.clientHeight * 0.9, behavior: 'smooth' }); }
                    break;
                case 'Escape':
                    if (this.app.getReaderState()?.mode === 'flow') {
                        e.preventDefault();
                        this.app.stopFlow();
                    } else {
                        this._closeDrawers();
                    }
                    break;
                case '+':
                case '=': {
                    const s = this.app.getCurrentSettings();
                    this.app.setFontSize(Math.min(48, (s.fontSize || 18) + 1));
                    setTimeout(() => this._syncUIWithSettings(), 0);
                    break;
                }
                case '-':
                case '_': {
                    const s = this.app.getCurrentSettings();
                    this.app.setFontSize(Math.max(12, (s.fontSize || 18) - 1));
                    setTimeout(() => this._syncUIWithSettings(), 0);
                    break;
                }
            }
        });
    }

    /** @private */
    _toggleFlowOrPlay() {
        const st = this.app.getReaderState();
        if (!st) return;
        if (st.mode === 'flow') {
            this.app.togglePlay();
        } else {
            this.app.startFlow();
        }
    }

    // ========================================
    // DRAG & DROP
    // ========================================

    /** @private */
    _setupDragAndDrop() {
        const overlay = this.elements.dropOverlay;
        if (!overlay) return;

        const hasFiles = (e) => {
            const t = e.dataTransfer && e.dataTransfer.types;
            return !!t && Array.prototype.indexOf.call(t, 'Files') !== -1;
        };

        let depth = 0;

        window.addEventListener('dragenter', (e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            depth++;
            overlay.hidden = false;
        });

        window.addEventListener('dragover', (e) => {
            if (hasFiles(e)) e.preventDefault();
        });

        window.addEventListener('dragleave', (e) => {
            if (!hasFiles(e)) return;
            depth = Math.max(0, depth - 1);
            if (depth === 0) overlay.hidden = true;
        });

        window.addEventListener('drop', (e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            depth = 0;
            overlay.hidden = true;

            const files = Array.from(e.dataTransfer.files || []);
            const epub = files.find(f => /\.epub$/i.test(f.name));
            if (epub) {
                this.app.loadEPUB(epub);
            } else if (files.length) {
                alert('Cheetah Reader opens .epub files. Use "Paste text" for anything else.');
            }
        });
    }

    // ========================================
    // READING PROGRESS
    // ========================================

    /** @private */
    _setupProgressTracking() {
        const attach = () => {
            const area = document.querySelector('.ebook-reader-area');
            if (!area) { setTimeout(attach, 200); return; }

            area.addEventListener('scroll', () => {
                this._updateProgress();
                this._flashLabel();
                if (!this._pendingRestore) this._saveProgressDebounced();
            }, { passive: true });

            window.addEventListener('resize', () => {
                this._updateProgress();
                this._updateMarginsUI();
            });
        };
        attach();
    }

    /** @private */
    _flashLabel() {
        const el = this.elements.readingProgress;
        if (!el) return;
        el.classList.add('show-label');
        clearTimeout(this._labelTimer);
        this._labelTimer = setTimeout(() => el.classList.remove('show-label'), 1400);
    }

    /** @private */
    _updateProgress() {
        const area = document.querySelector('.ebook-reader-area');
        const wrap = this.elements.readingProgress;
        if (!area || !wrap) return;

        const max = area.scrollHeight - area.clientHeight;
        const ratio = max > 0 ? Math.min(1, Math.max(0, area.scrollTop / max)) : 0;

        const chapters = (this.app.getChapters && this.app.getChapters()) || [];
        const idx = this.app.getCurrentChapterIndex ? this.app.getCurrentChapterIndex() : -1;

        let overall = ratio;
        let label = `${Math.round(ratio * 100)}%`;
        if (chapters.length > 0 && idx >= 0) {
            overall = (idx + ratio) / chapters.length;
            label = `Chapter ${idx + 1} of ${chapters.length} · ${Math.round(overall * 100)}%`;
        }

        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = (overall * 100).toFixed(1) + '%';
        }
        if (this.elements.progressLabel) {
            this.elements.progressLabel.textContent = label;
        }

        // Reveal the bar once there is something to scroll or chapters exist
        if (max > 24 || chapters.length > 0) wrap.hidden = false;
    }

    /** @private */
    _onChapterChanged(data) {
        const idx = data.index;

        if (this._pendingRestore && this._pendingRestore.chapterIndex !== idx && idx === 0) {
            // First chapter auto-loaded, but the reader has saved progress elsewhere.
            this.app.loadChapter(this._pendingRestore.chapterIndex);
            return;
        }

        if (this._pendingRestore && this._pendingRestore.chapterIndex === idx) {
            const ratio = this._pendingRestore.scrollRatio || 0;
            this._pendingRestore = null;
            this._restoreScroll(ratio);
        } else {
            // Genuine navigation - land at the top and record it
            this._restoreScroll(0, false);
            this._saveProgressNow(idx, 0);
        }

        setTimeout(() => this._updateProgress(), 350);
    }

    /** @private */
    _restoreScroll(ratio, smooth) {
        const apply = () => {
            const area = document.querySelector('.ebook-reader-area');
            if (!area) return;
            const max = area.scrollHeight - area.clientHeight;
            area.scrollTo({ top: ratio * max, behavior: smooth ? 'smooth' : 'auto' });
            this._updateProgress();
        };
        setTimeout(apply, 350);
        setTimeout(apply, 750); // fonts / images may reflow after first paint
    }

    /** @private */
    _makeBookId(meta) {
        const t = (meta && meta.title) || 'Unknown';
        const a = (meta && meta.author) || '';
        return `${t}|${a}`.slice(0, 200);
    }

    /** @private */
    _progressStore() {
        try {
            return JSON.parse(localStorage.getItem(this.PROGRESS_KEY)) || {};
        } catch (e) {
            return {};
        }
    }

    /** @private */
    _loadProgress(bookId) {
        if (!bookId) return null;
        const rec = this._progressStore()[bookId];
        if (!rec || typeof rec.chapterIndex !== 'number') return null;
        return { chapterIndex: rec.chapterIndex, scrollRatio: rec.scrollRatio || 0 };
    }

    /** @private */
    _saveProgressDebounced() {
        clearTimeout(this._progressSaveTimer);
        this._progressSaveTimer = setTimeout(() => {
            const area = document.querySelector('.ebook-reader-area');
            if (!area) return;
            const max = area.scrollHeight - area.clientHeight;
            const ratio = max > 0 ? area.scrollTop / max : 0;
            const idx = this.app.getCurrentChapterIndex ? this.app.getCurrentChapterIndex() : -1;
            this._saveProgressNow(idx, ratio);
        }, 500);
    }

    /** @private */
    _saveProgressNow(chapterIndex, scrollRatio) {
        if (!this._bookId || chapterIndex < 0) return;
        try {
            const store = this._progressStore();
            store[this._bookId] = {
                chapterIndex,
                scrollRatio: Math.min(1, Math.max(0, scrollRatio || 0)),
                updatedAt: Date.now()
            };
            // Cap the store so it can't grow forever
            const keys = Object.keys(store);
            if (keys.length > 40) {
                keys.sort((a, b) => (store[a].updatedAt || 0) - (store[b].updatedAt || 0))
                    .slice(0, keys.length - 40)
                    .forEach(k => delete store[k]);
            }
            localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(store));
        } catch (e) {
            /* storage full / disabled - progress is best-effort */
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
