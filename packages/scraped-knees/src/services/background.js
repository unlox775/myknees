const { AIManager } = require('./ai/ai-manager');

/**
 * Background Service Worker
 * 
 * Handles all background tasks for the extension including:
 * - AI service management
 * - Message handling from UI components
 * - Extension lifecycle management
 * 
 * @public - Main background service for the extension
 */
class BackgroundService {
  constructor() {
    this.aiManager = new AIManager();
    this.initialize();
  }

  /**
   * Initialize the background service
   * 
   * @private - Internal initialization
   */
  initialize() {
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('ScrapedKnees extension installed:', details.reason);
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

    // Initialize AI Manager
    this.aiManager.initialize(true); // Auto-check status on startup
  }

  /**
   * Setup default storage for the extension
   * 
   * @private - Internal setup
   */
  async setupDefaultStorage() {
    const defaultData = {
      trainingSessions: [],
      scrapedData: []
    };

    await chrome.storage.local.set(defaultData);
    console.log('Default storage initialized');
  }

  /**
   * Handle incoming messages from UI components
   * 
   * @param {Object} message - The message object
   * @param {Object} sender - The sender information
   * @param {Function} sendResponse - Response callback
   * 
   * @private - Internal message handling
   */
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'GET_OPTIONS':
          const options = await this.aiManager.getSettings();
          sendResponse({ success: true, data: options });
          break;

        case 'TEST_AI_CONNECTION':
          console.log('Testing AI connection:', message.data);
          const testResult = await this.aiManager.testConnection();
          console.log('Test result:', testResult);
          sendResponse({ success: testResult.success, error: testResult.error });
          break;

        case 'GET_AI_STATUS':
          console.log('Getting AI status');
          const status = await this.aiManager.checkStatus();
          console.log('AI status:', status);
          sendResponse({ success: true, data: status });
          break;

        case 'GET_USAGE_STATS':
          console.log('Getting usage stats');
          const usageStats = await this.aiManager.getUsageStats();
          console.log('Usage stats:', usageStats);
          sendResponse({ success: true, data: usageStats });
          break;

        case 'GET_REQUEST_LOG':
          console.log('Getting request log');
          const requestLog = await this.aiManager.getRequestLog();
          console.log('Request log:', requestLog);
          sendResponse({ success: true, data: requestLog });
          break;

        case 'SEND_PROMPT':
          console.log('Sending prompt:', message.data);
          const promptResult = await this.aiManager.sendPrompt(
            message.data.prompt, 
            message.data.context || {}
          );
          console.log('Prompt result:', promptResult);
          sendResponse({ success: promptResult.success, data: promptResult });
          break;

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

        default:
          console.warn('Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Start training mode for a tab
   * 
   * @param {Object} trainingConfig - Training configuration
   * @param {number} tabId - The tab ID
   * 
   * @private - Internal training management
   */
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

  /**
   * Stop training mode for a tab
   * 
   * @param {number} tabId - The tab ID
   * 
   * @private - Internal training management
   */
  async stopTraining(tabId) {
    if (!tabId) return;

    const message = { type: 'STOP_TRAINING_MODE' };
    await chrome.tabs.sendMessage(tabId, message);
    console.log('Training mode stopped for tab:', tabId);
  }

  /**
   * Save training data
   * 
   * @param {Object} trainingData - The training data to save
   * 
   * @private - Internal data management
   */
  async saveTrainingData(trainingData) {
    const { trainingSessions } = await chrome.storage.local.get(['trainingSessions']);
    const sessions = trainingSessions || [];
    
    sessions.push({
      ...trainingData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    });

    await chrome.storage.local.set({ trainingSessions: sessions });
    console.log('Training data saved:', trainingData);
  }

  /**
   * Get training sessions
   * 
   * @returns {Promise<Array>} The training sessions
   * 
   * @private - Internal data management
   */
  async getTrainingSessions() {
    const { trainingSessions } = await chrome.storage.local.get(['trainingSessions']);
    return trainingSessions || [];
  }

  /**
   * Execute scraping for a tab
   * 
   * @param {Object} scrapingConfig - Scraping configuration
   * @param {number} tabId - The tab ID
   * 
   * @private - Internal scraping management
   */
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

  /**
   * Get scraped data
   * 
   * @returns {Promise<Array>} The scraped data
   * 
   * @private - Internal data management
   */
  async getScrapedData() {
    const { scrapedData } = await chrome.storage.local.get(['scrapedData']);
    return scrapedData || [];
  }

  /**
   * Handle tab updates
   * 
   * @param {number} tabId - The tab ID
   * @param {Object} tab - The tab information
   * 
   * @private - Internal tab management
   */
  handleTabUpdate(tabId, tab) {
    // Inject content script if needed
    if (tab.url && tab.url.startsWith('http')) {
      console.log('Tab updated:', tabId, tab.url);
    }
  }
}

// Initialize background service
new BackgroundService();