# MyKnees Finance Application

> **"Where did my money go?"** - MyKnees helps you answer this question with AI-powered insights into your financial life.

MyKnees (a pun on "monies") is a comprehensive personal finance application designed to eliminate financial confusion through intelligent data aggregation and simple, actionable insights. The platform uses AI to help you understand your spending patterns, track your financial health, and make better financial decisions.

## 🎯 Vision

MyKnees transforms how you understand your finances by:

- **Connecting the dots** between bank statements and actual purchase details
- **Providing context** for every transaction through AI-powered analysis
- **Answering questions** about your spending habits and financial patterns
- **Offering insights** to help you make better financial decisions

## 🏗️ Architecture

This is a monorepo containing multiple packages that work together to provide a complete financial intelligence platform:

```
myknees/
├── packages/
│   ├── scraped-knees/     # AI-powered web data scraper (Chrome extension)
│   ├── web-app/           # Frontend web application (planned)
│   ├── backend/           # Backend API and services (planned)
│   └── shared/            # Shared utilities and types (planned)
├── docs/                  # Documentation
└── tools/                 # Development tools and scripts
```

## 📦 Packages

### 🕷️ ScrapedKnees (Chrome Extension)
**Status: ✅ Active Development**

A Chrome extension that uses AI to extract detailed purchase information from online retailers. When you see a transaction on your bank statement, ScrapedKnees can help you find the actual purchase details from Amazon, Walmart, Costco, and other online stores.

**Key Features:**
- Visual training mode for AI data extraction
- Automatic detection of purchase patterns
- Export of detailed transaction data
- Support for multiple retailer formats

**Use Case:** "I see a $127.45 charge on Amazon from last week. What did I actually buy?"

### 🌐 Web Application (Planned)
**Status: 🚧 Planned**

The main web interface for MyKnees where users can:
- View consolidated financial data
- Ask questions about their spending
- Get AI-powered insights and recommendations
- Manage their financial goals

### 🔧 Backend Services (Planned)
**Status: 🚧 Planned**

Backend infrastructure including:
- User authentication and management
- Financial data storage and processing
- AI/ML services for pattern recognition
- API endpoints for data access

### 📚 Shared Libraries (Planned)
**Status: 🚧 Planned**

Common utilities, types, and components shared across packages.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Google Chrome (for ScrapedKnees extension)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd myknees
   ```

2. **Install dependencies for all packages**
   ```bash
   npm install
   ```

3. **Start development**
   ```bash
   # For ScrapedKnees extension
   cd packages/scraped-knees
   make quick-dev
   ```

## 🛠️ Development

### Package-Specific Development

Each package has its own development workflow:

#### ScrapedKnees
```bash
cd packages/scraped-knees
make help          # Show available commands
make quick-dev     # Start development mode
make build         # Build for production
make package       # Create extension.zip
```

#### Web Application (when ready)
```bash
cd packages/web-app
npm run dev        # Start development server
```

#### Backend (when ready)
```bash
cd packages/backend
npm run dev        # Start development server
```

### Monorepo Commands

```bash
# Install all dependencies
npm install

# Run tests across all packages
npm test

# Build all packages
npm run build

# Lint all packages
npm run lint
```

## 📋 Roadmap

### Phase 1: Data Foundation ✅
- [x] ScrapedKnees Chrome extension
- [x] Basic data extraction capabilities
- [x] Training mode for AI pattern recognition

### Phase 2: Core Platform 🚧
- [ ] Web application for data visualization
- [ ] Backend services for data storage
- [ ] User authentication and management
- [ ] Basic AI integration

### Phase 3: Intelligence 🚧
- [ ] Advanced AI/ML for pattern recognition
- [ ] Natural language query interface
- [ ] Predictive insights and recommendations
- [ ] Financial goal tracking

### Phase 4: Integration 🚧
- [ ] Bank API integrations
- [ ] Credit card statement parsing
- [ ] Receipt scanning and OCR
- [ ] Mobile application

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation:** Check the `docs/` folder for detailed guides
- **Issues:** Report bugs and request features via GitHub Issues
- **Discussions:** Join the conversation in GitHub Discussions

## 🔗 Links

- [ScrapedKnees Documentation](packages/scraped-knees/README.md)
- [Development Guide](DEVELOPMENT.md)
- [Architecture Overview](docs/architecture.md)

---

**MyKnees** - Making your money make sense. 💰✨
