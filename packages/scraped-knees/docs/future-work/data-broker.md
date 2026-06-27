# Data Broker

## Overview
The Data Broker handles the export and synchronization of extracted data to external systems. It supports multiple export formats, destinations, and automation features to ensure data flows seamlessly from the extension to user-preferred locations.

## Core Responsibilities

### 1. Data Export Management
- Export data in multiple formats (CSV, JSON, Excel, etc.)
- Handle large dataset exports efficiently
- Support incremental and full data exports
- Manage export scheduling and automation

### 2. External System Integration
- Connect to Google Sheets API for automated updates
- Support webhook integrations for real-time data pushing
- Handle API authentication and rate limiting
- Manage data synchronization state

### 3. Format Conversion
- Transform repository data into export-friendly formats
- Handle data type conversions and formatting
- Support custom field mapping and transformations
- Generate export metadata and documentation

### 4. Export Orchestration
- Coordinate exports across multiple repositories
- Handle export dependencies and sequences
- Support batch export operations
- Manage export job queuing and processing

## Data Models

### Export Configuration
```javascript
{
  id: "export-config-uuid",
  repositoryId: "amazon-orders",
  name: "Amazon Orders to Google Sheets",
  enabled: true,
  
  // Export destination
  destination: {
    type: "google_sheets", // csv, json, excel, google_sheets, webhook, api
    config: {
      spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      sheetName: "Amazon Orders",
      range: "A1:Z1000",
      appendMode: true // true for append, false for overwrite
    },
    authentication: {
      method: "oauth2",
      credentials: "encrypted-oauth-token",
      refreshToken: "encrypted-refresh-token"
    }
  },
  
  // Export format
  format: {
    type: "csv",
    options: {
      delimiter: ",",
      includeHeaders: true,
      dateFormat: "YYYY-MM-DD",
      currencyFormat: "$#,##0.00",
      encoding: "utf-8"
    }
  },
  
  // Field mapping
  fieldMapping: {
    orderNumber: { source: "orderNumber", header: "Order Number" },
    orderDate: { source: "orderDate", header: "Date", transform: "formatDate" },
    total: { source: "total", header: "Total Amount", transform: "formatCurrency" },
    items: { 
      source: "items", 
      header: "Items", 
      transform: "joinItemDescriptions",
      separator: "; "
    },
    itemCount: {
      source: "items",
      header: "Item Count",
      transform: "countItems"
    }
  },
  
  // Export filters
  filters: {
    status: ["new", "updated"], // Only export new and updated items
    dateRange: {
      field: "extractedAt",
      start: "2023-01-01",
      end: null // null = no end date
    },
    customFilter: "total > 50" // Custom filter expression
  },
  
  // Automation settings
  automation: {
    enabled: true,
    trigger: "on_new_data", // manual, on_new_data, scheduled, realtime
    schedule: {
      frequency: "daily", // hourly, daily, weekly, monthly
      time: "08:00",
      timezone: "America/New_York"
    },
    conditions: {
      minNewItems: 1,
      maxAge: 86400000 // 24 hours in milliseconds
    }
  },
  
  // Export history tracking
  tracking: {
    lastExported: 1640995200000,
    lastExportedItemId: "ORDER-987654321",
    totalExports: 15,
    lastStatus: "success",
    lastError: null
  }
}
```

### Export Job
```javascript
{
  jobId: "export-job-uuid",
  configId: "export-config-uuid",
  repositoryId: "amazon-orders",
  status: "running", // queued, running, completed, failed, cancelled
  
  // Job timing
  createdAt: 1640995200000,
  startedAt: 1640995205000,
  completedAt: null,
  
  // Export parameters
  parameters: {
    exportType: "incremental", // full, incremental, filtered
    itemCount: 25,
    filters: { /* applied filters */ },
    format: { /* export format settings */ }
  },
  
  // Progress tracking
  progress: {
    itemsProcessed: 15,
    itemsTotal: 25,
    percentage: 60,
    currentPhase: "formatting", // preparing, filtering, formatting, uploading, finalizing
    estimatedTimeRemaining: 30000
  },
  
  // Results
  results: {
    itemsExported: 15,
    itemsSkipped: 2,
    itemsError: 0,
    outputSize: 2048,
    outputLocation: "https://docs.google.com/spreadsheets/d/...",
    exportMetadata: {
      exportedAt: 1640995200000,
      dataRange: "2023-01-01 to 2023-12-31",
      format: "csv",
      compression: "none"
    }
  },
  
  // Error tracking
  errors: [],
  warnings: [
    {
      type: "missing_field",
      message: "Tax field missing for 2 items",
      affectedItems: ["ORDER-123", "ORDER-456"]
    }
  ]
}
```

### Export Template
```javascript
{
  id: "amazon-orders-template",
  name: "Amazon Orders Standard Export",
  description: "Standard template for Amazon order exports",
  repositoryType: "financial",
  
  // Template configuration
  template: {
    format: "csv",
    fieldMapping: { /* default field mappings */ },
    transformations: { /* standard transformations */ },
    filters: { /* common filters */ }
  },
  
  // Supported destinations
  supportedDestinations: ["csv", "google_sheets", "excel"],
  
  // Customizable options
  customizations: [
    {
      field: "dateFormat",
      type: "select",
      options: ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"],
      default: "YYYY-MM-DD"
    },
    {
      field: "includeLineItems",
      type: "boolean",
      default: true,
      description: "Include individual line items or just order totals"
    }
  ]
}
```

## Component Interface

### Core Methods
```javascript
class DataBroker {
  // Export configuration management
  async createExportConfig(repositoryId, config) {}
  async updateExportConfig(configId, updates) {}
  async deleteExportConfig(configId) {}
  async getExportConfigs(repositoryId) {}
  
  // Export execution
  async triggerExport(configId, options) {}
  async scheduleExport(configId, schedule) {}
  async cancelExport(jobId) {}
  async retryExport(jobId) {}
  
  // Job management
  async getExportJob(jobId) {}
  async getExportHistory(configId, limit) {}
  async getActiveExports() {}
  async cleanupOldJobs(retentionDays) {}
  
  // Data formatting and transformation
  async formatData(data, format, options) {}
  async transformData(data, transformations) {}
  async validateExportData(data, schema) {}
  async generateExportPreview(configId, limit) {}
  
  // External system integration
  async testConnection(destination) {}
  async authenticateDestination(destinationType, credentials) {}
  async uploadToDestination(data, destination) {}
  async syncWithDestination(configId) {}
  
  // Template management
  async getExportTemplates(repositoryType) {}
  async createFromTemplate(templateId, repositoryId, customizations) {}
  async saveAsTemplate(configId, templateData) {}
}
```

### Message Types
```javascript
// Create export configuration
{
  type: "EXPORT_CREATE_CONFIG",
  data: { repositoryId: "amazon-orders", config: exportConfig }
}

// Trigger export
{
  type: "EXPORT_TRIGGER",
  data: { configId: "export-config-uuid", options: exportOptions }
}

// Get export status
{
  type: "EXPORT_GET_STATUS",
  data: { jobId: "export-job-uuid" }
}

// Test destination connection
{
  type: "EXPORT_TEST_CONNECTION",
  data: { destination: destinationConfig }
}

// Format data preview
{
  type: "EXPORT_PREVIEW",
  data: { configId: "export-config-uuid", limit: 10 }
}
```

## Export Formats

### CSV Export
```javascript
async exportToCSV(data, options) {
  const csvOptions = {
    delimiter: options.delimiter || ',',
    quote: options.quote || '"',
    escape: options.escape || '"',
    header: options.includeHeaders !== false,
    encoding: options.encoding || 'utf-8'
  };
  
  // Transform data to flat structure
  const flatData = await this.flattenData(data);
  
  // Apply field mappings
  const mappedData = await this.applyFieldMappings(flatData, options.fieldMapping);
  
  // Generate CSV
  return this.generateCSV(mappedData, csvOptions);
}
```

### Google Sheets Integration
```javascript
async exportToGoogleSheets(data, config) {
  // Authenticate with Google Sheets API
  const auth = await this.authenticateGoogleSheets(config.credentials);
  
  // Prepare data for sheets format
  const sheetData = await this.formatForSheets(data, config.format);
  
  // Determine write mode (append vs overwrite)
  if (config.appendMode) {
    await this.appendToSheet(auth, config.spreadsheetId, config.sheetName, sheetData);
  } else {
    await this.overwriteSheet(auth, config.spreadsheetId, config.sheetName, sheetData);
  }
  
  // Return result with sheet URL
  return {
    success: true,
    url: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}`,
    itemsExported: sheetData.length
  };
}
```

### JSON Export
```javascript
async exportToJSON(data, options) {
  // Apply transformations
  const transformedData = await this.transformData(data, options.transformations);
  
  // Structure data according to schema
  const structuredData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      repositoryId: options.repositoryId,
      format: "json",
      version: "1.0"
    },
    data: transformedData
  };
  
  // Serialize with formatting options
  return JSON.stringify(structuredData, null, options.prettyPrint ? 2 : 0);
}
```

## Data Transformations

### Field Transformations
```javascript
const transformations = {
  formatDate: (value, options) => {
    const date = new Date(value);
    return date.toLocaleDateString(options.locale, options.format);
  },
  
  formatCurrency: (value, options) => {
    return new Intl.NumberFormat(options.locale, {
      style: 'currency',
      currency: options.currency || 'USD'
    }).format(value);
  },
  
  joinItemDescriptions: (items, options) => {
    return items.map(item => item.description).join(options.separator || ', ');
  },
  
  countItems: (items) => {
    return Array.isArray(items) ? items.length : 0;
  },
  
  calculateSubtotal: (items) => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
};
```

### Data Flattening
```javascript
async flattenData(data) {
  return data.map(entry => {
    const flattened = { ...entry.data };
    
    // Flatten nested items
    if (flattened.items && Array.isArray(flattened.items)) {
      flattened.items.forEach((item, index) => {
        Object.keys(item).forEach(key => {
          flattened[`item_${index + 1}_${key}`] = item[key];
        });
      });
      
      // Remove original items array
      delete flattened.items;
    }
    
    // Add metadata
    flattened._extractedAt = entry.extractedAt;
    flattened._status = entry.status;
    flattened._identifier = entry.identifier;
    
    return flattened;
  });
}
```

## Automation and Scheduling

### Trigger-Based Exports
```javascript
async handleDataUpdateTrigger(repositoryId, newItems) {
  const configs = await this.getExportConfigs(repositoryId);
  
  for (const config of configs) {
    if (config.automation.enabled && config.automation.trigger === 'on_new_data') {
      // Check if conditions are met
      if (newItems.length >= config.automation.conditions.minNewItems) {
        await this.triggerExport(config.id, { triggerType: 'automatic' });
      }
    }
  }
}
```

### Scheduled Exports
```javascript
async processScheduledExports() {
  const now = new Date();
  const configs = await this.getScheduledExports(now);
  
  for (const config of configs) {
    try {
      await this.triggerExport(config.id, { triggerType: 'scheduled' });
      await this.updateNextScheduledTime(config.id);
    } catch (error) {
      await this.handleScheduledExportError(config.id, error);
    }
  }
}
```

## Error Handling and Recovery

### Export Error Handling
```javascript
async handleExportError(jobId, error) {
  const job = await this.getExportJob(jobId);
  
  switch (error.type) {
    case 'authentication_failed':
      return await this.handleAuthenticationError(job, error);
    
    case 'rate_limit_exceeded':
      return await this.handleRateLimitError(job, error);
    
    case 'destination_unavailable':
      return await this.handleDestinationError(job, error);
    
    case 'data_validation_failed':
      return await this.handleValidationError(job, error);
    
    default:
      return await this.handleGenericExportError(job, error);
  }
}
```

### Retry Logic
```javascript
async retryExport(jobId, retryOptions = {}) {
  const originalJob = await this.getExportJob(jobId);
  
  // Create new job with retry parameters
  const retryJob = {
    ...originalJob,
    jobId: uuidv4(),
    status: 'queued',
    retryOf: jobId,
    retryAttempt: (originalJob.retryAttempt || 0) + 1,
    createdAt: Date.now()
  };
  
  // Apply retry backoff
  const delay = this.calculateRetryDelay(retryJob.retryAttempt);
  
  setTimeout(() => {
    this.executeExport(retryJob);
  }, delay);
  
  return retryJob.jobId;
}
```

## Integration Points

### Repository Manager Integration
- Retrieve repository data structure for export mapping
- Handle repository configuration changes
- Support repository-specific export templates
- Track export performance metrics per repository

### Data Storage Integration
- Query data for export based on filters and criteria
- Track export status of individual data entries
- Handle large dataset exports efficiently
- Support incremental export based on data changes

### Scheduler Integration
- Coordinate scheduled export operations
- Handle export automation triggers
- Support export job prioritization
- Manage export resource allocation

### User Interface Integration
- Provide export configuration UI components
- Show real-time export progress
- Display export history and status
- Support export preview and testing

## Security and Privacy

### Data Protection
- Encrypt authentication credentials
- Secure transmission of exported data
- Implement access controls for export configurations
- Audit trail for all export operations

### External API Security
- OAuth2 authentication for Google Sheets
- API key management for webhook integrations
- Rate limiting and quota management
- Secure storage of refresh tokens

## Performance Optimization

### Large Dataset Handling
- Stream processing for large exports
- Chunked uploads to external systems
- Progress tracking for long-running exports
- Memory-efficient data transformations

### Export Efficiency
- Cached authentication tokens
- Batch operations where possible
- Parallel processing of independent exports
- Optimized data serialization

## Testing Strategy

### Unit Tests
- Data transformation functions
- Format conversion accuracy
- Error handling scenarios
- Authentication and API integration

### Integration Tests
- End-to-end export workflows
- External system connectivity
- Large dataset export performance
- Concurrent export handling

### User Acceptance Tests
- Export configuration usability
- Data accuracy verification
- Performance under realistic loads
- Error recovery user experience