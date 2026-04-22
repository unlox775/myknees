# Automatic bank feeds (Plaid) → MyKnees

This document explains how to connect **your own** Plaid developer application to **your** bank accounts, pull transactions with Plaid’s **`/transactions/sync`** API, and fold them into MyKnees using the **same** `import-transaction-records` pipeline you use for CSVs (day-by-day dedupe, transition-day merge, classification upserts).

It is **not** a multi-tenant SaaS recipe: credentials and access tokens stay on **your machine** under `~/.myknees/backend/secrets/` (or `DATA_STORE_ROOT`).

---

## Why Plaid (and what else exists)

| Approach | Pros | Cons |
|----------|------|------|
| **Bank CSV / PDF exports** | Free, authoritative, no third party | Manual or scripted per bank |
| **Plaid** | One integration pattern for many US institutions; official Link UI; **Transactions Sync** cursor API | Developer account + **production** pricing for live data; you trust Plaid as middleman |
| **MX, Finicity (Mastercard), Akoya** | Similar aggregator model | Same class of tradeoffs as Plaid; not wired in this repo |
| **OFX / QFX** | Standard file format at some banks | Coverage varies; separate parser work |
| **SimpleFIN** | Open protocol, some credit unions | Limited institution coverage |

For “connect banks once, then run a job on my laptop,” **Plaid is a reasonable default** in 2025–2026: mature Node SDK, `/transactions/sync` replaces legacy `/transactions/get` for incremental updates ([Plaid transactions docs](https://plaid.com/docs/transactions/)).

---

## Prerequisites

- MyKnees backend set up on a Mac path (`/Users/...`) so `getMykneesRoot()` resolves (see `src/config.js`), or set **`DATA_STORE_ROOT`** consistently for migrate/import/sql/Plaid.
- `make data-store` (or `npm run setup`) so `~/.myknees/backend/` exists. The setup script creates a **`secrets/`** directory for Plaid token files.
- Accounts already registered in MyKnees, e.g. `make add-account IDENTIFIER=Ally_Bank NAME='Ally Bank' TYPE=bank` and `Capital_One` for the card.

---

## 1. Create a Plaid developer application

1. Sign up at the [Plaid Dashboard](https://dashboard.plaid.com/).
2. Create an **application** (any name, e.g. “MyKnees personal”).
3. Copy **Client ID** and **Secret** for the environment you will use:
   - **Sandbox** — fake institution `First Platypus Bank`; good for testing plumbing.
   - **Development** — real Item creation with **development** secret; limited; see Plaid’s current policy.
   - **Production** — live connections; **billing applies**; use only when you accept Plaid’s terms and cost.

Official Node client: [`plaid` on npm](https://www.npmjs.com/package/plaid) (already added to this package).

---

## 2. Environment variables

Set these in your shell or a **local** env file (never commit secrets):

| Variable | Required | Description |
|----------|----------|-------------|
| `PLAID_CLIENT_ID` | Yes | From Plaid Dashboard |
| `PLAID_SECRET` | Yes | Secret for the environment you use |
| `PLAID_ENV` | No | `sandbox` (default), `development`, or `production` |
| `PLAID_BASE_PATH` | No | Override API host if needed (defaults: sandbox / production from SDK; `development` → `https://development.plaid.com`) |
| `PLAID_LINK_PORT` | No | Default `8765` |
| `PLAID_LINK_HOST` | No | Default `127.0.0.1` |
| `PLAID_CLIENT_USER_ID` | No | Stable string per human user for Link (`myknees-local-user` default) |
| `NO_IMPORT` | No | If `1`, sync only writes CSVs; does not run the importer |

Example:

```bash
export PLAID_CLIENT_ID="xxxxxxxxxxxxxxxxxxxxxxxx"
export PLAID_SECRET="yyyyyyyyyyyyyyyyyyyyyyyy"
export PLAID_ENV="sandbox"
```

---

## 3. Link a bank (local Plaid Link server)

From `packages/backend`:

```bash
npm run plaid:link
# or: node scripts/plaid/link-local-server.js
```

Open **http://127.0.0.1:8765** (or your `PLAID_LINK_HOST` / `PLAID_LINK_PORT`), click **Connect bank**, complete Plaid Link.

What gets written:

- **`~/.myknees/backend/secrets/plaid-items.json`** — one object per **Item** (`item_id`, `access_token`, institution metadata, and Plaid `accounts[]` with `plaid_account_id`).

**Security:** treat `plaid-items.json` like a password vault (`chmod 600` recommended). It is outside the git repo by default.

---

## 4. Map Plaid accounts → MyKnees accounts

Create **`~/.myknees/backend/secrets/plaid-account-map.json`** (same folder). After Link, the server response lists each account’s `plaid_account_id`. Map each ID you care about to a MyKnees account identifier and **import format** (must match `import-transaction-records.js` parsers):

```json
{
  "version": 1,
  "map": {
    "PASTE_PLAID_ACCOUNT_ID_CHECKING": {
      "myknees_account": "Ally_Bank",
      "import_format": "ally_bank"
    },
    "PASTE_PLAID_ACCOUNT_ID_CREDIT_CARD": {
      "myknees_account": "Capital_One",
      "import_format": "capital_one"
    },
    "PASTE_PLAID_ACCOUNT_ID_CHASE": {
      "myknees_account": "Chase_VISA",
      "import_format": "chase_visa"
    }
  }
}
```

- **`import_format` `ally_bank`** — CSV columns `Date`, `Description`, `Amount`. Amounts are derived so that **outflows match your existing Ally sign** (Plaid’s depository convention is inverted: we write `-plaid.amount`).
- **`import_format` `capital_one`** — Columns aligned with Capital One’s **website CSV**: `Transaction Date`, `Description`, `Debit`, `Credit` (positive charge → Debit; payment → Credit). This matches the importer’s Debit/Credit path.

If you map the wrong `import_format` for the account type, signs and dedupe keys will not line up with history.

---

## 5. Sync transactions and import

```bash
cd packages/backend
npm run plaid:sync
```

Or:

```bash
make plaid-sync
```

What happens:

1. For each Item in `plaid-items.json`, the script calls **`/transactions/sync`** until `has_more` is false, persisting Plaid’s **`next_cursor`** per `item_id` in **`plaid-sync-cursors.json`**.
2. Only **`added`** transactions are turned into rows (**`pending`** rows are skipped** to avoid duplicates when they post).
3. Rows are split per **`plaid_account_id`** using your map, written as `imports/Plaid_sync_<Account>_<timestamp>.csv`.
4. Unless **`NO_IMPORT=1`**, it runs:

   `node scripts/import-transaction-records.js --format=… --account=… <csv>`

   so **transition-day rules and classification behavior are identical** to manual CSV import.

**Dry run (CSV only):**

```bash
NO_IMPORT=1 npm run plaid:sync
```

---

## 6. Automation (cron / launchd)

Example daily job (adjust paths):

```bash
0 7 * * * cd /path/to/myknees/packages/backend && export PLAID_CLIENT_ID=… PLAID_SECRET=… PLAID_ENV=production && /usr/local/bin/npm run plaid:sync >> ~/.myknees/plaid-sync.log 2>&1
```

Add `make backup` on your own schedule if you rely on local SQLite.

---

## 7. Limitations (v1)

- **`modified` and `removed`** transactions from Plaid are **not** replayed into MyKnees. Corrections or deletions may require a manual CSV re-import or future tooling.
- **Pending** transactions are **ignored**. When they post, Plaid typically sends new **`added`** rows.
- **OAuth-only** institutions may require extra Plaid Link configuration (`redirect_uri`). If Link fails for a specific bank, check [Plaid institution status](https://status.plaid.com/) and Plaid’s OAuth docs.
- **Scale / “other people”**: Plaid’s **production** agreement is per **company** and product; redistributing your Plaid keys inside an app for strangers is **not** supported by this design. For multi-user products you would need your own Plaid contract, Link per user, token storage per user, and compliance work.

---

## 8. Quick reference — files

| File | Purpose |
|------|---------|
| `secrets/plaid-items.json` | Plaid `access_token` + accounts (written by Link server) |
| `secrets/plaid-account-map.json` | You edit: `plaid_account_id` → MyKnees account + format |
| `secrets/plaid-sync-cursors.json` | Written by sync: last `/transactions/sync` cursor per Item |
| `imports/Plaid_sync_*.csv` | Ephemeral CSVs fed to the importer |

---

## 9. Scripts in this repo

| Command | Script |
|---------|--------|
| `npm run plaid:link` | `scripts/plaid/link-local-server.js` |
| `npm run plaid:sync` | `scripts/plaid/sync-to-imports.js` |

Official references: [Transactions: add to app](https://plaid.com/docs/transactions/add-to-app), [API `/transactions/sync`](https://plaid.com/docs/api/products/transactions/#transactionssync), [Plaid Node quickstart](https://github.com/plaid/quickstart).
