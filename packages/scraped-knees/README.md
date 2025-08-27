# ScrapedKnees Chrome Extension

ScrapedKnees is an experimental Chrome extension used within the MyKnees project.  
It provides a small sandbox for configuring AI providers and sending test prompts.  
Future iterations will add automated page scanning and data extraction.

## Current Features
- Base Chrome extension structure with background worker, popup and options page
- Settings page for selecting an AI provider and storing API keys locally
- Central `AIManager` service that routes prompts to Groq, OpenRouter, OpenAI or Anthropic
- Popup that displays the connection status of the configured provider

## Getting Started
### Install Dependencies
```bash
cd packages/scraped-knees
make install
```

### Load the Extension
1. Run `make build` to generate the `dist/` folder
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** and choose **Load unpacked**
4. Select the generated `dist/` directory

## Development Commands
Common tasks are provided through the Makefile:
```bash
make build   # Build for production
make dev     # Watch and rebuild on changes
make test    # Run unit tests
make lint    # Lint source files
```

## Architecture Overview
```
scraped-knees/
├── src/
│   ├── ai-manager/        # Provider implementations and storage helpers
│   ├── ai-manager.js      # Main AI manager interface
│   ├── background.js      # Background service worker
│   └── ui/
│       ├── options/       # Options page assets
│       └── popup/         # Popup assets
├── manifest.json          # Chrome extension manifest
├── package.json           # Dependencies and scripts
└── test/                  # Unit tests
```

## Roadmap
Planned modules for the full scraping workflow include:
- **Repository Service** – define and store data repositories
- **Scraper Engine** – generate and apply scraping rules
- **Navigation Controller** – move through sites and pages
- **Data Broker** – export repository data to external targets
- **Scheduler** – trigger scraping runs based on recency

## License
MIT
