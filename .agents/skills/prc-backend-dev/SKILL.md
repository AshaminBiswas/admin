---
name: prc-backend-dev
description: >-
  Use this skill when developing, refactoring, or extending backend modules, Prisma database models,
  API endpoints, BullMQ workers, or authentication flows in PRC-Backend.
---

# PRC Backend Development Guide

## Directory Conventions (`PRC-Backend/src/`)

- `modules/<feature>/`:
  - `<feature>.routes.ts`: Express route definitions, middleware chains (`requireAuth`, `requirePermission`, `validate`).
  - `<feature>.controller.ts`: HTTP request parsing, response formatting, status codes.
  - `<feature>.service.ts`: Core business logic, Prisma queries, transaction handling.
  - `<feature>.schema.ts`: Zod validation schemas for request query, params, and body.
- `events/eventBus.ts`: Internal event publisher/subscriber.
- `queues/bullmq.worker.ts`: Background job processors.
- `middleware/`: Auth, error handling, rate limiting, validation.
- `scripts/fix-db.js`: Database self-healing script executed prior to server boot.

## Database Migration Protocol

1. **Edit Schema**: Modify `prisma/schema.prisma`.
2. **Add Idempotent DDL to `src/scripts/fix-db.js`**:
   Ensure new tables/columns are defined with `IF NOT EXISTS` so they can be applied on live Supabase databases without locking migrations.
3. **Regenerate Client**:
   ```bash
   npx prisma generate
   ```
4. **Compile & Verify**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
