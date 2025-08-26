# Architecture Overview (Planned)

This extension follows a microservice-like, provider-oriented structure where each module exposes a narrow interface and depends on other modules only through those interfaces.

## Modules
- AI Manager (implemented): Unified interface for AI calls
- Repository Service (planned): Storage and de-duplication of extracted entries and repository configs
- Scraper Engine (planned): Rule synthesis and deterministic extraction
- Navigation Controller (planned): Page reachability and traversal control
- Scheduler (planned): Run timing and user prompts
- Data Broker (planned): Exports and integrations

## Data Flow
1) Navigation Controller ensures the correct page is open and login is valid
2) Scraper Engine executes `ScrapingRules` against the page to produce entries
3) Repository Service de-dups and persists entries; stores updated rules/configs
4) Scheduler determines when to initiate subsequent runs
5) Data Broker exports data to CSV/Sheets based on repository configuration

## Interfaces
Each module publishes a small interface. Cross-module calls are strictly via interfaces to maintain isolation. UI consumes these interfaces without reaching into implementation details.

See individual specs in this folder for method sketches and data formats.