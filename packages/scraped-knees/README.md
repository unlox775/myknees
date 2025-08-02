# ScrapedKnees - AI-Powered Web Data Scraper

> Part of the [MyKnees Finance Application](../README.md) - AI-powered data extraction for financial insights.

ScrapedKnees is a Chrome extension that uses AI to extract detailed purchase information from online retailers. When you see a transaction on your bank statement, ScrapedKnees can help you find the actual purchase details from Amazon, Walmart, Costco, and other online stores.

## 🎯 Purpose

**"I see a $127.45 charge on Amazon from last week. What did I actually buy?"**

ScrapedKnees answers this question by:
- **Training AI models** to recognize purchase data patterns on retailer websites
- **Extracting detailed information** about your purchases (items, prices, dates, etc.)
- **Connecting bank transactions** to actual purchase details
- **Providing context** for your financial data

## ✨ Features

- **Visual Training Mode**: Click on elements to train the AI to recognize data patterns
- **Element Exclusion**: Exclude unwanted elements like advertisements
- **Pagination Support**: Automatically detect and navigate through paginated content
- **Data Export**: Export extracted data in CSV format
- **Training Sessions**: Save and reuse training configurations
- **Keyboard Shortcuts**: Quick access to training mode and controls

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Google Chrome browser

### Installation

1. **Navigate to the package**
   ```bash
   cd packages/scraped-knees
   ```

2. **Install dependencies and build**
   ```bash
   make install
   make build
   ```

3. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder from this package

### Using Makefile (Recommended)

The package includes a comprehensive Makefile for easy development:

```bash
# Show all available commands
make help

# Quick setup and development
make quick-dev      # Install + start development mode
make quick-build    # Install + build for production
make quick-test     # Install + run tests

# Individual commands
make install        # Install dependencies
make build          # Build for production
make dev            # Start development mode with watch
make test           # Run unit tests
make lint           # Check code quality
make package        # Create extension.zip
make deploy         # Full deployment pipeline

# Chrome extension specific
make load-chrome    # Show instructions for loading in Chrome
make reload-chrome  # Show instructions for reloading

# Project status
make status         # Check project status and next steps
```

## 📖 Usage

### Training Mode

1. **Start Training**
   - Click the extension icon in your browser
   - Click "Start Training" button
   - Or use keyboard shortcut: `Ctrl+Shift+S`

2. **Select Elements**
   - Click on elements you want to extract data from
   - Selected elements will be highlighted in green
   - Use `Ctrl+Click` to exclude elements (highlighted in red)

3. **Save Training**
   - Click "Save Training" in the training panel
   - Or press `Escape` to stop training

### Data Extraction

1. **Extract Data**
   - Click "Extract Data" in the extension popup
   - The extension will use your training to extract data from the current page

2. **Export Data**
   - Click "Export Data" to download as CSV
   - Data includes all extracted information with timestamps

### Training Sessions

- View all your training sessions in the extension popup
- Click on a session to load it for the corresponding website
- Sessions are automatically saved and can be reused

## 🏗️ Architecture

### Extension Components

1. **Background Script** (`background.js`)
   - Service worker managing extension lifecycle
   - Message routing between components
   - Storage management for training sessions and scraped data
   - Tab management and communication

2. **Content Script** (`content.js`)
   - Injected into web pages
   - Training mode UI and interactions
   - Element selection and overlay management
   - Event handling and keyboard shortcuts

3. **Popup Interface** (`popup.js` + `popup.html`)
   - Main user interface
   - Training session management
   - Data extraction controls
   - Export functionality

4. **Injected Script** (`injected.js`)
   - Advanced DOM manipulation
   - Data extraction logic
   - Pagination analysis
   - Structured data parsing

## 📁 Project Structure

```
packages/scraped-knees/
├── src/
│   ├── background.js          # Service worker
│   ├── content.js             # Content script
│   ├── popup.js               # Popup logic
│   ├── popup.html             # Popup template
│   ├── content.css            # Content script styles
│   ├── injected.js            # Injected script
│   └── test/                  # Unit tests
│       ├── setup.js           # Test environment
│       └── content.test.js    # Content script tests
├── dist/                      # Built extension files
├── manifest.json              # Extension manifest
├── package.json               # Dependencies and scripts
├── webpack.config.js          # Build configuration
├── .eslintrc.js              # Code linting rules
├── .babelrc                  # JavaScript transpilation
├── Makefile                  # Development commands
└── README.md                 # This file
```

## 🛠️ Development

### Development Workflow

1. **Start development mode**
   ```bash
   make dev
   ```
   This will watch for changes and rebuild automatically.

2. **Run tests**
   ```bash
   make test
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

## 🔗 Integration with MyKnees

ScrapedKnees is designed to work as part of the larger MyKnees ecosystem:

- **Data Source**: Provides detailed purchase data to the main MyKnees application
- **AI Training**: Contributes to the overall AI model for financial pattern recognition
- **User Experience**: Seamless integration with the web application and backend services

## 📋 Roadmap

### Phase 1: Core Functionality ✅
- [x] Visual training mode
- [x] Basic data extraction
- [x] Training session management
- [x] CSV export functionality

### Phase 2: AI Integration 🚧
- [ ] AI-powered pattern recognition
- [ ] Automatic element detection
- [ ] Smart pagination handling
- [ ] Advanced data validation

### Phase 3: MyKnees Integration 🚧
- [ ] Direct integration with MyKnees backend
- [ ] Real-time data synchronization
- [ ] User authentication integration
- [ ] Cloud storage for training sessions

### Phase 4: Advanced Features 🚧
- [ ] Multi-language support
- [ ] Advanced retailer templates
- [ ] Batch processing capabilities
- [ ] Mobile companion app

## 🤝 Contributing

See the main [MyKnees Contributing Guide](../../CONTRIBUTING.md) for details.

### Package-Specific Guidelines

1. **Follow the existing code style** and ESLint rules
2. **Write tests** for new functionality
3. **Update documentation** for any new features
4. **Test on multiple retailer websites** to ensure compatibility

## 📄 License

This package is part of the MyKnees project and is licensed under the MIT License.

## 🔗 Links

- [MyKnees Main Repository](../../README.md)
- [Development Guide](../../DEVELOPMENT.md)
- [Architecture Overview](../../docs/architecture.md)

---

**ScrapedKnees** - Extracting insights from your online purchases. 🕷️💰