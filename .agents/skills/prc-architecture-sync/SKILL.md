---
name: prc-architecture-sync
description: >-
  Use this skill to synchronize architectural changes across PRC-Backend, Admin, and Storefront,
  and update PROJECT_CONTEXT.md to preserve up-to-date codebase context for future tasks.
---

# PRC Architecture & Cross-Stack Synchronization

This skill outlines the standard operating procedure for maintaining full architectural alignment between the backend API (`PRC-Backend`), the admin console (`admin`), and the customer storefront (`frontend`).

## Mandatory Protocol: Updating PROJECT_CONTEXT.md

Whenever ANY changes are made to models, endpoints, modules, components, or workflows:
1. Open `PROJECT_CONTEXT.md` at the root of the workspace.
2. Update the relevant sections:
   - If database models changed, update **Section 3 (Database Schema & Prisma Models)**.
   - If modules or endpoints changed, update **Section 4 (Backend Module Architecture)**.
   - If admin views changed, update **Section 2.2 (Admin Console)**.
   - If storefront pages or services changed, update **Section 2.3 (Storefront)**.
3. Keep all 3 copies of `PROJECT_CONTEXT.md` in sync (`PRC-Backend`, `admin`, `frontend`).

## Full-Stack Cross-Validation Workflow

Whenever a feature touches multiple layers of the stack:

1. **Backend Validation**:
   ```bash
   cd d:\PRC-Backend
   npx prisma validate
   npx prisma generate
   npx tsc --noEmit
   ```

2. **Admin Console Validation**:
   ```bash
   cd D:\admin
   npx tsc --noEmit
   npm run build
   ```

3. **Storefront Validation**:
   ```bash
   cd D:\frontend
   npm run build
   ```

4. Verify that no broken links, outdated model references, or missing types exist across any layer.
