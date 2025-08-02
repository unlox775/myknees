const { AIProvider } = require('../interfaces/ai-provider');

/**
 * Base OpenAI-Compatible Provider
 * 
 * Most AI providers (OpenAI, Groq, OpenRouter) follow OpenAI's API contract.
 * This base class implements the common functionality that these providers share.
 * 
 * @abstract
 */
class OpenAICompatibleProvider extends AIProvider {
    constructor(name, id, baseUrl, defaultModel) {
        super();
        this.name = name;
        this.id = id;
        this.baseUrl = baseUrl;
        this.defaultModel = defaultModel;
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
     * Test connection using OpenAI-compatible API
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
     * Send a prompt using OpenAI-compatible API
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
                response: data.choices?.[0]?.message?.content || 'No response content'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Make the actual HTTP request to the provider
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
            'Content-Type': 'application/json'
        };

        // Add provider-specific headers
        this.addProviderHeaders(headers);

        const body = {
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens
        };

        return fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
    }

    /**
     * Add provider-specific headers to the request
     * 
     * @param {Object} headers - The headers object to modify
     * 
     * @protected - Override in subclasses for provider-specific headers
     */
    addProviderHeaders(headers) {
        // Base implementation - no additional headers
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
}

module.exports = { OpenAICompatibleProvider };