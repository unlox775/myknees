// ScrapedKnees Options Page JavaScript

class OptionsManager {
    constructor() {
        this.defaultOptions = {
            aiProvider: 'none',
            groqApiKey: '',
            groqModel: 'llama3-8b-8192',
            openrouterApiKey: '',
            openrouterModel: 'anthropic/claude-3-haiku',
            autoExtract: false,
            saveTraining: true,
            debugMode: false,
            overlayOpacity: 0.7
        };
        
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadOptions();
        this.updateUI();
        this.loadDataStats();
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

        // Opacity slider
        document.getElementById('overlay-opacity').addEventListener('input', (e) => {
            document.getElementById('opacity-value').textContent = `${Math.round(e.target.value * 100)}%`;
        });

        // Save options
        document.getElementById('save-options').addEventListener('click', () => {
            this.saveOptions();
        });

        // Reset options
        document.getElementById('reset-options').addEventListener('click', () => {
            this.resetOptions();
        });

        // Export data
        document.getElementById('export-data').addEventListener('click', () => {
            this.exportData();
        });

        // Clear data
        document.getElementById('clear-data').addEventListener('click', () => {
            this.clearData();
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
        }
    }

    togglePasswordVisibility(targetId) {
        const input = document.getElementById(targetId);
        const button = document.querySelector(`[data-target="${targetId}"]`);
        
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = '🙈';
        } else {
            input.type = 'password';
            button.textContent = '👁️';
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
        document.getElementById('ai-provider').value = this.options.aiProvider;
        this.toggleApiConfig(this.options.aiProvider);

        // Set API keys
        document.getElementById('groq-api-key').value = this.options.groqApiKey;
        document.getElementById('openrouter-api-key').value = this.options.openrouterApiKey;

        // Set models
        document.getElementById('groq-model').value = this.options.groqModel;
        document.getElementById('openrouter-model').value = this.options.openrouterModel;

        // Set checkboxes
        document.getElementById('auto-extract').checked = this.options.autoExtract;
        document.getElementById('save-training').checked = this.options.saveTraining;
        document.getElementById('debug-mode').checked = this.options.debugMode;

        // Set opacity
        document.getElementById('overlay-opacity').value = this.options.overlayOpacity;
        document.getElementById('opacity-value').textContent = `${Math.round(this.options.overlayOpacity * 100)}%`;
    }

    async saveOptions() {
        const saveButton = document.getElementById('save-options');
        const originalText = saveButton.textContent;
        
        try {
            saveButton.textContent = '💾 Saving...';
            saveButton.disabled = true;

            // Collect form data
            const newOptions = {
                aiProvider: document.getElementById('ai-provider').value,
                groqApiKey: document.getElementById('groq-api-key').value,
                groqModel: document.getElementById('groq-model').value,
                openrouterApiKey: document.getElementById('openrouter-api-key').value,
                openrouterModel: document.getElementById('openrouter-model').value,
                autoExtract: document.getElementById('auto-extract').checked,
                saveTraining: document.getElementById('save-training').checked,
                debugMode: document.getElementById('debug-mode').checked,
                overlayOpacity: parseFloat(document.getElementById('overlay-opacity').value)
            };

            // Validate API keys if provider is selected
            if (newOptions.aiProvider === 'groq' && !newOptions.groqApiKey) {
                this.showStatus('Please enter your Groq.com API key', 'error');
                return;
            }

            if (newOptions.aiProvider === 'openrouter' && !newOptions.openrouterApiKey) {
                this.showStatus('Please enter your OpenRouter API key', 'error');
                return;
            }

            // Save to storage
            await chrome.storage.sync.set(newOptions);
            this.options = newOptions;

                        this.showStatus('Options saved successfully!', 'success');

        } catch (error) {
            console.error('Error saving options:', error);
            this.showStatus('Error saving options. Please try again.', 'error');
        } finally {
            saveButton.textContent = originalText;
            saveButton.disabled = false;
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

    async loadDataStats() {
        try {
            const data = await chrome.storage.local.get(['trainingSessions', 'scrapedData']);
            
            const sessionCount = data.trainingSessions ? data.trainingSessions.length : 0;
            const itemCount = data.scrapedData ? data.scrapedData.reduce((total, session) => total + (session.items ? session.items.length : 0), 0) : 0;
            
            // Calculate storage size (approximate)
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

    async exportData() {
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
            
            this.showStatus('Data exported successfully!', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showStatus('Error exporting data', 'error');
        }
    }

    async clearData() {
        if (confirm('Are you sure you want to clear all training sessions and scraped data? This action cannot be undone.')) {
            try {
                await chrome.storage.local.clear();
                this.loadDataStats();
                this.showStatus('All data cleared successfully', 'success');
            } catch (error) {
                console.error('Error clearing data:', error);
                this.showStatus('Error clearing data', 'error');
            }
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