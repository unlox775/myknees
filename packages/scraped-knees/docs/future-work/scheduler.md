# Scheduler - Future Work

## Overview
The scheduler decides when each repository should be refreshed. It tracks the newest data in a repository, prompts the user when attention is needed, and orchestrates scraping runs.

## Responsibilities
- Register repositories with last-known update dates
- Determine which repositories are due for scraping
- Notify the user and initiate navigation/scraping workflows
- Record outcomes and next-run times

## Interface
```javascript
class Scheduler {
  async registerRepository(repoId, lastDate)
  async getDueRepositories(now)
  async markRun(repoId, status)
}
```

## Integration Points
- **Navigation Controller** and **Scraper Engine** are triggered by the scheduler.
- **Repository Service** provides timestamps to assess staleness.
- **Data Broker** may run after successful scraping sessions.

## Future Considerations
- User-configurable schedules per repository.
- Backoff and retry policies for repeated failures.
- Background alarms for automated checks when the extension is idle.
