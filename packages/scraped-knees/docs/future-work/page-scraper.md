# Page Scraper

## Overview
The Page Scraper component is responsible for analyzing web pages and extracting structured data according to repository-defined rules. It uses AI assistance to identify patterns, extract information, and validate data quality.

## Core Responsibilities

### 1. Page Analysis
- Analyze current page content and structure
- Identify data patterns using AI assistance
- Extract structured data according to repository rules
- Validate extracted data against repository schema

### 2. AI-Assisted Extraction
- Send page screenshots and HTML to AI providers
- Generate and refine scraping rules based on AI analysis
- Adapt to changes in page structure automatically
- Provide confidence scoring for extracted data

### 3. Data Processing
- Clean and normalize extracted data
- Handle missing or malformed data gracefully
- Convert data types according to repository definitions
- Generate extraction metadata and quality scores

### 4. Rule Management
- Apply repository-defined scraping rules
- Update and optimize rules based on success rates
- Handle rule versioning and fallbacks
- Generate new rules through AI analysis

## Data Models

### Extraction Request
```javascript
{
  repositoryId: "amazon-orders",
  pageUrl: "https://amazon.com/your-orders",
  extractionType: "initial", // initial, pagination, verification
  
  // Page context
  pageContext: {
    htmlContent: "full page HTML",
    screenshot: "base64-encoded-screenshot",
    userAgent: "browser user agent",
    timestamp: 1640995200000
  },
  
  // Repository configuration
  repository: {
    structure: { /* repository data structure */ },
    rules: { /* current scraping rules */ },
    navigation: { /* navigation config */ }
  },
  
  // Extraction options
  options: {
    useAI: true,
    confidenceThreshold: 0.7,
    maxRetries: 3,
    validateData: true
  }
}
```

### Extraction Result
```javascript
{
  extractionId: "extraction-uuid",
  repositoryId: "amazon-orders",
  success: true,
  
  // Extracted entries
  entries: [
    {
      identifier: "ORDER-123456789",
      confidence: 0.92,
      data: {
        orderNumber: "ORDER-123456789",
        orderDate: "2023-12-01T00:00:00Z",
        total: 127.45,
        items: [/* line items */]
      },
      extraction: {
        selector: ".order-info[data-order='123456789']",
        method: "ai-generated",
        confidence: 0.92,
        issues: []
      }
    }
  ],
  
  // Extraction metadata
  metadata: {
    pageUrl: "https://amazon.com/your-orders",
    extractedAt: 1640995200000,
    processingTime: 2340, // milliseconds
    rulesUsed: "v1.2.3",
    aiAnalysis: {
      model: "gpt-4",
      confidence: 0.89,
      suggestedImprovements: []
    }
  },
  
  // Quality metrics
  quality: {
    overallConfidence: 0.92,
    dataCompleteness: 0.95,
    structureMatch: 0.98,
    issues: [],
    warnings: ["Low confidence on tax field"]
  },
  
  // Next actions
  nextActions: {
    hasMoreData: true,
    nextPageUrl: "https://amazon.com/your-orders?page=2",
    shouldContinue: true,
    estimatedRemaining: 25
  }
}
```

### Scraping Rules
```javascript
{
  version: "1.2.3",
  repositoryId: "amazon-orders",
  createdAt: 1640995200000,
  lastUpdated: 1640995200000,
  
  // Page identification
  pageIdentification: {
    urlPatterns: [
      "https://amazon.com/your-orders*",
      "https://www.amazon.com/gp/css/order-history*"
    ],
    requiredElements: [".order-info", ".order-card"],
    pageTitle: "Your Orders"
  },
  
  // Container identification
  containers: {
    orderContainer: {
      selector: ".order-info, .order-card",
      multiple: true,
      required: true
    },
    itemContainer: {
      selector: ".shipment .a-row",
      multiple: true,
      parent: "orderContainer"
    }
  },
  
  // Data extraction rules
  extraction: {
    orderNumber: {
      selector: ".order-info .yohtmlc-order-id bdi",
      attribute: "text",
      required: true,
      pattern: /ORDER #?([A-Z0-9-]+)/i,
      transform: "toUpperCase"
    },
    orderDate: {
      selector: ".order-info .a-color-secondary",
      attribute: "text",
      required: true,
      pattern: /Ordered on (.+)/,
      transform: "parseDate"
    },
    total: {
      selector: ".order-info .a-color-price",
      attribute: "text",
      required: true,
      pattern: /\$?([\d,.]+)/,
      transform: "parseCurrency"
    },
    items: {
      container: "itemContainer",
      extraction: {
        description: {
          selector: ".a-link-normal",
          attribute: "text",
          required: true
        },
        price: {
          selector: ".a-price .a-price-whole",
          attribute: "text",
          pattern: /\$?([\d,.]+)/,
          transform: "parseCurrency"
        }
      }
    }
  },
  
  // Exclusions
  exclusions: [
    ".advertisement",
    ".sponsored-content",
    ".recommendations"
  ],
  
  // Validation rules
  validation: {
    required: ["orderNumber", "orderDate", "total"],
    patterns: {
      orderNumber: /^ORDER [A-Z0-9-]+$/i,
      total: /^\d+(\.\d{2})?$/
    },
    relationships: [
      {
        type: "sum",
        field: "items.price",
        should_equal: "total"
      }
    ]
  }
}
```

## Component Interface

### Core Methods
```javascript
class PageScraper {
  // Main extraction methods
  async extractFromPage(request) {}
  async analyzePageStructure(pageContext) {}
  async generateScrapingRules(pageContext, userGuidance) {}
  async validateExtractedData(data, repository) {}
  
  // Rule management
  async updateScrapingRules(repositoryId, rules) {}
  async optimizeRules(repositoryId, performanceData) {}
  async testRules(repositoryId, pageContext) {}
  async getRulesHistory(repositoryId) {}
  
  // AI integration
  async requestAIAnalysis(pageContext, repository) {}
  async processAIResponse(aiResponse, repository) {}
  async refineRulesWithAI(currentRules, issues) {}
  
  // Data processing
  async cleanExtractedData(rawData, repository) {}
  async validateDataIntegrity(data, repository) {}
  async calculateConfidenceScore(extraction) {}
  async identifyDataIssues(data, repository) {}
  
  // Performance monitoring
  async getExtractionStats(repositoryId) {}
  async getPerformanceMetrics() {}
  async optimizePerformance() {}
}
```

### Message Types
```javascript
// Extract data from current page
{
  type: "SCRAPER_EXTRACT_PAGE",
  data: { repositoryId: "amazon-orders", options: extractionOptions }
}

// Analyze page structure for rule generation
{
  type: "SCRAPER_ANALYZE_PAGE",
  data: { repositoryId: "amazon-orders", userGuidance: "Look for order information" }
}

// Generate new scraping rules
{
  type: "SCRAPER_GENERATE_RULES",
  data: { repositoryId: "amazon-orders", pageContext: pageData }
}

// Validate extracted data
{
  type: "SCRAPER_VALIDATE_DATA",
  data: { repositoryId: "amazon-orders", extractedData: data }
}

// Update scraping rules
{
  type: "SCRAPER_UPDATE_RULES",
  data: { repositoryId: "amazon-orders", rules: scrapingRules }
}
```

## AI Integration Architecture

### AI Analysis Request
```javascript
{
  type: "AI_ANALYZE_PAGE_STRUCTURE",
  data: {
    pageUrl: "https://amazon.com/your-orders",
    htmlContent: "full page HTML",
    screenshot: "base64-screenshot",
    repository: {
      name: "Amazon Orders",
      structure: { /* expected data structure */ },
      examples: [ /* example data */ ]
    },
    instructions: "Extract order information including order number, date, total, and line items"
  }
}
```

### AI Response Processing
```javascript
{
  confidence: 0.89,
  analysis: {
    pageType: "order-history",
    dataStructure: "tabular-list",
    complexity: "medium"
  },
  extractionRules: {
    containers: { /* suggested containers */ },
    extraction: { /* suggested extraction rules */ },
    validation: { /* suggested validation */ }
  },
  recommendations: [
    "Use order-info containers for individual orders",
    "Items are nested within shipment sections",
    "Total includes tax and shipping"
  ],
  issues: [
    "Sponsored content mixed with orders",
    "Date format varies by locale"
  ]
}
```

## Data Processing Pipeline

### 1. Page Preparation
```javascript
async preparePageForExtraction(pageContext) {
  // Remove ads and sponsored content
  // Normalize page structure
  // Capture clean screenshot
  // Extract relevant HTML sections
}
```

### 2. Rule Application
```javascript
async applyExtractionRules(cleanedPage, rules) {
  // Apply container selectors
  // Extract data using field rules
  // Handle nested structures
  // Apply transformations
}
```

### 3. Data Validation
```javascript
async validateExtractedData(rawData, repository) {
  // Check required fields
  // Validate data types
  // Apply pattern matching
  // Check relationships
}
```

### 4. Quality Assessment
```javascript
async assessDataQuality(data, extraction) {
  // Calculate confidence scores
  // Identify missing data
  // Check data consistency
  // Generate quality report
}
```

## Error Handling and Recovery

### Common Issues
- Page structure changes
- Missing or moved elements
- JavaScript-generated content
- Network timeouts during extraction

### Recovery Strategies
- Retry with different selectors
- Fall back to AI-assisted extraction
- Use alternative extraction methods
- Notify user of persistent issues

### Rule Adaptation
- Automatically update rules based on failures
- A/B test new rules against existing ones
- Track rule performance over time
- Provide user feedback on rule changes

## Performance Optimization

### Extraction Efficiency
- Cache frequently used selectors
- Optimize DOM queries
- Batch data processing operations
- Use efficient data structures

### Memory Management
- Clean up large HTML content after processing
- Stream process large datasets
- Implement garbage collection hints
- Monitor memory usage

### Network Optimization
- Compress AI request payloads
- Cache AI responses for similar pages
- Implement request deduplication
- Use efficient screenshot formats

## Integration Points

### Repository Manager Integration
- Retrieve repository structure and rules
- Update rule performance metrics
- Handle repository configuration changes
- Support rule versioning

### Data Storage Integration
- Check for duplicate identifiers
- Store extracted data with metadata
- Track extraction sessions
- Update data statistics

### AI Manager Integration
- Send structured requests to AI providers
- Handle AI response processing
- Manage AI usage and costs
- Implement AI provider fallbacks

### Navigation Controller Integration
- Coordinate with page navigation
- Handle login state verification
- Support multi-page extraction
- Manage extraction session state

## Testing Strategy

### Unit Tests
- Rule application logic
- Data transformation functions
- Validation algorithms
- Error handling scenarios

### Integration Tests
- End-to-end extraction workflows
- AI integration scenarios
- Cross-component communication
- Performance under load

### Quality Assurance
- Extraction accuracy testing
- Rule effectiveness measurement
- Performance benchmarking
- User experience validation

## Security Considerations

### Data Privacy
- Minimize data sent to AI providers
- Scrub sensitive information from requests
- Implement data anonymization
- Clear data retention policies

### Injection Prevention
- Sanitize all extracted data
- Validate selector strings
- Prevent script injection in rules
- Secure AI response processing