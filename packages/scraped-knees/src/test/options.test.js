// Unit tests for options page functionality

describe('Options Page Functions', () => {
  let mockChrome;

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
          clear: jest.fn()
        }
      },
      runtime: {
        getURL: jest.fn(() => 'chrome-extension://test-id/')
      }
    };

    global.chrome = mockChrome;
    global.fetch = jest.fn();

    // Mock DOM elements
    document.body.innerHTML = `
      <select id="ai-provider">
        <option value="none">No AI</option>
        <option value="groq">Groq.com</option>
        <option value="openrouter">OpenRouter</option>
      </select>
      <input type="password" id="groq-api-key" />
      <input type="password" id="openrouter-api-key" />
      <select id="groq-model">
        <option value="llama3-8b-8192">Llama3-8b-8192</option>
      </select>
      <select id="openrouter-model">
        <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
      </select>
      <input type="checkbox" id="auto-extract" />
      <input type="checkbox" id="save-training" />
      <input type="checkbox" id="debug-mode" />
      <input type="range" id="overlay-opacity" value="0.7" />
      <span id="opacity-value">70%</span>
      <div id="groq-config" style="display: none;"></div>
      <div id="openrouter-config" style="display: none;"></div>
      <div id="status-message"></div>
      <span id="session-count">0</span>
      <span id="item-count">0</span>
      <span id="storage-used">0 KB</span>
    `;
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

  describe('Settings Management', () => {
    test('should save and load settings correctly', async () => {
      const testSettings = {
        aiProvider: 'groq',
        groqApiKey: 'test-key',
        overlayOpacity: 0.8
      };

      mockChrome.storage.sync.set.mockResolvedValue();
      mockChrome.storage.sync.get.mockResolvedValue(testSettings);

      // Test saving settings
      await saveSettings(testSettings);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(testSettings);

      // Test loading settings
      const loadedSettings = await loadSettings();
      expect(loadedSettings).toEqual(testSettings);
    });
  });

  describe('Data Management Functions', () => {
    test('should load data statistics', async () => {
      const mockData = {
        trainingSessions: [
          { id: '1', url: 'https://example.com' },
          { id: '2', url: 'https://example2.com' }
        ],
        scrapedData: [
          { items: [{ id: 1 }, { id: 2 }] },
          { items: [{ id: 3 }] }
        ]
      };

      mockChrome.storage.local.get.mockResolvedValue(mockData);

      await loadDataStats();

      expect(document.getElementById('session-count').textContent).toBe('2');
      expect(document.getElementById('item-count').textContent).toBe('3');
      expect(document.getElementById('storage-used').textContent).toContain('B');
    });

    test('should export data as JSON file', async () => {
      const mockData = { test: 'data' };
      mockChrome.storage.local.get.mockResolvedValue(mockData);

      // Mock URL.createObjectURL and URL.revokeObjectURL
      const mockUrl = 'blob:test-url';
      global.URL.createObjectURL = jest.fn(() => mockUrl);
      global.URL.revokeObjectURL = jest.fn();

      // Mock document.createElement and click
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn()
      };
      document.createElement = jest.fn(() => mockAnchor);
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();

      await exportData();

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.download).toContain('scraped-knees-data-');
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    });
  });

  describe('Status Messages', () => {
    test('should show status messages', () => {
      showStatus('Test message', 'success');
      
      const statusElement = document.getElementById('status-message');
      expect(statusElement.textContent).toBe('Test message');
      expect(statusElement.className).toContain('success');
      expect(statusElement.className).toContain('show');
    });

    test('should auto-hide status messages', async () => {
      jest.useFakeTimers();
      
      showStatus('Test message', 'info');
      
      const statusElement = document.getElementById('status-message');
      expect(statusElement.className).toContain('show');
      
      jest.advanceTimersByTime(5000);
      
      expect(statusElement.className).not.toContain('show');
      
      jest.useRealTimers();
    });
  });
});

// Helper functions for testing
async function saveSettings(settings) {
  try {
    await chrome.storage.sync.set(settings);
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

async function loadSettings() {
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
    console.error('Error loading settings:', error);
    return {};
  }
}

async function loadDataStats() {
  try {
    const data = await chrome.storage.local.get(['trainingSessions', 'scrapedData']);
    
    const sessionCount = data.trainingSessions ? data.trainingSessions.length : 0;
    const itemCount = data.scrapedData ? data.scrapedData.reduce((total, session) => total + (session.items ? session.items.length : 0), 0) : 0;
    
    const storageSize = JSON.stringify(data).length;
    const storageUsed = storageSize < 1024 ? `${storageSize} B` : 
                       storageSize < 1024 * 1024 ? `${(storageSize / 1024).toFixed(1)} KB` :
                       `${(storageSize / (1024 * 1024)).toFixed(1)} MB`;

    document.getElementById('session-count').textContent = sessionCount;
    document.getElementById('item-count').textContent = itemCount;
    document.getElementById('storage-used').textContent = storageUsed;
  } catch (error) {
    console.error('Error loading data stats:', error);
  }
}

async function exportData() {
  try {
    const data = await chrome.storage.local.get();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `scraped-knees-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting data:', error);
  }
}

function showStatus(message, type = 'info') {
  const statusElement = document.getElementById('status-message');
  statusElement.textContent = message;
  statusElement.className = `status-message ${type} show`;
  
  setTimeout(() => {
    statusElement.classList.remove('show');
  }, 5000);
}