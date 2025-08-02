/**
 * Settings Storage Service
 * 
 * Handles all settings persistence for the extension.
 * This service abstracts away the Chrome storage API and provides
 * a clean interface for storing and retrieving settings.
 * 
 * @public - Used by AIManager and options page for settings management
 */
class SettingsStorage {
    constructor() {
        this.defaultSettings = {
            selectedProvider: null,
            apiKeys: {},
            selectedModels: {},
            autoCheckStatus: true,
            debugMode: false
        };
    }

    /**
     * Load all settings from Chrome storage
     * 
     * @returns {Promise<Object>} The loaded settings
     * 
     * @public - Used by AIManager and options page to load settings
     */
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(this.defaultSettings);
            return { ...this.defaultSettings, ...result };
        } catch (error) {
            console.error('Error loading settings:', error);
            return { ...this.defaultSettings };
        }
    }

    /**
     * Save settings to Chrome storage
     * 
     * @param {Object} settings - The settings to save
     * @returns {Promise<void>}
     * 
     * @public - Used by options page to save settings
     */
    async saveSettings(settings) {
        try {
            await chrome.storage.sync.set(settings);
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    }

    /**
     * Get a specific setting value
     * 
     * @param {string} key - The setting key
     * @param {*} defaultValue - Default value if not found
     * @returns {Promise<*>} The setting value
     * 
     * @public - Used by AIManager to get specific settings
     */
    async getSetting(key, defaultValue = null) {
        try {
            const result = await chrome.storage.sync.get({ [key]: defaultValue });
            return result[key];
        } catch (error) {
            console.error(`Error getting setting ${key}:`, error);
            return defaultValue;
        }
    }

    /**
     * Set a specific setting value
     * 
     * @param {string} key - The setting key
     * @param {*} value - The value to set
     * @returns {Promise<void>}
     * 
     * @public - Used by AIManager to update specific settings
     */
    async setSetting(key, value) {
        try {
            await chrome.storage.sync.set({ [key]: value });
        } catch (error) {
            console.error(`Error setting ${key}:`, error);
            throw error;
        }
    }

    /**
     * Clear all settings and reset to defaults
     * 
     * @returns {Promise<void>}
     * 
     * @public - Used by options page for reset functionality
     */
    async clearSettings() {
        try {
            await chrome.storage.sync.clear();
        } catch (error) {
            console.error('Error clearing settings:', error);
            throw error;
        }
    }
}

module.exports = { SettingsStorage };