// Content script for AI Data Scraper extension

import './content.css';

class ContentScript {
  constructor() {
    this.isTrainingMode = false;
    this.selectedElements = [];
    this.excludedElements = [];
    this.overlayContainer = null;
    this.trainingConfig = null;
    this.initialize();
  }

  initialize() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    // Create overlay container
    this.createOverlayContainer();

    // Add keyboard shortcuts
    this.addKeyboardShortcuts();

    console.log('AI Data Scraper content script initialized');
  }

  createOverlayContainer() {
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.id = 'ai-scraper-overlay';
    this.overlayContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999999;
      display: none;
    `;
    document.body.appendChild(this.overlayContainer);
  }

  addKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl+Shift+S to start/stop training
      if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        this.toggleTrainingMode();
      }

      // Escape to stop training
      if (event.key === 'Escape' && this.isTrainingMode) {
        this.stopTrainingMode();
      }
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'START_TRAINING_MODE':
          await this.startTrainingMode(message.data);
          sendResponse({ success: true });
          break;

        case 'STOP_TRAINING_MODE':
          await this.stopTrainingMode();
          sendResponse({ success: true });
          break;

        case 'EXECUTE_SCRAPING':
          await this.executeScraping(message.data);
          sendResponse({ success: true });
          break;

        default:
          console.warn('Unknown message type in content script:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message in content script:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async startTrainingMode(config) {
    this.isTrainingMode = true;
    this.trainingConfig = config;
    this.selectedElements = [];
    this.excludedElements = [];

    this.showOverlay();
    this.addElementSelectionHandlers();
    this.showTrainingUI();

    console.log('Training mode started');
  }

  async stopTrainingMode() {
    this.isTrainingMode = false;
    this.hideOverlay();
    this.removeElementSelectionHandlers();
    this.hideTrainingUI();

    // Save training data
    if (this.selectedElements.length > 0) {
      await this.saveTrainingData();
    }

    console.log('Training mode stopped');
  }

  showOverlay() {
    this.overlayContainer.style.display = 'block';
    this.overlayContainer.style.pointerEvents = 'auto';
  }

  hideOverlay() {
    this.overlayContainer.style.display = 'none';
    this.overlayContainer.style.pointerEvents = 'none';
    this.clearOverlays();
  }

  addElementSelectionHandlers() {
    document.addEventListener('click', this.handleElementClick.bind(this), true);
    document.addEventListener('mouseover', this.handleElementHover.bind(this), true);
    document.addEventListener('mouseout', this.handleElementMouseOut.bind(this), true);
  }

  removeElementSelectionHandlers() {
    document.removeEventListener('click', this.handleElementClick.bind(this), true);
    document.removeEventListener('mouseover', this.handleElementHover.bind(this), true);
    document.removeEventListener('mouseout', this.handleElementMouseOut.bind(this), true);
  }

  handleElementClick(event) {
    if (!this.isTrainingMode) return;

    event.preventDefault();
    event.stopPropagation();

    const element = event.target;
    const elementInfo = this.getElementInfo(element);

    if (event.ctrlKey) {
      // Ctrl+click to exclude element
      this.excludeElement(element, elementInfo);
    } else {
      // Regular click to select element
      this.selectElement(element, elementInfo);
    }
  }

  handleElementHover(event) {
    if (!this.isTrainingMode) return;

    const element = event.target;
    this.showElementPreview(element);
  }

  handleElementMouseOut(event) {
    if (!this.isTrainingMode) return;

    this.hideElementPreview();
  }

  selectElement(element, elementInfo) {
    if (this.selectedElements.some(el => el.element === element)) {
      // Remove if already selected
      this.selectedElements = this.selectedElements.filter(el => el.element !== element);
      this.removeElementOverlay(element);
    } else {
      // Add to selection
      this.selectedElements.push({ element, info: elementInfo });
      this.addElementOverlay(element, 'selected');
    }

    this.updateTrainingUI();
  }

  excludeElement(element, elementInfo) {
    if (this.excludedElements.some(el => el.element === element)) {
      // Remove if already excluded
      this.excludedElements = this.excludedElements.filter(el => el.element !== element);
      this.removeElementOverlay(element);
    } else {
      // Add to exclusions
      this.excludedElements.push({ element, info: elementInfo });
      this.addElementOverlay(element, 'excluded');
    }

    this.updateTrainingUI();
  }

  getElementInfo(element) {
    return {
      tagName: element.tagName,
      className: element.className,
      id: element.id,
      textContent: element.textContent?.trim().substring(0, 100),
      attributes: this.getElementAttributes(element),
      xpath: this.getElementXPath(element),
      cssSelector: this.getElementCSSSelector(element)
    };
  }

  getElementAttributes(element) {
    const attributes = {};
    for (let attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  getElementXPath(element) {
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
  }

  getElementCSSSelector(element) {
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
  }

  addElementOverlay(element, type) {
    const rect = element.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.className = `ai-scraper-overlay ai-scraper-${type}`;
    overlay.style.cssText = `
      position: absolute;
      top: ${rect.top + window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid ${type === 'selected' ? '#4CAF50' : '#f44336'};
      background-color: ${type === 'selected' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'};
      pointer-events: none;
      z-index: 1000000;
    `;

    this.overlayContainer.appendChild(overlay);
  }

  removeElementOverlay(element) {
    const overlays = this.overlayContainer.querySelectorAll('.ai-scraper-overlay');
    overlays.forEach(overlay => {
      const rect = element.getBoundingClientRect();
      const overlayRect = overlay.getBoundingClientRect();
      
      if (rect.top === overlayRect.top && rect.left === overlayRect.left) {
        overlay.remove();
      }
    });
  }

  clearOverlays() {
    const overlays = this.overlayContainer.querySelectorAll('.ai-scraper-overlay');
    overlays.forEach(overlay => overlay.remove());
  }

  showElementPreview(element) {
    // Implementation for showing element preview on hover
  }

  hideElementPreview() {
    // Implementation for hiding element preview
  }

  showTrainingUI() {
    // Create training UI overlay
    const trainingUI = document.createElement('div');
    trainingUI.id = 'ai-scraper-training-ui';
    trainingUI.innerHTML = `
      <div class="training-panel">
        <h3>AI Data Scraper Training</h3>
        <div class="training-stats">
          <span>Selected: <span id="selected-count">0</span></span>
          <span>Excluded: <span id="excluded-count">0</span></span>
        </div>
        <div class="training-controls">
          <button id="save-training">Save Training</button>
          <button id="stop-training">Stop Training</button>
        </div>
        <div class="training-help">
          <p>Click elements to select them for data extraction</p>
          <p>Ctrl+Click to exclude elements (ads, etc.)</p>
          <p>Press Escape to stop training</p>
        </div>
      </div>
    `;

    document.body.appendChild(trainingUI);
    this.bindTrainingUIEvents();
  }

  hideTrainingUI() {
    const trainingUI = document.getElementById('ai-scraper-training-ui');
    if (trainingUI) {
      trainingUI.remove();
    }
  }

  bindTrainingUIEvents() {
    document.getElementById('save-training')?.addEventListener('click', () => {
      this.saveTrainingData();
    });

    document.getElementById('stop-training')?.addEventListener('click', () => {
      this.stopTrainingMode();
    });
  }

  updateTrainingUI() {
    const selectedCount = document.getElementById('selected-count');
    const excludedCount = document.getElementById('excluded-count');

    if (selectedCount) {
      selectedCount.textContent = this.selectedElements.length;
    }
    if (excludedCount) {
      excludedCount.textContent = this.excludedElements.length;
    }
  }

  async saveTrainingData() {
    const trainingData = {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      selectedElements: this.selectedElements.map(item => item.info),
      excludedElements: this.excludedElements.map(item => item.info),
      config: this.trainingConfig
    };

    await chrome.runtime.sendMessage({
      type: 'SAVE_TRAINING_DATA',
      data: trainingData
    });

    console.log('Training data saved:', trainingData);
  }

  async executeScraping(config) {
    // Implementation for executing scraping based on training data
    console.log('Executing scraping with config:', config);
  }

  toggleTrainingMode() {
    if (this.isTrainingMode) {
      this.stopTrainingMode();
    } else {
      this.startTrainingMode({});
    }
  }
}

// Initialize content script
new ContentScript();