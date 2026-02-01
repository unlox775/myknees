# MyKnees Finance Application - Monorepo Makefile
# Provides commands for managing the entire MyKnees ecosystem

.PHONY: help install build dev test lint clean status scraped-knees web-app backend shared

# Default target
help:
	@echo "MyKnees Finance Application - Available Commands:"
	@echo ""
	@echo "📦 Monorepo Commands:"
	@echo "  install     - Install dependencies for all packages"
	@echo "  build       - Build all packages"
	@echo "  test        - Run tests for all packages"
	@echo "  lint        - Lint all packages"
	@echo "  clean       - Clean all packages"
	@echo "  status      - Show status of all packages"
	@echo ""
	@echo "🕷️  ScrapedKnees (Chrome Extension):"
	@echo "  scraped-knees-dev     - Start ScrapedKnees development"
	@echo "  scraped-knees-build   - Build ScrapedKnees extension"
	@echo "  scraped-knees-test    - Test ScrapedKnees"
	@echo "  scraped-knees-package - Package ScrapedKnees"
	@echo ""
	@echo "🌐 Web Application (Planned):"
	@echo "  web-app-dev           - Start web app development (when ready)"
	@echo "  web-app-build         - Build web app (when ready)"
	@echo ""
	@echo "🔧 Backend Services:"
	@echo "  data-store            - Create ~/.myknees/backend and symlinks (Mac)"
	@echo "  backup                - Backup imports + data"
	@echo "  migrate               - Run DB migrations"
	@echo ""
	@echo "📚 Shared Libraries (Planned):"
	@echo "  shared-build          - Build shared libraries (when ready)"
	@echo ""

# Monorepo commands
install:
	@echo "Installing dependencies for all packages..."
	@if [ -d "packages/scraped-knees" ]; then \
		cd packages/scraped-knees && make install; \
	fi
	@echo "✅ All dependencies installed"

build:
	@echo "Building all packages..."
	@if [ -d "packages/scraped-knees" ]; then \
		cd packages/scraped-knees && make build; \
	fi
	@echo "✅ All packages built"

test:
	@echo "Running tests for all packages..."
	@if [ -d "packages/scraped-knees" ]; then \
		cd packages/scraped-knees && make test; \
	fi
	@echo "✅ All tests completed"

lint:
	@echo "Linting all packages..."
	@if [ -d "packages/scraped-knees" ]; then \
		cd packages/scraped-knees && make lint; \
	fi
	@echo "✅ All packages linted"

clean:
	@echo "Cleaning all packages..."
	@if [ -d "packages/scraped-knees" ]; then \
		cd packages/scraped-knees && make clean; \
	fi
	@echo "✅ All packages cleaned"

status:
	@echo "📊 MyKnees Monorepo Status"
	@echo "=========================="
	@echo ""
	@echo "📦 Packages:"
	@if [ -d "packages/scraped-knees" ]; then \
		echo "  ✅ scraped-knees/ - Chrome extension (Active)"; \
	else \
		echo "  ❌ scraped-knees/ - Not found"; \
	fi
	@if [ -d "packages/web-app" ]; then \
		echo "  🚧 web-app/ - Web application (Planned)"; \
	else \
		echo "  ❌ web-app/ - Not found"; \
	fi
	@if [ -d "packages/backend" ]; then \
		echo "  🚧 backend/ - Backend services (Planned)"; \
	else \
		echo "  ❌ backend/ - Not found"; \
	fi
	@if [ -d "packages/shared" ]; then \
		echo "  🚧 shared/ - Shared libraries (Planned)"; \
	else \
		echo "  ❌ shared/ - Not found"; \
	fi
	@echo ""
	@echo "🔧 Quick Commands:"
	@echo "  make scraped-knees-dev    - Start ScrapedKnees development"
	@echo "  make scraped-knees-build  - Build ScrapedKnees extension"
	@echo "  make status               - Check this status again"

# ScrapedKnees commands
scraped-knees-dev:
	@echo "Starting ScrapedKnees development..."
	@if [ -d "packages/scraped-knees" ]; then \
		cd packages/scraped-knees && make dev; \
	else \
		echo "❌ ScrapedKnees package not found"; \
		exit 1; \
	fi

scraped-knees-build:
	@echo "Building ScrapedKnees extension..."
	@if [ -d "packages/scraped-knees" ]; then \
		cd packages/scraped-knees && make build; \
	else \
		echo "❌ ScrapedKnees package not found"; \
		exit 1; \
	fi

scraped-knees-test:
	@echo "Testing ScrapedKnees..."
	@if [ -d "packages/scraped-knees" ]; then \
		cd packages/scraped-knees && make test; \
	else \
		echo "❌ ScrapedKnees package not found"; \
		exit 1; \
	fi

scraped-knees-package:
	@echo "Packaging ScrapedKnees extension..."
	@if [ -d "packages/scraped-knees" ]; then \
		cd packages/scraped-knees && make package; \
	else \
		echo "❌ ScrapedKnees package not found"; \
		exit 1; \
	fi

scraped-knees-status:
	@echo "Checking ScrapedKnees status..."
	@if [ -d "packages/scraped-knees" ]; then \
		cd packages/scraped-knees && make status; \
	else \
		echo "❌ ScrapedKnees package not found"; \
		exit 1; \
	fi

# Web application commands (placeholder)
web-app-dev:
	@echo "🚧 Web application development not yet implemented"
	@echo "This will be available when the web-app package is set up"

web-app-build:
	@echo "🚧 Web application build not yet implemented"
	@echo "This will be available when the web-app package is set up"

# Backend commands
backend-dev:
	@echo "Backend has no dev server yet; use make data-store and make migrate"

backend-build:
	@echo "Backend has no build step; use make data-store and make migrate"

# Data store: create ~/.myknees/backend and symlinks (Mac only)
data-store:
	@if [ -d "packages/backend" ]; then \
		cd packages/backend && make data-store; \
	else \
		echo "❌ packages/backend not found"; exit 1; \
	fi

# Backend backup (imports + data -> ~/.myknees/backend/backups)
backup:
	@if [ -d "packages/backend" ]; then \
		cd packages/backend && make backup; \
	else \
		echo "❌ packages/backend not found"; exit 1; \
	fi

# Backend migrations
migrate:
	@if [ -d "packages/backend" ]; then \
		cd packages/backend && make migrate; \
	else \
		echo "❌ packages/backend not found"; exit 1; \
	fi

# Shared libraries commands (placeholder)
shared-build:
	@echo "🚧 Shared libraries build not yet implemented"
	@echo "This will be available when the shared package is set up"

# Quick development commands
quick-dev: scraped-knees-dev

quick-build: scraped-knees-build

quick-test: scraped-knees-test

# Development workflow
dev-full: lint test build
	@echo "🎯 Full development workflow completed!"
	@echo "📦 All packages built and tested"
	@echo "✨ Ready for development"

# Production readiness
prod-check: lint test build scraped-knees-package
	@echo "🚀 Production readiness check completed!"
	@echo "✅ All checks passed"
	@echo "📦 ScrapedKnees extension packaged"
	@echo "📁 All packages built"

# Show monorepo info
info:
	@echo "MyKnees Finance Application"
	@echo "=========================="
	@echo ""
	@echo "🎯 Vision: Where did my money go?"
	@echo "MyKnees helps you answer this question with AI-powered insights."
	@echo ""
	@echo "📦 Current Packages:"
	@echo "  🕷️  ScrapedKnees - AI-powered web data scraper (Active)"
	@echo "  🌐 Web Application - Frontend interface (Planned)"
	@echo "  🔧 Backend Services - API and data processing (Planned)"
	@echo "  📚 Shared Libraries - Common utilities (Planned)"
	@echo ""
	@echo "🔗 Links:"
	@echo "  📖 Main README: README.md"
	@echo "  🕷️  ScrapedKnees: packages/scraped-knees/README.md"
	@echo "  🌐 Web App: packages/web-app/README.md"
	@echo "  🔧 Backend: packages/backend/README.md"
	@echo "  📚 Shared: packages/shared/README.md"