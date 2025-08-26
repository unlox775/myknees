# AI Manager

## Overview
The AI Manager is a self-contained service that provides a unified interface for multiple AI providers. It handles API key management, provider selection, error handling, and cost tracking.

## Current Implementation

### Supported Providers
- **Groq**: Fast inference with various models
- **OpenRouter**: Access to multiple AI models through a single API
- **OpenAI**: Direct OpenAI API access
- **Anthropic**: Claude models through direct API

### Core Features

#### 1. Provider Management
- **Unified Interface**: All providers use the same API regardless of underlying service
- **Provider Selection**: Users can choose their preferred provider in settings
- **API Key Management**: Secure storage and validation of API keys
- **Fallback Mechanisms**: Automatic fallback if primary provider fails

#### 2. Settings Integration
- **Options Page**: UI for configuring AI providers and API keys
- **Storage**: Chrome storage API for secure key storage
- **Validation**: Real-time validation of API keys and connections
- **Cost Tracking**: Basic cost estimation and usage monitoring

#### 3. Error Handling
- **Robust Error Recovery**: Graceful handling of API failures
- **User Feedback**: Clear error messages and suggestions
- **Retry Logic**: Automatic retries with exponential backoff
- **Offline Support**: Graceful degradation when services are unavailable

## Architecture

### File Structure
```
src/
├── ai-manager.js              # Main AI manager service
└── ai-manager/
    ├── providers/             # Individual provider implementations
    │   ├── groq-provider.js
    │   ├── openrouter-provider.js
    │   ├── openai-provider.js
    │   ├── anthropic-provider.js
    │   └── openai-base.js     # Shared OpenAI-compatible base
    ├── interfaces/            # Service interfaces
    └── storage/               # AI-related storage utilities
```

### Core Interface
```javascript
class AIManager {
  async callAI(messages, options)
  async testConnection(provider)
  async getAvailableModels(provider)
  async estimateCost(messages, provider)
  async validateAPIKey(provider, key)
}
```

## Usage

### Basic AI Call
```javascript
const aiManager = new AIManager();
const response = await aiManager.callAI([
  { role: 'user', content: 'Hello, how are you?' }
]);
```

### Provider-Specific Options
```javascript
const response = await aiManager.callAI(messages, {
  provider: 'groq',
  model: 'llama3-8b-8192',
  temperature: 0.7,
  maxTokens: 1000
});
```

### Cost Estimation
```javascript
const cost = await aiManager.estimateCost(messages, 'groq');
console.log(`Estimated cost: $${cost}`);
```

## Settings Configuration

### Options Page Integration
The AI Manager integrates with the extension's options page to provide:
- Provider selection dropdown
- API key input fields with validation
- Model selection per provider
- Cost tracking display
- Connection testing

### Storage Pattern
```javascript
// User preferences stored in Chrome storage
{
  aiProvider: 'groq',
  apiKeys: {
    groq: 'encrypted-key',
    openrouter: 'encrypted-key',
    openai: 'encrypted-key',
    anthropic: 'encrypted-key'
  },
  models: {
    groq: 'llama3-8b-8192',
    openrouter: 'gpt-4',
    openai: 'gpt-4',
    anthropic: 'claude-3-sonnet'
  }
}

// Debug logs and usage data stored in Chrome storage local
{
  usageStats: {
    groq: {
      requests: 15,
      tokens: 2500,
      lastUsed: 1640995200000,
      models: {
        'llama3-8b-8192': {
          requests: 10,
          lastUsed: 1640995200000
        }
      }
    }
  },
  requestLog: [
    {
      timestamp: 1640995200000,
      provider: 'groq',
      model: 'llama3-8b-8192',
      request: '{"prompt": "Hello", "context": {}}',
      response: '{"success": true, "response": "Hi there!"}',
      success: true
    }
  ],
  aiStatus: {
    isReady: true,
    provider: 'groq',
    lastChecked: 1640995200000
  }
}
```

## Error Handling

### Common Error Scenarios
1. **Invalid API Key**: Clear error message with validation
2. **Rate Limiting**: Automatic retry with backoff
3. **Network Issues**: Graceful timeout and user notification
4. **Provider Unavailable**: Fallback to alternative provider
5. **Model Not Available**: Automatic model selection

### Error Recovery
- Automatic retries for transient failures
- Fallback to alternative providers
- User-friendly error messages
- Logging for debugging

## Cost Management

### Cost Tracking
- Real-time cost estimation
- Usage statistics per provider
- Monthly cost summaries
- Budget alerts (future feature)

### Optimization
- Model selection based on task complexity
- Token usage optimization
- Caching of common responses
- Batch processing where possible

## Integration Points

### Extension Components
- **Background Script**: Handles AI service initialization
- **Content Script**: Uses AI for page analysis
- **Options Page**: Configuration and testing
- **Popup**: Quick AI interactions

### Future Integrations
- **Training Session Engine**: AI-assisted training
- **Data Extraction Engine**: Intelligent data extraction
- **Analytics Engine**: Usage tracking and optimization

## Testing

### Unit Tests
- Provider interface testing
- Error handling validation
- Cost estimation accuracy
- API key validation

### Integration Tests
- End-to-end AI calls
- Provider switching
- Error recovery scenarios
- Performance testing

## Security Considerations

### API Key Protection
- Encrypted storage in Chrome storage
- No logging of sensitive keys
- Secure transmission to providers
- Key rotation support

### Privacy
- Minimal data sent to providers
- User consent for AI features
- Data anonymization where possible
- Clear privacy policies

## Debug Logs and Usage Tracking

### Debug Log Persistence
**Debug logs are persistent** and stored in Chrome's local storage. They are **NOT cleared on page refresh** and will persist until:
- The extension is uninstalled
- The browser data is cleared
- The logs are manually cleared through the debug interface

### What's Logged
- **Request/Response Pairs**: Complete request and response data for each AI call
- **Usage Statistics**: Per-provider and per-model usage counts
- **AI Status**: Connection status and last check timestamps
- **Error Information**: Failed requests with error details

### Log Management
- **Automatic Rotation**: Only the last 50 request log entries are kept
- **Storage Location**: Chrome Storage Local (persistent across sessions)
- **Data Structure**: JSON format for easy parsing and debugging
- **Privacy**: No sensitive data (like API keys) is logged

### Accessing Debug Data
```javascript
// Get usage statistics
const usageStats = await aiManager.getUsageStats();

// Get request log
const requestLog = await aiManager.getRequestLog();

// Get cached AI status
const status = await aiManager.getCachedStatus();
```

## Performance

### Optimization Strategies
- Connection pooling
- Response caching
- Lazy provider initialization
- Background processing

### Monitoring
- Response time tracking
- Error rate monitoring
- Cost per request tracking
- Provider performance comparison