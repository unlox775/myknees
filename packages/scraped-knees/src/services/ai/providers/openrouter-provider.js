const { OpenAICompatibleProvider } = require('./openai-base');

/**
 * OpenRouter Provider Implementation
 * 
 * Implements the OpenRouter API using the OpenAI-compatible base class.
 * OpenRouter follows OpenAI's API contract but requires additional headers.
 * 
 * @public - Used by AIManager to handle OpenRouter requests
 */
class OpenRouterProvider extends OpenAICompatibleProvider {
    constructor() {
        super('OpenRouter', 'openrouter', 'https://openrouter.ai/api/v1', 'anthropic/claude-3-haiku');
    }

    /**
     * Add OpenRouter-specific headers
     * 
     * @param {Object} headers - The headers object to modify
     * 
     * @protected - Override from base class for OpenRouter-specific headers
     */
    addProviderHeaders(headers) {
        headers['HTTP-Referer'] = chrome.runtime.getURL('');
        headers['X-Title'] = 'ScrapedKnees';
    }

    /**
     * @public - Used by options page for model selection
     */
    getAvailableModels() {
        return [
            { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', description: 'Fast and efficient' },
            { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet', description: 'Balanced performance' },
            { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', description: 'Most powerful model' },
            { id: 'openai/gpt-4o', name: 'GPT-4o (OpenAI)', description: 'Latest OpenAI model' },
            { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (OpenAI)', description: 'Efficient OpenAI model' },
            { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', description: 'Fast and reliable' },
            { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', description: 'Powerful and capable' }
        ];
    }
}

module.exports = { OpenRouterProvider };