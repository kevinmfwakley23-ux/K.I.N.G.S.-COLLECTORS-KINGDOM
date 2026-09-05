# IMP-005 Royal Vault — Transactional Bulk Import Reconnaissance

**Research date:** 2026-09-05  
**Target:** preview → duplicate review → explicit commit → retry-safe all-or-nothing Vault import

## Why this pass exists

Collector imports are dangerous because they operate on many permanent treasure records at once. The Kingdom must be faster than manual entry without turning a malformed spreadsheet, duplicate row, browser retry, or partial server failure into a damaged Vault.

The target is therefore not merely "CSV/JSON import." The target is a reviewable and recoverable intake transaction.

## Current external findings

### Snipe-IT importer

Current Snipe-IT documentation supports GUI and CLI imports for large inventories and distinguishes create/update behavior through identifiers such as asset ID / asset tag. Its documentation explicitly warns that the importer cannot infer near-matches such as misspellings and that weak source data can create duplicates. Current importer source also contains explicit duplicate-handling paths and careful update semantics around absent versus present-but-empty fields.

Sources:

- https://snipe-it.readme.io/docs/importing
- https://snipe-it.readme.io/docs/importing-assets
- https://snipe-it.readme.io/docs/item-importer
- https://github.com/grokability/snipe-it/tree/master/app/Importer

**Kingdom improvement:** Never silently turn an uncertain duplicate into either a merge or a second permanent treasure. Preview duplicate signals first and require an explicit import/skip decision for review rows.

### HomeBox importer experience

HomeBox continues to invest in export/import, including experimental full-collection package transfer. Recent public issues/discussions show real-world friction from malformed CSVs, location creation failures, and contradictory import success/failure UI states.

Sources:

- https://github.com/sysadminsmedia/homebox/releases
- https://github.com/sysadminsmedia/homebox/issues/630
- https://github.com/sysadminsmedia/homebox/issues/1381
- https://github.com/sysadminsmedia/homebox/discussions/1065

**Kingdom improvement:** A batch must have one authoritative server state (`preview`, `committed`, `expired`, or `cancelled`) so UI cannot honestly report both success and failure. The client should render server batch state rather than infer success from partial local activity.

### SQLite transaction guarantees

SQLite documents transactions as ACID and atomic: changes inside a transaction occur completely or not at all. This remains true with WAL mode, which Collector's Kingdom already uses for the Vault store.

Sources:

- https://www.sqlite.org/transactional.html
- https://sqlite.org/atomiccommit.html
- https://www.sqlite.org/lang_transaction.html

**Kingdom decision:** The final import commit must use one explicit SQLite write transaction that contains all selected treasure inserts, their audit events, import-row commit references, and the batch state transition. A thrown validation/database error must roll everything back.

### Retry / idempotency behavior

POST requests are not inherently idempotent. Current HTTP documentation for idempotency-key patterns describes using a unique client/server key plus a request fingerprint so a retry can return the result of the first operation rather than repeating side effects.

Source:

- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Idempotency-Key

**Kingdom decision:** The import batch ID itself is the durable operation identity, and commit will additionally require an idempotency key tied to a fingerprint of the selected row decisions. Repeating the same commit returns the previously committed result; reusing the key with different decisions is rejected.

## Locked engineering rules for the Kingdom importer

1. **Preview writes no treasure records.** It may persist a short-lived owner-scoped batch/review record.
2. **Every batch is owner-scoped.** A different collector receives no information that the batch exists.
3. **Accepted rows are normalized once during preview** and the normalized payload is what is reviewed and eventually committed.
4. **Rejected rows never become importable without a new corrected preview.**
5. **Duplicate candidates never auto-merge.** Existing-Vault and within-batch duplicate signals are surfaced.
6. **Rows with duplicate signals require an explicit `import` or `skip` decision.**
7. **Clean rows may default to `import`, but the collector still performs the final batch commit.**
8. **Commit is atomic.** Either every selected treasure + audit event + batch metadata lands, or none does.
9. **Commit is idempotent.** Retrying the same approved commit cannot create duplicate treasure records.
10. **A changed decision set cannot reuse the same idempotency key.**
11. **Committed batches are immutable.** They can be inspected but not recommitted with altered decisions.
12. **Preview batches expire.** Stale review state cannot be committed indefinitely.
13. **Server state is authoritative.** UI reports `preview`, `committed`, `expired`, or errors from the batch service; it does not invent a success toast.
14. **Audit evidence is first-class.** Imported treasures record their source batch ID/row index in creation events, and the batch stores committed treasure IDs.
15. **No external catalog match is treated as fact.** Future barcode/image/catalog adapters will feed candidate data into this same review boundary.

## Phase implementation shape

Persistent tables:

- `vault_import_batches` — owner, status, expiry, source label, counts, payload hash, commit fingerprint/key, committed timestamp;
- `vault_import_rows` — batch row index, normalized payload or validation error, duplicate signals/candidates, default/review state, committed treasure ID.

APIs:

- `POST /api/vault/import/preview` — create review batch;
- `GET /api/vault/import/:batchId` — recover/reload review state;
- `POST /api/vault/import/:batchId/commit` — explicit atomic commit with row decisions and idempotency key.

Browser workflow:

1. paste/upload records;
2. preview;
3. see ready/rejected/duplicate-review rows;
4. choose import/skip for duplicate-review rows;
5. explicitly commit;
6. receive one authoritative committed result and refresh Vault.

## Superiority target

A collector should be able to import hundreds of treasures confidently without wondering which half of a file succeeded, whether a retry doubled the collection, or whether fuzzy matching silently merged two genuinely different variants. The Royal Vault should make bulk intake fast while preserving the same permanence, provenance, and collector control as one-at-a-time entry.
