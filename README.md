# AI Data Scraper Chrome Extension

A powerful Chrome extension that allows you to train an AI to extract data from any website using visual element selection and pattern recognition.

## Features

- **Visual Training Mode**: Click on elements to train the AI to recognize data patterns
- **Element Exclusion**: Exclude unwanted elements like advertisements
- **Pagination Support**: Automatically detect and navigate through paginated content
- **Data Export**: Export extracted data in CSV format
- **Training Sessions**: Save and reuse training configurations
- **Keyboard Shortcuts**: Quick access to training mode and controls

## Quick Start

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-data-scraper-extension
   ```

2. **Install dependencies and build**
   ```bash
   make install
   make build
   ```
   
   > **Note**: The `dist/` folder will be created after building. This folder contains the built extension files that you'll load into Chrome.

### Using Makefile (Recommended)

The project includes a comprehensive Makefile for easy development:

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

4. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder from this project

### Development

1. **Start development mode**
   ```bash
   npm run dev
   ```
   This will watch for changes and rebuild automatically.

2. **Run tests**
   ```bash
   npm test
   ```

3. **Lint code**
   ```bash
   npm run lint
   ```

## Usage

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

## Project Structure

```
├── src/
│   ├── background.js          # Service worker for extension lifecycle
│   ├── content.js             # Content script for page interaction
│   ├── popup.js               # Popup UI logic
│   ├── popup.html             # Popup UI template
│   ├── content.css            # Styles for content script overlays
│   ├── injected.js            # Script injected into pages for data extraction
│   └── test/                  # Unit tests
│       ├── setup.js           # Test environment setup
│       └── content.test.js    # Content script tests
├── dist/                      # Built extension files
├── manifest.json              # Extension manifest
├── package.json               # Dependencies and scripts
├── webpack.config.js          # Build configuration
├── .eslintrc.js              # Code linting rules
├── .babelrc                  # JavaScript transpilation
└── README.md                 # This file
```

## Architecture

### Background Script (`background.js`)
- Manages extension lifecycle
- Handles communication between components
- Manages storage for training sessions and scraped data
- Coordinates between popup and content scripts

### Content Script (`content.js`)
- Injected into web pages
- Handles training mode UI and interactions
- Manages element selection and overlays
- Communicates with background script

### Popup (`popup.js` + `popup.html`)
- Main user interface
- Controls training mode start/stop
- Manages training sessions
- Handles data export

### Injected Script (`injected.js`)
- Advanced DOM manipulation
- Data extraction logic
- Pagination analysis
- Structured data parsing

## API Reference

### Message Types

#### Background Script Messages
- `START_TRAINING`: Start training mode on current tab
- `STOP_TRAINING`: Stop training mode
- `SAVE_TRAINING_DATA`: Save training session
- `GET_TRAINING_SESSIONS`: Retrieve saved sessions
- `EXECUTE_SCRAPING`: Run data extraction
- `GET_SCRAPED_DATA`: Get extracted data

#### Content Script Messages
- `START_TRAINING_MODE`: Enable training mode
- `STOP_TRAINING_MODE`: Disable training mode
- `EXECUTE_SCRAPING`: Extract data from page

### Storage Schema

```javascript
{
  trainingSessions: [
    {
      id: string,
      url: string,
      timestamp: string,
      selectedElements: Array,
      excludedElements: Array,
      config: Object
    }
  ],
  scrapedData: [
    {
      url: string,
      timestamp: string,
      items: Array,
      sessionId: string
    }
  ],
  settings: {
    autoStart: boolean,
    debugMode: boolean,
    overlayOpacity: number
  }
}
```

## Development Guidelines

### Code Style
- Use ES6+ features
- Follow ESLint rules
- Write unit tests for new features
- Use meaningful variable and function names

### Testing
- Run tests before committing: `npm test`
- Add tests for new functionality
- Maintain good test coverage

### Building
- Development: `npm run dev` (with watch mode)
- Production: `npm run build`
- Package: `npm run package` (creates extension.zip)

## Troubleshooting

### Common Issues

1. **Extension not loading**
   - Check that all files are built in `dist/` folder
   - Verify manifest.json is valid
   - Check Chrome extension console for errors

2. **Training mode not working**
   - Ensure you're on a regular website (not chrome:// pages)
   - Check if content script is injected (look for console logs)
   - Verify permissions in manifest.json

3. **Data extraction fails**
   - Check if training session exists for the current page
   - Verify element selectors are still valid
   - Check browser console for errors

### Debug Mode

Enable debug mode in extension settings to see detailed logs:
1. Open extension popup
2. Look for debug settings
3. Enable debug mode
4. Check browser console for detailed logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run linting and tests
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check the troubleshooting section
- Look at existing issues
- Create a new issue with detailed information

## Roadmap

- [ ] AI-powered pattern recognition
- [ ] Advanced pagination detection
- [ ] Data validation and cleaning
- [ ] Export to multiple formats
- [ ] Cloud sync for training sessions
- [ ] Batch processing across multiple pages
- [ ] Custom extraction rules
- [ ] Integration with external APIs
