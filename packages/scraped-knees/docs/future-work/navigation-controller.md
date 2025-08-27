# Navigation Controller - Future Work

## Overview
The navigation controller drives the browser to the pages where data resides. It handles login flows, detects whether the current page is correct, and paginates through result sets.

## Responsibilities
- Ensure the browser is on the repository's starting page
- Detect login state and execute login steps when necessary
- Navigate forward and backward through paginated lists
- Provide page HTML and screenshots to the scraper engine

## Interface
```javascript
class NavigationController {
  async ensureOnStartPage(repository)
  async gotoNextPage()
  async gotoPreviousPage()
  async getPageSnapshot()
}
```

## Integration Points
- **Scraper Engine** receives page snapshots from `getPageSnapshot`.
- **Repository Service** may supply pagination boundaries and starting URLs.
- **Scheduler** triggers navigation when a repository becomes due.

## Future Considerations
- Support for site-specific navigation scripts.
- Heuristics for detecting when pagination ends.
- Retry strategies for network failures or unexpected redirects.
