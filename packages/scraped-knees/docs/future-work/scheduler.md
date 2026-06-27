# Scheduler

## Overview
The Scheduler manages automated scraping schedules, monitors repository data freshness, and orchestrates the overall extraction workflow. It acts as the system's intelligence layer, determining when repositories need updates and coordinating the extraction process.

## Core Responsibilities

### 1. Schedule Management
- Define and manage scraping schedules for repositories
- Calculate optimal scraping frequency based on data patterns
- Handle schedule conflicts and prioritization
- Support user-defined and adaptive scheduling

### 2. Data Freshness Monitoring
- Track when repositories were last updated
- Identify repositories that need fresh data
- Analyze data patterns to predict update needs
- Generate user notifications for actionable items

### 3. Extraction Orchestration
- Coordinate the complete extraction workflow
- Manage component interactions during extraction
- Handle extraction failures and recovery
- Optimize resource usage across multiple repositories

### 4. User Notification System
- Alert users when manual intervention is needed
- Provide progress updates during extractions
- Send completion notifications with summaries
- Handle user preferences for notification types

## Data Models

### Repository Schedule
```javascript
{
  id: "schedule-uuid",
  repositoryId: "amazon-orders",
  name: "Amazon Orders Weekly Check",
  enabled: true,
  
  // Schedule configuration
  schedule: {
    type: "adaptive", // fixed, adaptive, manual, event_driven
    frequency: "weekly", // hourly, daily, weekly, monthly, custom
    interval: 7, // days for weekly, custom interval
    time: "09:00", // preferred time
    timezone: "America/New_York",
    
    // Adaptive scheduling parameters
    adaptive: {
      minInterval: 1, // minimum days between checks
      maxInterval: 30, // maximum days between checks
      activityThreshold: 0.1, // activity level to trigger more frequent checks
      dataVelocity: "medium" // low, medium, high
    }
  },
  
  // Execution criteria
  criteria: {
    // Data freshness requirements
    maxDataAge: 604800000, // 7 days in milliseconds
    minNewItemsExpected: 1,
    
    // Execution conditions
    requireUserPresence: true, // true = user must be available
    autoExecute: false, // automatically run or just notify
    maxExecutionTime: 3600000, // 1 hour timeout
    
    // Quality requirements
    minConfidenceScore: 0.7,
    requireManualReview: false
  },
  
  // Last execution tracking
  lastExecution: {
    executedAt: 1640995200000,
    status: "completed", // completed, failed, cancelled, timeout
    itemsFound: 15,
    newItems: 3,
    duration: 180000, // 3 minutes
    nextScheduled: 1641600000000
  },
  
  // Performance metrics
  performance: {
    averageExecutionTime: 175000,
    successRate: 0.92,
    averageNewItems: 2.8,
    efficiency: 0.85,
    lastOptimized: 1640995200000
  },
  
  // User preferences
  userPreferences: {
    notifications: {
      onCompletion: true,
      onFailure: true,
      onNewData: true,
      onInterventionNeeded: true
    },
    autoRetry: true,
    maxRetries: 3,
    notificationMethods: ["extension", "email"]
  }
}
```

### Extraction Session Plan
```javascript
{
  sessionId: "session-plan-uuid",
  planId: "execution-plan-uuid",
  repositoryId: "amazon-orders",
  scheduledAt: 1640995200000,
  status: "pending", // pending, in_progress, completed, failed, cancelled
  
  // Execution plan
  executionPlan: {
    phases: [
      {
        phase: "navigation",
        component: "NavigationController",
        estimatedDuration: 30000,
        dependencies: [],
        parameters: { /* navigation parameters */ }
      },
      {
        phase: "scraping",
        component: "PageScraper",
        estimatedDuration: 120000,
        dependencies: ["navigation"],
        parameters: { /* scraping parameters */ }
      },
      {
        phase: "pagination",
        component: "PaginationController",
        estimatedDuration: 180000,
        dependencies: ["scraping"],
        parameters: { /* pagination parameters */ }
      },
      {
        phase: "export",
        component: "DataBroker",
        estimatedDuration: 60000,
        dependencies: ["pagination"],
        parameters: { /* export parameters */ }
      }
    ],
    totalEstimatedDuration: 390000,
    priority: "normal", // low, normal, high, urgent
    resourceRequirements: {
      aiCalls: 5,
      estimatedCost: 0.15,
      bandwidth: "low"
    }
  },
  
  // Execution tracking
  execution: {
    startedAt: null,
    currentPhase: null,
    completedPhases: [],
    failedPhases: [],
    
    // Real-time progress
    progress: {
      overallProgress: 0.0,
      currentPhaseProgress: 0.0,
      estimatedTimeRemaining: 390000,
      pagesProcessed: 0,
      itemsFound: 0
    },
    
    // User interactions
    userInteractions: [
      {
        type: "login_required",
        requestedAt: 1640995300000,
        message: "Please log in to Amazon",
        status: "pending" // pending, completed, timeout
      }
    ]
  },
  
  // Results
  results: {
    success: null,
    summary: null,
    itemsExtracted: 0,
    newItems: 0,
    errors: [],
    recommendations: []
  }
}
```

### Notification
```javascript
{
  id: "notification-uuid",
  repositoryId: "amazon-orders",
  type: "intervention_required", // scheduled, completed, failed, intervention_required, new_data
  priority: "high", // low, normal, high, urgent
  
  // Notification content
  title: "Amazon Orders - Login Required",
  message: "Please log in to Amazon to continue data extraction",
  timestamp: 1640995200000,
  
  // Action requirements
  actionRequired: {
    type: "user_login",
    timeout: 900000, // 15 minutes
    instructions: "Click the extension icon and follow the login prompt",
    sessionId: "session-plan-uuid"
  },
  
  // Notification state
  status: "sent", // pending, sent, read, dismissed, expired
  methods: ["extension", "desktop"],
  sentAt: 1640995200000,
  readAt: null,
  
  // Context
  context: {
    repositoryName: "Amazon Orders",
    lastSuccessfulRun: 1640908800000,
    dataAge: 86400000, // 1 day old
    expectedNewItems: 3
  }
}
```

## Component Interface

### Core Methods
```javascript
class Scheduler {
  // Schedule management
  async createSchedule(repositoryId, scheduleConfig) {}
  async updateSchedule(scheduleId, updates) {}
  async deleteSchedule(scheduleId) {}
  async getSchedules(repositoryId) {}
  
  // Execution planning and management
  async planExecution(repositoryId, options) {}
  async executeScheduledRun(scheduleId) {}
  async cancelExecution(sessionId) {}
  async pauseExecution(sessionId) {}
  async resumeExecution(sessionId) {}
  
  // Monitoring and analysis
  async analyzeDataFreshness(repositoryId) {}
  async calculateOptimalSchedule(repositoryId) {}
  async getRepositoryHealth(repositoryId) {}
  async optimizeSchedules() {}
  
  // Notification management
  async sendNotification(notification) {}
  async getNotifications(filters) {}
  async markNotificationRead(notificationId) {}
  async dismissNotification(notificationId) {}
  
  // System orchestration
  async processScheduledTasks() {}
  async coordinateExtractionWorkflow(sessionId) {}
  async handleComponentFailure(component, error, sessionId) {}
  async getSystemStatus() {}
}
```

### Message Types
```javascript
// Create repository schedule
{
  type: "SCHEDULER_CREATE_SCHEDULE",
  data: { repositoryId: "amazon-orders", schedule: scheduleConfig }
}

// Execute scheduled run
{
  type: "SCHEDULER_EXECUTE_RUN",
  data: { scheduleId: "schedule-uuid", manual: false }
}

// Handle user intervention
{
  type: "SCHEDULER_USER_INTERVENTION",
  data: { sessionId: "session-plan-uuid", intervention: interventionData }
}

// Get repository health
{
  type: "SCHEDULER_GET_HEALTH",
  data: { repositoryId: "amazon-orders" }
}

// Process notifications
{
  type: "SCHEDULER_PROCESS_NOTIFICATIONS",
  data: { filters: notificationFilters }
}
```

## Scheduling Strategies

### Adaptive Scheduling
```javascript
async calculateAdaptiveSchedule(repositoryId) {
  const repository = await this.repositoryManager.getRepository(repositoryId);
  const dataHistory = await this.dataStorage.getExtractionHistory(repositoryId, 30);
  
  // Analyze data patterns
  const patterns = this.analyzeDataPatterns(dataHistory);
  
  // Calculate optimal frequency
  const optimalFrequency = this.calculateOptimalFrequency(patterns);
  
  // Adjust based on data velocity
  const adjustedFrequency = this.adjustForDataVelocity(optimalFrequency, patterns.velocity);
  
  return {
    frequency: adjustedFrequency,
    nextExecution: this.calculateNextExecution(adjustedFrequency),
    confidence: patterns.confidence,
    reasoning: patterns.reasoning
  };
}
```

### Data Pattern Analysis
```javascript
analyzeDataPatterns(extractionHistory) {
  const itemCounts = extractionHistory.map(h => h.newItems);
  const intervals = this.calculateIntervals(extractionHistory);
  
  // Detect patterns
  const weeklyPattern = this.detectWeeklyPattern(extractionHistory);
  const monthlyPattern = this.detectMonthlyPattern(extractionHistory);
  const trendAnalysis = this.analyzeTrend(itemCounts);
  
  // Calculate data velocity
  const velocity = this.calculateDataVelocity(itemCounts, intervals);
  
  return {
    weeklyPattern,
    monthlyPattern,
    trend: trendAnalysis,
    velocity,
    confidence: this.calculatePatternConfidence([weeklyPattern, monthlyPattern, trendAnalysis]),
    reasoning: this.generateReasoningText(weeklyPattern, monthlyPattern, trendAnalysis, velocity)
  };
}
```

### Execution Planning
```javascript
async planExecution(repositoryId, options = {}) {
  const repository = await this.repositoryManager.getRepository(repositoryId);
  const lastExecution = await this.getLastExecution(repositoryId);
  
  // Create execution plan
  const plan = {
    sessionId: uuidv4(),
    repositoryId,
    scheduledAt: Date.now(),
    executionPlan: await this.buildExecutionPlan(repository, lastExecution, options)
  };
  
  // Estimate resource requirements
  plan.executionPlan.resourceRequirements = await this.estimateResources(plan);
  
  // Check for conflicts and optimize
  await this.optimizeExecutionPlan(plan);
  
  return plan;
}
```

## Workflow Orchestration

### Complete Extraction Workflow
```javascript
async executeExtractionWorkflow(sessionPlan) {
  const session = await this.createExecutionSession(sessionPlan);
  
  try {
    // Phase 1: Navigation
    await this.executePhase(session, 'navigation');
    
    // Phase 2: Page Analysis and Setup
    await this.executePhase(session, 'analysis');
    
    // Phase 3: Data Extraction
    await this.executePhase(session, 'extraction');
    
    // Phase 4: Data Processing
    await this.executePhase(session, 'processing');
    
    // Phase 5: Export (if configured)
    if (session.plan.includeExport) {
      await this.executePhase(session, 'export');
    }
    
    // Complete session
    await this.completeExecution(session);
    
  } catch (error) {
    await this.handleExecutionError(session, error);
  }
}
```

### Phase Execution
```javascript
async executePhase(session, phaseName) {
  const phase = session.plan.phases.find(p => p.phase === phaseName);
  
  try {
    // Update session status
    await this.updateSessionPhase(session.sessionId, phaseName);
    
    // Execute component
    const result = await this.executeComponent(phase.component, phase.parameters);
    
    // Update progress
    await this.updatePhaseProgress(session.sessionId, phaseName, result);
    
    // Check for user intervention needs
    if (result.requiresIntervention) {
      await this.requestUserIntervention(session.sessionId, result.intervention);
    }
    
    return result;
    
  } catch (error) {
    await this.handlePhaseError(session.sessionId, phaseName, error);
    throw error;
  }
}
```

## Notification System

### Notification Types
```javascript
const notificationTypes = {
  scheduled: {
    title: "Scheduled Extraction Starting",
    icon: "clock",
    priority: "normal",
    actions: ["view", "cancel"]
  },
  
  intervention_required: {
    title: "Action Required",
    icon: "warning",
    priority: "high",
    actions: ["take_action", "dismiss", "snooze"]
  },
  
  completed: {
    title: "Extraction Completed",
    icon: "check",
    priority: "normal",
    actions: ["view_results", "dismiss"]
  },
  
  failed: {
    title: "Extraction Failed",
    icon: "error",
    priority: "high", 
    actions: ["retry", "view_details", "dismiss"]
  },
  
  new_data: {
    title: "New Data Available",
    icon: "data",
    priority: "normal",
    actions: ["view_data", "export", "dismiss"]
  }
};
```

### Smart Notification Management
```javascript
async sendSmartNotification(repositoryId, type, context) {
  const userPreferences = await this.getUserNotificationPreferences();
  const notificationHistory = await this.getRecentNotifications(repositoryId);
  
  // Check if we should throttle notifications
  if (this.shouldThrottleNotification(type, notificationHistory)) {
    return { sent: false, reason: "throttled" };
  }
  
  // Create notification
  const notification = this.createNotification(repositoryId, type, context);
  
  // Apply user preferences
  const methods = this.filterNotificationMethods(notification, userPreferences);
  
  // Send notification
  const results = await Promise.all(
    methods.map(method => this.sendNotificationViaMethod(notification, method))
  );
  
  // Track notification
  await this.trackNotification(notification, results);
  
  return { sent: true, methods, results };
}
```

## Performance and Optimization

### Resource Management
```javascript
async optimizeResourceUsage() {
  const activeExtractions = await this.getActiveExtractions();
  const systemResources = await this.getSystemResources();
  
  // Calculate resource allocation
  const allocation = this.calculateResourceAllocation(activeExtractions, systemResources);
  
  // Adjust execution priorities
  await this.adjustExecutionPriorities(allocation);
  
  // Reschedule if necessary
  if (allocation.needsRescheduling) {
    await this.rescheduleConflictingExtractions(allocation.conflicts);
  }
  
  return allocation;
}
```

### Schedule Optimization
```javascript
async optimizeSchedules() {
  const allSchedules = await this.getAllSchedules();
  const optimizations = [];
  
  for (const schedule of allSchedules) {
    const currentPerformance = await this.getSchedulePerformance(schedule.id);
    const optimizedConfig = await this.calculateOptimalSchedule(schedule.repositoryId);
    
    if (this.shouldUpdateSchedule(currentPerformance, optimizedConfig)) {
      optimizations.push({
        scheduleId: schedule.id,
        currentConfig: schedule.schedule,
        optimizedConfig,
        expectedImprovement: this.calculateImprovement(currentPerformance, optimizedConfig)
      });
    }
  }
  
  return optimizations;
}
```

## Error Handling and Recovery

### Execution Error Handling
```javascript
async handleExecutionError(session, error) {
  // Log error details
  await this.logExecutionError(session.sessionId, error);
  
  // Determine recovery strategy
  const recoveryStrategy = this.determineRecoveryStrategy(error, session);
  
  switch (recoveryStrategy.type) {
    case 'retry':
      return await this.retryExecution(session, recoveryStrategy.options);
    
    case 'reschedule':
      return await this.rescheduleExecution(session, recoveryStrategy.delay);
    
    case 'user_intervention':
      return await this.requestUserIntervention(session.sessionId, recoveryStrategy.intervention);
    
    case 'abort':
      return await this.abortExecution(session, recoveryStrategy.reason);
    
    default:
      return await this.handleUnknownError(session, error);
  }
}
```

### Graceful Degradation
```javascript
async handleComponentFailure(component, error, sessionId) {
  const session = await this.getExecutionSession(sessionId);
  
  // Try alternative approaches
  const alternatives = this.getComponentAlternatives(component);
  
  for (const alternative of alternatives) {
    try {
      const result = await this.executeAlternative(alternative, session);
      await this.logComponentSubstitution(component, alternative, sessionId);
      return result;
    } catch (altError) {
      continue; // Try next alternative
    }
  }
  
  // No alternatives worked, escalate
  throw new Error(`Component ${component} failed with no viable alternatives`);
}
```

## Integration Points

### Repository Manager Integration
- Monitor repository configurations for schedule updates
- Use repository metadata for schedule optimization
- Handle repository lifecycle events
- Support repository-specific scheduling rules

### Data Storage Integration
- Track extraction history for pattern analysis
- Monitor data freshness across repositories
- Support incremental extraction planning
- Manage execution session metadata

### All Component Integration
- Coordinate multi-component workflows
- Handle component dependencies and sequencing
- Manage component failure recovery
- Optimize cross-component resource usage

### User Interface Integration
- Provide schedule management interfaces
- Show real-time execution progress
- Handle user intervention requests
- Display system health and status

## Security and Privacy

### Schedule Security
- Encrypt sensitive schedule configurations
- Audit trail for schedule modifications
- Access controls for schedule management
- Secure storage of user preferences

### Execution Security
- Validate all execution parameters
- Secure inter-component communication
- Protect against execution injection attacks
- Monitor for unusual execution patterns

## Testing Strategy

### Unit Tests
- Schedule calculation algorithms
- Pattern analysis functions
- Notification logic
- Error handling scenarios

### Integration Tests
- End-to-end workflow execution
- Cross-component coordination
- Failure recovery procedures
- Performance under load

### System Tests
- Long-running schedule accuracy
- Resource usage optimization
- Concurrent execution handling
- User experience validation