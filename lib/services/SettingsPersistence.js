/**
 * SettingsPersistence v1.0.0
 * Manages saving and loading user settings from localStorage
 * 
 * @license MIT
 * @version 1.0.0
 */

class SettingsPersistence {
    constructor(stateManager, storageKey = 'cheetah-reader-settings') {
        this.stateManager = stateManager;
        this.storageKey = storageKey;
        
        // Define which settings should be persisted
        this.persistedKeys = [
            'fontSize',
            'font',
            'lineHeight',
            'theme',
            'autoTheme',
            'marginL',
            'marginR',
            'bionic',
            'bionicStrength',
            'flow.speed',
            'flow.focusWidth',
            'flow.scrollLevel'
        ];
        
        this.saveTimeout = null;
        this.saveDelay = 300; // Debounce saves by 300ms
    }

    /**
     * Load settings from localStorage and apply to state
     * @returns {Object} Loaded settings object
     */
    loadSettings() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored) {
                console.log('📦 No saved settings found');
                return null;
            }

            const settings = JSON.parse(stored);
            console.log('📦 Loaded settings from localStorage:', settings);

            // Apply each setting to state (silently to avoid triggering saves)
            for (const key of this.persistedKeys) {
                if (this._hasNestedKey(settings, key)) {
                    const value = this._getNestedValue(settings, key);
                    this.stateManager.set(key, value, true); // true = silent
                }
            }

            return settings;
        } catch (error) {
            console.error('❌ Failed to load settings from localStorage:', error);
            return null;
        }
    }

    /**
     * Save current settings to localStorage
     */
    saveSettings() {
        // Debounce saves to avoid excessive writes
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        this.saveTimeout = setTimeout(() => {
            try {
                const settings = {};

                // Collect current values for all persisted keys
                for (const key of this.persistedKeys) {
                    const value = this.stateManager.get(key);
                    this._setNestedValue(settings, key, value);
                }

                localStorage.setItem(this.storageKey, JSON.stringify(settings));
                console.log('💾 Saved settings to localStorage');
            } catch (error) {
                console.error('❌ Failed to save settings to localStorage:', error);
            }
        }, this.saveDelay);
    }

    /**
     * Setup automatic saving when settings change
     */
    enableAutoSave() {
        // Subscribe to all persisted keys
        for (const key of this.persistedKeys) {
            this.stateManager.subscribe(key, () => {
                this.saveSettings();
            });
        }
        console.log('✅ Auto-save enabled for user settings');
    }

    /**
     * Clear all saved settings
     */
    clearSettings() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('🗑️ Cleared saved settings');
        } catch (error) {
            console.error('❌ Failed to clear settings:', error);
        }
    }

    /**
     * Export settings as JSON string
     * @returns {string} JSON string of current settings
     */
    exportSettings() {
        const settings = {};
        for (const key of this.persistedKeys) {
            const value = this.stateManager.get(key);
            this._setNestedValue(settings, key, value);
        }
        return JSON.stringify(settings, null, 2);
    }

    /**
     * Import settings from JSON string
     * @param {string} jsonString - JSON string of settings
     * @returns {boolean} Success status
     */
    importSettings(jsonString) {
        try {
            const settings = JSON.parse(jsonString);
            
            for (const key of this.persistedKeys) {
                if (this._hasNestedKey(settings, key)) {
                    const value = this._getNestedValue(settings, key);
                    this.stateManager.set(key, value);
                }
            }
            
            this.saveSettings();
            console.log('📥 Imported settings successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to import settings:', error);
            return false;
        }
    }

    // ========================================
    // PRIVATE HELPER METHODS
    // ========================================

    /**
     * Check if nested key exists in object
     * @private
     */
    _hasNestedKey(obj, path) {
        const keys = path.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current === null || current === undefined || !(key in current)) {
                return false;
            }
            current = current[key];
        }
        
        return true;
    }

    /**
     * Get nested value from object using dot notation
     * @private
     */
    _getNestedValue(obj, path) {
        const keys = path.split('.');
        let value = obj;
        
        for (const key of keys) {
            if (value === null || value === undefined) return undefined;
            value = value[key];
        }
        
        return value;
    }

    /**
     * Set nested value in object using dot notation
     * @private
     */
    _setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        let current = obj;
        for (const key of keys) {
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[lastKey] = value;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsPersistence;
}
if (typeof window !== 'undefined') {
    window.SettingsPersistence = SettingsPersistence;
}
