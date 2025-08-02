const { OpenAICompatibleProvider } = require('./openai-base');

/**
 * OpenAI Provider Implementation
 * 
 * Implements the OpenAI API using the OpenAI-compatible base class.
 * 
 * @public - Used by AIManager to handle OpenAI requests
 */
class OpenAIProvider extends OpenAICompatibleProvider {
    constructor() {
        super('OpenAI', 'openai', 'https://api.openai.com/v1', 'gpt-4o');
    }

    /**
     * @public - Used by options page for model selection
     */
    getAvailableModels() {
        return [
            { id: 'gpt-4o', name: 'GPT-4o', description: 'Latest and most capable model' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Efficient and cost-effective' },
            { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and reliable' }
        ];
    }
}

module.exports = { OpenAIProvider };