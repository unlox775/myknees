# Repository Model & Service (Planned)

## Purpose
Represent, store, and query extracted data for a given site/repository. Provide a stable interface to de-duplicate by identifier, track dates, and persist repository-specific configurations (scraping rules, navigation, broker settings).

## Responsibilities
- Define the repository metadata and data model
- Persist repository definitions and entries
- De-duplicate entries using a stable identifier per record
- Track backfill boundaries (how far back to look)
- Expose query and upsert operations for other modules

## Boundaries
- Consumes: Scraper Engine outputs (candidate entries, derived rules)
- Provides: Lookup/hasIdentifier, upsert, list, and repository config access
- Does not: Perform navigation, scraping, AI calls, or exporting

## Data Model

### RepositoryDefinition
```json
{
  "id": "repo_amazon_orders",
  "name": "Amazon Orders",
  "type": "financial_order", 
  "domain": "amazon.com",
  "createdAt": 0,
  "updatedAt": 0,
  "schemaVersion": 1,

  "identifierFields": ["orderNumber"],
  "entryDateField": "orderDate",
  "maxBackfillDate": "2021-01-01", 

  "scrapingRules": {
    "version": 1,
    "engine": "rule-v1",
    "rules": {}
  },

  "navigationConfig": {
    "startUrl": "https://www.amazon.com/gp/your-account/order-history",
    "loginCheck": { "selector": "#nav-link-accountList" },
    "pagination": { "nextSelector": ".a-last a" }
  },

  "brokerConfig": {
    "csv": { "enabled": true, "fileNameTemplate": "amazon_orders.csv" },
    "googleSheets": { "enabled": false, "sheetId": null }
  }
}
```

### RepositoryEntry (Generic)
```json
{
  "id": "repo_amazon_orders:113-1234567-8910112",
  "repositoryId": "repo_amazon_orders",
  "identifier": "113-1234567-8910112",
  "date": "2024-07-05T00:00:00.000Z",
  "payload": {},
  "extractedAt": 0,
  "sourceUrl": "https://www.amazon.com/...",
  "status": "active" 
}
```

### Financial Order Entry (Specialization)
```json
{
  "id": "repo_amazon_orders:113-1234567-8910112",
  "repositoryId": "repo_amazon_orders",
  "identifier": "113-1234567-8910112",
  "date": "2024-07-05",
  "order": {
    "orderNumber": "113-1234567-8910112",
    "orderDate": "2024-07-05",
    "subtotal": 120.00,
    "tax": 7.45,
    "shipping": 0,
    "total": 127.45,
    "currency": "USD",
    "lineItems": [
      {
        "description": "Widget A",
        "quantity": 1,
        "unitPrice": 60.00,
        "total": 60.00,
        "sku": "B00XYZ"
      },
      {
        "description": "Widget B",
        "quantity": 2,
        "unitPrice": 30.00,
        "total": 60.00,
        "sku": "B00ABC"
      }
    ],
    "meta": {
      "shippingAddress": "...",
      "invoiceUrl": "..."
    }
  },
  "extractedAt": 0,
  "sourceUrl": "https://www.amazon.com/gp/your-account/order-details/...",
  "status": "active"
}
```

## Service Interfaces (Sketch)

```ts
interface RepositoryService {
  createRepository(definition: RepositoryDefinition): Promise<RepositoryDefinition>;
  getRepository(repositoryId: string): Promise<RepositoryDefinition | null>;
  updateRepository(definition: RepositoryDefinition): Promise<RepositoryDefinition>;

  hasIdentifier(repositoryId: string, identifier: string): Promise<boolean>;
  getEntryByIdentifier(repositoryId: string, identifier: string): Promise<RepositoryEntry | null>;

  upsertEntry(repositoryId: string, entry: RepositoryEntry): Promise<RepositoryEntry>;
  listEntries(repositoryId: string, opts?: { since?: string; limit?: number }): Promise<RepositoryEntry[]>;

  getScrapingRules(repositoryId: string): Promise<ScrapingRules | null>;
  setScrapingRules(repositoryId: string, rules: ScrapingRules): Promise<void>;

  getBrokerConfig(repositoryId: string): Promise<BrokerConfig>;
  setBrokerConfig(repositoryId: string, cfg: BrokerConfig): Promise<void>;
}
```

## Storage Strategy (Initial)
- Chrome storage (local) for definitions and entries
- JSON with simple versioning (`schemaVersion`)
- Migration hooks to evolve structures later

## Errors & Edge Cases
- Identifier collisions: reject or replace based on timestamp
- Backfill cutoff: stop conditions for navigation controller
- Partial extractions: allow upsert with minimal fields, fill later

## Milestones
- M1: CRUD for repository definitions; basic list/upsert of entries; de-dup by identifier
- M2: Versioned `scrapingRules` persistence; `brokerConfig` persistence
- M3: Query helpers (since date, paging)

## Open Questions
- Do we need a `status` field on entries? Optional for now
- Should we normalize line items into a separate collection? Likely later if needed