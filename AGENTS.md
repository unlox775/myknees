# Agent Instructions

## Service Restart Workflow

When working on the backend-served ad hoc UI/API service, do not manually hunt for PIDs, run `kill`, or restart `scripts/ad-hoc-server.js` directly unless the Make target is broken.

From `packages/backend`, use:

```bash
make bounce-service
```

This stops the MyKnees ad hoc service listening on `AD_HOC_PORT` and starts a fresh detached instance. If no service is running, it starts one. Defaults are `AD_HOC_HOST=127.0.0.1` and `AD_HOC_PORT=8791`.

Useful related targets:

```bash
make service-status
make start-service
make stop-service
make refresh-service
```

Use an explicit port when working alongside other agents:

```bash
AD_HOC_PORT=8793 make bounce-service
```
