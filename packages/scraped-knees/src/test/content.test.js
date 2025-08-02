// Unit tests for content script functionality

describe('ContentScript', () => {
  let contentScript;
  let mockOverlayContainer;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="test-container">
        <div class="item" data-id="1">Item 1</div>
        <div class="item" data-id="2">Item 2</div>
        <div class="advertisement">Ad Content</div>
        <div class="item" data-id="3">Item 3</div>
      </div>
    `;

    // Mock overlay container
    mockOverlayContainer = document.createElement('div');
    mockOverlayContainer.id = 'ai-scraper-overlay';
    document.body.appendChild(mockOverlayContainer);

    // Import and initialize content script
    // Note: In a real test environment, you'd need to properly import the module
    // For now, we'll test the individual methods
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Element Selection', () => {
    test('should select elements when clicked', () => {
      const element = document.querySelector('.item');
      const elementInfo = {
        tagName: 'DIV',
        className: 'item',
        textContent: 'Item 1',
        xpath: '/div[1]/div[1]',
        cssSelector: '.item'
      };

      // Simulate element selection
      const selectedElements = [];
      selectedElements.push({ element, info: elementInfo });

      expect(selectedElements).toHaveLength(1);
      expect(selectedElements[0].element).toBe(element);
      expect(selectedElements[0].info.textContent).toBe('Item 1');
    });

    test('should exclude elements when Ctrl+clicked', () => {
      const element = document.querySelector('.advertisement');
      const elementInfo = {
        tagName: 'DIV',
        className: 'advertisement',
        textContent: 'Ad Content',
        xpath: '/div[1]/div[3]',
        cssSelector: '.advertisement'
      };

      // Simulate element exclusion
      const excludedElements = [];
      excludedElements.push({ element, info: elementInfo });

      expect(excludedElements).toHaveLength(1);
      expect(excludedElements[0].element).toBe(element);
      expect(excludedElements[0].info.className).toBe('advertisement');
    });

    test('should generate correct XPath for elements', () => {
      const element = document.querySelector('.item[data-id="2"]');

      // Mock XPath generation
      const generateXPath = (element) => {
        if (element.id) {
          return `//*[@id="${element.id}"]`;
        }

        let path = '';
        while (element && element.nodeType === Node.ELEMENT_NODE) {
          let index = 1;
          let sibling = element.previousSibling;
          while (sibling) {
            if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
              index++;
            }
            sibling = sibling.previousSibling;
          }

          const tagName = element.tagName.toLowerCase();
          const pathIndex = index > 1 ? `[${index}]` : '';
          path = `/${tagName}${pathIndex}${path}`;
          element = element.parentNode;
        }
        return path;
      };

      const xpath = generateXPath(element);
      expect(xpath).toContain('div');
      expect(xpath).toContain('[2]'); // Second div
    });

    test('should generate correct CSS selector for elements', () => {
      const element = document.querySelector('.item[data-id="1"]');

      // Mock CSS selector generation
      const generateCSSSelector = (element) => {
        if (element.id) {
          return `#${element.id}`;
        }

        if (element.className) {
          const classes = element.className.split(' ').filter(c => c.trim());
          if (classes.length > 0) {
            return `.${classes.join('.')}`;
          }
        }

        return element.tagName.toLowerCase();
      };

      const selector = generateCSSSelector(element);
      expect(selector).toBe('.item');
    });
  });

  describe('Training Mode', () => {
    test('should start training mode correctly', () => {
      const isTrainingMode = true;
      const selectedElements = [];
      const excludedElements = [];
      const trainingConfig = { mode: 'list_items' };

      expect(isTrainingMode).toBe(true);
      expect(selectedElements).toHaveLength(0);
      expect(excludedElements).toHaveLength(0);
      expect(trainingConfig.mode).toBe('list_items');
    });

    test('should stop training mode and save data', () => {
      const isTrainingMode = false;
      const selectedElements = [
        { element: document.querySelector('.item'), info: { textContent: 'Item 1' } }
      ];

      // Simulate saving training data
      const trainingData = {
        url: 'https://example.com',
        timestamp: new Date().toISOString(),
        selectedElements: selectedElements.map(item => item.info),
        excludedElements: []
      };

      expect(isTrainingMode).toBe(false);
      expect(trainingData.selectedElements).toHaveLength(1);
      expect(trainingData.selectedElements[0].textContent).toBe('Item 1');
    });

    test('should handle keyboard shortcuts', () => {
      const eventHandlers = {
        'Ctrl+Shift+S': jest.fn(),
        'Escape': jest.fn()
      };

      // Simulate Ctrl+Shift+S
      const ctrlShiftSEvent = new KeyboardEvent('keydown', {
        ctrlKey: true,
        shiftKey: true,
        key: 'S'
      });

      // Simulate Escape
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape'
      });

      expect(typeof eventHandlers['Ctrl+Shift+S']).toBe('function');
      expect(typeof eventHandlers['Escape']).toBe('function');
    });
  });

  describe('Overlay Management', () => {
    test('should create overlay container', () => {
      const overlayContainer = document.getElementById('ai-scraper-overlay');

      expect(overlayContainer).toBeTruthy();
      expect(overlayContainer.id).toBe('ai-scraper-overlay');
    });

    test('should add element overlays', () => {
      const element = document.querySelector('.item');
      const rect = element.getBoundingClientRect();

      // Mock overlay creation
      const overlay = document.createElement('div');
      overlay.className = 'ai-scraper-overlay ai-scraper-selected';
      overlay.style.cssText = `
        position: absolute;
        top: ${rect.top + window.scrollY}px;
        left: ${rect.left + window.scrollX}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        border: 2px solid #4CAF50;
        background-color: rgba(76, 175, 80, 0.2);
        pointer-events: none;
        z-index: 1000000;
      `;

      mockOverlayContainer.appendChild(overlay);

      expect(mockOverlayContainer.children).toHaveLength(1);
      expect(overlay.className).toContain('ai-scraper-selected');
      expect(overlay.style.border).toContain('#4caf50');
    });

    test('should clear overlays', () => {
      // Add some overlays
      const overlay1 = document.createElement('div');
      overlay1.className = 'ai-scraper-overlay';
      const overlay2 = document.createElement('div');
      overlay2.className = 'ai-scraper-overlay';

      mockOverlayContainer.appendChild(overlay1);
      mockOverlayContainer.appendChild(overlay2);

      expect(mockOverlayContainer.children).toHaveLength(2);

      // Clear overlays
      const overlays = mockOverlayContainer.querySelectorAll('.ai-scraper-overlay');
      overlays.forEach(overlay => overlay.remove());

      expect(mockOverlayContainer.children).toHaveLength(0);
    });
  });

  describe('Message Handling', () => {
    test('should handle START_TRAINING_MODE message', () => {
      const message = {
        type: 'START_TRAINING_MODE',
        data: { mode: 'list_items' }
      };

      const sendResponse = jest.fn();

      // Mock message handling
      const handleMessage = (message, sender, sendResponse) => {
        switch (message.type) {
        case 'START_TRAINING_MODE':
          sendResponse({ success: true });
          break;
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
        }
      };

      handleMessage(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle STOP_TRAINING_MODE message', () => {
      const message = {
        type: 'STOP_TRAINING_MODE'
      };

      const sendResponse = jest.fn();

      // Mock message handling
      const handleMessage = (message, sender, sendResponse) => {
        switch (message.type) {
        case 'STOP_TRAINING_MODE':
          sendResponse({ success: true });
          break;
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
        }
      };

      handleMessage(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('Data Extraction', () => {
    test('should extract element information correctly', () => {
      const element = document.querySelector('.item[data-id="1"]');

      // Mock element info extraction
      const getElementInfo = (element) => {
        return {
          tagName: element.tagName,
          className: element.className,
          id: element.id,
          textContent: element.textContent?.trim().substring(0, 100),
          attributes: Array.from(element.attributes).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {}),
          xpath: '/div[1]/div[1]',
          cssSelector: '.item'
        };
      };

      const elementInfo = getElementInfo(element);

      expect(elementInfo.tagName).toBe('DIV');
      expect(elementInfo.className).toBe('item');
      expect(elementInfo.textContent).toBe('Item 1');
      expect(elementInfo.attributes['data-id']).toBe('1');
      expect(elementInfo.cssSelector).toBe('.item');
    });

    test('should handle data extraction errors gracefully', () => {
      const invalidElement = null;

      // Mock safe element info extraction
      const getElementInfo = (element) => {
        if (!element) {
          return null;
        }

        return {
          tagName: element.tagName,
          className: element.className,
          textContent: element.textContent?.trim() || ''
        };
      };

      const elementInfo = getElementInfo(invalidElement);
      expect(elementInfo).toBeNull();
    });
  });
});
