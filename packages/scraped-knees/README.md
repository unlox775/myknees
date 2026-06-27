# ScrapedKnees - AI-Powered Web Data Scraper

> Part of the [MyKnees Finance Application](../README.md) - AI-powered data extraction for financial insights.

ScrapedKnees is a Chrome extension that will use AI to extract detailed financial data from online retailers and services. The goal is to help users track and analyze their purchase history by connecting bank statement transactions to actual purchase details.

## 🎯 Vision

**"I see a $127.45 charge on Amazon from last week. What did I actually buy?"**

ScrapedKnees will answer this question by:
- **Creating data repositories** to define what information to extract from websites
- **Training AI models** to recognize purchase data patterns on retailer websites
- **Extracting detailed information** about purchases (items, prices, dates, etc.)
- **Connecting bank transactions** to actual purchase details
- **Providing context** for financial data through automated exports

## ✅ Currently Implemented

### Core Infrastructure
- **Chrome Extension Framework**: Complete manifest, build system, and development tools
- **AI Manager**: Full integration with multiple AI providers (Groq, OpenRouter, OpenAI, Anthropic)
- **Settings Management**: Secure API key storage and provider configuration
- **Basic UI Components**: Options page, popup interface, and extension infrastructure

### Working Features
- Extension installation and configuration
- AI provider setup and testing
- API key management and validation
- Development build system with testing framework

## 🚧 Planned Architecture

ScrapedKnees will be built using a microservice-style architecture with these main components:

### 1. Repository Manager
Manages data repository definitions - what type of data to extract, how to identify unique records, and how to structure the information.

### 2. Page Scraper  
Analyzes web pages and extracts structured data using AI assistance to identify patterns and adapt to page changes.

### 3. Navigation Controller
Handles page navigation, login detection, and flow management to get users to the correct pages for extraction.

### 4. Pagination Controller
Manages multi-page data collection, detecting pagination patterns and ensuring comprehensive data extraction.

### 5. Data Storage
Handles persistence and retrieval of extracted data with duplicate detection, querying, and status tracking.

### 6. Data Broker
Exports data to various formats (CSV, Google Sheets, etc.) with automation and scheduling capabilities.

### 7. Scheduler
Orchestrates automated extraction workflows, monitors data freshness, and manages user notifications.

## 🛠️ Development

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Google Chrome browser

### Quick Setup

```bash
# Navigate to the extension directory
cd packages/scraped-knees

# Install and build
make install
make build

# Load in Chrome
# Go to chrome://extensions/, enable Developer mode, 
# click "Load unpacked", select the dist folder
```

### Development Commands

```bash
# Show all available commands
make help

# Development workflow
make dev            # Start development mode with watch
make test           # Run unit tests
make lint           # Check code quality
make package        # Create extension.zip

# Project status
make status         # Check project status and next steps
```

## 📁 Project Structure

```
packages/scraped-knees/
├── src/
│   ├── ai-manager.js          # ✅ AI service manager (complete)
│   ├── ai-manager/            # ✅ AI provider implementations
│   ├── background.js          # ✅ Background service worker
│   ├── ui/                    # ✅ User interface components
│   └── icons/                 # ✅ Extension icons
├── docs/                      # 📋 Architecture and planning docs
│   ├── current-status.md      # Current implementation status
│   ├── ai-manager.md          # AI Manager documentation
│   └── future-work/           # Planned component specifications
├── test/                      # ✅ Unit tests and test framework
├── dist/                      # Built extension files
├── manifest.json              # ✅ Extension manifest
└── webpack.config.js          # ✅ Build configuration
```

## 🎬 Planned User Workflow

### Initial Setup
1. Install the extension and configure AI provider
2. Create a new repository (e.g., "Amazon Orders")
3. Define the data structure and extraction rules
4. Set up navigation flow for the target website

### Data Extraction Process
1. Navigate to the target website (Amazon orders page)
2. AI analyzes the page structure and generates extraction rules
3. Extension extracts data across multiple pages automatically
4. Data is stored locally with duplicate detection
5. Results are exported to user's preferred format

### Ongoing Usage
1. Scheduler monitors data freshness
2. Automated notifications prompt user when updates are needed
3. One-click data refresh with minimal user intervention
4. Continuous export to Google Sheets or other destinations

## 🔗 Integration with MyKnees

ScrapedKnees is designed as part of the larger MyKnees financial ecosystem:

- **Data Source**: Provides detailed purchase data to the main application
- **AI Training**: Contributes to overall financial pattern recognition
- **User Experience**: Seamless integration with web app and backend services

## 📋 Development Roadmap

### Phase 1: Core Components (Next)
- [ ] Repository Manager implementation
- [ ] Data Storage system
- [ ] Basic Page Scraper with AI integration
- [ ] Navigation Controller

### Phase 2: Advanced Features
- [ ] Pagination Controller
- [ ] Data Broker with export capabilities
- [ ] Scheduler with automation
- [ ] Advanced UI and user experience

### Phase 3: MyKnees Integration
- [ ] Backend service integration
- [ ] Real-time data synchronization
- [ ] User authentication integration
- [ ] Cloud storage for repositories

## 📖 Documentation

- [Current Status](docs/current-status.md) - What's implemented now
- [AI Manager](docs/ai-manager.md) - AI integration documentation
- [Architecture Overview](docs/future-work/architecture-overview.md) - System architecture
- [Component Specifications](docs/future-work/) - Detailed component plans

## 🤝 Contributing

This is part of a larger project. See the main [MyKnees Contributing Guide](../../CONTRIBUTING.md).

### Development Guidelines
1. Follow the microservice architecture pattern
2. Write comprehensive tests for new components  
3. Update documentation for any new features
4. Ensure AI integration follows established patterns

## 📄 License

MIT License - Part of the MyKnees project

---

**ScrapedKnees** - Bringing clarity to your financial data, one extraction at a time. 🕷️💰