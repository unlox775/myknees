# Pagination Controller

## Overview
The Pagination Controller manages multi-page data collection by detecting pagination patterns, navigating between pages, and coordinating with the Page Scraper to ensure comprehensive data extraction across all available pages.

## Core Responsibilities

### 1. Pagination Detection
- Identify pagination controls and patterns on pages
- Detect different pagination types (numbered, next/previous, infinite scroll)
- Analyze pagination structure using AI assistance
- Handle dynamic and JavaScript-driven pagination

### 2. Page Navigation
- Navigate between pages systematically
- Handle different pagination mechanisms
- Manage navigation state and progress tracking
- Coordinate with Navigation Controller for complex flows

### 3. Completion Detection
- Determine when all available data has been collected
- Respect repository-defined limits and boundaries
- Handle edge cases and data boundaries
- Optimize stopping criteria based on data patterns

### 4. Progress Management
- Track extraction progress across multiple pages
- Provide progress updates to user interface
- Handle interruptions and resume functionality
- Coordinate with Data Storage for duplicate detection

## Data Models

### Pagination Configuration
```javascript
{
  repositoryId: "amazon-orders",
  paginationType: "numbered", // numbered, next_previous, infinite_scroll, load_more
  
  // Pagination controls
  controls: {
    nextButton: {
      selector: ".a-pagination .a-last",
      disabledClass: "a-disabled",
      clickable: true
    },
    previousButton: {
      selector: ".a-pagination .a-first",
      disabledClass: "a-disabled",
      clickable: true
    },
    pageNumbers: {
      selector: ".a-pagination .a-normal",
      currentPageClass: "a-selected"
    },
    loadMoreButton: {
      selector: ".load-more-results",
      loadingIndicator: ".loading-spinner"
    }
  },
  
  // Detection patterns
  detection: {
    hasMoreIndicator: ".a-pagination .a-last:not(.a-disabled)",
    noMoreIndicator: ".no-more-results, .end-of-results",
    pageCountIndicator: ".results-info",
    totalItemsIndicator: ".total-count"
  },
  
  // Navigation settings
  navigation: {
    waitAfterClick: 2000, // Wait time after pagination click
    maxWaitForLoad: 10000, // Max wait for page load
    scrollBehavior: "smooth", // For infinite scroll
    loadTimeout: 30000 // Timeout for loading new content
  },
  
  // Boundaries and limits
  limits: {
    maxPages: 50,
    maxItems: 1000,
    maxAge: 365, // Days back from latest entry
    stopOnDuplicate: true,
    consecutiveDuplicatesLimit: 5
  },
  
  // AI assistance
  aiAnalysis: {
    enabled: true,
    confidenceThreshold: 0.7,
    analysisFrequency: "adaptive" // always, never, adaptive, first_page_only
  }
}
```

### Pagination Session
```javascript
{
  sessionId: "pagination-session-uuid",
  repositoryId: "amazon-orders",
  extractionSessionId: "extraction-session-uuid",
  startedAt: 1640995200000,
  completedAt: null,
  status: "in_progress", // in_progress, completed, failed, paused
  
  // Current state
  currentState: {
    currentPage: 3,
    currentUrl: "https://amazon.com/your-orders?page=3",
    hasNextPage: true,
    lastItemId: "ORDER-987654321",
    lastItemDate: 1640995200000
  },
  
  // Progress tracking
  progress: {
    pagesProcessed: 2,
    pagesRemaining: "unknown", // or number
    totalItemsFound: 45,
    newItemsFound: 12,
    duplicatesFound: 33,
    estimatedTimeRemaining: 120000 // milliseconds
  },
  
  // Page history
  pageHistory: [
    {
      pageNumber: 1,
      url: "https://amazon.com/your-orders",
      processedAt: 1640995200000,
      itemsFound: 20,
      newItems: 8,
      duplicates: 12,
      processingTime: 3400,
      status: "completed"
    },
    {
      pageNumber: 2,
      url: "https://amazon.com/your-orders?page=2",
      processedAt: 1640995300000,
      itemsFound: 25,
      newItems: 4,
      duplicates: 21,
      processingTime: 2800,
      status: "completed"
    }
  ],
  
  // Completion criteria
  completionCriteria: {
    reason: null, // max_pages, max_items, no_more_pages, age_limit, duplicate_limit
    metCriteria: [],
    remainingCriteria: ["no_more_pages"]
  },
  
  // Performance metrics
  performance: {
    averagePageTime: 3100,
    averageItemsPerPage: 22.5,
    duplicateRate: 0.73,
    estimatedEfficiency: 0.27
  }
}
```

### Page Analysis
```javascript
{
  pageUrl: "https://amazon.com/your-orders?page=3",
  analyzedAt: 1640995200000,
  
  // Pagination structure
  paginationStructure: {
    type: "numbered",
    currentPage: 3,
    totalPages: "unknown",
    hasNext: true,
    hasPrevious: true,
    controls: {
      nextButton: { found: true, enabled: true, selector: ".a-last" },
      previousButton: { found: true, enabled: true, selector: ".a-first" },
      pageNumbers: { found: true, count: 5, current: 3 }
    }
  },
  
  // Content analysis
  contentAnalysis: {
    itemsOnPage: 20,
    uniqueItems: 8,
    duplicateItems: 12,
    oldestItemDate: 1635724800000,
    newestItemDate: 1640995200000,
    dataQuality: 0.92
  },
  
  // AI analysis (if enabled)
  aiAnalysis: {
    confidence: 0.89,
    paginationPattern: "standard_numbered",
    recommendations: [
      "Continue to next page",
      "High duplicate rate indicates approaching end"
    ],
    issues: [],
    estimatedRemainingPages: 2
  },
  
  // Navigation readiness
  navigationReadiness: {
    ready: true,
    nextAction: "click_next",
    waitTime: 2000,
    issues: []
  }
}
```

## Component Interface

### Core Methods
```javascript
class PaginationController {
  // Session management
  async startPaginationSession(repositoryId, extractionSessionId) {}
  async pausePaginationSession(sessionId) {}
  async resumePaginationSession(sessionId) {}
  async stopPaginationSession(sessionId, reason) {}
  
  // Page navigation
  async navigateToNextPage(sessionId) {}
  async navigateToPreviousPage(sessionId) {}
  async navigateToPage(sessionId, pageNumber) {}
  async handleInfiniteScroll(sessionId) {}
  
  // Analysis and detection
  async analyzePaginationStructure(pageContext) {}
  async detectCompletionCriteria(sessionId) {}
  async checkForMorePages(sessionId) {}
  async estimateRemainingPages(sessionId) {}
  
  // Progress tracking
  async updateProgress(sessionId, pageResults) {}
  async getProgress(sessionId) {}
  async calculateEfficiency(sessionId) {}
  async estimateTimeRemaining(sessionId) {}
  
  // Configuration and optimization
  async optimizePaginationStrategy(repositoryId, performanceData) {}
  async updatePaginationConfig(repositoryId, config) {}
  async testPaginationControls(pageContext, config) {}
}
```

### Message Types
```javascript
// Start pagination session
{
  type: "PAGINATION_START",
  data: { repositoryId: "amazon-orders", extractionSessionId: "ext-uuid" }
}

// Navigate to next page
{
  type: "PAGINATION_NEXT",
  data: { sessionId: "pagination-uuid" }
}

// Analyze current page pagination
{
  type: "PAGINATION_ANALYZE",
  data: { sessionId: "pagination-uuid", pageContext: pageData }
}

// Update progress
{
  type: "PAGINATION_UPDATE_PROGRESS",
  data: { sessionId: "pagination-uuid", pageResults: results }
}

// Check completion criteria
{
  type: "PAGINATION_CHECK_COMPLETION",
  data: { sessionId: "pagination-uuid" }
}
```

## Pagination Strategies

### Numbered Pagination
```javascript
async handleNumberedPagination(session) {
  while (session.currentState.hasNextPage) {
    // Extract data from current page
    const pageResults = await this.pageScrapingService.extractPage(session);
    
    // Update progress and check completion
    await this.updateProgress(session.sessionId, pageResults);
    const shouldStop = await this.checkCompletionCriteria(session.sessionId);
    
    if (shouldStop) break;
    
    // Navigate to next page
    await this.navigateToNextPage(session.sessionId);
    await this.waitForPageLoad();
  }
}
```

### Infinite Scroll
```javascript
async handleInfiniteScroll(session) {
  let previousItemCount = 0;
  let consecutiveNoNewItems = 0;
  
  while (consecutiveNoNewItems < 3) {
    // Scroll to bottom
    await this.scrollToBottom();
    await this.waitForContent();
    
    // Extract new items
    const currentItems = await this.countItems();
    const newItemsLoaded = currentItems > previousItemCount;
    
    if (newItemsLoaded) {
      consecutiveNoNewItems = 0;
      previousItemCount = currentItems;
      
      // Extract and process new items
      await this.extractNewItems(session);
    } else {
      consecutiveNoNewItems++;
    }
  }
}
```

### Load More Button
```javascript
async handleLoadMorePagination(session) {
  while (await this.hasLoadMoreButton()) {
    // Extract current page data
    await this.extractCurrentPageData(session);
    
    // Click load more button
    await this.clickLoadMoreButton();
    await this.waitForNewContent();
    
    // Check if new content was loaded
    const hasNewContent = await this.detectNewContent();
    if (!hasNewContent) break;
    
    // Check completion criteria
    const shouldStop = await this.checkCompletionCriteria(session.sessionId);
    if (shouldStop) break;
  }
}
```

## Completion Detection

### Completion Criteria
```javascript
async checkCompletionCriteria(sessionId) {
  const session = await this.getSession(sessionId);
  const criteria = session.completionCriteria;
  
  // Check max pages limit
  if (session.progress.pagesProcessed >= session.limits.maxPages) {
    return { shouldStop: true, reason: "max_pages" };
  }
  
  // Check max items limit
  if (session.progress.totalItemsFound >= session.limits.maxItems) {
    return { shouldStop: true, reason: "max_items" };
  }
  
  // Check age limit
  if (await this.hasReachedAgeLimit(session)) {
    return { shouldStop: true, reason: "age_limit" };
  }
  
  // Check duplicate rate
  if (await this.hasHighDuplicateRate(session)) {
    return { shouldStop: true, reason: "duplicate_limit" };
  }
  
  // Check if no more pages exist
  if (!session.currentState.hasNextPage) {
    return { shouldStop: true, reason: "no_more_pages" };
  }
  
  return { shouldStop: false };
}
```

### Smart Stopping
```javascript
async calculateOptimalStoppingPoint(session) {
  const duplicateRate = session.progress.duplicatesFound / session.progress.totalItemsFound;
  const efficiencyTrend = await this.calculateEfficiencyTrend(session);
  
  // If duplicate rate is very high and efficiency is declining
  if (duplicateRate > 0.9 && efficiencyTrend < -0.1) {
    return { shouldStop: true, reason: "low_efficiency" };
  }
  
  // If we haven't found new items in several pages
  const recentPages = session.pageHistory.slice(-3);
  const recentNewItems = recentPages.reduce((sum, page) => sum + page.newItems, 0);
  
  if (recentNewItems === 0 && recentPages.length >= 3) {
    return { shouldStop: true, reason: "no_new_items" };
  }
  
  return { shouldStop: false };
}
```

## Error Handling and Recovery

### Common Pagination Issues
- Pagination controls not found or moved
- JavaScript pagination that doesn't update URL
- Rate limiting or anti-bot measures
- Network timeouts during navigation
- Dynamic content loading failures

### Recovery Strategies
```javascript
async handlePaginationError(error, session) {
  switch (error.type) {
    case "controls_not_found":
      // Try alternative selectors or AI analysis
      return await this.findAlternativePaginationControls(session);
    
    case "navigation_timeout":
      // Retry with longer timeout
      return await this.retryNavigationWithBackoff(session);
    
    case "rate_limited":
      // Implement polite delay and retry
      return await this.handleRateLimit(session);
    
    case "content_not_loaded":
      // Wait longer or refresh page
      return await this.handleContentLoadingIssue(session);
    
    default:
      // Generic error handling
      return await this.handleGenericPaginationError(error, session);
  }
}
```

## Integration Points

### Page Scraper Integration
- Coordinate page extraction with pagination navigation
- Share page context and analysis results
- Handle extraction errors during pagination
- Optimize extraction timing with navigation

### Data Storage Integration
- Check for duplicate identifiers during pagination
- Track progress and completion status
- Store pagination session metadata
- Support resume functionality

### Navigation Controller Integration
- Coordinate complex navigation flows
- Handle login state during pagination
- Manage page readiness verification
- Support navigation error recovery

### Repository Manager Integration
- Use repository-specific pagination configuration
- Update pagination performance metrics
- Handle configuration changes
- Support different pagination patterns per repository

## Performance Optimization

### Navigation Efficiency
- Minimize wait times between page navigation
- Optimize pagination detection algorithms
- Cache pagination control selectors
- Batch operations where possible

### Memory Management
- Clean up page data after processing
- Limit session history retention
- Optimize data structures for large datasets
- Implement progressive data processing

### User Experience
- Provide real-time progress updates
- Allow user to pause/resume operations
- Show estimated time remaining
- Enable cancellation at any point

## Testing Strategy

### Unit Tests
- Pagination detection algorithms
- Navigation control interaction
- Completion criteria evaluation
- Error handling scenarios

### Integration Tests
- End-to-end pagination flows
- Cross-component coordination
- Performance under various page structures
- Error recovery procedures

### Performance Tests
- Large dataset pagination
- Memory usage during long sessions
- Network resilience testing
- Concurrent session handling