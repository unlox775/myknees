# ScrapedKnees Current Status

## Overview
ScrapedKnees is in an early planning phase. The extension foundation and the
AI connection framework are in place while the actual page–scanning features are
still to be built.

## ✅ Currently Implemented
### 1. Extension Foundation
- Chrome extension scaffold with manifest, background worker, popup and options
  page
- Webpack build system, Jest tests and Makefile helper commands
- Basic project documentation

### 2. Settings & AI Provider
- Options page for entering API keys and choosing a provider
- `AIManager` with providers for Groq, OpenRouter, OpenAI and Anthropic
- Popup displays provider connection status
- Usage statistics and request logging

## 📋 Planned
The following modules are planned for the full scraping workflow:
1. **Repository Service** – define repositories with identifiers and date ranges
2. **Scraper Engine** – generate scraping rules and extract structured data
3. **Navigation Controller** – move through sites and handle pagination/login
4. **Data Broker** – export repository data (CSV, Google Sheets, etc.)
5. **Scheduler** – trigger scraping runs and remind the user when updates are
   needed

## 🧪 Testing Status
- Unit tests cover the AI manager and options page
- Additional integration tests will be added as new modules appear
