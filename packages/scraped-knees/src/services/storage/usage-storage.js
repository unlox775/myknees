/**
 * Usage Storage Service
 * 
 * Handles usage tracking and request logging for AI providers.
 * This service manages usage statistics and request logs separately
 * from settings to avoid cluttering the settings storage.
 * 
 * @public - Used by AIManager for usage tracking and debug mode
 */
class UsageStorage {
    constructor() {
        this.usageKey = 'usageStats';
        this.logKey = 'requestLog';
        this.statusKey = 'aiStatus';
    }

    /**
     * Update usage statistics for a provider
     * 
     * @param {string} provider - The provider ID
     * @param {number} requests - Number of requests to add
     * @param {string} model - The model used (optional)
     * @returns {Promise<void>}
     * 
     * @public - Used by AIManager to track usage
     */
    async updateUsageStats(provider, requests = 1, model = null) {
        try {
            const { [this.usageKey]: usageStats } = await chrome.storage.local.get([this.usageKey]);
            const currentStats = usageStats || {};
            
            if (!currentStats[provider]) {
                currentStats[provider] = { requests: 0, tokens: 0, lastUsed: null, models: {} };
            }
            
            currentStats[provider].requests += requests;
            currentStats[provider].lastUsed = Date.now();
            
            if (model) {
                if (!currentStats[provider].models[model]) {
                    currentStats[provider].models[model] = { requests: 0, lastUsed: null };
                }
                currentStats[provider].models[model].requests += requests;
                currentStats[provider].models[model].lastUsed = Date.now();
            }
            
            await chrome.storage.local.set({ [this.usageKey]: currentStats });
        } catch (error) {
            console.error('Error updating usage stats:', error);
        }
    }

    /**
     * Get usage statistics
     * 
     * @returns {Promise<Object>} The usage statistics
     * 
     * @public - Used by debug mode to display usage stats
     */
    async getUsageStats() {
        try {
            const { [this.usageKey]: usageStats } = await chrome.storage.local.get([this.usageKey]);
            return usageStats || {};
        } catch (error) {
            console.error('Error getting usage stats:', error);
            return {};
        }
    }

    /**
     * Log a request/response pair
     * 
     * @param {string} provider - The provider ID
     * @param {string} model - The model used
     * @param {Object} request - The request data
     * @param {Object} response - The response data
     * @param {boolean} success - Whether the request was successful
     * @returns {Promise<void>}
     * 
     * @public - Used by AIManager to log requests for debug mode
     */
    async logRequest(provider, model, request, response, success = true) {
        try {
            const { [this.logKey]: requestLog } = await chrome.storage.local.get([this.logKey]);
            const log = requestLog || [];
            
            const logEntry = {
                timestamp: Date.now(),
                provider,
                model,
                request: JSON.stringify(request, null, 2),
                response: JSON.stringify(response, null, 2),
                success
            };
            
            log.unshift(logEntry); // Add to beginning
            
            // Keep only last 50 entries
            if (log.length > 50) {
                log.splice(50);
            }
            
            await chrome.storage.local.set({ [this.logKey]: log });
        } catch (error) {
            console.error('Error logging request:', error);
        }
    }

    /**
     * Get the request log
     * 
     * @returns {Promise<Array>} The request log entries
     * 
     * @public - Used by debug mode to display request logs
     */
    async getRequestLog() {
        try {
            const { [this.logKey]: requestLog } = await chrome.storage.local.get([this.logKey]);
            return requestLog || [];
        } catch (error) {
            console.error('Error getting request log:', error);
            return [];
        }
    }

    /**
     * Save AI status information
     * 
     * @param {Object} status - The status data to save
     * @returns {Promise<void>}
     * 
     * @public - Used by AIManager to persist status
     */
    async saveAIStatus(status) {
        try {
            await chrome.storage.local.set({ [this.statusKey]: status });
        } catch (error) {
            console.error('Error saving AI status:', error);
        }
    }

    /**
     * Get AI status information
     * 
     * @returns {Promise<Object|null>} The saved status or null
     * 
     * @public - Used by AIManager to get cached status
     */
    async getAIStatus() {
        try {
            const { [this.statusKey]: aiStatus } = await chrome.storage.local.get([this.statusKey]);
            return aiStatus || null;
        } catch (error) {
            console.error('Error getting AI status:', error);
            return null;
        }
    }

    /**
     * Clear all usage data
     * 
     * @returns {Promise<void>}
     * 
     * @public - Used for cleanup or reset functionality
     */
    async clearUsageData() {
        try {
            await chrome.storage.local.remove([this.usageKey, this.logKey, this.statusKey]);
        } catch (error) {
            console.error('Error clearing usage data:', error);
        }
    }
}

module.exports = { UsageStorage };