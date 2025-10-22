/**
 * StateManager v1.0.0
 * Single source of truth for application state
 * Implements Observer pattern for reactive state updates
 * 
 * @license MIT
 * @version 1.0.0
 */

class StateManager {
    constructor(initialState = {}) {
        // Internal state storage
        this._state = { ...initialState };
        
        // Subscribers organized by state key
        // { fontSize: [callback1, callback2], theme: [callback3], ... }
        this._subscribers = {};
        
        // Global subscribers (notified on any state change)
        this._globalSubscribers = [];
        
        // State change history (useful for debugging)
        this._history = [];
        this._maxHistory = 50;
    }

    /**
     * Get a state value
     * @param {string} key - State key (supports dot notation: 'flow.speed')
     * @returns {*} The state value
     */
    get(key) {
        if (!key) return { ...this._state };
        
        // Support dot notation: 'flow.speed'
        const keys = key.split('.');
        let value = this._state;
        
        for (const k of keys) {
            if (value === null || value === undefined) return undefined;
            value = value[k];
        }
        
        return value;
    }

    /**
     * Set a state value and notify subscribers
     * @param {string} key - State key (supports dot notation)
     * @param {*} value - New value
     * @param {boolean} silent - If true, don't notify subscribers
     */
    set(key, value, silent = false) {
        if (!key) {
            throw new Error('StateManager.set() requires a key');
        }
        
        const oldValue = this.get(key);
        
        // Support dot notation: 'flow.speed'
        const keys = key.split('.');
        const lastKey = keys.pop();
        
        let target = this._state;
        for (const k of keys) {
            if (!(k in target)) {
                target[k] = {};
            }
            target = target[k];
        }
        
        // Set the value
        target[lastKey] = value;
        
        // Record in history
        this._recordChange(key, oldValue, value);
        
        // Notify subscribers unless silent
        if (!silent) {
            this._notify(key, value, oldValue);
        }
    }

    /**
     * Update multiple state values at once
     * @param {Object} updates - Object with key-value pairs to update
     * @param {boolean} silent - If true, don't notify subscribers
     */
    update(updates, silent = false) {
        if (typeof updates !== 'object' || updates === null) {
            throw new Error('StateManager.update() requires an object');
        }
        
        for (const [key, value] of Object.entries(updates)) {
            this.set(key, value, silent);
        }
    }

    /**
     * Subscribe to state changes
     * @param {string|Array<string>} keys - State key(s) to watch, or '*' for all changes
     * @param {Function} callback - Called when state changes: callback(newValue, oldValue, key)
     * @returns {Function} Unsubscribe function
     */
    subscribe(keys, callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        
        // Handle global subscription
        if (keys === '*') {
            this._globalSubscribers.push(callback);
            return () => {
                const index = this._globalSubscribers.indexOf(callback);
                if (index > -1) {
                    this._globalSubscribers.splice(index, 1);
                }
            };
        }
        
        // Normalize to array
        const keyArray = Array.isArray(keys) ? keys : [keys];
        
        // Add callback to each key's subscriber list
        for (const key of keyArray) {
            if (!this._subscribers[key]) {
                this._subscribers[key] = [];
            }
            this._subscribers[key].push(callback);
        }
        
        // Return unsubscribe function
        return () => {
            for (const key of keyArray) {
                if (this._subscribers[key]) {
                    const index = this._subscribers[key].indexOf(callback);
                    if (index > -1) {
                        this._subscribers[key].splice(index, 1);
                    }
                }
            }
        };
    }

    /**
     * Subscribe to a single state change (fires once, then unsubscribes)
     * @param {string} key - State key to watch
     * @param {Function} callback - Called once when state changes
     */
    once(key, callback) {
        const unsubscribe = this.subscribe(key, (newValue, oldValue, changedKey) => {
            callback(newValue, oldValue, changedKey);
            unsubscribe();
        });
        return unsubscribe;
    }

    /**
     * Check if a state key exists
     * @param {string} key - State key
     * @returns {boolean}
     */
    has(key) {
        return this.get(key) !== undefined;
    }

    /**
     * Delete a state key
     * @param {string} key - State key
     * @param {boolean} silent - If true, don't notify subscribers
     */
    delete(key, silent = false) {
        if (!key) return;
        
        const oldValue = this.get(key);
        
        const keys = key.split('.');
        const lastKey = keys.pop();
        
        let target = this._state;
        for (const k of keys) {
            if (!(k in target)) return;
            target = target[k];
        }
        
        delete target[lastKey];
        
        this._recordChange(key, oldValue, undefined);
        
        if (!silent) {
            this._notify(key, undefined, oldValue);
        }
    }

    /**
     * Reset state to initial values
     * @param {Object} newState - New state object (optional)
     * @param {boolean} silent - If true, don't notify subscribers
     */
    reset(newState = {}, silent = false) {
        const oldState = { ...this._state };
        this._state = { ...newState };
        this._history = [];
        
        if (!silent) {
            // Notify all subscribers
            for (const key in oldState) {
                this._notify(key, this._state[key], oldState[key]);
            }
            for (const key in this._state) {
                if (!(key in oldState)) {
                    this._notify(key, this._state[key], undefined);
                }
            }
        }
    }

    /**
     * Get entire state as plain object (deep copy)
     * @returns {Object}
     */
    getAll() {
        return JSON.parse(JSON.stringify(this._state));
    }

    /**
     * Get state change history
     * @param {number} limit - Max number of history items to return
     * @returns {Array}
     */
    getHistory(limit = 10) {
        return this._history.slice(-limit);
    }

    /**
     * Clear state change history
     */
    clearHistory() {
        this._history = [];
    }

    // ========================================
    // PRIVATE METHODS
    // ========================================

    /**
     * Notify subscribers of a state change
     * @private
     */
    _notify(key, newValue, oldValue) {
        // Notify specific key subscribers
        if (this._subscribers[key]) {
            for (const callback of this._subscribers[key]) {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error(`Error in StateManager subscriber for "${key}":`, error);
                }
            }
        }
        
        // Notify global subscribers
        for (const callback of this._globalSubscribers) {
            try {
                callback(newValue, oldValue, key);
            } catch (error) {
                console.error('Error in StateManager global subscriber:', error);
            }
        }
    }

    /**
     * Record a state change in history
     * @private
     */
    _recordChange(key, oldValue, newValue) {
        this._history.push({
            timestamp: Date.now(),
            key,
            oldValue,
            newValue
        });
        
        // Limit history size
        if (this._history.length > this._maxHistory) {
            this._history.shift();
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateManager;
}
if (typeof window !== 'undefined') {
    window.StateManager = StateManager;
}
