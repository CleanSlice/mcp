---
id: get-started
title: Agent Quick Start
version: 5.0.0
last_updated: 2026-10-01
category: quickstart
tags: [quickstart, rules, architecture]
---

# Agent Quick Start

## Overview

CleanSlice uses vertical slices with Presentation → Domain ← Data. Use SINGULAR slice names (`user/`) and plural resource routes (`/users`); DTO filenames are camelCase. The fixed stack is NestJS + Prisma and Nuxt + Vue + Pinia.

Domain services hold business policy and depend on abstract gateway contracts. Data gateways implement those contracts and map persistence output into domain types. Do not import Prisma or concrete data gateways into domain. Prisma already supplies the database repository; repositories are permitted for self-contained external adapters or homogeneous capabilities, with their own types and no domain imports. Cross-slice imports follow the project's declared dependency groups and public contracts.

Use Pinia stores for state and Provider.vue as component entry. Implement API before App. Use the target database engine for migration/concurrency tests, not an automatic SQLite substitute.

## When to Use

Read these rules before planning or changing a slice. Search and read the task-relevant documents rather than inferring rules from adjacent code. An approved task authorizes its stated scope: do not repeatedly request approval between phases. Ask when a missing requirement or material scope change needs a decision; preserve explicit merge/deploy gates. See [Workflow](./phases.md).

## Checklist

- Identify the invariant, owning slice and permitted dependency direction.
- Validate input in DTOs and keep domain independent of persistence types.
- Define the real transaction boundary for multi-record writes.
- Use durable intent, idempotency and reconciliation for external effects.
- Check authorization context at HTTP and asynchronous boundaries.
- Verify backfill, compatibility and recovery before enabling migrations.
- Report designed, tested, integration-verified and release-ready separately.
- Preserve unrelated changes and complete the authorized scope.

## Read for the task

- [Transactions across slices](../architecture/transactions.md)
- [Reliable external operations](../architecture/reliable-operations.md)
- [Authorization context](../architecture/authorization-context.md)
- [Migrations and evidence](../architecture/migrations-and-evidence.md)
- [Gateway](../03-patterns/gateway.md) and [Repository](../03-patterns/repository.md)

These are general patterns, not a requirement to adopt any product's organization names, actor-link schema, billing provider or timeout values.
