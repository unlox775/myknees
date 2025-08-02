// Tests for AI Manager

const { AIManager } = require('../ai-manager.js');

// Mock Chrome API
global.chrome = {
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    getURL: jest.fn(() => 'chrome-extension://test')
  }
};

// Mock fetch
global.fetch = jest.fn();

describe('AIManager', () => {
  let aiManager;

  beforeEach(() => {
    aiManager = new AIManager();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default providers', () => {
      expect(aiManager.providers).toHaveProperty('groq');
      expect(aiManager.providers).toHaveProperty('openrouter');
      expect(aiManager.providers).toHaveProperty('openai');
      expect(aiManager.providers).toHaveProperty('anthropic');
    });

    test('should initialize with default status', () => {
      expect(aiManager.status).toEqual({
        isReady: false,
        provider: null,
        error: null,
        lastChecked: null
      });
    });
  });

  describe('Settings Management', () => {
    test('should load settings from storage', async () => {
      const mockSettings = {
        selectedProvider: 'groq',
        apiKeys: { groq: 'test-key' },
        selectedModels: { groq: 'llama3-8b-8192' },
        autoCheckStatus: true,
        debugMode: false
      };

      chrome.storage.sync.get.mockResolvedValue(mockSettings);

      await aiManager.loadSettings();

      expect(chrome.storage.sync.get).toHaveBeenCalledWith({
        selectedProvider: null,
        apiKeys: {},
        selectedModels: {},
        autoCheckStatus: true,
        debugMode: false
      });
      expect(aiManager.settings).toEqual(mockSettings);
    });

    test('should save settings to storage', async () => {
      const settings = {
        selectedProvider: 'groq',
        apiKeys: { groq: 'test-key' },
        selectedModels: { groq: 'llama3-8b-8192' },
        autoCheckStatus: true,
        debugMode: false
      };

      aiManager.settings = settings;
      await aiManager.saveSettings();

      expect(chrome.storage.sync.set).toHaveBeenCalledWith(settings);
    });

    test('should handle storage errors', async () => {
      chrome.storage.sync.set.mockRejectedValue(new Error('Storage error'));

      await expect(aiManager.saveSettings()).rejects.toThrow('Storage error');
    });
  });

  describe('Provider Management', () => {
    test('should get all providers', () => {
      const providers = aiManager.getProviders();
      expect(providers).toHaveProperty('groq');
      expect(providers).toHaveProperty('openrouter');
      expect(providers).toHaveProperty('openai');
      expect(providers).toHaveProperty('anthropic');
    });

    test('should get models for provider', () => {
      const groqModels = aiManager.getModels('groq');
      expect(groqModels).toHaveLength(3);
      expect(groqModels[0]).toHaveProperty('id');
      expect(groqModels[0]).toHaveProperty('name');
    });

    test('should return empty array for unknown provider', () => {
      const models = aiManager.getModels('unknown');
      expect(models).toEqual([]);
    });
  });

  describe('Status Checking', () => {
    test('should return not ready when no provider selected', async () => {
      aiManager.settings = { selectedProvider: null };

      const result = await aiManager.isReady();

      expect(result).toEqual({
        ready: false,
        error: 'No AI provider selected',
        provider: null
      });
    });

    test('should return not ready when no API key configured', async () => {
      aiManager.settings = {
        selectedProvider: 'groq',
        apiKeys: {}
      };

      const result = await aiManager.isReady();

      expect(result).toEqual({
        ready: false,
        error: 'No API key configured',
        provider: 'groq'
      });
    });

    test('should check status when interval has passed', async () => {
      aiManager.settings = {
        selectedProvider: 'groq',
        apiKeys: { groq: 'test-key' }
      };
      aiManager.status.lastChecked = Date.now() - (6 * 60 * 1000); // 6 minutes ago

      const mockCheckStatus = jest.spyOn(aiManager, 'checkStatus').mockResolvedValue({
        isReady: true,
        provider: 'groq',
        error: null,
        lastChecked: Date.now()
      });

      await aiManager.isReady();

      expect(mockCheckStatus).toHaveBeenCalled();
    });
  });

  describe('Connection Testing', () => {
    test('should test OpenAI connection successfully', async () => {
      const mockResponse = { ok: true };
      fetch.mockResolvedValue(mockResponse);

      const result = await aiManager.testOpenAIConnection('groq', 'test-key', 'test message');

      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
    });

    test('should handle OpenAI connection error', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({})
      };
      fetch.mockResolvedValue(mockResponse);

      const result = await aiManager.testOpenAIConnection('groq', 'test-key', 'test message');

      expect(result).toEqual({ success: false, error: 'Invalid API key' });
    });

    test('should test Anthropic connection successfully', async () => {
      const mockResponse = { ok: true };
      fetch.mockResolvedValue(mockResponse);

      const result = await aiManager.testAnthropicConnection('test-key', 'test message');

      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
            'anthropic-version': '2023-06-01'
          })
        })
      );
    });
  });

  describe('Error Parsing', () => {
    test('should parse 401 error', () => {
      const error = aiManager.parseAPIError(401, {});
      expect(error).toBe('Invalid API key');
    });

    test('should parse 403 error', () => {
      const error = aiManager.parseAPIError(403, {});
      expect(error).toBe('API key does not have required permissions');
    });

    test('should parse 429 error', () => {
      const error = aiManager.parseAPIError(429, {});
      expect(error).toBe('Rate limit exceeded - please try again later');
    });

    test('should parse 402 error', () => {
      const error = aiManager.parseAPIError(402, {});
      expect(error).toBe('Billing issue - please check your account');
    });

    test('should parse 500+ error', () => {
      const error = aiManager.parseAPIError(500, {});
      expect(error).toBe('Service temporarily unavailable');
    });

    test('should parse error message from response', () => {
      const error = aiManager.parseAPIError(400, {
        error: { message: 'Custom error message' }
      });
      expect(error).toBe('Custom error message');
    });

    test('should parse generic error', () => {
      const error = aiManager.parseAPIError(404, {});
      expect(error).toBe('API error (404)');
    });
  });

  describe('Prompt Running', () => {
    test('should throw error when not ready', async () => {
      aiManager.settings = { selectedProvider: null };

      await expect(aiManager.runPrompt('test prompt')).rejects.toThrow('No AI provider selected');
    });

    test('should run OpenAI prompt successfully', async () => {
      aiManager.settings = {
        selectedProvider: 'groq',
        apiKeys: { groq: 'test-key' },
        selectedModels: { groq: 'llama3-8b-8192' }
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'AI response' } }]
        })
      };
      fetch.mockResolvedValue(mockResponse);

      const result = await aiManager.runPrompt('test prompt', 'context');

      expect(result).toBe('AI response');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [{ role: 'user', content: 'context\n\ntest prompt' }],
            max_tokens: 1000,
            temperature: 0.7
          })
        })
      );
    });

    test('should run Anthropic prompt successfully', async () => {
      aiManager.settings = {
        selectedProvider: 'anthropic',
        apiKeys: { anthropic: 'test-key' },
        selectedModels: { anthropic: 'claude-3-haiku-20240307' }
      };

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ text: 'AI response' }]
        })
      };
      fetch.mockResolvedValue(mockResponse);

      const result = await aiManager.runPrompt('test prompt', 'context');

      expect(result).toBe('AI response');
    });

    test('should handle prompt error', async () => {
      aiManager.settings = {
        selectedProvider: 'groq',
        apiKeys: { groq: 'test-key' },
        selectedModels: { groq: 'llama3-8b-8192' }
      };

      const mockResponse = {
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({})
      };
      fetch.mockResolvedValue(mockResponse);

      await expect(aiManager.runPrompt('test prompt')).rejects.toThrow('Invalid API key');
    });
  });

  describe('Provider Configuration', () => {
    test('should set provider', async () => {
      const mockSaveSettings = jest.spyOn(aiManager, 'saveSettings').mockResolvedValue();
      const mockCheckStatus = jest.spyOn(aiManager, 'checkStatus').mockResolvedValue({});

      await aiManager.setProvider('groq');

      expect(aiManager.settings.selectedProvider).toBe('groq');
      expect(mockSaveSettings).toHaveBeenCalled();
      expect(mockCheckStatus).toHaveBeenCalled();
    });

    test('should set API key', async () => {
      const mockSaveSettings = jest.spyOn(aiManager, 'saveSettings').mockResolvedValue();
      const mockCheckStatus = jest.spyOn(aiManager, 'checkStatus').mockResolvedValue({});

      await aiManager.setApiKey('groq', 'new-key');

      expect(aiManager.settings.apiKeys.groq).toBe('new-key');
      expect(mockSaveSettings).toHaveBeenCalled();
      expect(mockCheckStatus).toHaveBeenCalled();
    });

    test('should set model', async () => {
      const mockSaveSettings = jest.spyOn(aiManager, 'saveSettings').mockResolvedValue();

      await aiManager.setModel('groq', 'new-model');

      expect(aiManager.settings.selectedModels.groq).toBe('new-model');
      expect(mockSaveSettings).toHaveBeenCalled();
    });
  });
});
