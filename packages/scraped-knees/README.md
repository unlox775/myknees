# ScrapedKnees - AI-Powered Web Data Scraper

> Part of the [MyKnees Finance Application](../README.md)

ScrapedKnees is a Chrome extension that provides the foundation for AI-assisted data extraction. Today it includes a working extension scaffold, settings management, and an AI Manager capable of calling a selected AI provider using stored API keys.

## 🎯 Purpose

Lay a solid, modular foundation for general data extraction from webpages, with AI assistance routed through a unified provider interface.

## ✨ Current Features (Implemented)

- Extension scaffold: manifest, background, content, popup
- Options page for AI provider selection and API key entry
- AI Manager framework to send simple queries to the chosen AI provider
- Build and dev tooling via Makefile and webpack

See `docs/current-status.md` for the detailed status.

## 🚫 Not Implemented Yet

- Visual training mode and keyboard shortcuts
- Data scraping/extraction engine and pagination handling
- Repository model/storage for extracted data
- Navigation/crawling controller and scheduler
- Data broker (exports beyond basic development utilities)

Planned specifications for these modules live under `docs/future-work/`.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Google Chrome browser

### Installation

1. Navigate to the package
   ```bash
   cd packages/scraped-knees
   ```

2. Install dependencies and build
   ```bash
   make install
   make build
   ```

3. Load in Chrome
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder from this package

### Using Makefile (Recommended)

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

## 📖 Usage (Today)

- Open the Options page to select an AI provider and enter API keys
- Use the AI Manager (via internal interfaces) to send basic AI queries
- Popup currently provides minimal controls; advanced training/extraction is planned

## 🏗️ Architecture (High-Level)

- **AI Manager** (`ai-manager.js`): Unified interface for AI calls using stored keys and provider selection
- **Background Script** (`background.js`): Extension lifecycle and message routing
- **Content Script** (`content.js`): Page context bridge and future interaction point
- **Popup/Options**: Basic UI for configuration and minimal interactions

Planned modules and their interfaces are documented in `docs/future-work/`.

## 📁 Project Structure

```
packages/scraped-knees/
├── src/
│   ├── ai-manager.js          # Main AI service manager
│   ├── ai-manager/            # AI service components
│   │   ├── interfaces/        # AI provider interfaces
│   │   ├── providers/         # AI provider implementations
│   │   └── storage/           # AI-specific storage services
│   ├── ui/                    # Options/popup and future UI
│   ├── background.js          # Background service worker
│   ├── injected.js            # (Reserved) Page-context injection
│   └── icons/                 # Extension icons
├── test/                      # Unit tests
├── dist/                      # Built extension files
├── manifest.json              # Extension manifest
├── package.json               # Dependencies and scripts
├── webpack.config.js          # Build configuration
├── .eslintrc.js               # Code linting rules
├── .babelrc                   # JavaScript transpilation
├── Makefile                   # Development commands
└── README.md                  # This file
```

## 🔗 Integration with MyKnees

ScrapedKnees is designed as a self-contained, modular provider that will integrate with the broader MyKnees ecosystem once repository and broker modules exist.

## 📋 Roadmap (Docs-Only; No Code Changes in This PR)

- Phase 1 (Done): Extension scaffold, Settings, AI Manager framework
- Phase 2 (Planned): Repository Model & Service; Scraper Engine; Navigation Controller
- Phase 3 (Planned): Scheduler; Data Broker (CSV first, then destinations like Google Sheets)

See `docs/future-work/` for detailed specs and interfaces.

## 🤝 Contributing

See the main [MyKnees Contributing Guide](../../CONTRIBUTING.md) for details.

## 📄 License

MIT License.

## 🔗 Links

- [MyKnees Main Repository](../../README.md)
- [Development Guide](../../DEVELOPMENT.md)
- [Current Status](docs/current-status.md)
- [AI Manager](docs/ai-manager.md)
- [Planned Modules](docs/future-work/)

---

ScrapedKnees — a modular, AI-ready foundation for web data extraction.