# Repository Skeleton

## Top Level
- `README.md` – general orientation for visitors.
- `skeleton.markdown` – canonical layout rules.
- `packages/` – collection of packages.

## Package Structure
Each package contains:

- `README.md` – usage instructions and commands.
- `docs/`
  - `current-status.md` – truthful summary of implemented features and remaining work; avoid listing files or commands.
  - `architecture-overview.md` – concise description of modules, interfaces, and data structures.
  - `future-work/` – folder with one specification file per planned module.
- `src/` – source code grouped by provider modules.
- `test/` – package tests.

## Provider Modules
- Each provider resides in its own directory under `src/`.
- Providers communicate only through their exported interfaces.
- No file may access another provider's internals or constants directly.
