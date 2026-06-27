# Data Broker (Planned)

## Purpose
Move repository data out to external destinations. Start with CSV exports; later support Google Sheets and other sinks.

## Responsibilities
- Export repository entries using configurable field mappings
- Maintain per-repository destination configuration
- Optionally perform incremental sync (append-only) for supported destinations

## Boundaries
- Reads data via Repository Service queries
- Does not mutate repository entries
- Does not schedule itself (Scheduler triggers exports)

## Config
```json
{
  "csv": { "enabled": true, "fileNameTemplate": "{{repository.name}}_{{date}}.csv" },
  "googleSheets": {
    "enabled": false,
    "sheetId": null,
    "worksheet": "Orders",
    "mapping": {
      "A": "order.orderNumber",
      "B": "order.orderDate",
      "C": "order.total",
      "D": "order.tax",
      "E": "order.shipping"
    }
  }
}
```

## Interfaces (Sketch)
```ts
interface DataBroker {
  exportCSV(repositoryId: string, opts?: { since?: string }): Promise<{ path: string; rows: number }>;
  configureDestination(repositoryId: string, config: BrokerConfig): Promise<void>;
  sync(repositoryId: string): Promise<{ inserted: number; updated: number }>; // for Sheets later
}
```

## CSV (Initial)
- Flatten entries to rows using default or configured mapping
- Emit UTF-8 CSV with header row
- Provide file name templating with date placeholders

## Google Sheets (Later)
- OAuth flow and token storage (out of scope for now)
- Append new rows; detect/update existing by identifier if feasible

## Milestones
- M1: CSV export for generic and financial order entries
- M2: Configurable field mapping per repository
- M3: Google Sheets incremental sync