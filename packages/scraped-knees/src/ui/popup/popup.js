// Popup script for ScrapedKnees extension

class PopupController {
  constructor() {
    this.initialize();
  }

  async initialize() {
    // Bind event listeners
    this.bindEventListeners();

    // Load AI status
    await this.loadAIStatus();

    console.log('Popup initialized');
  }

  bindEventListeners() {
    // Open options
    document.getElementById('open-options').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  async loadAIStatus() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_AI_STATUS'
      });
      
      if (response.success) {
        this.updateAIStatus(response.data);
      } else {
        this.updateAIStatus({ isReady: false, error: 'Error loading status' });
      }
    } catch (error) {
      console.error('Error loading AI status:', error);
      this.updateAIStatus({ isReady: false, error: 'Connection error' });
    }
  }

  updateAIStatus(status) {
    const statusElement = document.getElementById('ai-status');
    
    if (status.isReady) {
      statusElement.className = 'status success';
      statusElement.innerHTML = `
        <p>✅ <strong>${status.provider}</strong> - Connected</p>
        <p>Ready for AI operations</p>
      `;
    } else if (status.error) {
      statusElement.className = 'status error';
      statusElement.innerHTML = `
        <p>❌ <strong>${status.provider || 'No Provider'}</strong> - ${status.error}</p>
        <p>Please configure your AI provider in settings</p>
      `;
    } else {
      statusElement.className = 'status info';
      statusElement.innerHTML = `
        <p>⚙️ <strong>Not Configured</strong></p>
        <p>Please set up your AI provider in settings</p>
      `;
    }
  }
}

// Initialize popup controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});