# ScrapedKnees Architecture Overview

## Vision
ScrapedKnees will be built as a collection of independent, microservice-style components within a Chrome extension. Each component operates as a self-contained module with clear interfaces, following the pattern established by the AI Manager.

## Core Architecture Principles

### 1. Microservice Pattern
Each major functionality is implemented as an independent service:
- **Self-contained**: All related code in one directory
- **Interface-driven**: Communication through well-defined APIs
- **Isolation**: No direct dependencies between services
- **Testable**: Each service can be tested independently

### 2. Service Layer Pattern
Complex functionality is abstracted behind simple interfaces:
```javascript
// Example: Repository Manager
const repoManager = new RepositoryManager();
const repository = await repoManager.createRepository(config);
const entries = await repoManager.getEntries(repositoryId);
```

### 3. Message-Based Communication
Services communicate through the Chrome extension message system:
- Background script acts as message router
- No direct service-to-service communication
- Async message handling with proper error handling

## Component Architecture

### 1. Repository Manager
**Purpose**: Manages repository definitions and configurations
- **Location**: `src/repository-manager/`
- **Interface**: Repository CRUD operations, configuration management
- **Storage**: Repository definitions, metadata, settings
- **Dependencies**: None (storage only)

### 2. Data Storage
**Purpose**: Handles storage of repository data and extracted entries
- **Location**: `src/data-storage/`
- **Interface**: Data persistence, querying, status tracking
- **Storage**: Extracted entries, identifiers, dates, status
- **Dependencies**: None (storage only)

### 3. Page Scraper
**Purpose**: Analyzes and extracts data from current page
- **Location**: `src/page-scraper/`
- **Interface**: Data extraction, rule application, AI integration
- **Dependencies**: AI Manager (for analysis), Repository Manager (for rules), Data Storage (for duplicate checking)

### 4. Navigation Controller
**Purpose**: Handles navigation to correct pages and login flows
- **Location**: `src/navigation-controller/`
- **Interface**: Page navigation, login detection, flow management
- **Dependencies**: Repository Manager (for navigation rules)

### 5. Pagination Controller
**Purpose**: Manages pagination and multi-page data collection
- **Location**: `src/pagination-controller/`
- **Interface**: Page detection, navigation, completion tracking
- **Dependencies**: Page Scraper (for data extraction), Data Storage (for tracking progress)

### 6. Data Broker
**Purpose**: Exports and synchronizes data to external systems
- **Location**: `src/data-broker/`
- **Interface**: Export operations, format conversion, external API integration
- **Dependencies**: Data Storage (for data access), Repository Manager (for export configs)

### 7. Scheduler
**Purpose**: Manages automated scraping schedules and user notifications
- **Location**: `src/scheduler/`
- **Interface**: Schedule management, notification system, automation triggers
- **Dependencies**: Repository Manager, Data Storage, Navigation Controller

## Data Flow Architecture

### 1. Repository Creation
```
User Input → Repository Manager → Data Storage
           ↓
    Configuration Storage
```

### 2. Data Extraction Process
```
User Trigger → Scheduler → Navigation Controller → Page Scraper
                                                        ↓
Data Storage ← Pagination Controller ← Page Analysis (AI Manager)
```

### 3. Data Export
```
User Request → Data Broker → Data Storage → External Systems
                          ↓
               Repository Manager (for export configs)
```

## Component Interfaces

### Standard Interface Pattern
Each component follows this pattern:
```javascript
class ComponentManager {
  constructor() {
    this.initialize();
  }
  
  async initialize() {
    // Setup storage, load configuration
  }
  
  // Core interface methods
  async primaryOperation(params) {
    // Main functionality
  }
  
  // Configuration methods
  async getConfiguration() {}
  async setConfiguration(config) {}
  
  // Status methods
  async getStatus() {}
  async getStatistics() {}
}
```

### Message Handling Pattern
```javascript
// In background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch(message.type) {
    case 'REPOSITORY_CREATE':
      repositoryManager.createRepository(message.data)
        .then(result => sendResponse({success: true, data: result}))
        .catch(error => sendResponse({success: false, error: error.message}));
      break;
  }
  return true; // Keep channel open for async response
});
```

## Storage Architecture

### Separation by Component
Each component manages its own storage:
- **Repository Manager**: Repository definitions, configurations
- **Data Storage**: Extracted data, entries, metadata
- **Page Scraper**: Scraping rules, AI analysis cache
- **Navigation Controller**: Navigation flows, login states
- **Pagination Controller**: Page tracking, completion status
- **Data Broker**: Export configurations, sync status
- **Scheduler**: Schedule definitions, notification states

### Storage Interface Pattern
```javascript
class ComponentStorage {
  async save(key, data) {}
  async load(key) {}
  async delete(key) {}
  async list(filter) {}
  async clear() {}
}
```

## Security and Privacy

### Data Isolation
- Each component has access only to its own storage
- Cross-component data access through interfaces only
- No direct storage sharing between components

### API Key Management
- Only AI Manager handles API keys
- Other components request AI services through AI Manager interface
- No API keys stored outside AI Manager

### User Data Protection
- All scraped data stored locally in Chrome storage
- Optional external sync through Data Broker
- Clear data retention and deletion policies

## Error Handling and Resilience

### Component-Level Error Handling
Each component implements:
- Graceful error recovery
- Fallback mechanisms
- Error logging and reporting
- Status reporting to UI

### System-Level Resilience
- Component failures don't affect other components
- Background script manages component lifecycle
- Automatic recovery and retry mechanisms
- User notification of system issues

## Testing Strategy

### Unit Testing
Each component tested independently:
- Mock external dependencies
- Test all interface methods
- Validate error handling
- Performance testing

### Integration Testing
Test component interactions:
- Message passing between components
- Data flow through the system
- End-to-end user workflows
- Error propagation and handling

## Development Workflow

### Component Development
1. Define component interface and responsibilities
2. Create component directory structure
3. Implement core functionality
4. Add storage layer
5. Implement message handling
6. Write comprehensive tests
7. Document component API

### Integration Phase
1. Register component with background script
2. Add UI integration points
3. Test component interactions
4. Performance optimization
5. Error handling refinement