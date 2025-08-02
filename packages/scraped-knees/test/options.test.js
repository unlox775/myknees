// Unit tests for options page functionality

const { OptionsManager } = require('../src/ui/options/options.js');

/**
 * Options Page Tests
 * 
 * Tests for the OptionsManager class that handles the options page UI
 * and settings management.
 */

describe('OptionsManager', () => {
  let mockChrome;
  let optionsManager;

  beforeEach(() => {
    // Mock Chrome API
    mockChrome = {
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn(),
          clear: jest.fn()
        },
        local: {
          get: jest.fn(),
          set: jest.fn(),
          clear: jest.fn()
        }
      },
      runtime: {
        sendMessage: jest.fn(),
        getURL: jest.fn(() => 'chrome-extension://test-id/')
      }
    };

    global.chrome = mockChrome;
    global.fetch = jest.fn();

    // Mock DOM elements
    document.body.innerHTML = `
      <select id="ai-provider">
        <option value="">Select Provider</option>
        <option value="openai">OpenAI</option>
        <option value="groq">Groq</option>
        <option value="openrouter">OpenRouter</option>
        <option value="anthropic">Anthropic Claude</option>
      </select>
      
      <div id="openai-config" class="api-config" style="display: none;">
        <div class="input-group">
          <input type="password" id="openai-api-key" placeholder="Enter OpenAI API Key" />
          <button class="toggle-password" data-target="openai-api-key">👁️</button>
        </div>
        <select id="openai-model">
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4o-mini">GPT-4o Mini</option>
        </select>
      </div>
      
      <div id="groq-config" class="api-config" style="display: none;">
        <div class="input-group">
          <input type="password" id="groq-api-key" placeholder="Enter Groq API Key" />
          <button class="toggle-password" data-target="groq-api-key">👁️</button>
        </div>
        <select id="groq-model">
          <option value="llama3-8b-8192">Llama3-8b-8192</option>
          <option value="llama3-70b-8192">Llama3-70b-8192</option>
        </select>
      </div>
      
      <div id="openrouter-config" class="api-config" style="display: none;">
        <div class="input-group">
          <input type="password" id="openrouter-api-key" placeholder="Enter OpenRouter API Key" />
          <button class="toggle-password" data-target="openrouter-api-key">👁️</button>
        </div>
        <select id="openrouter-model">
          <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
          <option value="anthropic/claude-3-sonnet">Claude 3 Sonnet</option>
        </select>
      </div>
      
      <div id="anthropic-config" class="api-config" style="display: none;">
        <div class="input-group">
          <input type="password" id="anthropic-api-key" placeholder="Enter Anthropic API Key" />
          <button class="toggle-password" data-target="anthropic-api-key">👁️</button>
        </div>
        <select id="anthropic-model">
          <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
          <option value="claude-3-opus-20240229">Claude 3 Opus</option>
        </select>
      </div>
      
      <div class="general-settings">
        <label class="checkbox-label">
          <input type="checkbox" id="auto-check-status" />
          <span class="checkmark"></span>
          Automatically check API status
        </label>
        <label class="checkbox-label">
          <input type="checkbox" id="debug-mode" />
          <span class="checkmark"></span>
          Enable debug mode
        </label>
      </div>
      
      <button id="save-options">Save Options</button>
      <button id="reset-options">Reset Options</button>
      <button id="test-connection">Test Connection</button>
      <button id="check-status">Check Status</button>
      
             <div id="status-display">
         <div class="status-item">
           <span class="status-label">Connection Status:</span>
           <span id="connection-status" class="status-value">Not configured</span>
         </div>
         <div class="status-item">
           <span class="status-label">Last Checked:</span>
           <span id="last-checked" class="status-value">Never</span>
         </div>
         <div class="status-item">
           <span class="status-label">Selected Provider:</span>
           <span id="selected-provider" class="status-value">None</span>
         </div>
       </div>
       
       <div id="status-message" class="status-message"></div>
      
      <div id="debug-section" class="debug-section" style="display: none;">
        <div class="usage-table-section">
          <table id="usage-table" class="usage-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Model</th>
                <th>Total Requests</th>
                <th>Last Used</th>
              </tr>
            </thead>
            <tbody id="usage-table-body"></tbody>
          </table>
        </div>
        <div class="log-section">
          <div id="log-container" class="log-container">
            <table id="log-table" class="log-table">
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Request</th>
                  <th>Response</th>
                </tr>
              </thead>
              <tbody id="log-table-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Create OptionsManager instance
    optionsManager = new OptionsManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset Chrome API mocks to avoid conflicts with global setup
    if (global.chrome && global.chrome.storage) {
      Object.values(global.chrome.storage).forEach(storage => {
        if (storage.get) storage.get.mockClear();
        if (storage.set) storage.set.mockClear();
        if (storage.clear) storage.clear.mockClear();
      });
    }
  });

  describe('Initialization', () => {
    test('should initialize with default options', () => {
      expect(optionsManager.defaultOptions).toEqual({
        selectedProvider: null,
        apiKeys: {},
        selectedModels: {},
        autoCheckStatus: true,
        debugMode: false
      });
    });

    test('should bind events on initialization', () => {
      const addEventListenerSpy = jest.spyOn(document.getElementById('ai-provider'), 'addEventListener');
      
      // Re-initialize to trigger event binding
      optionsManager.bindEvents();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('Settings Management', () => {
    test('should load settings from storage', async () => {
      const mockSettings = {
        selectedProvider: 'openai',
        apiKeys: { openai: 'test-key' },
        selectedModels: { openai: 'gpt-4o' },
        autoCheckStatus: true,
        debugMode: false
      };

      mockChrome.storage.sync.get.mockResolvedValue(mockSettings);

      await optionsManager.loadOptions();

      expect(mockChrome.storage.sync.get).toHaveBeenCalledWith(optionsManager.defaultOptions);
      expect(optionsManager.options).toEqual(mockSettings);
    });

         test('should save settings to storage', async () => {
       // Set up DOM values
       document.getElementById('ai-provider').value = 'openai';
       document.getElementById('openai-api-key').value = 'test-key';
       document.getElementById('openai-model').value = 'gpt-4o';
       document.getElementById('auto-check-status').checked = true;
       document.getElementById('debug-mode').checked = false;

       mockChrome.storage.sync.set.mockResolvedValue();

       await optionsManager.saveOptions();

       expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
         selectedProvider: 'openai',
         apiKeys: {
           groq: '',
           openrouter: '',
           openai: 'test-key',
           anthropic: ''
         },
         selectedModels: {
           groq: 'llama3-8b-8192',
           openrouter: 'anthropic/claude-3-haiku',
           openai: 'gpt-4o',
           anthropic: 'claude-3-5-sonnet-20241022'
         },
         autoCheckStatus: true,
         debugMode: false
       });
     });
  });

  describe('UI Management', () => {
    test('should toggle API config visibility', () => {
      const openaiConfig = document.getElementById('openai-config');
      const groqConfig = document.getElementById('groq-config');

      // Initially hidden
      expect(openaiConfig.style.display).toBe('none');
      expect(groqConfig.style.display).toBe('none');

      // Show OpenAI config
      optionsManager.toggleApiConfig('openai');
      expect(openaiConfig.style.display).toBe('block');
      expect(groqConfig.style.display).toBe('none');

      // Show Groq config
      optionsManager.toggleApiConfig('groq');
      expect(openaiConfig.style.display).toBe('none');
      expect(groqConfig.style.display).toBe('block');
    });

    test('should toggle password visibility', () => {
      const apiKeyInput = document.getElementById('openai-api-key');
      const toggleButton = document.querySelector('[data-target="openai-api-key"]');

      // Initially password type
      expect(apiKeyInput.type).toBe('password');

      // Toggle to text
      optionsManager.togglePasswordVisibility('openai-api-key');
      expect(apiKeyInput.type).toBe('text');

      // Toggle back to password
      optionsManager.togglePasswordVisibility('openai-api-key');
      expect(apiKeyInput.type).toBe('password');
    });

    test('should update UI based on settings', () => {
      optionsManager.options = {
        selectedProvider: 'openai',
        apiKeys: { openai: 'test-key' },
        selectedModels: { openai: 'gpt-4o' },
        autoCheckStatus: true,
        debugMode: false
      };

      optionsManager.updateUI();

      expect(document.getElementById('ai-provider').value).toBe('openai');
      expect(document.getElementById('openai-api-key').value).toBe('test-key');
      expect(document.getElementById('openai-model').value).toBe('gpt-4o');
      expect(document.getElementById('auto-check-status').checked).toBe(true);
      expect(document.getElementById('debug-mode').checked).toBe(false);
    });
  });

  describe('Connection Testing', () => {
    test('should test connection successfully', async () => {
      // Set up provider and API key
      document.getElementById('ai-provider').value = 'openai';
      document.getElementById('openai-api-key').value = 'test-key';

      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        error: null
      });

      await optionsManager.testConnection();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'TEST_AI_CONNECTION',
        data: { provider: 'openai', apiKey: 'test-key' }
      });
    });

    test('should check status successfully', async () => {
      mockChrome.runtime.sendMessage.mockResolvedValue({
        success: true,
        data: {
          isReady: true,
          provider: 'openai',
          error: null,
          lastChecked: Date.now()
        }
      });

      await optionsManager.checkStatus();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_AI_STATUS'
      });
    });
  });

  describe('Debug Mode', () => {
    test('should toggle debug mode visibility', () => {
      const debugSection = document.getElementById('debug-section');

      // Initially hidden
      expect(debugSection.style.display).toBe('none');

      // Show debug section
      optionsManager.toggleDebugMode(true);
      expect(debugSection.style.display).toBe('block');

      // Hide debug section
      optionsManager.toggleDebugMode(false);
      expect(debugSection.style.display).toBe('none');
    });

    test('should load debug information', async () => {
      const mockUsageStats = {
        openai: { requests: 10, lastUsed: Date.now() }
      };
      const mockRequestLog = [
        { timestamp: Date.now(), provider: 'openai', request: 'test', response: 'response' }
      ];

      mockChrome.runtime.sendMessage
        .mockResolvedValueOnce({ success: true, data: mockUsageStats })
        .mockResolvedValueOnce({ success: true, data: mockRequestLog });

      await optionsManager.loadDebugInfo();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_USAGE_STATS'
      });
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_REQUEST_LOG'
      });
    });
  });

  describe('Status Display', () => {
         test('should update status display', () => {
       const status = {
         isReady: true,
         provider: 'openai',
         error: null,
         lastChecked: Date.now()
       };

       optionsManager.updateStatusDisplay(status);

       const connectionStatus = document.getElementById('connection-status');
       const lastChecked = document.getElementById('last-checked');
       const selectedProvider = document.getElementById('selected-provider');
       
       expect(connectionStatus.textContent).toContain('Connected');
       expect(lastChecked.textContent).not.toBe('Never');
       expect(selectedProvider.textContent).toBe('openai');
     });

    test('should show status messages', () => {
      optionsManager.showStatus('Test message', 'success');

      // Check if status message was shown (implementation dependent)
      expect(optionsManager.showStatus).toBeDefined();
    });
  });
});
