const { OpenAICompatibleProvider } = require('./openai-base');

/**
 * Groq Provider Implementation
 * 
 * Implements the Groq API using the OpenAI-compatible base class.
 * Groq follows OpenAI's API contract, so we can extend the base class.
 * 
 * @public - Used by AIManager to handle Groq requests
 */
class GroqProvider extends OpenAICompatibleProvider {
    constructor() {
        super('Groq', 'groq', 'https://api.groq.com/openai/v1', 'llama3-8b-8192');
    }

    /**
     * @public - Used by options page for model selection
     */
    getAvailableModels() {
        return [
            { id: 'llama3-8b-8192', name: 'Llama3-8b-8192', description: 'Fast and efficient' },
            { id: 'llama3-70b-8192', name: 'Llama3-70b-8192', description: 'Balanced performance' },
            { id: 'mixtral-8x7b-32768', name: 'Mixtral-8x7b-32768', description: 'Powerful and capable' },
            { id: 'gemma2-9b-it', name: 'Gemma2-9b-it', description: 'Efficient and reliable' }
        ];
    }
}

module.exports = { GroqProvider };