const { AIProvider } = require('../interfaces/ai-provider');

/**
 * Anthropic Provider Implementation
 * 
 * Implements the Anthropic Claude API which has a different contract than OpenAI.
 * Anthropic uses a different endpoint structure and message format.
 * 
 * @public - Used by AIManager to handle Anthropic requests
 */
class AnthropicProvider extends AIProvider {
    constructor() {
        super();
        this.name = 'Anthropic Claude';
        this.id = 'anthropic';
        this.baseUrl = 'https://api.anthropic.com/v1';
        this.defaultModel = 'claude-3-5-sonnet-20241022';
    }

    /**
     * @public
     */
    getName() {
        return this.name;
    }

    /**
     * @public
     */
    getId() {
        return this.id;
    }

    /**
     * Test connection using Anthropic API
     * 
     * @param {string} apiKey - The API key for the provider
     * @returns {Promise<{success: boolean, error?: string}>}
     * 
     * @public - Used by options page for connection testing
     */
    async testConnection(apiKey) {
        try {
            const testPrompt = 'Hello! This is a connection test from ScrapedKnees.';
            const response = await this.makeRequest(apiKey, this.defaultModel, testPrompt, 10);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return this.parseError(response.status, errorData);
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Send a prompt using Anthropic API
     * 
     * @param {string} prompt - The prompt to send
     * @param {Object} context - Additional context data
     * @param {string} apiKey - The API key
     * @param {string} model - The model to use
     * @returns {Promise<{success: boolean, response?: string, error?: string}>}
     * 
     * @public - Main interface for external services to send prompts
     */
    async sendPrompt(prompt, context, apiKey, model) {
        try {
            const fullPrompt = this.buildPrompt(prompt, context);
            const response = await this.makeRequest(apiKey, model, fullPrompt);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return this.parseError(response.status, errorData);
            }

            const data = await response.json();
            return {
                success: true,
                response: data.content?.[0]?.text || 'No response content'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Make the actual HTTP request to Anthropic API
     * 
     * @param {string} apiKey - The API key
     * @param {string} model - The model to use
     * @param {string} prompt - The prompt to send
     * @param {number} maxTokens - Maximum tokens to generate
     * @returns {Promise<Response>}
     * 
     * @private - Internal implementation detail
     */
    async makeRequest(apiKey, model, prompt, maxTokens = 1000) {
        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
        };

        const body = {
            model: model,
            max_tokens: maxTokens,
            messages: [{ role: 'user', content: prompt }]
        };

        return fetch(`${this.baseUrl}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
    }

    /**
     * Build the full prompt from the base prompt and context
     * 
     * @param {string} prompt - The base prompt
     * @param {Object} context - Additional context
     * @returns {string} - The full prompt
     * 
     * @private - Internal implementation detail
     */
    buildPrompt(prompt, context) {
        if (!context || Object.keys(context).length === 0) {
            return prompt;
        }

        const contextStr = JSON.stringify(context, null, 2);
        return `${prompt}\n\nContext:\n${contextStr}`;
    }

    /**
     * Parse API errors into user-friendly messages
     * 
     * @param {number} status - HTTP status code
     * @param {Object} errorData - Error response data
     * @returns {{success: boolean, error: string}}
     * 
     * @private - Internal implementation detail
     */
    parseError(status, errorData) {
        let errorMessage = 'API error';
        
        if (status === 401) errorMessage = 'Invalid API key';
        else if (status === 403) errorMessage = 'API key does not have required permissions';
        else if (status === 429) errorMessage = 'Rate limit exceeded';
        else if (status === 402) errorMessage = 'Billing issue';
        else if (status >= 500) errorMessage = 'Service temporarily unavailable';
        else if (errorData.error?.message) errorMessage = errorData.error.message;
        else errorMessage = `API error (${status})`;
        
        return { success: false, error: errorMessage };
    }

    /**
     * @public - Used by options page for model selection
     */
    getAvailableModels() {
        return [
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Latest and most capable model' },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most powerful model' },
            { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance' }
        ];
    }
}

module.exports = { AnthropicProvider };