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

        case 'CALL_AI_API':
          const aiResponse = await this.callAiApi(message.data);
          sendResponse({ success: true, data: aiResponse });
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
        aiProvider: 'none',
        groqApiKey: '',
        groqModel: 'llama3-8b-8192',
        openrouterApiKey: '',
        openrouterModel: 'anthropic/claude-3-haiku',
        autoExtract: false,
        saveTraining: true,
        debugMode: false,
        overlayOpacity: 0.7
      });
      return result;
    } catch (error) {
      console.error('Error getting options:', error);
      return {};
    }
  }

  async callAiApi(requestData) {
    try {
      const options = await this.getOptions();
      
      if (options.aiProvider === 'none') {
        throw new Error('No AI provider configured');
      }

      if (options.aiProvider === 'groq') {
        return await this.callGroqApi(requestData, options);
      } else if (options.aiProvider === 'openrouter') {
        return await this.callOpenRouterApi(requestData, options);
      } else {
        throw new Error('Unknown AI provider');
      }
    } catch (error) {
      console.error('Error calling AI API:', error);
      throw error;
    }
  }

  async callGroqApi(requestData, options) {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${options.groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.groqModel,
        messages: requestData.messages,
        max_tokens: requestData.maxTokens || 1000,
        temperature: requestData.temperature || 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  async callOpenRouterApi(requestData, options) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${options.openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': chrome.runtime.getURL(''),
        'X-Title': 'ScrapedKnees'
      },
      body: JSON.stringify({
        model: options.openrouterModel,
        messages: requestData.messages,
        max_tokens: requestData.maxTokens || 1000,
        temperature: requestData.temperature || 0.7
      })
    });

    try {
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${data.error?.message || 'Unknown error'}`);
      }
      
      return data;
    } catch (error) {
      if (error.name === 'SyntaxError') {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }
      throw error;
    }
  }
}

// Initialize background service
new BackgroundService();