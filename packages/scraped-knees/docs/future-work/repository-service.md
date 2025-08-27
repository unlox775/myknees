# Repository Service - Future Work

## Overview
The repository service manages collections of records discovered on a website. Each repository defines what constitutes a unique record and how far back the scraper should search.

## Responsibilities
- Create and retrieve repository definitions
- Store records with identifiers and timestamps
- Check for existing records when new data is found
- Track oldest date of interest for incremental scraping

## Data Structures
```javascript
// Repository metadata
{
  id: string,
  name: string,
  domain: string,
  maxDate: string, // ISO date string indicating oldest record needed
  createdAt: string,
  updatedAt: string
}

// Record stored within a repository
{
  identifier: string,
  date: string, // ISO date
  total: number,
  lineItems: Array<{
    description: string,
    amount: number
  }>,
  metadata: Object
}
```

## Interface
```javascript
class RepositoryService {
  async createRepository(meta)
  async getRepository(id)
  async saveRecord(repoId, record)
  async getRecord(repoId, identifier)
  async listRecords(repoId, options)
}
```

## Integration Points
- **Scraper Engine** uses `getRecord` to avoid duplicates and `saveRecord` to persist new data.
- **Navigation Controller** queries the repository to determine pagination boundaries.
- **Data Broker** reads repository data for export.
- **Scheduler** tracks `maxDate` and `updatedAt` to know when to run again.

## Future Considerations
- Support multiple storage backends (IndexedDB, cloud sync).
- Versioned schemas for evolving data shapes.
- Conflict resolution when records change on the source site.
