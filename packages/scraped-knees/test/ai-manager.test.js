// Tests for AI Manager Service

const { AIManager } = require('../src/services/ai/ai-manager');

// Mock the provider classes
jest.mock('../src/services/ai/providers/openai-provider');
jest.mock('../src/services/ai/providers/groq-provider');
jest.mock('../src/services/ai/providers/openrouter-provider');
jest.mock('../src/services/ai/providers/anthropic-provider');

// Mock the storage services
jest.mock('../src/services/storage/settings-storage');
jest.mock('../src/services/storage/usage-storage');

describe('AIManager', () => {
  let aiManager;
  let mockSettingsStorage;
  let mockUsageStorage;
  let mockOpenAIProvider;
  let mockGroqProvider;
  let mockOpenRouterProvider;
  let mockAnthropicProvider;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock provider instances
    mockOpenAIProvider = {
      getId: jest.fn().mockReturnValue('openai'),
      getName: jest.fn().mockReturnValue('OpenAI'),
      testConnection: jest.fn(),
      sendPrompt: jest.fn(),
      getAvailableModels: jest.fn().mockReturnValue([
        { id: 'gpt-4o', name: 'GPT-4o', description: 'Latest model' }
      ]),
      defaultModel: 'gpt-4o'
    };

    mockGroqProvider = {
      getId: jest.fn().mockReturnValue('groq'),
      getName: jest.fn().mockReturnValue('Groq'),
      testConnection: jest.fn(),
      sendPrompt: jest.fn(),
      getAvailableModels: jest.fn().mockReturnValue([
        { id: 'llama3-8b-8192', name: 'Llama3-8b-8192', description: 'Fast model' }
      ]),
      defaultModel: 'llama3-8b-8192'
    };

    mockOpenRouterProvider = {
      getId: jest.fn().mockReturnValue('openrouter'),
      getName: jest.fn().mockReturnValue('OpenRouter'),
      testConnection: jest.fn(),
      sendPrompt: jest.fn(),
      getAvailableModels: jest.fn().mockReturnValue([
        { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', description: 'Fast model' }
      ]),
      defaultModel: 'anthropic/claude-3-haiku'
    };

    mockAnthropicProvider = {
      getId: jest.fn().mockReturnValue('anthropic'),
      getName: jest.fn().mockReturnValue('Anthropic Claude'),
      testConnection: jest.fn(),
      sendPrompt: jest.fn(),
      getAvailableModels: jest.fn().mockReturnValue([
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Latest model' }
      ]),
      defaultModel: 'claude-3-5-sonnet-20241022'
    };

    // Mock storage services
    mockSettingsStorage = {
      loadSettings: jest.fn(),
      saveSettings: jest.fn(),
      getSetting: jest.fn(),
      setSetting: jest.fn(),
      clearSettings: jest.fn()
    };

    mockUsageStorage = {
      updateUsageStats: jest.fn(),
      getUsageStats: jest.fn(),
      logRequest: jest.fn(),
      getRequestLog: jest.fn(),
      saveAIStatus: jest.fn(),
      getAIStatus: jest.fn(),
      clearUsageData: jest.fn()
    };

    // Mock the provider constructors
    const { OpenAIProvider } = require('../src/services/ai/providers/openai-provider');
    const { GroqProvider } = require('../src/services/ai/providers/groq-provider');
    const { OpenRouterProvider } = require('../src/services/ai/providers/openrouter-provider');
    const { AnthropicProvider } = require('../src/services/ai/providers/anthropic-provider');

    OpenAIProvider.mockImplementation(() => mockOpenAIProvider);
    GroqProvider.mockImplementation(() => mockGroqProvider);
    OpenRouterProvider.mockImplementation(() => mockOpenRouterProvider);
    AnthropicProvider.mockImplementation(() => mockAnthropicProvider);

    // Mock the storage constructors
    const { SettingsStorage } = require('../src/services/storage/settings-storage');
    const { UsageStorage } = require('../src/services/storage/usage-storage');

    SettingsStorage.mockImplementation(() => mockSettingsStorage);
    UsageStorage.mockImplementation(() => mockUsageStorage);

    aiManager = new AIManager();
  });

  describe('Initialization', () => {
    test('should initialize with all providers', () => {
      expect(aiManager.providers).toHaveProperty('openai');
      expect(aiManager.providers).toHaveProperty('groq');
      expect(aiManager.providers).toHaveProperty('openrouter');
      expect(aiManager.providers).toHaveProperty('anthropic');
    });

    test('should initialize with null settings', () => {
      expect(aiManager.settings).toBeNull();
    });
  });

  describe('Settings Management', () => {
    test('should load settings on initialize', async () => {
      const mockSettings = {
        selectedProvider: 'openai',
        apiKeys: { openai: 'test-key' },
        selectedModels: { openai: 'gpt-4o' },
        autoCheckStatus: true,
        debugMode: false
      };

      mockSettingsStorage.loadSettings.mockResolvedValue(mockSettings);

      await aiManager.initialize();

      expect(mockSettingsStorage.loadSettings).toHaveBeenCalled();
      expect(aiManager.settings).toEqual(mockSettings);
    });

    test('should get settings', async () => {
      const mockSettings = {
        selectedProvider: 'openai',
        apiKeys: { openai: 'test-key' }
      };

      aiManager.settings = mockSettings;
      const result = await aiManager.getSettings();

      expect(result).toEqual(mockSettings);
    });
  });

  describe('Provider Status', () => {
    test('should check if ready with no provider', async () => {
      aiManager.settings = { selectedProvider: null };

      const result = await aiManager.isReady();

      expect(result).toEqual({
        ready: false,
        provider: null,
        error: 'No provider selected'
      });
    });

    test('should check if ready with no API key', async () => {
      aiManager.settings = {
        selectedProvider: 'openai',
        apiKeys: {}
      };

      const result = await aiManager.isReady();

      expect(result).toEqual({
        ready: false,
        provider: 'openai',
        error: 'No API key configured'
      });
    });

    test('should check if ready with valid configuration', async () => {
      aiManager.settings = {
        selectedProvider: 'openai',
        apiKeys: { openai: 'test-key' }
      };

      const result = await aiManager.isReady();

      expect(result).toEqual({
        ready: true,
        provider: 'openai'
      });
    });
  });

  describe('Connection Testing', () => {
    test('should test connection successfully', async () => {
      aiManager.settings = {
        selectedProvider: 'openai',
        apiKeys: { openai: 'test-key' }
      };

      mockOpenAIProvider.testConnection.mockResolvedValue({ success: true });
      mockUsageStorage.updateUsageStats.mockResolvedValue();

      const result = await aiManager.testConnection();

      expect(result).toEqual({ success: true });
      expect(mockOpenAIProvider.testConnection).toHaveBeenCalledWith('test-key');
      expect(mockUsageStorage.updateUsageStats).toHaveBeenCalledWith('openai', 1);
    });

    test('should test connection with error', async () => {
      aiManager.settings = {
        selectedProvider: 'openai',
        apiKeys: { openai: 'test-key' }
      };

      mockOpenAIProvider.testConnection.mockResolvedValue({ 
        success: false, 
        error: 'Invalid API key' 
      });

      const result = await aiManager.testConnection();

      expect(result).toEqual({ 
        success: false, 
        error: 'Invalid API key' 
      });
    });
  });

  describe('Prompt Sending', () => {
    test('should send prompt successfully', async () => {
      aiManager.settings = {
        selectedProvider: 'openai',
        apiKeys: { openai: 'test-key' },
        selectedModels: { openai: 'gpt-4o' }
      };

      mockOpenAIProvider.sendPrompt.mockResolvedValue({
        success: true,
        response: 'Test response'
      });

      const result = await aiManager.sendPrompt('Test prompt', { context: 'test' });

      expect(result).toEqual({
        success: true,
        response: 'Test response'
      });
      expect(mockOpenAIProvider.sendPrompt).toHaveBeenCalledWith(
        'Test prompt',
        { context: 'test' },
        'test-key',
        'gpt-4o'
      );
    });

    test('should handle prompt sending error', async () => {
      aiManager.settings = {
        selectedProvider: 'openai',
        apiKeys: { openai: 'test-key' }
      };

      mockOpenAIProvider.sendPrompt.mockRejectedValue(new Error('API error'));

      const result = await aiManager.sendPrompt('Test prompt');

      expect(result).toEqual({
        success: false,
        error: 'API error'
      });
    });
  });

  describe('Provider Information', () => {
    test('should get all providers', () => {
      const providers = aiManager.getProviders();

      expect(providers).toEqual([
        { id: 'openai', name: 'OpenAI' },
        { id: 'groq', name: 'Groq' },
        { id: 'openrouter', name: 'OpenRouter' },
        { id: 'anthropic', name: 'Anthropic Claude' }
      ]);
    });

    test('should get models for provider', () => {
      const models = aiManager.getModels('openai');

      expect(models).toEqual([
        { id: 'gpt-4o', name: 'GPT-4o', description: 'Latest model' }
      ]);
    });

    test('should return empty array for unknown provider', () => {
      const models = aiManager.getModels('unknown');

      expect(models).toEqual([]);
    });
  });

  describe('Usage and Debug', () => {
    test('should get usage stats', async () => {
      const mockStats = { openai: { requests: 10 } };
      mockUsageStorage.getUsageStats.mockResolvedValue(mockStats);

      const result = await aiManager.getUsageStats();

      expect(result).toEqual(mockStats);
    });

    test('should get request log', async () => {
      const mockLog = [{ timestamp: 1234567890, provider: 'openai' }];
      mockUsageStorage.getRequestLog.mockResolvedValue(mockLog);

      const result = await aiManager.getRequestLog();

      expect(result).toEqual(mockLog);
    });

    test('should get cached status', async () => {
      const mockStatus = { isReady: true, provider: 'openai' };
      mockUsageStorage.getAIStatus.mockResolvedValue(mockStatus);

      const result = await aiManager.getCachedStatus();

      expect(result).toEqual(mockStatus);
    });
  });
});
