// Jest test setup for AI Data Scraper extension

// Mock Chrome extension APIs
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn(),
    getURL: jest.fn((path) => `chrome-extension://test-id/${path}`)
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    update: jest.fn(),
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  scripting: {
    executeScript: jest.fn(),
    insertCSS: jest.fn()
  }
};

// Mock DOM APIs that might not be available in test environment
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: jest.fn(() => ''),
    position: 'static',
    display: 'block'
  })
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock DOMPurify
global.DOMPurify = {
  sanitize: jest.fn((input) => input),
  setConfig: jest.fn(),
  addHook: jest.fn(),
  removeHook: jest.fn()
};

// Setup test utilities
global.createMockElement = (tagName = 'div', attributes = {}) => {
  const element = document.createElement(tagName);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
};

global.createMockEvent = (type, options = {}) => {
  const event = new Event(type, { bubbles: true, cancelable: true, ...options });
  event.preventDefault = jest.fn();
  event.stopPropagation = jest.fn();
  return event;
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

// Setup cleanup after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();

  // Clean up DOM
  document.body.innerHTML = '';

  // Reset Chrome API mocks
  Object.values(chrome.runtime).forEach(api => {
    if (typeof api === 'object' && api.addListener) {
      api.addListener.mockClear();
    }
  });

  chrome.storage.local.get.mockClear();
  chrome.storage.local.set.mockClear();
  chrome.tabs.query.mockClear();
  chrome.tabs.sendMessage.mockClear();
});
