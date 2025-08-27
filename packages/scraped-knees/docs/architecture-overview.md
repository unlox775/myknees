# Planned Architecture

This document outlines the upcoming modules for ScrapedKnees. Each module is
treated as a small, isolated service communicating through clearly defined
interfaces. Detailed specifications for each module live alongside this file.

## Implemented Foundations
- **Extension Shell** – background worker, popup and options page
- **AI Manager** – wrapper around Groq, OpenRouter, OpenAI and Anthropic with
  settings and usage logging

## Planned Modules
### Repository Service
Stores information about a set of records discovered on a site. Tracks unique
identifiers, dates and the oldest record to look for.

[Detailed spec](repository-service.md)

```javascript
class RepositoryService {
  async createRepository(meta)
  async getRepository(id)
  async saveRecord(repoId, record)
  async getRecord(repoId, identifier)
  async listRecords(repoId, options)
}
```

### Scraper Engine
Given a page and repository rules, extract structured records from the DOM.
Will use AI to propose reliable selectors and ignore noise such as ads.

[Detailed spec](scraper-engine.md)

```javascript
class ScraperEngine {
  async analyzePage(html, screenshot)
  async extractRecords(rules)
  async validateRecord(record)
}
```

### Navigation Controller
Moves the browser to the pages where data lives and handles pagination or
login flows.

[Detailed spec](navigation-controller.md)

```javascript
class NavigationController {
  async ensureOnStartPage(repository)
  async gotoNextPage()
  async gotoPreviousPage()
  async getPageSnapshot()
}
```

### Data Broker
Exports repository data to external targets like CSV files or Google Sheets.

[Detailed spec](data-broker.md)

```javascript
class DataBroker {
  async exportCSV(repoId)
  async syncGoogleSheet(repoId, config)
  async listExports(repoId)
}
```

### Scheduler
Determines when repositories need to be revisited and notifies the user.

[Detailed spec](scheduler.md)

```javascript
class Scheduler {
  async registerRepository(repoId, lastDate)
  async getDueRepositories()
  async markRun(repoId, status)
}
```

These modules will be implemented incrementally in future iterations.
