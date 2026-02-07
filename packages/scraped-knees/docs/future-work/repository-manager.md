# Repository Manager

## Overview
The Repository Manager is responsible for creating, managing, and configuring data repositories. A repository defines what type of data to extract from web pages, how to identify unique records, and how to organize the extracted information.

## Core Responsibilities

### 1. Repository Definition Management
- Create new repository configurations
- Store repository metadata and settings
- Manage repository lifecycle (active, paused, archived)
- Validate repository configurations

### 2. Data Structure Definition
- Define the structure of data to be extracted
- Configure identifiers for duplicate detection
- Set up date fields for chronological ordering
- Define metadata fields (totals, subtotals, categories)

### 3. Scraping Rules Storage
- Store page-specific scraping rules (JSON configurations)
- Manage rule versioning and updates
- Handle rule validation and testing
- Support rule inheritance and templates

## Data Models

### Repository Definition
```javascript
{
  id: "amazon-orders",
  name: "Amazon Orders",
  description: "Extract order details from Amazon order history",
  type: "financial", // financial, general
  status: "active", // active, paused, archived
  createdAt: 1640995200000,
  updatedAt: 1640995200000,
  
  // Data structure definition
  structure: {
    identifier: "orderNumber", // Field that uniquely identifies each record
    dateField: "orderDate", // Field containing the record date
    maxLookback: 365, // Days to look back (null = unlimited)
    
    // Field definitions
    fields: {
      orderNumber: { type: "string", required: true },
      orderDate: { type: "date", required: true },
      total: { type: "currency", required: true },
      tax: { type: "currency", required: false },
      shipping: { type: "currency", required: false },
      items: { type: "array", itemType: "lineItem" }
    },
    
    // Line item structure (for financial repositories)
    lineItemStructure: {
      description: { type: "string", required: true },
      quantity: { type: "number", required: true },
      price: { type: "currency", required: true },
      category: { type: "string", required: false }
    }
  },
  
  // Navigation configuration
  navigation: {
    loginRequired: true,
    baseUrl: "https://amazon.com",
    startingPath: "/your-orders",
    
    // Login detection rules
    loginDetection: {
      loggedInIndicator: ".nav-line-1-container",
      loginPageIndicator: "#signInSubmit",
      loginUrl: "https://amazon.com/signin"
    },
    
    // Navigation flow
    navigationSteps: [
      { action: "navigate", url: "https://amazon.com/your-orders" },
      { action: "waitFor", selector: ".order-info" },
      { action: "verify", condition: "ordersVisible" }
    ]
  },
  
  // Scraping configuration
  scraping: {
    // AI-generated scraping rules (JSON blob)
    rules: {
      containerSelector: ".order-info",
      orderIdentifier: ".order-number",
      dateExtraction: ".order-date",
      totalExtraction: ".order-total",
      itemsContainer: ".order-items",
      itemSelector: ".item-row"
    },
    
    // Pagination handling
    pagination: {
      nextButtonSelector: ".a-pagination .a-last",
      hasMoreIndicator: ".a-pagination .a-last:not(.a-disabled)",
      maxPages: 50
    },
    
    // Exclusion rules
    exclusions: [
      ".advertisement",
      ".sponsored-content",
      ".recommendations"
    ]
  },
  
  // Export configuration (managed by Data Broker)
  exportConfig: {
    autoExport: false,
    formats: ["csv"],
    destination: "local", // local, googleSheets, api
    schedule: null
  }
}
```

### Repository Statistics
```javascript
{
  repositoryId: "amazon-orders",
  totalRecords: 156,
  lastExtracted: 1640995200000,
  lastIdentifier: "ORDER-12345",
  dateRange: {
    earliest: 1609459200000,
    latest: 1640995200000
  },
  extractionStats: {
    totalExtractions: 12,
    successfulExtractions: 11,
    lastExtraction: {
      date: 1640995200000,
      recordsFound: 8,
      newRecords: 3,
      duplicates: 5
    }
  }
}
```

## Component Interface

### Core Methods
```javascript
class RepositoryManager {
  // Repository CRUD operations
  async createRepository(config) {}
  async getRepository(id) {}
  async updateRepository(id, updates) {}
  async deleteRepository(id) {}
  async listRepositories(filter) {}
  
  // Repository configuration
  async validateConfiguration(config) {}
  async getRepositoryStructure(id) {}
  async updateScrapingRules(id, rules) {}
  
  // Repository status and statistics
  async getRepositoryStats(id) {}
  async updateLastExtraction(id, stats) {}
  async setRepositoryStatus(id, status) {}
  
  // Template and import/export
  async createFromTemplate(templateId, config) {}
  async exportRepository(id) {}
  async importRepository(config) {}
}
```

### Message Types
```javascript
// Repository creation
{
  type: "REPOSITORY_CREATE",
  data: { config: repositoryConfig }
}

// Repository retrieval
{
  type: "REPOSITORY_GET",
  data: { id: "amazon-orders" }
}

// Repository listing
{
  type: "REPOSITORY_LIST",
  data: { filter: { status: "active", type: "financial" } }
}

// Configuration update
{
  type: "REPOSITORY_UPDATE_CONFIG",
  data: { id: "amazon-orders", updates: { status: "paused" } }
}

// Scraping rules update
{
  type: "REPOSITORY_UPDATE_RULES",
  data: { id: "amazon-orders", rules: scrapingRules }
}
```

## Storage Architecture

### Repository Storage
- **Key Pattern**: `repository:{id}`
- **Storage Type**: Chrome Storage Sync (for cross-device sync)
- **Max Size**: 8KB per repository (Chrome limit)

### Statistics Storage
- **Key Pattern**: `repository-stats:{id}`
- **Storage Type**: Chrome Storage Local
- **Retention**: 90 days of extraction history

### Templates Storage
- **Key Pattern**: `repository-template:{templateId}`
- **Predefined templates**: Amazon, Costco, Walmart, etc.
- **User templates**: Custom templates created by users

## AI Integration

### Repository Setup Assistance
```javascript
// AI-assisted repository creation
{
  type: "AI_ANALYZE_PAGE_FOR_REPOSITORY",
  data: {
    pageUrl: "https://amazon.com/your-orders",
    pageContent: htmlContent,
    userDescription: "Extract order information including items and totals"
  }
}
```

### Response Processing
```javascript
{
  suggestedStructure: {
    identifier: "orderNumber",
    dateField: "orderDate",
    fields: { /* AI-suggested field structure */ }
  },
  scrapingRules: { /* AI-generated scraping rules */ },
  confidence: 0.85,
  suggestions: ["Consider adding tax field", "Items structure looks complex"]
}
```

## Error Handling

### Validation Errors
- Invalid repository structure
- Missing required fields
- Conflicting configuration options
- Storage quota exceeded

### Recovery Strategies
- Graceful degradation for invalid configurations
- Automatic backup of repository configurations
- Rollback mechanism for failed updates
- User notification of configuration issues

## Testing Strategy

### Unit Tests
- Repository CRUD operations
- Configuration validation
- Statistics calculation
- Template system

### Integration Tests
- AI integration for repository creation
- Storage persistence and retrieval
- Cross-component communication
- Error handling scenarios

## UI Integration Points

### Repository Management Interface
- Repository list view with status indicators
- Repository creation wizard with AI assistance
- Configuration editor with live validation
- Statistics dashboard

### Quick Actions
- Duplicate repository
- Archive/restore repository
- Export repository configuration
- Test repository configuration

## Performance Considerations

### Caching Strategy
- Cache frequently accessed repositories
- Lazy load repository statistics
- Batch repository operations
- Optimize storage access patterns

### Storage Optimization
- Compress large configuration objects
- Use efficient serialization
- Implement data migration strategies
- Monitor storage usage

## Security Considerations

### Data Protection
- Validate all user inputs
- Sanitize repository configurations
- Prevent script injection in rules
- Secure storage of sensitive data

### Access Control
- Repository ownership verification
- Permission-based operations
- Audit trail for changes
- Data export controls