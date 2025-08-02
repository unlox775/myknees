# ScrapedKnees Chrome Extension - Makefile
# Provides simple commands for common development tasks

.PHONY: help install build dev test test-watch lint lint-fix clean package deploy check-deps

# Default target
help:
	@echo "ScrapedKnees Chrome Extension - Available Commands:"
	@echo ""
	@echo "Setup:"
	@echo "  install     - Install dependencies"
	@echo "  check-deps  - Check if dependencies are installed"
	@echo ""
	@echo "Development:"
	@echo "  dev         - Start development mode with watch"
	@echo "  build       - Build for production"
	@echo "  clean       - Clean build artifacts"
	@echo ""
	@echo "Testing:"
	@echo "  test        - Run unit tests"
	@echo "  test-watch  - Run tests in watch mode"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint        - Check code quality"
	@echo "  lint-fix    - Fix linting issues"
	@echo ""
	@echo "Deployment:"
	@echo "  package     - Create extension.zip for distribution"
	@echo "  deploy      - Full deployment pipeline (build, test, package)"
	@echo ""
	@echo "Chrome Extension:"
	@echo "  load-chrome - Instructions for loading extension in Chrome"
	@echo "  reload-chrome - Instructions for reloading extension"
	@echo ""

# Setup commands
install:
	@echo "Installing dependencies..."
	npm install
	@echo "✅ Dependencies installed successfully"

check-deps:
	@echo "Checking dependencies..."
	@if [ ! -d "node_modules" ]; then \
		echo "❌ Dependencies not found. Run 'make install' first."; \
		exit 1; \
	fi
	@echo "✅ Dependencies found"

# Development commands
dev: check-deps
	@echo "Starting development mode..."
	@echo "📝 Watching for changes..."
	@echo "🔄 Auto-rebuilding on file changes..."
	@echo "⏹️  Press Ctrl+C to stop"
	npm run dev

build: check-deps
	@echo "Building for production..."
	npm run build
	@echo "✅ Build completed successfully"
	@echo "📁 Extension files created in dist/"

clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/
	rm -f extension.zip
	@echo "✅ Clean completed"

# Testing commands
test: check-deps
	@echo "Running unit tests..."
	npm test
	@echo "✅ Tests completed"

build-icon: check-deps
	@echo "Building extension icons..."
	@if [ ! -f icon.png ]; then \
		echo "❌ icon.png not found. Please add your custom 128x128 PNG icon to the root directory."; \
		echo "   Then run: make build-icon"; \
		exit 1; \
	fi
	@echo "Converting icon.png to multiple sizes..."
	@mkdir -p src/icons
	@cp icon.png src/icons/icon128.png
	@echo "✅ Icons built successfully"
	@echo "📁 Icon files created in src/icons/"

test-watch: check-deps
	@echo "Running tests in watch mode..."
	@echo "🔄 Tests will re-run on file changes"
	@echo "⏹️  Press Ctrl+C to stop"
	npm run test:watch

# Code quality commands
lint: check-deps
	@echo "Checking code quality..."
	npm run lint
	@echo "✅ Linting completed"

lint-fix: check-deps
	@echo "Fixing linting issues..."
	npm run lint:fix
	@echo "✅ Linting issues fixed"

# Deployment commands
package: build
	@echo "Creating extension package..."
	npm run package
	@echo "✅ Extension packaged as extension.zip"
	@echo "📦 Ready for distribution"

deploy: clean lint test build package
	@echo "🎉 Deployment pipeline completed successfully!"
	@echo "📦 Extension ready: extension.zip"
	@echo "📁 Build files: dist/"

# Chrome extension specific commands
load-chrome:
	@echo "📋 Instructions to load extension in Chrome:"
	@echo "1. Open Chrome and go to chrome://extensions/"
	@echo "2. Enable 'Developer mode' (toggle in top right)"
	@echo "3. Click 'Load unpacked'"
	@echo "4. Select the 'dist' folder from this project"
	@echo ""
	@echo "💡 Make sure to run 'make build' first!"

reload-chrome:
	@echo "📋 Instructions to reload extension:"
	@echo "1. Go to chrome://extensions/"
	@echo "2. Find 'AI Data Scraper' extension"
	@echo "3. Click the refresh icon 🔄"
	@echo "4. Or press Ctrl+R on the extension page"
	@echo ""
	@echo "💡 Run 'make build' first if you made changes!"

# Quick development workflow
quick-dev: install dev

quick-test: install test

quick-build: install build

# Development workflow with all checks
dev-full: install lint test build
	@echo "🎯 Development environment ready!"
	@echo "📁 Extension built in dist/"
	@echo "🧪 Tests passed"
	@echo "✨ Code quality checks passed"

# Production readiness check
prod-check: install lint test build package
	@echo "🚀 Production readiness check completed!"
	@echo "✅ All checks passed"
	@echo "📦 Extension packaged: extension.zip"
	@echo "📁 Build files: dist/"

# Show project status
status:
	@echo "📊 ScrapedKnees Status:"
	@echo ""
	@if [ -d "node_modules" ]; then \
		echo "✅ Dependencies: Installed"; \
	else \
		echo "❌ Dependencies: Not installed (run 'make install')"; \
	fi
	@if [ -d "dist" ]; then \
		echo "✅ Build: Available (dist/)"; \
	else \
		echo "❌ Build: Not available (run 'make build')"; \
	fi
	@if [ -f "extension.zip" ]; then \
		echo "✅ Package: Available (extension.zip)"; \
	else \
		echo "❌ Package: Not available (run 'make package')"; \
	fi
	@echo ""
	@echo "📋 Next steps:"
	@if [ ! -d "node_modules" ]; then \
		echo "  make install"; \
	fi
	@if [ ! -d "dist" ]; then \
		echo "  make build"; \
	fi
	@if [ ! -f "extension.zip" ]; then \
		echo "  make package"; \
	fi
	@echo "  make load-chrome"