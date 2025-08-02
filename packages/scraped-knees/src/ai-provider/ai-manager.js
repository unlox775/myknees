const { OpenAIProvider } = require('./providers/openai-provider');
const { GroqProvider } = require('./providers/groq-provider');
const { OpenRouterProvider } = require('./providers/openrouter-provider');
const { AnthropicProvider } = require('./providers/anthropic-provider');
const { SettingsStorage } = require('./storage/settings-storage');
const { UsageStorage } = require('./storage/usage-storage');

/**
 * AI Manager Service
 * 
 * Main service for managing AI providers and handling AI requests.
 * This is the primary interface for external services that need AI capabilities.
 * 
 * External services should only use the public methods marked with @public.
 * 
 * @public - Main interface for external services to interact with AI providers
 */
class AIManager {
    constructor() {
        this.settingsStorage = new SettingsStorage();
        this.usageStorage = new UsageStorage();
        
        // Initialize provider registry
        this.providers = {
            openai: new OpenAIProvider(),
            groq: new GroqProvider(),
            openrouter: new OpenRouterProvider(),
            anthropic: new AnthropicProvider()
        };
        
        this.settings = null;
    }

    /**
     * Initialize the AI Manager
     * 
     * Loads settings and optionally checks status if auto-check is enabled.
     * This method is called automatically when the service starts.
     * 
     * @param {boolean} checkStatus - Whether to check status after initialization
     * @returns {Promise<void>}
     * 
     * @public - Used by background script to initialize the service
     */
    async initialize(checkStatus = false) {
        try {
            this.settings = await this.settingsStorage.loadSettings();
            
            if (checkStatus && this.settings.autoCheckStatus && this.settings.selectedProvider) {
                await this.checkStatus();
            }
        } catch (error) {
            console.error('Error initializing AI Manager:', error);
        }
    }

    /**
     * Check if AI is ready for use
     * 
     * @returns {Promise<{ready: boolean, provider: string|null, error?: string}>}
     * 
     * @public - Used by external services to check if they can make AI requests
     */
    async isReady() {
        if (!this.settings) {
            await this.initialize();
        }

        if (!this.settings.selectedProvider) {
            return { ready: false, provider: null, error: 'No provider selected' };
        }

        const apiKey = this.settings.apiKeys[this.settings.selectedProvider];
        if (!apiKey) {
            return { 
                ready: false, 
                provider: this.settings.selectedProvider, 
                error: 'No API key configured' 
            };
        }

        return { ready: true, provider: this.settings.selectedProvider };
    }

    /**
     * Send a prompt to the currently configured AI provider
     * 
     * @param {string} prompt - The prompt to send
     * @param {Object} context - Additional context data
     * @returns {Promise<{success: boolean, response?: string, error?: string}>}
     * 
     * @public - Main interface for external services to send prompts
     */
    async sendPrompt(prompt, context = {}) {
        const readyCheck = await this.isReady();
        if (!readyCheck.ready) {
            return { success: false, error: readyCheck.error };
        }

        const provider = this.providers[readyCheck.provider];
        const apiKey = this.settings.apiKeys[readyCheck.provider];
        const model = this.settings.selectedModels?.[readyCheck.provider] || provider.defaultModel;

        try {
            // Log the request
            await this.usageStorage.logRequest(readyCheck.provider, model, { prompt, context }, { status: 'pending' }, true);
            
            const result = await provider.sendPrompt(prompt, context, apiKey, model);
            
            // Update usage stats if successful
            if (result.success) {
                await this.usageStorage.updateUsageStats(readyCheck.provider, 1, model);
            }
            
            // Update the log with the actual response
            await this.usageStorage.logRequest(readyCheck.provider, model, { prompt, context }, result, result.success);
            
            return result;
        } catch (error) {
            const errorResult = { success: false, error: error.message };
            await this.usageStorage.logRequest(readyCheck.provider, model, { prompt, context }, errorResult, false);
            return errorResult;
        }
    }

    /**
     * Test connection to the currently configured provider
     * 
     * @returns {Promise<{success: boolean, error?: string}>}
     * 
     * @public - Used by options page for connection testing
     */
    async testConnection() {
        const readyCheck = await this.isReady();
        if (!readyCheck.ready) {
            return { success: false, error: readyCheck.error };
        }

        const provider = this.providers[readyCheck.provider];
        const apiKey = this.settings.apiKeys[readyCheck.provider];

        try {
            const result = await provider.testConnection(apiKey);
            
            if (result.success) {
                await this.usageStorage.updateUsageStats(readyCheck.provider, 1);
            }
            
            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Check the status of the currently configured provider
     * 
     * @returns {Promise<{isReady: boolean, provider: string|null, error?: string, lastChecked: number}>}
     * 
     * @public - Used by options page and popup to display status
     */
    async checkStatus() {
        const readyCheck = await this.isReady();
        
        if (!readyCheck.ready) {
            const status = {
                isReady: false,
                provider: readyCheck.provider,
                error: readyCheck.error,
                lastChecked: Date.now()
            };
            
            await this.usageStorage.saveAIStatus(status);
            return status;
        }

        try {
            const testResult = await this.testConnection();
            
            const status = {
                isReady: testResult.success,
                provider: readyCheck.provider,
                error: testResult.error,
                lastChecked: Date.now()
            };
            
            await this.usageStorage.saveAIStatus(status);
            return status;
        } catch (error) {
            const status = {
                isReady: false,
                provider: readyCheck.provider,
                error: error.message,
                lastChecked: Date.now()
            };
            
            await this.usageStorage.saveAIStatus(status);
            return status;
        }
    }

    /**
     * Get all available providers
     * 
     * @returns {Array<{id: string, name: string}>}
     * 
     * @public - Used by options page for provider selection
     */
    getProviders() {
        return Object.values(this.providers).map(provider => ({
            id: provider.getId(),
            name: provider.getName()
        }));
    }

    /**
     * Get available models for a specific provider
     * 
     * @param {string} providerId - The provider ID
     * @returns {Array<{id: string, name: string, description?: string}>}
     * 
     * @public - Used by options page for model selection
     */
    getModels(providerId) {
        const provider = this.providers[providerId];
        if (!provider) {
            return [];
        }
        return provider.getAvailableModels();
    }

    /**
     * Get current settings
     * 
     * @returns {Promise<Object>} The current settings
     * 
     * @public - Used by options page to display current settings
     */
    async getSettings() {
        if (!this.settings) {
            await this.initialize();
        }
        return { ...this.settings };
    }

    /**
     * Get usage statistics
     * 
     * @returns {Promise<Object>} The usage statistics
     * 
     * @public - Used by debug mode to display usage stats
     */
    async getUsageStats() {
        return await this.usageStorage.getUsageStats();
    }

    /**
     * Get request log
     * 
     * @returns {Promise<Array>} The request log entries
     * 
     * @public - Used by debug mode to display request logs
     */
    async getRequestLog() {
        return await this.usageStorage.getRequestLog();
    }

    /**
     * Get cached AI status
     * 
     * @returns {Promise<Object|null>} The cached status
     * 
     * @public - Used by options page to display cached status
     */
    async getCachedStatus() {
        return await this.usageStorage.getAIStatus();
    }

    // ===== PRIVATE METHODS (Internal use only) =====

    /**
     * @private - Internal method for updating settings
     */
    async _updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        await this.settingsStorage.saveSettings(this.settings);
    }

    /**
     * @private - Internal method for setting a specific setting
     */
    async _setSetting(key, value) {
        if (!this.settings) {
            await this.initialize();
        }
        
        this.settings[key] = value;
        await this.settingsStorage.setSetting(key, value);
    }
}

module.exports = { AIManager };