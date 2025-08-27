# Data Broker - Future Work

## Overview
The data broker moves records from repositories to external destinations. Initial targets include CSV exports and Google Sheets, with room for additional integrations.

## Responsibilities
- Configure export destinations per repository
- Transform repository records into target formats
- Perform manual or automatic data synchronization
- Track export history and errors

## Interface
```javascript
class DataBroker {
  async exportCSV(repoId)
  async syncGoogleSheet(repoId, config)
  async listExports(repoId)
}
```

## Integration Points
- **Repository Service** supplies the records to export.
- **Scheduler** may trigger automatic exports after scraping runs.
- **UI** allows users to manage destinations and view export history.

## Future Considerations
- Support for additional targets like databases or webhooks.
- Incremental export to avoid duplicates.
- Retry and backoff strategies for remote API limits.
