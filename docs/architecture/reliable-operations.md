<!-- Generated from docs/docs/architecture/reliable-operations.md. Run scripts/sync-architecture-docs.mjs in the MCP repo. -->
---
title: Reliable External Operations
version: 1.0.0
last_updated: 2026-10-01
---

# Reliable External Operations

Use this pattern when an operation commits local state and also calls another system. It is unnecessary for a simple local read.

## Commit intent before remote work

Commit the business records, durable operation and outbox event together. A worker claims an outbox item with a lease, performs a bounded step, and persists progress. Remote effects happen after the local transaction. Recovery must handle crashes before the call, after the remote effect and before the local acknowledgement.

Expose pending, ready and failed states with safe reasons and explicit retryability. “Accepted” means intent was durably recorded; “ready” means the required remote setup actually succeeded. A retry resumes the same operation. Compensation is a new auditable action, not a claim that the external world was rolled back.

## Idempotency and permanent identity

Scope idempotency keys by authenticated tenant/namespace and operation kind, independently of a rotating credential. Bind each key to a canonical versioned request fingerprint: identical retries return the existing result; changed input conflicts. Define receipt retention explicitly.

When a business identity must remain unique after receipt expiry, retain its unique mapping separately. Deleted identities may require tombstones. Retrying creation must not restore deleted resources, revoked memberships or an obsolete payer assignment. Audit the actual credential on each attempt without making it the operation's identity.

## Unknown outcomes and reconciliation

A timeout does not prove that a provider did nothing. Query by a stable external reference, reconcile callbacks and provider state, and only retry an unsafe operation when its previous outcome is resolved. Do not release a financial reservation solely because a request timed out.

A provider's idempotency header is not proof of end-to-end exactly-once behavior. Verify its documented scope/retention and test retries in the intended account/environment. Persist authenticated callback intake before acknowledging; deduplicate events and handle reordering. Never infer collected money from an active subscription or an accepted request.

Keep vendor-specific restrictions and measured anomalies in the integration's capability matrix with date, environment and evidence. Do not generalize a sandbox finding to every account or production.

## Verification

Inject crashes around commit, remote calls and acknowledgements. Exercise expired receipts, credential rotation, repeated callbacks and ambiguous outcomes. Check that retry neither duplicates the resource nor repeats a charge. State which cases were measured and which remain unverified.
