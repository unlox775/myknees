// Popup script for AI Data Scraper extension

class PopupController {
  constructor() {
    this.currentTab = null;
    this.isTrainingActive = false;
    this.initialize();
  }

  async initialize() {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;

    // Bind event listeners
    this.bindEventListeners();

    // Load initial data
    await this.loadTrainingSessions();
    await this.checkTrainingStatus();

    console.log('Popup initialized for tab:', this.currentTab?.url);
  }

  bindEventListeners() {
    // Training controls
    document.getElementById('start-training').addEventListener('click', () => {
      this.startTraining();
    });

    document.getElementById('stop-training').addEventListener('click', () => {
      this.stopTraining();
    });

    // Data extraction controls
    document.getElementById('extract-data').addEventListener('click', () => {
      this.extractData();
    });

    document.getElementById('export-data').addEventListener('click', () => {
      this.exportData();
    });

    // Session list clicks
    document.getElementById('sessions-list').addEventListener('click', (event) => {
      const sessionItem = event.target.closest('.session-item');
      if (sessionItem) {
        const sessionId = sessionItem.dataset.sessionId;
        this.loadSession(sessionId);
      }
    });
  }

  async startTraining() {
    try {
      if (!this.currentTab) {
        throw new Error('No active tab found');
      }

      // Check if we're on a valid page
      if (!this.currentTab.url || this.currentTab.url.startsWith('chrome://')) {
        throw new Error('Cannot train on this page. Please navigate to a regular website.');
      }

      // Send message to start training
      await chrome.runtime.sendMessage({
        type: 'START_TRAINING',
        data: {
          url: this.currentTab.url,
          timestamp: new Date().toISOString()
        }
      });

      this.isTrainingActive = true;
      this.updateTrainingUI();
      this.showStatus('Training mode started! Use Ctrl+Shift+S to toggle on the page.', 'success');

    } catch (error) {
      console.error('Error starting training:', error);
      this.showStatus(`Error: ${error.message}`, 'error');
    }
  }

  async stopTraining() {
    try {
      if (!this.currentTab) {
        throw new Error('No active tab found');
      }

      // Send message to stop training
      await chrome.runtime.sendMessage({
        type: 'STOP_TRAINING'
      });

      this.isTrainingActive = false;
      this.updateTrainingUI();
      this.showStatus('Training mode stopped.', 'info');

      // Reload sessions to show new data
      await this.loadTrainingSessions();

    } catch (error) {
      console.error('Error stopping training:', error);
      this.showStatus(`Error: ${error.message}`, 'error');
    }
  }

  async extractData() {
    try {
      if (!this.currentTab) {
        throw new Error('No active tab found');
      }

      // Get training sessions for this URL
      const sessions = await this.getTrainingSessions();
      const relevantSessions = sessions.filter(session => 
        session.url === this.currentTab.url
      );

      if (relevantSessions.length === 0) {
        throw new Error('No training data found for this page. Please train the scraper first.');
      }

      // Use the most recent session
      const latestSession = relevantSessions[relevantSessions.length - 1];

      // Send message to execute scraping
      await chrome.runtime.sendMessage({
        type: 'EXECUTE_SCRAPING',
        data: {
          sessionId: latestSession.id,
          config: latestSession.config
        }
      });

      this.showStatus('Data extraction started!', 'success');

    } catch (error) {
      console.error('Error extracting data:', error);
      this.showStatus(`Error: ${error.message}`, 'error');
    }
  }

  async exportData() {
    try {
      const scrapedData = await this.getScrapedData();
      
      if (scrapedData.length === 0) {
        throw new Error('No data to export. Please extract data first.');
      }

      // Create CSV content
      const csvContent = this.convertToCSV(scrapedData);
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `scraped-data-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showStatus('Data exported successfully!', 'success');

    } catch (error) {
      console.error('Error exporting data:', error);
      this.showStatus(`Error: ${error.message}`, 'error');
    }
  }

  convertToCSV(data) {
    if (data.length === 0) return '';

    // Get all unique keys from all objects
    const keys = [...new Set(data.flatMap(obj => Object.keys(obj)))];
    
    // Create header row
    const header = keys.join(',');
    
    // Create data rows
    const rows = data.map(obj => 
      keys.map(key => {
        const value = obj[key] || '';
        // Escape commas and quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );
    
    return [header, ...rows].join('\n');
  }

  async loadTrainingSessions() {
    try {
      this.showLoading(true);
      
      const sessions = await this.getTrainingSessions();
      this.renderTrainingSessions(sessions);
      
    } catch (error) {
      console.error('Error loading training sessions:', error);
      this.showStatus('Error loading training sessions', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async getTrainingSessions() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'GET_TRAINING_SESSIONS' }, (response) => {
        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Failed to get training sessions'));
        }
      });
    });
  }

  async getScrapedData() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'GET_SCRAPED_DATA' }, (response) => {
        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Failed to get scraped data'));
        }
      });
    });
  }

  renderTrainingSessions(sessions) {
    const sessionsList = document.getElementById('sessions-list');
    const emptySessions = document.getElementById('empty-sessions');

    if (sessions.length === 0) {
      sessionsList.style.display = 'none';
      emptySessions.style.display = 'block';
      return;
    }

    sessionsList.style.display = 'block';
    emptySessions.style.display = 'none';

    // Sort sessions by date (newest first)
    const sortedSessions = sessions.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    sessionsList.innerHTML = sortedSessions.map(session => `
      <div class="session-item" data-session-id="${session.id}">
        <div class="session-title">${this.getDomainFromUrl(session.url)}</div>
        <div class="session-meta">
          ${session.selectedElements?.length || 0} elements selected • 
          ${new Date(session.createdAt).toLocaleDateString()}
        </div>
      </div>
    `).join('');
  }

  getDomainFromUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return 'Unknown site';
    }
  }

  async checkTrainingStatus() {
    // This would check if training is currently active on the current tab
    // For now, we'll just check if we're on a valid page
    const isValidPage = this.currentTab && 
                       this.currentTab.url && 
                       !this.currentTab.url.startsWith('chrome://');

    const startButton = document.getElementById('start-training');
    const stopButton = document.getElementById('stop-training');

    if (isValidPage) {
      startButton.disabled = false;
      stopButton.disabled = !this.isTrainingActive;
    } else {
      startButton.disabled = true;
      stopButton.disabled = true;
    }
  }

  updateTrainingUI() {
    const startButton = document.getElementById('start-training');
    const stopButton = document.getElementById('stop-training');
    const statusDiv = document.getElementById('training-status');

    if (this.isTrainingActive) {
      startButton.disabled = true;
      stopButton.disabled = false;
      statusDiv.style.display = 'block';
      statusDiv.className = 'status success';
      statusDiv.textContent = 'Training mode is active!';
    } else {
      startButton.disabled = false;
      stopButton.disabled = true;
      statusDiv.style.display = 'none';
    }
  }

  showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('training-status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (statusDiv.textContent === message) {
        statusDiv.style.display = 'none';
      }
    }, 5000);
  }

  showLoading(show) {
    const loading = document.querySelector('.loading');
    const sessionsList = document.getElementById('sessions-list');
    const emptySessions = document.getElementById('empty-sessions');

    if (show) {
      loading.style.display = 'block';
      sessionsList.style.display = 'none';
      emptySessions.style.display = 'none';
    } else {
      loading.style.display = 'none';
    }
  }

  async loadSession(sessionId) {
    try {
      const sessions = await this.getTrainingSessions();
      const session = sessions.find(s => s.id === sessionId);
      
      if (session) {
        // Navigate to the session URL if it's different from current tab
        if (session.url !== this.currentTab.url) {
          await chrome.tabs.update(this.currentTab.id, { url: session.url });
        }
        
        this.showStatus(`Loaded training session for ${this.getDomainFromUrl(session.url)}`, 'success');
      }
    } catch (error) {
      console.error('Error loading session:', error);
      this.showStatus('Error loading session', 'error');
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});