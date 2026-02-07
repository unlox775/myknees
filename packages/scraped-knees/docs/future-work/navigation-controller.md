# Navigation Controller

## Overview
The Navigation Controller handles page navigation, login detection, and flow management to get users to the correct pages for data extraction. It manages the initial setup and ensures the user is in the right location before scraping begins.

## Core Responsibilities

### 1. Login State Management
- Detect when user is logged in vs logged out
- Identify login pages and redirect to authentication
- Handle different authentication flows
- Monitor session state throughout extraction

### 2. Page Navigation
- Navigate to repository-defined starting pages
- Follow navigation flows step by step
- Handle dynamic redirects and URL changes
- Verify arrival at correct destinations

### 3. Flow Orchestration
- Execute multi-step navigation sequences
- Handle conditional navigation based on page state
- Coordinate with other components during navigation
- Manage navigation timeouts and retries

### 4. State Verification
- Verify page readiness for data extraction
- Check for required elements and content
- Handle loading states and dynamic content
- Validate navigation success criteria

## Data Models

### Navigation Configuration
```javascript
{
  repositoryId: "amazon-orders",
  name: "Amazon Orders Navigation",
  
  // Base configuration
  baseConfig: {
    baseUrl: "https://amazon.com",
    startingPath: "/your-orders",
    timeout: 30000, // 30 seconds
    retryAttempts: 3
  },
  
  // Login detection
  loginDetection: {
    loggedInIndicators: [
      { selector: ".nav-line-1-container", type: "element" },
      { selector: "#nav-link-accountList", type: "element", text: "Hello" }
    ],
    loggedOutIndicators: [
      { selector: "#signInSubmit", type: "element" },
      { url: "/signin", type: "url_contains" }
    ],
    loginUrl: "https://amazon.com/signin",
    loginPageTitle: "Amazon Sign In"
  },
  
  // Navigation flow
  navigationSteps: [
    {
      id: "step-1",
      action: "navigate",
      url: "https://amazon.com",
      description: "Navigate to Amazon homepage"
    },
    {
      id: "step-2", 
      action: "check_login",
      onLoggedOut: "redirect_to_login",
      description: "Verify user is logged in"
    },
    {
      id: "step-3",
      action: "navigate",
      url: "https://amazon.com/your-orders",
      description: "Navigate to orders page"
    },
    {
      id: "step-4",
      action: "wait_for",
      selector: ".order-info, .order-card",
      timeout: 10000,
      description: "Wait for orders to load"
    },
    {
      id: "step-5",
      action: "verify",
      condition: "orders_visible",
      description: "Verify orders are displayed"
    }
  ],
  
  // Success criteria
  successCriteria: {
    requiredElements: [".order-info", ".order-card"],
    forbiddenElements: [".error-message", ".signin-form"],
    urlPatterns: ["*/your-orders*", "*/order-history*"],
    pageTitle: /Your Orders|Order History/i
  },
  
  // Error handling
  errorHandling: {
    maxRetries: 3,
    retryDelay: 5000,
    fallbackUrls: [
      "https://www.amazon.com/gp/css/order-history",
      "https://amazon.com/orders"
    ],
    commonIssues: [
      {
        condition: "captcha_detected",
        selector: ".captcha",
        action: "wait_for_user",
        message: "Please complete the captcha and try again"
      },
      {
        condition: "two_factor_required",
        selector: ".cvf-page",
        action: "wait_for_user", 
        message: "Please complete two-factor authentication"
      }
    ]
  }
}
```

### Navigation Session
```javascript
{
  sessionId: "nav-session-uuid",
  repositoryId: "amazon-orders",
  startedAt: 1640995200000,
  completedAt: null,
  status: "in_progress", // in_progress, completed, failed, user_intervention_required
  
  // Current state
  currentState: {
    currentUrl: "https://amazon.com/signin",
    currentStep: "step-2",
    isLoggedIn: false,
    pageReady: false,
    lastAction: "check_login"
  },
  
  // Execution history
  executionHistory: [
    {
      stepId: "step-1",
      action: "navigate",
      startedAt: 1640995200000,
      completedAt: 1640995203000,
      status: "completed",
      url: "https://amazon.com",
      result: { success: true, finalUrl: "https://amazon.com" }
    },
    {
      stepId: "step-2",
      action: "check_login",
      startedAt: 1640995203000,
      completedAt: 1640995205000,
      status: "completed",
      result: { 
        success: false, 
        isLoggedIn: false,
        redirect: "https://amazon.com/signin"
      }
    }
  ],
  
  // Issues encountered
  issues: [
    {
      type: "login_required",
      stepId: "step-2",
      timestamp: 1640995205000,
      message: "User needs to log in",
      action: "redirect_to_login"
    }
  ],
  
  // User interactions required
  userInteractions: [
    {
      type: "login_required",
      message: "Please log in to Amazon to continue",
      expectedAction: "complete_login",
      timeoutAt: 1640996000000 // 15 minutes from now
    }
  ]
}
```

### Page State
```javascript
{
  url: "https://amazon.com/your-orders",
  title: "Your Orders - Amazon.com",
  readyState: "complete",
  timestamp: 1640995200000,
  
  // Login state
  loginState: {
    isLoggedIn: true,
    username: "user@example.com",
    indicators: [
      { selector: ".nav-line-1-container", found: true },
      { selector: "#signInSubmit", found: false }
    ]
  },
  
  // Page readiness
  readiness: {
    domReady: true,
    resourcesLoaded: true,
    requiredElementsPresent: true,
    noErrors: true,
    score: 1.0
  },
  
  // Required elements status
  requiredElements: [
    { selector: ".order-info", found: true, count: 15 },
    { selector: ".order-card", found: false, count: 0 }
  ],
  
  // Potential issues
  issues: [
    {
      type: "warning",
      message: "Page loaded slowly",
      loadTime: 8500
    }
  ]
}
```

## Component Interface

### Core Methods
```javascript
class NavigationController {
  // Main navigation methods
  async navigateToRepository(repositoryId) {}
  async executeNavigationFlow(repositoryId, config) {}
  async verifyPageReady(repositoryId) {}
  async handleUserIntervention(sessionId, action) {}
  
  // Login management
  async checkLoginState(config) {}
  async detectLoginRequired() {}
  async waitForLogin(timeout) {}
  async verifyLoginSuccess(config) {}
  
  // Page state management
  async getCurrentPageState() {}
  async waitForPageReady(criteria, timeout) {}
  async verifySuccessCriteria(criteria) {}
  async detectPageIssues() {}
  
  // Flow control
  async executeNavigationStep(step, context) {}
  async handleNavigationError(error, step) {}
  async retryNavigation(sessionId) {}
  async cancelNavigation(sessionId) {}
  
  // Session management
  async createNavigationSession(repositoryId) {}
  async updateNavigationSession(sessionId, updates) {}
  async getNavigationSession(sessionId) {}
  async getNavigationHistory(repositoryId) {}
}
```

### Message Types
```javascript
// Start navigation to repository
{
  type: "NAVIGATION_START",
  data: { repositoryId: "amazon-orders", options: navigationOptions }
}

// Check current page state
{
  type: "NAVIGATION_CHECK_STATE",
  data: { repositoryId: "amazon-orders" }
}

// Handle user interaction
{
  type: "NAVIGATION_USER_ACTION",
  data: { sessionId: "nav-session-uuid", action: "login_completed" }
}

// Retry failed navigation
{
  type: "NAVIGATION_RETRY",
  data: { sessionId: "nav-session-uuid" }
}

// Verify page readiness
{
  type: "NAVIGATION_VERIFY_READY",
  data: { repositoryId: "amazon-orders", criteria: readinessCriteria }
}
```

## Navigation Actions

### Action Types
```javascript
// Navigate to URL
{
  action: "navigate",
  url: "https://amazon.com/your-orders",
  options: { waitUntil: "domcontentloaded" }
}

// Wait for element
{
  action: "wait_for",
  selector: ".order-info",
  timeout: 10000,
  condition: "visible" // visible, present, text_contains
}

// Check login state
{
  action: "check_login",
  indicators: loginConfig,
  onLoggedOut: "redirect_to_login"
}

// Verify condition
{
  action: "verify",
  condition: "orders_visible",
  criteria: successCriteria
}

// Wait for user
{
  action: "wait_for_user",
  message: "Please complete login",
  timeout: 900000 // 15 minutes
}

// Click element
{
  action: "click",
  selector: ".load-more-orders",
  optional: true
}
```

### Action Execution
```javascript
async executeAction(action, context) {
  switch(action.action) {
    case "navigate":
      return await this.navigateToUrl(action.url, action.options);
    case "wait_for":
      return await this.waitForElement(action.selector, action.timeout);
    case "check_login":
      return await this.checkLoginState(action.indicators);
    case "verify":
      return await this.verifyCondition(action.condition, action.criteria);
    case "wait_for_user":
      return await this.requestUserIntervention(action.message, action.timeout);
    case "click":
      return await this.clickElement(action.selector, action.optional);
  }
}
```

## Error Handling and Recovery

### Common Navigation Issues
- User not logged in
- Captcha challenges
- Two-factor authentication
- Page timeouts
- Network connectivity issues
- Site maintenance pages

### Recovery Strategies
```javascript
const errorRecoveryStrategies = {
  login_required: {
    action: "redirect_to_login",
    userMessage: "Please log in to continue",
    timeout: 900000 // 15 minutes
  },
  captcha_detected: {
    action: "wait_for_user",
    userMessage: "Please complete the captcha",
    timeout: 300000 // 5 minutes
  },
  page_timeout: {
    action: "retry_navigation",
    maxRetries: 3,
    retryDelay: 5000
  },
  network_error: {
    action: "retry_with_backoff",
    maxRetries: 5,
    baseDelay: 2000
  }
};
```

### User Intervention Handling
```javascript
async requestUserIntervention(type, message, timeout) {
  const intervention = {
    type,
    message,
    requestedAt: Date.now(),
    timeoutAt: Date.now() + timeout
  };
  
  // Show user notification
  await this.showUserNotification(intervention);
  
  // Wait for user action or timeout
  return await this.waitForUserAction(intervention);
}
```

## Integration Points

### Repository Manager Integration
- Retrieve navigation configuration
- Handle repository-specific navigation flows
- Update navigation success/failure metrics
- Support configuration changes

### Page Scraper Integration
- Coordinate page readiness verification
- Signal when extraction can begin
- Handle page state changes during scraping
- Support multi-page extraction flows

### Scheduler Integration
- Receive automated navigation requests
- Report navigation status for scheduling
- Handle scheduled navigation flows
- Support batch navigation operations

### Data Storage Integration
- Track navigation session history
- Store navigation performance metrics
- Log navigation issues and resolutions
- Support navigation analytics

## Performance Optimization

### Navigation Efficiency
- Cache navigation configurations
- Reuse navigation sessions when possible
- Optimize page load detection
- Minimize unnecessary navigation steps

### Timeout Management
- Dynamic timeout adjustment based on site performance
- Progressive timeout increases for retries
- User-configurable timeout settings
- Smart timeout detection for different action types

### State Caching
- Cache login state across sessions
- Remember successful navigation paths
- Store page readiness criteria results
- Optimize repeated navigation flows

## Testing Strategy

### Unit Tests
- Individual action execution
- State detection logic
- Error handling scenarios
- Configuration validation

### Integration Tests
- End-to-end navigation flows
- Cross-component communication
- Error recovery procedures
- User intervention scenarios

### Performance Tests
- Navigation speed optimization
- Timeout handling under various conditions
- Concurrent navigation session management
- Memory usage during long sessions

## Security Considerations

### User Privacy
- No storage of login credentials
- Minimal tracking of user actions
- Secure handling of session information
- Clear data retention policies

### Site Compatibility
- Respect robots.txt and site policies
- Implement polite navigation delays
- Handle rate limiting gracefully
- Avoid disrupting site functionality