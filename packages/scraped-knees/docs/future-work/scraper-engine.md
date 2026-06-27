# Scraper Engine (Planned)

## Purpose
Analyze the current page and produce reliable, repeatable scraping rules; execute those rules to extract entries and discover pagination controls.

## Responsibilities
- Page analysis using DOM and optional screenshot context (AI-assisted)
- Produce versioned `ScrapingRules` JSON stored with the repository
- Execute rules to extract entries and required fields (identifier, date)
- Identify and operate pagination controls (next/prev)
- Filter noise (ads, unrelated UI)

## Boundaries
- Uses AI Manager for rule synthesis only
- Reads/writes rules via Repository Service
- Does not persist entries directly (returns to Repository Service for upsert)
- Does not navigate across pages (Navigation Controller does)

## Data Types

### PageContext
```ts
interface PageContext {
  url: string;
  html: string;           // serialized DOM
  screenshotDataUrl?: string; // optional base64 image for visual cues
  viewport: { width: number; height: number };
}
```

### ScrapingRules
```json
{
  "version": 1,
  "selectors": {
    "entryRoot": ".order",
    "identifier": ".order-id",
    "date": ".order-date",
    "total": ".order-total",
    "tax": ".order-tax",
    "shipping": ".order-shipping",
    "lineItems": {
      "root": ".line-item",
      "description": ".desc",
      "quantity": ".qty",
      "unitPrice": ".unit",
      "total": ".line-total"
    }
  },
  "pagination": {
    "nextSelector": ".pagination .next a",
    "prevSelector": ".pagination .prev a",
    "disabledClass": "disabled"
  },
  "ignore": [".ad", ".sponsored"]
}
```

## Interfaces (Sketch)

```ts
interface ScraperEngine {
  analyzePage(context: PageContext, opts?: { repositoryId: string }): Promise<ScrapingRules>;
  extractEntries(context: PageContext, rules: ScrapingRules): Promise<{
    entries: RepositoryEntry[]; // minimally identifier+date + payload
    stats: { itemCount: number; durationMs: number };
    issues?: string[];
  }>;
  detectPagination(context: PageContext, rules: ScrapingRules): Promise<{
    hasNext: boolean;
    hasPrev: boolean;
    nextAction?: { type: 'click' | 'url'; selector?: string; url?: string };
    prevAction?: { type: 'click' | 'url'; selector?: string; url?: string };
  }>;
}
```

## AI-Assisted Rule Synthesis
- Inputs: `html`, optional `screenshotDataUrl`, brief task prompt
- Output: initial `ScrapingRules` proposal
- Human-in-the-loop: UI can accept/edit rules before persisting

## Execution Semantics
- Deterministic extraction given rules
- Normalize dates/currency where possible
- Return candidate entries; de-dup via Repository Service

## Errors & Edge Cases
- Dynamic content/virtualized lists → may require scrolling/injection
- Date/price parsing failures → report `issues` for UI surfacing
- Missing identifiers → entry is discarded with explanation

## Milestones
- M1: Execute fixed rules against DOM to extract entries
- M2: Pagination discovery and next/prev actions
- M3: AI-assisted rule proposal pipe through AI Manager