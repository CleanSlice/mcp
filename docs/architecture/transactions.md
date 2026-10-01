<!-- Generated from docs/docs/architecture/transactions.md. Run scripts/sync-architecture-docs.mjs in the MCP repo. -->
---
title: Transactions Across Slices
version: 1.0.0
last_updated: 2026-10-01
---

# Transactions Across Slices

Use an explicit atomic operation when several local writes must either all commit or all fail. Sequential service calls are not a transaction.

## Ownership and dependency direction

The coordinating use case owns a domain gateway contract describing the business result. Its data implementation owns the database transaction. Place coordination in a slice/group permitted to depend on every participating contract; do not introduce upward imports into lower groups. The service decides policy; persistence constraints enforce invariants at commit time.

Never pass PrismaClient or Prisma.TransactionClient through domain contracts. A data adapter may compose transaction-aware persistence helpers behind permitted boundaries, but each helper must use the same transaction, not silently start an independent connection. Document which writes participate and which remain eventual. If the operation spans databases, a local transaction cannot make the whole workflow atomic; use a durable workflow and explicit compensation.

```typescript
// domain/allocation.gateway.ts — no database types
export interface IAllocateWorkspaceData {
  readonly subjectId: string;
  readonly externalWorkspaceId: string;
}
export interface IAllocationData {
  readonly workspaceId: string;
  readonly operationId: string;
}
export abstract class IAllocationGateway {
  abstract allocate(input: IAllocateWorkspaceData): Promise<IAllocationData>;
}
```

The data adapter commits the workspace, initial membership, operation receipt and outbox record in one database transaction. Return domain data through a mapper. A thrown error rolls all participating writes back. Do not call a remote payment or provisioning API while holding this transaction open.

## Concurrent invariants

A read such as “one owner remains” followed by a separate update is unsafe under concurrency. Use database constraints and an appropriate lock, compare-and-set/version check or isolation level; choose based on the actual contention and database semantics. Define bounded retry behavior for transaction conflicts. A unique constraint is the final arbiter of concurrent claims, not an earlier existence check.

## Verification

Test against the target database: failure after each write, simultaneous conflicting operations, retry after a lost response, and constraint violations. Assert the invariant and retained data, not merely that a gateway method was called. Record the transaction's lock scope and measure duration before applying it to large production tables.

See [Reliable external operations](./reliable-operations) and [Migrations and evidence](./migrations-and-evidence).
