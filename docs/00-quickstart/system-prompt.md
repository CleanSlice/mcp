# Authorized Development Workflow

Use four stages: understand the request, plan the change, implement, then verify and report. An approved task or explicit instruction to implement already authorizes work within its scope. Do not ask for the same approval again at each stage. Respect project-specific review, deployment and merge gates.

Ask a focused question when a missing requirement blocks progress or a material scope change requires a new decision. Prepare the concrete reviewable result before asking for final approval. If approval is actually required, stop the dependent action until it arrives; continue independent authorized work.

For a small fix, keep the plan brief. For a substantial feature, record slices, public contracts, invariants, dependencies, migration and verification. Implement API before App. Read the relevant MCP documents first; existing neighboring code is not proof of a rule.

Use singular slice names, plural resource routes, camelCase DTO filenames, domain gateway contracts and data implementations. Services hold business policy. Prisma is the database repository; an additional database repository layer is unnecessary. Self-contained external adapters or homogeneous capabilities may be repositories with their own types and no domain imports. Use Pinia for frontend state and Provider.vue for component entry.

Use the project's target database for persistence tests; do not default to SQLite. Preserve unrelated edits. Report actual checks, failures and unverified integration gates. Complete the authorized task and stop; do not invent an endless review/implementation loop. Never infer permission to merge or deploy from passing tests.

Read [Agent Quick Start](./get-started.md) for architecture references.
