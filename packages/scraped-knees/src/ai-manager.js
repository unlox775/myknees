// AI Manager - Core AI provider foundation for ScrapedKnees

class AIManager {
  constructor() {
    this.defaultOptions = {
      selectedProvider: null,
      apiKeys: {},
      selectedModels: {},
      autoCheckStatus: true,
      debugMode: false
    };

    this.providers = {
      groq: {
        name: 'Groq',
        baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
        models: [
          { id: 'llama3-8b-8192', name: 'Llama3-8b-8192 (Fast)' },
          { id: 'llama3-70b-8192', name: 'Llama3-70b-8192 (Balanced)' },
          { id: 'mixtral-8x7b-32768', name: 'Mixtral-8x7b-32768 (Powerful)' }
        ]
      },
      openrouter: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        models: [
          { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku (Fast)' },
          { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet (Balanced)' },
          { id: 'openai/gpt-4o', name: 'GPT-4o (OpenAI)' },
          { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini (Efficient)' }
        ]
      },
      openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        models: [
          { id: 'gpt-4o', name: 'GPT-4o (Latest)' },
          { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Efficient)' },
          { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Fast)' }
        ]
      },
      anthropic: {
        name: 'Anthropic Claude',
        baseUrl: 'https://api.anthropic.com/v1/messages',
        models: [
          { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Latest)' },
          { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Powerful)' },
          { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet (Balanced)' }
        ]
      }
    };
    
    this.settings = null;
    this.status = {
      isReady: false,
      provider: null,
      error: null,
      lastChecked: null
    };
  }

  async initialize() {
    await this.loadSettings();
    await this.checkStatus();
  }

  async loadSettings() {
    try {
      this.settings = await chrome.storage.sync.get(this.defaultOptions);
    } catch (error) {
      console.error('Error loading AI settings:', error);
      this.settings = { ...this.defaultOptions };
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set(this.settings);
    } catch (error) {
      console.error('Error saving AI settings:', error);
      throw error;
    }
  }

  async isReady() {
    if (!this.settings.selectedProvider) {
      return { ready: false, error: 'No AI provider selected', provider: null };
    }

    if (!this.settings.apiKeys[this.settings.selectedProvider]) {
      return { ready: false, error: 'No API key configured', provider: this.settings.selectedProvider };
    }

    const now = Date.now();
    const lastChecked = this.status.lastChecked || 0;
    const checkInterval = 5 * 60 * 1000; // 5 minutes

    if (now - lastChecked > checkInterval) {
      await this.checkStatus();
    }

    return {
      ready: this.status.isReady,
      error: this.status.error,
      provider: this.settings.selectedProvider
    };
  }

  async checkStatus() {
    if (!this.settings.selectedProvider) {
      this.status = {
        isReady: false,
        provider: null,
        error: 'No provider selected',
        lastChecked: Date.now()
      };
      return this.status;
    }

    const provider = this.settings.selectedProvider;
    const apiKey = this.settings.apiKeys[provider];

    if (!apiKey) {
      this.status = {
        isReady: false,
        provider,
        error: 'No API key configured',
        lastChecked: Date.now()
      };
      return this.status;
    }

    try {
      const testResult = await this.testConnection(provider, apiKey);
      this.status = {
        isReady: testResult.success,
        provider,
        error: testResult.error,
        lastChecked: Date.now()
      };
    } catch (error) {
      this.status = {
        isReady: false,
        provider,
        error: error.message,
        lastChecked: Date.now()
      };
    }

    return this.status;
  }

  async testConnection(provider, apiKey) {
    try {
      const providerConfig = this.providers[provider];
      if (!providerConfig) {
        return { success: false, error: 'Unknown provider' };
      }

      const testMessage = 'Hello! This is a connection test from ScrapedKnees.';
      
      if (provider === 'anthropic') {
        return await this.testAnthropicConnection(apiKey, testMessage);
      } else {
        return await this.testOpenAIConnection(provider, apiKey, testMessage);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testOpenAIConnection(provider, apiKey, message) {
    const providerConfig = this.providers[provider];
    const model = providerConfig.models[0].id;

    const response = await fetch(providerConfig.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(provider === 'openrouter' && {
          'HTTP-Referer': chrome.runtime.getURL(''),
          'X-Title': 'ScrapedKnees'
        })
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: message }],
        max_tokens: 10
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = this.parseAPIError(response.status, errorData);
      return { success: false, error: errorMessage };
    }

    return { success: true };
  }

  async testAnthropicConnection(apiKey, message) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: message }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = this.parseAPIError(response.status, errorData);
      return { success: false, error: errorMessage };
    }

    return { success: true };
  }

  parseAPIError(status, errorData) {
    if (status === 401) return 'Invalid API key';
    if (status === 403) return 'API key does not have required permissions';
    if (status === 429) return 'Rate limit exceeded - please try again later';
    if (status === 402) return 'Billing issue - please check your account';
    if (status >= 500) return 'Service temporarily unavailable';
    if (errorData.error?.message) return errorData.error.message;
    return `API error (${status})`;
  }

  async runPrompt(prompt, context = '') {
    const readyCheck = await this.isReady();
    if (!readyCheck.ready) {
      throw new Error(readyCheck.error);
    }

    const provider = this.settings.selectedProvider;
    const apiKey = this.settings.apiKeys[provider];
    const model = this.settings.selectedModels[provider] || this.providers[provider].models[0].id;

    try {
      if (provider === 'anthropic') {
        return await this.runAnthropicPrompt(apiKey, model, prompt, context);
      } else {
        return await this.runOpenAIPrompt(provider, apiKey, model, prompt, context);
      }
    } catch (error) {
      this.status.error = error.message;
      this.status.isReady = false;
      throw error;
    }
  }

  async runOpenAIPrompt(provider, apiKey, model, prompt, context) {
    const providerConfig = this.providers[provider];
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

    const response = await fetch(providerConfig.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(provider === 'openrouter' && {
          'HTTP-Referer': chrome.runtime.getURL(''),
          'X-Title': 'ScrapedKnees'
        })
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = this.parseAPIError(response.status, errorData);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async runAnthropicPrompt(apiKey, model, prompt, context) {
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: fullPrompt }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = this.parseAPIError(response.status, errorData);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  getProviders() {
    return this.providers;
  }

  getModels(provider) {
    return this.providers[provider]?.models || [];
  }

  async setProvider(provider) {
    if (!this.settings) {
      this.settings = this.defaultOptions;
    }
    this.settings.selectedProvider = provider;
    await this.saveSettings();
    await this.checkStatus();
  }

  async setApiKey(provider, apiKey) {
    if (!this.settings) {
      this.settings = this.defaultOptions;
    }
    if (!this.settings.apiKeys) {
      this.settings.apiKeys = {};
    }
    this.settings.apiKeys[provider] = apiKey;
    await this.saveSettings();
    await this.checkStatus();
  }

  async setModel(provider, model) {
    if (!this.settings) {
      this.settings = this.defaultOptions;
    }
    if (!this.settings.selectedModels) {
      this.settings.selectedModels = {};
    }
    this.settings.selectedModels[provider] = model;
    await this.saveSettings();
  }

  getStatus() {
    return this.status;
  }

  getSettings() {
    return this.settings;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIManager };
}