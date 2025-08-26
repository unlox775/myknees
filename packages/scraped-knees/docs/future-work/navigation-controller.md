# Navigation Controller (Planned)

## Purpose
Drive the browser to the correct starting page for a repository, verify login state, and coordinate page-to-page traversal while deferring extraction to the Scraper Engine.

## Responsibilities
- Validate "am I on the right page?"
- Perform steps to reach the target page (e.g., open start URL, follow links)
- Detect and handle login state (halt and notify if user intervention is required)
- Advance pagination (next/prev) until stop criteria are met
- Report discovered page states and errors

## Boundaries
- Calls Scraper Engine to extract entries on each page
- Calls Repository Service to de-dup and persist entries
- Does not synthesize scraping rules (reads saved rules via Repository)
- Does not schedule runs (Scheduler does)

## Interfaces (Sketch)
```ts
interface NavigationController {
  ensureOnTargetPage(repositoryId: string): Promise<{ ready: boolean; reason?: string }>;
  isLoggedIn(context?: PageContext): Promise<boolean>;

  crawl(repositoryId: string, opts?: {
    direction?: 'forward' | 'backward';
    maxPages?: number;
    stopWhenNoNew?: boolean;     // stop when Repository has all identifiers on page
    backfillUntil?: string;      // ISO date cutoff
  }): Promise<CrawlResult>;
}

interface CrawlResult {
  pagesVisited: number;
  entriesNew: number;
  entriesUpdated: number;
  stoppedReason: 'no-new' | 'date-cutoff' | 'max-pages' | 'login-required' | 'error';
  issues?: string[];
}
```

## Stop Conditions
- Repository indicates all identifiers on page already exist
- Date for entries is older than repository `maxBackfillDate`
- Max pages reached
- Login required or navigation error

## Login Handling
- Quick checks via selectors or URL patterns
- If not logged in, surface actionable prompt to user to log in
- Resume crawl after user returns control

## Milestones
- M1: Reach target page and detect login state
- M2: Drive next/prev pagination with simple stop conditions
- M3: Integrate per-repository `navigationConfig` and robust error reporting