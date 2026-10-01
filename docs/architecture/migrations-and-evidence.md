<!-- Generated from docs/docs/architecture/migrations-and-evidence.md. Run scripts/sync-architecture-docs.mjs in the MCP repo. -->
---
title: Migrations and Evidence of Readiness
version: 1.0.0
last_updated: 2026-10-01
---

# Migrations and Evidence of Readiness

A successful build proves neither migration safety nor provider interoperability. State precisely what each check establishes.

## Expand, backfill, gate, contract

1. Expand the schema and deploy compatible readers/writers with new behavior disabled.
2. Backfill from evidence, preserving stable identifiers and historical ownership/payment records. Quarantine ambiguous data instead of inventing attribution.
3. Verify old clients and background workers, repeatability, partial completion and failure recovery.
4. Enable the capability gradually after its release gates pass.
5. Contract only after legacy readers, tokens and rollback binaries have been retired.

A backfill should not overwrite already valid assignments. Define lock duration, batching, transaction boundaries and concurrent-write behavior for the actual data volume. Historical obligations should not disappear through an unrelated entity's cascade deletion; explicitly separate retention and access policy from resource lifecycle.

Use the target production database engine for migration, constraint and concurrency tests. Do not substitute SQLite just because it is convenient for development: database-specific features and semantics require representative tests. Name a dedicated test database explicitly and never run destructive tests against a development or production database.

## Rollback is a compatibility question

Turning off a feature flag can stop new issuance or work, but it does not undo committed remote effects. Drain/reconcile durable operations and preserve history. Old binaries that cannot represent new identities or states are not a safe rollback target; retain compatible readers or roll forward. Reverting a migration file is not a recovery plan.

## Evidence levels

| Claim | Required evidence |
| --- | --- |
| Designed | Invariants, assumptions, alternatives and unresolved gates documented |
| Locally tested | Named tests and environment, actual results, failures and limitations |
| Integration verified | Real exchanges with the intended provider/account configuration; mocks labeled separately |
| Ready for release | Required gates passed, monitoring/recovery/rollout reviewed and authorization obtained |

Each external capability should be marked measured, documented by the provider, or unverified. Keep the date/account/environment and a sanitized reproduction. A document may be ready for review while the capability it describes remains blocked. A green docs build or HTTP health check must not close an unexecuted payment/security acceptance criterion.

## Verification

Use representative fixtures preserving existing IDs, relationships and commercial history; distinguish them from production snapshots. Test repeated/partial backfill, old writers omitting new fields, rollback compatibility and conflict cases. Include negative controls where a validator could accidentally report success without checking the intended property.
