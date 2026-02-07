# ScrapedKnees Current Status

## Overview
This document reflects the actual, currently implemented scope of the ScrapedKnees Chrome extension. It intentionally excludes speculative or partially implemented features.

## ✅ Implemented Today

### 1) Extension Foundation
- Chrome extension scaffold: manifest, background, content, popup
- Build tooling: webpack config, production/dev builds
- Development tooling: Makefile workflows (install, dev, build, package)
- Test harness setup (baseline)

### 2) Settings Management
- Options page to configure AI provider and enter API keys
- Persistent storage of provider choice and keys
- Basic validation and UI feedback

### 3) AI Manager (Framework)
- Unified interface to call a selected AI provider
- Uses stored API key(s) and provider selection from Settings
- Returns AI responses for simple queries

### 4) Basic Popup
- Minimal popup UI to access extension basics

## ❌ Not Implemented Yet
These items do not exist in the codebase at this time and should be considered planned, not partial:
- Visual training mode and keyboard shortcuts
- Data extraction/scraping engine and pagination handling
- Repository storage/model for extracted records
- Analytics/usage tracking and advanced cost tracking
- Navigation/crawling controller
- Scheduler
- Data broker/exports beyond basic dev utilities

## 🔭 Planned Work
Detailed specifications for planned modules live under `docs/future-work/`:
- Repository Model & Service
- Scraper Engine
- Navigation Controller
- Scheduler
- Data Broker

Refer to those docs for interfaces, responsibilities, and milestones. This page will be updated as each piece is implemented.
