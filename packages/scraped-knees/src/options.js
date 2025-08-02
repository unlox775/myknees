// ScrapedKnees Options Page JavaScript

class OptionsManager {
  constructor() {
    this.defaultOptions = {
      selectedProvider: null,
      apiKeys: {},
      selectedModels: {},
      autoCheckStatus: true,
      debugMode: false
    };
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadOptions();
        this.updateUI();
        
        // Auto-check status if enabled
        if (this.options.autoCheckStatus && this.options.selectedProvider) {
            setTimeout(() => {
                this.checkStatus();
            }, 500); // Small delay to ensure UI is loaded
        }
    }

      bindEvents() {
    // AI Provider selection
    document.getElementById('ai-provider').addEventListener('change', (e) => {
      this.toggleApiConfig(e.target.value);
    });

    // Password toggle buttons
    document.querySelectorAll('.toggle-password').forEach(button => {
      button.addEventListener('click', (e) => {
        this.togglePasswordVisibility(e.target.dataset.target);
      });
    });

    // Save options
    document.getElementById('save-options').addEventListener('click', () => {
      this.saveOptions();
    });

    // Reset options
    document.getElementById('reset-options').addEventListener('click', () => {
      this.resetOptions();
    });

    // Test connection
    document.getElementById('test-connection').addEventListener('click', () => {
      this.testConnection();
    });

    // Check status
    document.getElementById('check-status').addEventListener('click', () => {
      this.checkStatus();
    });

    // Debug mode toggle
    document.getElementById('debug-mode').addEventListener('change', (e) => {
      this.toggleDebugMode(e.target.checked);
    });
  }

      toggleApiConfig(provider) {
    // Hide all config sections
    document.querySelectorAll('.api-config').forEach(config => {
      config.style.display = 'none';
    });

    // Show selected provider config
    if (provider === 'groq') {
      document.getElementById('groq-config').style.display = 'block';
    } else if (provider === 'openrouter') {
      document.getElementById('openrouter-config').style.display = 'block';
    } else if (provider === 'openai') {
      document.getElementById('openai-config').style.display = 'block';
    } else if (provider === 'anthropic') {
      document.getElementById('anthropic-config').style.display = 'block';
    }
  }

    togglePasswordVisibility(targetId) {
        console.log('Toggling password visibility for:', targetId);
        const input = document.getElementById(targetId);
        const button = document.querySelector(`button[data-target="${targetId}"]`);
        
        console.log('Found input:', input);
        console.log('Found button:', button);
        
        if (!input || !button) {
            console.error('Could not find input or button for:', targetId);
            return;
        }
        
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '🙈';
            console.log('Password now visible');
        } else {
            input.type = 'password';
            button.textContent = '👁️';
            console.log('Password now hidden');
        }
    }

    async loadOptions() {
        try {
            const result = await chrome.storage.sync.get(this.defaultOptions);
            this.options = { ...this.defaultOptions, ...result };
        } catch (error) {
            console.error('Error loading options:', error);
            this.options = { ...this.defaultOptions };
        }
    }

      updateUI() {
    // Set AI provider
    document.getElementById('ai-provider').value = this.options.selectedProvider || 'none';
    this.toggleApiConfig(this.options.selectedProvider || 'none');

    // Set API keys
    document.getElementById('groq-api-key').value = this.options.apiKeys.groq || '';
    document.getElementById('openrouter-api-key').value = this.options.apiKeys.openrouter || '';
    document.getElementById('openai-api-key').value = this.options.apiKeys.openai || '';
    document.getElementById('anthropic-api-key').value = this.options.apiKeys.anthropic || '';

    // Set models
    document.getElementById('groq-model').value = this.options.selectedModels.groq || 'llama3-8b-8192';
    document.getElementById('openrouter-model').value = this.options.selectedModels.openrouter || 'anthropic/claude-3-haiku';
    document.getElementById('openai-model').value = this.options.selectedModels.openai || 'gpt-4o';
    document.getElementById('anthropic-model').value = this.options.selectedModels.anthropic || 'claude-3-5-sonnet-20241022';

    // Set checkboxes
    document.getElementById('auto-check-status').checked = this.options.autoCheckStatus;
    document.getElementById('debug-mode').checked = this.options.debugMode;

    // Update status display
    this.updateStatusDisplay();
    
    // Show/hide debug section based on debug mode
    this.toggleDebugMode(this.options.debugMode);
  }

    async saveOptions() {
        const saveButton = document.getElementById('save-options');
        const originalText = saveButton.textContent;
        
        try {
            saveButton.textContent = '💾 Saving...';
            saveButton.disabled = true;

            // Collect form data
            const selectedProvider = document.getElementById('ai-provider').value;
            const newOptions = {
                selectedProvider: selectedProvider === 'none' ? null : selectedProvider,
                apiKeys: {
                    groq: document.getElementById('groq-api-key').value,
                    openrouter: document.getElementById('openrouter-api-key').value,
                    openai: document.getElementById('openai-api-key').value,
                    anthropic: document.getElementById('anthropic-api-key').value
                },
                selectedModels: {
                    groq: document.getElementById('groq-model').value,
                    openrouter: document.getElementById('openrouter-model').value,
                    openai: document.getElementById('openai-model').value,
                    anthropic: document.getElementById('anthropic-model').value
                },
                autoCheckStatus: document.getElementById('auto-check-status').checked,
                debugMode: document.getElementById('debug-mode').checked
            };

            // Validate API key if provider is selected
            if (selectedProvider !== 'none' && !newOptions.apiKeys[selectedProvider]) {
                this.showStatus(`Please enter your ${selectedProvider} API key`, 'error');
                return;
            }

            // Save to storage
            await chrome.storage.sync.set(newOptions);
            this.options = newOptions;

                        this.showStatus('Options saved successfully!', 'success');
            
            // Update status display
            this.updateStatusDisplay();

        } catch (error) {
            console.error('Error saving options:', error);
            this.showStatus('Error saving options. Please try again.', 'error');
        } finally {
            saveButton.textContent = originalText;
            saveButton.disabled = false;
        }
    }

    async testConnection() {
        // Get current values from the form, not from saved options
        const selectedProvider = document.getElementById('ai-provider').value;
        if (selectedProvider === 'none' || !selectedProvider) {
            this.showStatus('No provider selected', 'error');
            return;
        }

        const apiKey = document.getElementById(`${selectedProvider}-api-key`).value;
        if (!apiKey) {
            this.showStatus('No API key configured', 'error');
            return;
        }

        try {
            this.showStatus('Testing connection...', 'info');
            console.log('Sending test connection message:', { provider: selectedProvider, apiKey: '***' });
            
            // Send message to background script to test connection
            const response = await chrome.runtime.sendMessage({
                type: 'TEST_AI_CONNECTION',
                data: { provider: selectedProvider, apiKey }
            });

            console.log('Received test connection response:', response);

            if (response.success) {
                this.showStatus('Connection successful!', 'success');
            } else {
                this.showStatus(`Connection failed: ${response.error}`, 'error');
            }
        } catch (error) {
            console.error('Error in test connection:', error);
            this.showStatus('Error testing connection', 'error');
        }
    }

    async checkStatus() {
        try {
            this.showStatus('Checking status...', 'info');
            console.log('Sending get AI status message');
            
            const response = await chrome.runtime.sendMessage({
                type: 'GET_AI_STATUS'
            });

            console.log('Received AI status response:', response);

            if (response.success) {
                this.updateStatusDisplay(response.data);
                this.showStatus('Status updated', 'success');
                
                // Update debug info if debug mode is enabled
                if (this.options.debugMode) {
                    this.loadDebugInfo();
                }
            } else {
                this.showStatus('Error checking status', 'error');
            }
        } catch (error) {
            console.error('Error in check status:', error);
            this.showStatus('Error checking status', 'error');
        }
    }

    updateStatusDisplay(status = null) {
        const selectedProvider = status?.provider || this.options.selectedProvider;
        const isReady = status?.isReady || false;
        const error = status?.error || null;
        const lastChecked = status?.lastChecked || null;

        document.getElementById('selected-provider').textContent = selectedProvider || 'None';
        
        const connectionStatus = document.getElementById('connection-status');
        if (isReady) {
            connectionStatus.textContent = '✅ Connected';
            connectionStatus.className = 'status-connected';
        } else if (error) {
            connectionStatus.textContent = `❌ ${error}`;
            connectionStatus.className = 'status-error';
        } else {
            connectionStatus.textContent = 'Not configured';
            connectionStatus.className = '';
        }

        const lastCheckedElement = document.getElementById('last-checked');
        if (lastChecked) {
            const date = new Date(lastChecked);
            lastCheckedElement.textContent = date.toLocaleString();
        } else {
            lastCheckedElement.textContent = 'Never';
        }
    }

    

    async resetOptions() {
        if (confirm('Are you sure you want to reset all options to their default values?')) {
            try {
                await chrome.storage.sync.clear();
                this.options = { ...this.defaultOptions };
                this.updateUI();
                this.showStatus('Options reset to defaults', 'success');
            } catch (error) {
                console.error('Error resetting options:', error);
                this.showStatus('Error resetting options', 'error');
            }
        }
    }



    toggleDebugMode(enabled) {
        const debugSection = document.getElementById('debug-section');
        if (enabled) {
            debugSection.style.display = 'block';
            this.loadDebugInfo();
        } else {
            debugSection.style.display = 'none';
        }
    }

    async loadDebugInfo() {
        try {
            const response = await chrome.runtime.sendMessage({
                type: 'GET_USAGE_STATS'
            });

            if (response.success) {
                this.updateDebugDisplay(response.data);
            }
        } catch (error) {
            console.error('Error loading debug info:', error);
        }
    }

    updateDebugDisplay(usageStats) {
        const selectedProvider = this.options.selectedProvider;
        if (!selectedProvider || !usageStats[selectedProvider]) {
            document.getElementById('total-requests').textContent = '0';
            document.getElementById('last-used').textContent = 'Never';
            return;
        }

        const stats = usageStats[selectedProvider];
        document.getElementById('total-requests').textContent = stats.requests.toString();
        
        if (stats.lastUsed) {
            const date = new Date(stats.lastUsed);
            document.getElementById('last-used').textContent = date.toLocaleString();
        } else {
            document.getElementById('last-used').textContent = 'Never';
        }
    }

    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('status-message');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type} show`;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            statusElement.classList.remove('show');
        }, 5000);
    }
}

// Initialize options manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new OptionsManager();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OptionsManager };
}