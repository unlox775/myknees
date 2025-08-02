// Background service worker for AI Data Scraper extension

class BackgroundService {
  constructor() {
    this.initialize();
  }

  initialize() {
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('AI Data Scraper extension installed:', details.reason);
      this.setupDefaultStorage();
    });

    // Listen for messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Handle tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabUpdate(tabId, tab);
      }
    });
  }

  async setupDefaultStorage() {
    const defaultData = {
      trainingSessions: [],
      scrapedData: [],
      settings: {
        autoStart: false,
        debugMode: false,
        overlayOpacity: 0.7,
        aiProvider: 'none',
        groqApiKey: '',
        groqModel: 'llama3-8b-8192',
        openrouterApiKey: '',
        openrouterModel: 'anthropic/claude-3-haiku',
        autoExtract: false,
        saveTraining: true
      }
    };

    await chrome.storage.local.set(defaultData);
    console.log('Default storage initialized');
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'START_TRAINING':
          await this.startTraining(message.data, sender.tab?.id);
          sendResponse({ success: true });
          break;

        case 'STOP_TRAINING':
          await this.stopTraining(sender.tab?.id);
          sendResponse({ success: true });
          break;

        case 'SAVE_TRAINING_DATA':
          await this.saveTrainingData(message.data);
          sendResponse({ success: true });
          break;

        case 'GET_TRAINING_SESSIONS':
          const sessions = await this.getTrainingSessions();
          sendResponse({ success: true, data: sessions });
          break;

        case 'EXECUTE_SCRAPING':
          await this.executeScraping(message.data, sender.tab?.id);
          sendResponse({ success: true });
          break;

        case 'GET_SCRAPED_DATA':
          const data = await this.getScrapedData();
          sendResponse({ success: true, data });
          break;

        case 'GET_OPTIONS':
          const options = await this.getOptions();
          sendResponse({ success: true, data: options });
          break;

        case 'TEST_AI_CONNECTION':
          console.log('Testing AI connection:', message.data);
          const testResult = await this.testAIConnection(message.data);
          console.log('Test result:', testResult);
          sendResponse({ success: testResult.success, error: testResult.error });
          break;

        case 'GET_AI_STATUS':
          console.log('Getting AI status');
          const status = await this.getAIStatus();
          console.log('AI status:', status);
          sendResponse({ success: true, data: status });
          break;

        case 'GET_USAGE_STATS':
          console.log('Getting usage stats');
          const usageStats = await this.getUsageStats();
          console.log('Usage stats:', usageStats);
          sendResponse({ success: true, data: usageStats });
          break;

        case 'GET_REQUEST_LOG':
          console.log('Getting request log');
          const requestLog = await this.getRequestLog();
          console.log('Request log:', requestLog);
          sendResponse({ success: true, data: requestLog });
          break;

        default:
          console.warn('Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async startTraining(trainingConfig, tabId) {
    if (!tabId) {
      throw new Error('No tab ID provided for training');
    }

    const message = {
      type: 'START_TRAINING_MODE',
      data: trainingConfig
    };

    await chrome.tabs.sendMessage(tabId, message);
    console.log('Training mode started for tab:', tabId);
  }

  async stopTraining(tabId) {
    if (!tabId) return;

    const message = { type: 'STOP_TRAINING_MODE' };
    await chrome.tabs.sendMessage(tabId, message);
    console.log('Training mode stopped for tab:', tabId);
  }

  async saveTrainingData(trainingData) {
    const { trainingSessions } = await chrome.storage.local.get(['trainingSessions']);
    trainingSessions.push({
      ...trainingData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    });

    await chrome.storage.local.set({ trainingSessions });
    console.log('Training data saved:', trainingData);
  }

  async getTrainingSessions() {
    const { trainingSessions } = await chrome.storage.local.get(['trainingSessions']);
    return trainingSessions || [];
  }

  async executeScraping(scrapingConfig, tabId) {
    if (!tabId) {
      throw new Error('No tab ID provided for scraping');
    }

    const message = {
      type: 'EXECUTE_SCRAPING',
      data: scrapingConfig
    };

    await chrome.tabs.sendMessage(tabId, message);
    console.log('Scraping executed for tab:', tabId);
  }

  async getScrapedData() {
    const { scrapedData } = await chrome.storage.local.get(['scrapedData']);
    return scrapedData || [];
  }

  handleTabUpdate(tabId, tab) {
    // Inject content script if needed
    if (tab.url && tab.url.startsWith('http')) {
      console.log('Tab updated:', tabId, tab.url);
    }
  }

  async getOptions() {
    try {
      const result = await chrome.storage.sync.get({
        selectedProvider: null,
        apiKeys: {},
        selectedModels: {},
        autoCheckStatus: true,
        debugMode: false
      });
      return result;
    } catch (error) {
      console.error('Error getting options:', error);
      return {};
    }
  }

  async testAIConnection(data) {
    try {
      const { provider, apiKey } = data;
      
      // Create a simple test connection without importing AI Manager
      const result = await this.simpleTestConnection(provider, apiKey);
      return result;
    } catch (error) {
      console.error('Error testing AI connection:', error);
      return { success: false, error: error.message };
    }
  }

  async simpleTestConnection(provider, apiKey) {
    console.log('simpleTestConnection called with:', { provider, apiKey: apiKey ? '***' : 'null' });
    try {
      let testUrl, headers, body;
      
      if (provider === 'groq') {
        testUrl = 'https://api.groq.com/openai/v1/chat/completions';
        headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        };
        body = JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [{ role: 'user', content: 'Hello! This is a connection test from ScrapedKnees.' }],
          max_tokens: 10
        });
      } else if (provider === 'openai') {
        testUrl = 'https://api.openai.com/v1/chat/completions';
        headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        };
        body = JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hello! This is a connection test from ScrapedKnees.' }],
          max_tokens: 10
        });
      } else if (provider === 'anthropic') {
        testUrl = 'https://api.anthropic.com/v1/messages';
        headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        };
        body = JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello! This is a connection test from ScrapedKnees.' }]
        });
      } else if (provider === 'openrouter') {
        testUrl = 'https://openrouter.ai/api/v1/chat/completions';
        headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': chrome.runtime.getURL(''),
          'X-Title': 'ScrapedKnees'
        };
        body = JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: [{ role: 'user', content: 'Hello! This is a connection test from ScrapedKnees.' }],
          max_tokens: 10
        });
      } else {
        return { success: false, error: 'Unknown provider' };
      }

      console.log('Making API call to:', testUrl);
      
      // Log the request
      const requestData = JSON.parse(body);
      await this.logRequest(provider, requestData.model, requestData, { status: 'pending' }, true);
      
      const response = await fetch(testUrl, {
        method: 'POST',
        headers,
        body
      });

      console.log('API response status:', response.status);
      
      let responseData;
      try {
        responseData = await response.json();
      } catch (e) {
        responseData = { error: 'Invalid JSON response' };
      }
      
      if (!response.ok) {
        const errorData = responseData;
        let errorMessage = 'API error';
        
        if (response.status === 401) errorMessage = 'Invalid API key';
        else if (response.status === 403) errorMessage = 'API key does not have required permissions';
        else if (response.status === 429) errorMessage = 'Rate limit exceeded';
        else if (response.status === 402) errorMessage = 'Billing issue';
        else if (response.status >= 500) errorMessage = 'Service temporarily unavailable';
        else if (errorData.error?.message) errorMessage = errorData.error.message;
        else errorMessage = `API error (${response.status})`;
        
        // Update the log entry with the error response
        await this.logRequest(provider, requestData.model, requestData, responseData, false);
        
        return { success: false, error: errorMessage };
      }

      // Update the log entry with the success response
      await this.logRequest(provider, requestData.model, requestData, responseData, true);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getAIStatus() {
    try {
      const options = await this.getOptions();
      const selectedProvider = options.selectedProvider;
      
      // Try to get cached status first
      const { aiStatus } = await chrome.storage.local.get(['aiStatus']);
      
      if (!selectedProvider) {
        return {
          isReady: false,
          provider: null,
          error: 'No provider selected',
          lastChecked: aiStatus?.lastChecked || null
        };
      }

      const apiKey = options.apiKeys[selectedProvider];
      if (!apiKey) {
        return {
          isReady: false,
          provider: selectedProvider,
          error: 'No API key configured',
          lastChecked: Date.now()
        };
      }

      const testResult = await this.simpleTestConnection(selectedProvider, apiKey);
      
      // Store status persistently
      const statusData = {
        isReady: testResult.success,
        provider: selectedProvider,
        error: testResult.error,
        lastChecked: Date.now()
      };
      
      await chrome.storage.local.set({ aiStatus: statusData });
      
      // Update usage stats if successful
      if (testResult.success) {
        await this.updateUsageStats(selectedProvider, 1);
      }
      
      return statusData;
    } catch (error) {
      console.error('Error getting AI status:', error);
      return {
        isReady: false,
        provider: null,
        error: error.message,
        lastChecked: Date.now()
      };
    }
  }

  async updateUsageStats(provider, requests = 1, model = null) {
    try {
      const { usageStats } = await chrome.storage.local.get(['usageStats']);
      const currentStats = usageStats || {};
      
      if (!currentStats[provider]) {
        currentStats[provider] = { requests: 0, tokens: 0, lastUsed: null, models: {} };
      }
      
      currentStats[provider].requests += requests;
      currentStats[provider].lastUsed = Date.now();
      
      if (model) {
        if (!currentStats[provider].models[model]) {
          currentStats[provider].models[model] = { requests: 0, lastUsed: null };
        }
        currentStats[provider].models[model].requests += requests;
        currentStats[provider].models[model].lastUsed = Date.now();
      }
      
      await chrome.storage.local.set({ usageStats: currentStats });
    } catch (error) {
      console.error('Error updating usage stats:', error);
    }
  }

  async logRequest(provider, model, request, response, success = true) {
    try {
      const { requestLog } = await chrome.storage.local.get(['requestLog']);
      const log = requestLog || [];
      
      const logEntry = {
        timestamp: Date.now(),
        provider,
        model,
        request: JSON.stringify(request, null, 2),
        response: JSON.stringify(response, null, 2),
        success
      };
      
      log.unshift(logEntry); // Add to beginning
      
      // Keep only last 50 entries
      if (log.length > 50) {
        log.splice(50);
      }
      
      await chrome.storage.local.set({ requestLog: log });
    } catch (error) {
      console.error('Error logging request:', error);
    }
  }

  async getUsageStats() {
    try {
      const { usageStats } = await chrome.storage.local.get(['usageStats']);
      return usageStats || {};
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return {};
    }
  }

  async getRequestLog() {
    try {
      const { requestLog } = await chrome.storage.local.get(['requestLog']);
      return requestLog || [];
    } catch (error) {
      console.error('Error getting request log:', error);
      return [];
    }
  }
}

// Initialize background service
new BackgroundService();