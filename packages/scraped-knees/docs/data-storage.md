# Data Storage

## Overview
This document describes the current data storage patterns used in ScrapedKnees, focusing on what's actually implemented rather than future plans.

## Current Storage Implementation

### 1. Chrome Storage API
The extension primarily uses Chrome's storage API for data persistence:

#### Storage Types Used
- **Chrome Storage Local**: For larger datasets and user preferences
- **Chrome Storage Sync**: For cross-device synchronization of settings

#### Current Data Stored

##### User Preferences
```javascript
{
  // AI Provider Settings
  aiProvider: 'groq',
  apiKeys: {
    groq: 'encrypted-api-key',
    openrouter: 'encrypted-api-key',
    openai: 'encrypted-api-key',
    anthropic: 'encrypted-api-key'
  },
  models: {
    groq: 'llama3-8b-8192',
    openrouter: 'gpt-4',
    openai: 'gpt-4',
    anthropic: 'claude-3-sonnet'
  },
  
  // Extension Settings
  settings: {
    autoExtract: false,
    debugMode: false,
    overlayOpacity: 0.3,
    saveTraining: true
  },
  
  // UI Preferences
  ui: {
    theme: 'light',
    language: 'en'
  }
}
```

##### Training Sessions (Basic)
```javascript
{
  id: 'session-123',
  name: 'E-commerce Product Scraping',
  url: 'https://example.com/products',
  domain: 'example.com',
  createdAt: 1640995200000,
  updatedAt: 1640995200000,
  selectedElements: [
    {
      selector: '.product-title',
      type: 'text',
      name: 'Product Name'
    },
    {
      selector: '.product-price',
      type: 'text',
      name: 'Price'
    }
  ],
  excludedElements: [
    {
      selector: '.advertisement',
      type: 'exclude'
    }
  ]
}
```

##### Extracted Data (Basic)
```javascript
{
  id: 'extraction-456',
  sessionId: 'session-123',
  url: 'https://example.com/products',
  extractedAt: 1640995200000,
  data: [
    {
      'Product Name': 'Sample Product 1',
      'Price': '$19.99'
    },
    {
      'Product Name': 'Sample Product 2',
      'Price': '$29.99'
    }
  ],
  metadata: {
    itemCount: 2,
    extractionTime: 1500,
    success: true
  }
}
```

### 2. Local Storage (Browser)
Used for temporary data and session state:

#### Session State
```javascript
{
  currentTrainingSession: {
    isActive: true,
    sessionId: 'session-123',
    selectedElements: [],
    excludedElements: []
  },
  
  currentExtraction: {
    isRunning: false,
    progress: 0,
    currentPage: 1
  }
}
```

#### UI State
```javascript
{
  popupState: {
    isOpen: false,
    currentTab: 'extract',
    lastExportFormat: 'csv'
  },
  
  overlayState: {
    isVisible: false,
    opacity: 0.3,
    selectedElement: null
  }
}
```

## Storage Operations

### Reading Data
```javascript
// Get user preferences
chrome.storage.sync.get(['aiProvider', 'apiKeys', 'settings'], (result) => {
  const { aiProvider, apiKeys, settings } = result;
  // Use the data
});

// Get training sessions
chrome.storage.local.get(['trainingSessions'], (result) => {
  const sessions = result.trainingSessions || [];
  // Process sessions
});
```

### Writing Data
```javascript
// Save user preferences
chrome.storage.sync.set({
  aiProvider: 'groq',
  apiKeys: { groq: 'new-key' },
  settings: { debugMode: true }
});

// Save training session
chrome.storage.local.set({
  trainingSessions: [...existingSessions, newSession]
});
```

### Data Validation
```javascript
// Validate API key before saving
async function validateAndSaveAPIKey(provider, key) {
  try {
    const isValid = await testAPIKey(provider, key);
    if (isValid) {
      await chrome.storage.sync.set({
        [`apiKeys.${provider}`]: key
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('API key validation failed:', error);
    return false;
  }
}
```

## Data Export/Import

### Export Functionality
```javascript
// Export training sessions
function exportTrainingSessions() {
  chrome.storage.local.get(['trainingSessions'], (result) => {
    const sessions = result.trainingSessions || [];
    const dataStr = JSON.stringify(sessions, null, 2);
    downloadFile(dataStr, 'training-sessions.json', 'application/json');
  });
}

// Export extracted data
function exportExtractedData(format = 'csv') {
  chrome.storage.local.get(['extractedData'], (result) => {
    const data = result.extractedData || [];
    if (format === 'csv') {
      const csv = convertToCSV(data);
      downloadFile(csv, 'extracted-data.csv', 'text/csv');
    } else {
      const json = JSON.stringify(data, null, 2);
      downloadFile(json, 'extracted-data.json', 'application/json');
    }
  });
}
```

### Import Functionality
```javascript
// Import training sessions
function importTrainingSessions(fileContent) {
  try {
    const sessions = JSON.parse(fileContent);
    if (Array.isArray(sessions)) {
      chrome.storage.local.set({ trainingSessions: sessions });
      return { success: true, count: sessions.length };
    }
    return { success: false, error: 'Invalid format' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## Data Management

### Cleanup Operations
```javascript
// Clear old extracted data
function cleanupOldData(daysToKeep = 30) {
  const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
  
  chrome.storage.local.get(['extractedData'], (result) => {
    const data = result.extractedData || [];
    const filteredData = data.filter(item => item.extractedAt > cutoffDate);
    
    chrome.storage.local.set({ extractedData: filteredData });
  });
}

// Clear all data
function clearAllData() {
  chrome.storage.local.clear();
  chrome.storage.sync.clear();
}
```

### Data Statistics
```javascript
// Get storage statistics
function getStorageStats() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (localData) => {
      chrome.storage.sync.get(null, (syncData) => {
        const stats = {
          localStorageSize: JSON.stringify(localData).length,
          syncStorageSize: JSON.stringify(syncData).length,
          trainingSessionsCount: localData.trainingSessions?.length || 0,
          extractedDataCount: localData.extractedData?.length || 0
        };
        resolve(stats);
      });
    });
  });
}
```

## Security Considerations

### API Key Protection
- API keys are stored in Chrome's secure storage
- Keys are not logged or exposed in console
- Validation before saving keys
- Option to clear keys from storage

### Data Privacy
- All data stored locally by default
- No automatic cloud sync of sensitive data
- User control over what data is exported
- Clear data deletion options

## Performance Considerations

### Storage Limits
- Chrome Storage Local: ~5MB
- Chrome Storage Sync: ~100KB
- Local Storage: ~5-10MB per domain

### Optimization Strategies
- Compress large datasets before storage
- Clean up old data regularly
- Use efficient data structures
- Batch storage operations

## Error Handling

### Storage Errors
```javascript
// Handle storage quota exceeded
chrome.storage.local.set(data, () => {
  if (chrome.runtime.lastError) {
    if (chrome.runtime.lastError.message.includes('QUOTA_BYTES_PER_ITEM')) {
      // Handle quota exceeded
      cleanupOldData();
      retryStorage();
    }
  }
});
```

### Data Corruption
```javascript
// Validate data integrity
function validateStoredData() {
  chrome.storage.local.get(null, (data) => {
    const errors = [];
    
    // Check training sessions
    if (data.trainingSessions && !Array.isArray(data.trainingSessions)) {
      errors.push('Training sessions corrupted');
    }
    
    // Check extracted data
    if (data.extractedData && !Array.isArray(data.extractedData)) {
      errors.push('Extracted data corrupted');
    }
    
    if (errors.length > 0) {
      console.error('Data corruption detected:', errors);
      // Attempt recovery or clear corrupted data
    }
  });
}
```

## Future Considerations

### Potential Improvements
- IndexedDB for larger datasets
- Compression for storage efficiency
- Better data versioning
- Automatic backup/restore
- Cross-device sync for non-sensitive data

### Migration Paths
- Schema versioning for data structure changes
- Migration scripts for data format updates
- Backward compatibility for user data