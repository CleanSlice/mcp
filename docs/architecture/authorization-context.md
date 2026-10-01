<!-- Generated from docs/docs/architecture/authorization-context.md. Run scripts/sync-architecture-docs.mjs in the MCP repo. -->
---
title: Authorization Context and Tenant Isolation
version: 1.0.0
last_updated: 2026-10-01
---

# Authorization Context and Tenant Isolation

Use explicit authorization context when a system supports tenants, delegation, account linking, service credentials or background work. A user ID alone cannot describe these authorities.

## Distinguish identity from authority

Record the authenticating principal, effective actor, authentication source, audience, tenant/team scope and relevant grant/session versions. A tenant ID in a URL selects a resource; it does not grant access. Membership, ownership and financial responsibility are separate grants.

Derive trusted context from verified credentials and current authorization state. Never accept actor, tenant or role claims from a request body as authority. Account linking must not automatically merge grants or let a less trusted authentication source acquire more trusted privileges. Separate stable actors with a one-hop link are one possible design, not a universal requirement.

## Enforce at every execution boundary

HTTP handlers, jobs, streams, exports, search, storage and download capabilities must all enforce the same resource-scope and current-state policy. A signed token alone does not prove a grant remains active. Refresh and exchange cannot widen the original source or scope.

Default-deny new principal types on existing endpoints until explicitly adapted. Isolate cache keys and serialization; an error response or account selector must not reveal another tenant. If an action requires authoritative revocation state and that state is unavailable, fail closed. Decide separately whether unrelated public operations can remain available.

## Trust, revocation and recovery

An identity issuer that may assert arbitrary subjects can impersonate its own subjects. Do not promise privacy from that issuer without an independent proof mechanism. The invariant is that this authority cannot spread into unrelated identities or tenants.

Define revocation timing from an observable event, such as durable receipt by this service. If upstream state is cached, define per-subject freshness and the outage policy; stale events and organization heartbeats must not renew a subject's authorization lease. Avoid universal TTLs: measure and agree targets for the product.

Security suspension must not be rejected merely because it removes the last active owner. Suspend dependent work and preserve recovery evidence rather than appointing an arbitrary replacement. Log identifiers, provenance and reasons without raw secrets.

## Verification

Test cross-tenant IDs, malicious issuer claims, stale refresh, unlink, concurrent grants/revocation, queued work, active streams and downloads. For browser flows additionally test login CSRF, exact redirects, one-use proof redemption and tab/context confusion using the selected protocol's current specification.
