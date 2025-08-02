# Development Guide

This guide will help you get started with developing the AI Data Scraper Chrome extension.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Google Chrome browser
- Make (for using the Makefile commands)

## Quick Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-data-scraper-extension
   ```

2. **Quick development setup**
   ```bash
   make quick-dev
   ```
   This will install dependencies and start development mode with watch.

   > **Note**: The `node_modules/` directory and `package-lock.json` are excluded from version control via `.gitignore`. They will be created when you run `make install`.

### Alternative Setup

If you prefer manual setup:

```bash
# Install dependencies
make install

# Start development mode
make dev
```

This will watch for file changes and rebuild automatically.

3. **Load extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

## Development Workflow

### Making Changes

1. **Edit source files** in the `src/` directory
2. **Save changes** - webpack will automatically rebuild
3. **Reload extension** in Chrome:
   - Go to `chrome://extensions/`
   - Click the refresh icon on your extension
   - Or press `Ctrl+R` on the extension page

### Testing Changes

1. **Run unit tests**
   ```bash
   make test
   ```

2. **Run tests in watch mode**
   ```bash
   make test-watch
   ```

3. **Lint code**
   ```bash
   make lint
   ```

### Debugging

1. **Background Script Debugging**
   - Go to `chrome://extensions/`
   - Find your extension
   - Click "service worker" link
   - Use Chrome DevTools to debug

2. **Content Script Debugging**
   - Open DevTools on any webpage
   - Check the Console tab for logs
   - Use `console.log()` in content scripts

3. **Popup Debugging**
   - Right-click the extension icon
   - Select "Inspect popup"
   - Use DevTools to debug

## Makefile Commands

The project includes a comprehensive Makefile for easy development. Run `make help` to see all available commands.

### Quick Commands
```bash
make help          # Show all available commands
make status        # Check project status and next steps
make quick-dev     # Install + start development mode
make quick-build   # Install + build for production
make quick-test    # Install + run tests
```

### Development Commands
```bash
make install       # Install dependencies
make dev           # Start development mode with watch
make build         # Build for production
make clean         # Clean build artifacts
```

### Testing Commands
```bash
make test          # Run unit tests
make test-watch    # Run tests in watch mode
```

### Code Quality Commands
```bash
make lint          # Check code quality
make lint-fix      # Fix linting issues
```

### Deployment Commands
```bash
make package       # Create extension.zip
make deploy        # Full deployment pipeline
```

### Chrome Extension Commands
```bash
make load-chrome   # Show instructions for loading in Chrome
make reload-chrome # Show instructions for reloading extension
```

## File Structure

```
src/
├── background.js          # Service worker (extension lifecycle)
├── content.js             # Content script (page interaction)
├── popup.js               # Popup logic
├── popup.html             # Popup template
├── content.css            # Content script styles
├── injected.js            # Injected script (data extraction)
└── test/                  # Unit tests
    ├── setup.js           # Test environment
    └── content.test.js    # Content script tests
```

## Key Concepts

### Message Passing

The extension uses Chrome's message passing API for communication:

```javascript
// Send message from popup to background
chrome.runtime.sendMessage({ type: 'START_TRAINING' });

// Send message from background to content script
chrome.tabs.sendMessage(tabId, { type: 'START_TRAINING_MODE' });

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle message
});
```

### Storage

Use Chrome's storage API for persistent data:

```javascript
// Save data
chrome.storage.local.set({ key: 'value' });

// Get data
chrome.storage.local.get(['key'], (result) => {
  console.log(result.key);
});
```

### Content Scripts

Content scripts run in the context of web pages:

```javascript
// Access DOM
document.querySelector('.item');

// Inject scripts
const script = document.createElement('script');
script.src = chrome.runtime.getURL('injected.js');
document.head.appendChild(script);
```

## Common Tasks

### Adding New Features

1. **Add UI elements** in `popup.html`
2. **Add logic** in `popup.js`
3. **Add message handling** in `background.js`
4. **Add page interaction** in `content.js`
5. **Add tests** in `src/test/`

### Adding New Message Types

1. **Define message type** in sender
2. **Handle message** in receiver
3. **Add tests** for message handling

### Adding New Storage Keys

1. **Update storage schema** in `background.js`
2. **Add default values** in `setupDefaultStorage()`
3. **Update tests** if needed

## Troubleshooting

### Extension Not Loading

- Check `dist/` folder exists and has files
- Verify `manifest.json` is valid
- Check Chrome extension console for errors

### Changes Not Appearing

- Reload extension in `chrome://extensions/`
- Check webpack build output
- Verify file paths in `manifest.json`

### Tests Failing

- Check test setup in `src/test/setup.js`
- Verify Chrome API mocks
- Check for syntax errors in test files

### Build Errors

- Check webpack configuration
- Verify all dependencies installed
- Check for syntax errors in source files

## Best Practices

1. **Use ES6+ features** - Babel will transpile
2. **Follow ESLint rules** - Run `npm run lint`
3. **Write tests** for new functionality
4. **Use meaningful names** for variables and functions
5. **Add comments** for complex logic
6. **Handle errors gracefully** - Use try/catch blocks

## Deployment

1. **Build for production**
   ```bash
   make build
   ```

2. **Package extension**
   ```bash
   make package
   ```
   This creates `extension.zip`

3. **Full deployment pipeline**
   ```bash
   make deploy
   ```
   This runs clean, lint, test, build, and package in sequence.

3. **Upload to Chrome Web Store** (when ready)

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Message Passing](https://developer.chrome.com/docs/extensions/mv3/messaging/)
- [Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)