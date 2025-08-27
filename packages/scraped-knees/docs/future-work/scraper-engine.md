# Scraper Engine - Future Work

## Overview
The scraper engine turns a page snapshot into structured records using AI-generated rules. It proposes selectors, filters out noise, and returns data in the format expected by the repository service.

## Responsibilities
- Analyze DOM and screenshot to suggest reliable selectors
- Apply stored scraping rules to extract records
- Ignore ads and irrelevant elements
- Validate extracted data before storage

## Data Structures
```javascript
// Scraping rules stored with a repository
{
  identifierSelector: string,
  dateSelector: string,
  totalSelector: string,
  lineItemSelectors: {
    container: string,
    description: string,
    amount: string
  }
}
```

## Interface
```javascript
class ScraperEngine {
  async analyzePage(html, screenshot)
  async extractRecords(rules)
  async validateRecord(record)
}
```

## Integration Points
- **AI Manager** assists with `analyzePage` to suggest selectors.
- **Repository Service** checks whether a found record already exists and stores new ones.
- **Navigation Controller** supplies page content and handles pagination.

## Future Considerations
- Support for multiple page types per repository.
- Feedback loop from user corrections to improve rules.
- Caching of selectors for faster subsequent runs.
