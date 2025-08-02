/**
 * Base AI Provider Interface
 * 
 * This interface defines the contract that all AI providers must implement.
 * External services should only use the public methods defined here.
 * 
 * @interface AIProvider
 */
class AIProvider {
    /**
     * Test the connection to the AI provider's API
     * 
     * @param {string} apiKey - The API key for the provider
     * @returns {Promise<{success: boolean, error?: string}>}
     * 
     * @public - Used by options page for connection testing
     */
    async testConnection(apiKey) {
        throw new Error('testConnection must be implemented by provider');
    }

    /**
     * Send a prompt to the AI provider and get a response
     * 
     * @param {string} prompt - The prompt to send to the AI
     * @param {Object} context - Additional context data
     * @param {string} apiKey - The API key for the provider
     * @param {string} model - The model to use
     * @returns {Promise<{success: boolean, response?: string, error?: string}>}
     * 
     * @public - Main interface for external services to send prompts
     */
    async sendPrompt(prompt, context, apiKey, model) {
        throw new Error('sendPrompt must be implemented by provider');
    }

    /**
     * Get the list of available models for this provider
     * 
     * @returns {Array<{id: string, name: string, description?: string}>}
     * 
     * @public - Used by options page for model selection
     */
    getAvailableModels() {
        throw new Error('getAvailableModels must be implemented by provider');
    }

    /**
     * Get the provider name
     * 
     * @returns {string}
     * 
     * @public - Used for display purposes
     */
    getName() {
        throw new Error('getName must be implemented by provider');
    }

    /**
     * Get the provider ID
     * 
     * @returns {string}
     * 
     * @public - Used for identification
     */
    getId() {
        throw new Error('getId must be implemented by provider');
    }
}

module.exports = { AIProvider };