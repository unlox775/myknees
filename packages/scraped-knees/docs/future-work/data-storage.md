# Data Storage

## Overview
The Data Storage component handles the persistence, retrieval, and management of extracted data from web scraping operations. It maintains the actual repository data, tracks extraction status, and provides efficient querying capabilities.

## Core Responsibilities

### 1. Data Persistence
- Store extracted entries with full metadata
- Maintain data integrity and consistency
- Handle large datasets efficiently
- Provide atomic transaction support

### 2. Duplicate Detection
- Identify duplicate entries using repository-defined identifiers
- Update existing entries when new data is found
- Track data changes and versions
- Maintain extraction audit trails

### 3. Query and Retrieval
- Efficient data retrieval by various criteria
- Support for filtering, sorting, and pagination
- Date-range queries for chronological data
- Status-based filtering (new, updated, exported)

### 4. Data Lifecycle Management
- Track entry status throughout the system
- Manage data retention and archival
- Handle data cleanup and optimization
- Monitor storage usage and quotas

## Data Models

### Repository Entry
```javascript
{
  id: "uuid-generated-id",
  repositoryId: "amazon-orders",
  identifier: "ORDER-123456789", // Repository-defined unique identifier
  extractedAt: 1640995200000,
  updatedAt: 1640995200000,
  status: "new", // new, updated, exported, archived
  
  // Data structure matches repository definition
  data: {
    orderNumber: "ORDER-123456789",
    orderDate: "2023-12-01T00:00:00Z",
    total: 127.45,
    tax: 10.23,
    shipping: 5.99,
    items: [
      {
        description: "Wireless Headphones",
        quantity: 1,
        price: 89.99,
        category: "Electronics"
      },
      {
        description: "Phone Case",
        quantity: 2,
        price: 12.50,
        category: "Accessories"
      }
    ]
  },
  
  // Extraction metadata
  extraction: {
    pageUrl: "https://amazon.com/your-orders",
    extractionId: "extraction-uuid",
    confidence: 0.95,
    rules: { /* scraping rules used */ },
    aiAnalysis: {
      confidence: 0.92,
      issues: [],
      suggestions: []
    }
  },
  
  // Status tracking
  processing: {
    exported: false,
    exportedAt: null,
    exportTargets: [],
    validationStatus: "passed", // passed, failed, pending
    validationErrors: []
  }
}
```

### Extraction Session
```javascript
{
  id: "extraction-session-uuid",
  repositoryId: "amazon-orders",
  startedAt: 1640995200000,
  completedAt: 1640996000000,
  status: "completed", // running, completed, failed, cancelled
  
  // Session statistics
  stats: {
    pagesProcessed: 5,
    entriesFound: 23,
    newEntries: 8,
    updatedEntries: 2,
    duplicates: 13,
    errors: 0
  },
  
  // Page tracking
  pageHistory: [
    {
      url: "https://amazon.com/your-orders?page=1",
      processedAt: 1640995300000,
      entriesFound: 10,
      status: "completed"
    },
    {
      url: "https://amazon.com/your-orders?page=2", 
      processedAt: 1640995600000,
      entriesFound: 8,
      status: "completed"
    }
  ],
  
  // Error tracking
  errors: [],
  
  // Completion criteria
  completion: {
    reason: "reached_max_lookback", // reached_max_lookback, no_more_pages, user_stopped, error
    lastIdentifier: "ORDER-987654321",
    lastDate: 1609459200000
  }
}
```

### Storage Metrics
```javascript
{
  repositoryId: "amazon-orders",
  totalEntries: 156,
  totalSize: 2048576, // bytes
  lastUpdated: 1640995200000,
  
  // Status breakdown
  statusCounts: {
    new: 8,
    updated: 2,
    exported: 140,
    archived: 6
  },
  
  // Date range
  dateRange: {
    earliest: 1609459200000,
    latest: 1640995200000
  },
  
  // Storage usage
  storage: {
    entriesSize: 1920000,
    indexSize: 128576,
    quotaUsed: 0.25, // 25% of quota
    compressionRatio: 0.7
  }
}
```

## Component Interface

### Core Methods
```javascript
class DataStorage {
  // Entry management
  async saveEntry(repositoryId, entryData) {}
  async getEntry(repositoryId, entryId) {}
  async findEntryByIdentifier(repositoryId, identifier) {}
  async updateEntry(repositoryId, entryId, updates) {}
  async deleteEntry(repositoryId, entryId) {}
  
  // Batch operations
  async saveEntries(repositoryId, entries) {}
  async getEntries(repositoryId, options) {}
  async updateEntryStatus(repositoryId, entryIds, status) {}
  async deleteEntries(repositoryId, entryIds) {}
  
  // Querying and filtering
  async queryEntries(repositoryId, query) {}
  async getEntriesByDateRange(repositoryId, startDate, endDate) {}
  async getEntriesByStatus(repositoryId, status) {}
  async searchEntries(repositoryId, searchTerm) {}
  
  // Duplicate detection
  async checkDuplicate(repositoryId, identifier) {}
  async findSimilarEntries(repositoryId, entryData) {}
  async mergeDuplicates(repositoryId, primaryId, duplicateIds) {}
  
  // Extraction session management
  async createExtractionSession(repositoryId) {}
  async updateExtractionSession(sessionId, updates) {}
  async getExtractionSession(sessionId) {}
  async getExtractionHistory(repositoryId, limit) {}
  
  // Repository data management
  async getRepositoryMetrics(repositoryId) {}
  async getRepositoryDataRange(repositoryId) {}
  async clearRepositoryData(repositoryId) {}
  async exportRepositoryData(repositoryId, format) {}
  
  // Storage management
  async getStorageStats() {}
  async optimizeStorage() {}
  async cleanupOldData(retentionDays) {}
}
```

### Query Interface
```javascript
// Query options for flexible data retrieval
{
  filter: {
    status: ["new", "updated"],
    dateRange: {
      start: 1640995200000,
      end: 1641081600000
    },
    identifiers: ["ORDER-123", "ORDER-456"],
    hasChanges: true
  },
  sort: {
    field: "extractedAt",
    direction: "desc"
  },
  pagination: {
    offset: 0,
    limit: 50
  },
  include: ["extraction", "processing"] // Include metadata
}
```

### Message Types
```javascript
// Save new entry
{
  type: "DATA_SAVE_ENTRY",
  data: { repositoryId: "amazon-orders", entry: entryData }
}

// Query entries
{
  type: "DATA_QUERY_ENTRIES",
  data: { repositoryId: "amazon-orders", query: queryOptions }
}

// Check for duplicate
{
  type: "DATA_CHECK_DUPLICATE",
  data: { repositoryId: "amazon-orders", identifier: "ORDER-123" }
}

// Update entry status
{
  type: "DATA_UPDATE_STATUS",
  data: { repositoryId: "amazon-orders", entryIds: ["id1", "id2"], status: "exported" }
}

// Get repository metrics
{
  type: "DATA_GET_METRICS",
  data: { repositoryId: "amazon-orders" }
}
```

## Storage Architecture

### Data Partitioning
- **Entry Storage**: `data:{repositoryId}:{entryId}`
- **Index Storage**: `index:{repositoryId}:{indexType}`
- **Session Storage**: `session:{sessionId}`
- **Metrics Storage**: `metrics:{repositoryId}`

### Storage Types
- **Entries**: Chrome Storage Local (5MB quota)
- **Indexes**: Chrome Storage Local (for fast queries)
- **Sessions**: Chrome Storage Local (temporary, cleaned up)
- **Metrics**: Chrome Storage Sync (for cross-device sync)

### Indexing Strategy
```javascript
// Identifier index for fast duplicate detection
{
  "identifier:ORDER-123": "entry-uuid-1",
  "identifier:ORDER-456": "entry-uuid-2"
}

// Date index for chronological queries
{
  "date:2023-12-01": ["entry-uuid-1", "entry-uuid-3"],
  "date:2023-12-02": ["entry-uuid-2", "entry-uuid-4"]
}

// Status index for filtering
{
  "status:new": ["entry-uuid-1", "entry-uuid-5"],
  "status:exported": ["entry-uuid-2", "entry-uuid-3"]
}
```

## Performance Optimization

### Caching Strategy
- Cache frequently accessed entries
- Maintain in-memory indexes for active queries
- Lazy load entry details on demand
- Cache repository metrics and statistics

### Batch Processing
- Batch multiple operations for efficiency
- Use transaction-like operations for consistency
- Optimize Chrome storage API usage
- Implement write coalescing for rapid updates

### Storage Efficiency
- Compress large data entries
- Use efficient serialization formats
- Implement data deduplication
- Monitor and optimize storage usage

## Data Integrity

### Validation
- Validate entries against repository structure
- Check required fields and data types
- Validate identifier uniqueness
- Ensure referential integrity

### Consistency
- Atomic operations for critical updates
- Maintain index consistency with data
- Handle partial write failures gracefully
- Implement data recovery mechanisms

### Backup and Recovery
- Regular data backups to Chrome Storage Sync
- Export capabilities for data preservation
- Recovery procedures for corrupted data
- Data migration support for schema changes

## Error Handling

### Common Error Scenarios
- Storage quota exceeded
- Data corruption or invalid format
- Concurrent access conflicts
- Network issues during sync

### Recovery Strategies
- Graceful degradation with reduced functionality
- Automatic data repair for minor corruption
- User notification of critical issues
- Fallback to read-only mode when needed

## Integration Points

### Repository Manager Integration
- Validate data against repository structure
- Support repository schema changes
- Handle repository deletion scenarios
- Maintain referential integrity

### Page Scraper Integration
- Receive extracted data for storage
- Provide duplicate checking services
- Return existing data for comparison
- Track extraction sessions

### Data Broker Integration
- Provide data for export operations
- Track export status and history
- Support various export formats
- Handle export error scenarios

## Testing Strategy

### Unit Tests
- Data CRUD operations
- Query and filtering functionality
- Duplicate detection logic
- Index management

### Performance Tests
- Large dataset handling
- Query performance optimization
- Storage quota management
- Concurrent operation handling

### Integration Tests
- Cross-component data flow
- Storage migration scenarios
- Error recovery procedures
- Data consistency validation

## Security and Privacy

### Data Protection
- Encrypt sensitive data at rest
- Secure data transmission
- Implement access controls
- Audit data access patterns

### Privacy Compliance
- Data minimization principles
- User consent for data storage
- Clear data retention policies
- Secure data deletion procedures