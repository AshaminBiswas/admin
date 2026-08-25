# PRC Hardware Project Rules & Guidelines

> **MANDATORY DIRECTIVES FOR AI ASSISTANTS**:
> 1. **Read Project Context First**: Before performing any research, design, or code modification, review `PROJECT_CONTEXT.md` located in the repository root.
> 2. **Maintain Context Integrity**: Whenever you create, modify, or remove any models, endpoints, services, pages, or system workflows, you MUST update `PROJECT_CONTEXT.md` to reflect the current state of the architecture.
> 3. **Full-Stack Cross-Synchronization**:
>    - Any backend API change (`PRC-Backend/src/modules/`) must be reflected in both Admin (`admin/src/api/`, `admin/src/types/`) and Storefront (`frontend/src/services/`, `frontend/src/types/`).
>    - Never leave orphaned types or dangling endpoints.
> 4. **Zero-Error Validation**: Always execute `npx tsc --noEmit` before finishing any task to guarantee 0 TypeScript compiler errors.
> 5. **Database Protocol**:
>    - Direct DDL / migrations must use session port 5432 (`DIRECT_URL`).
>    - Idempotent table/column patches must be added to `src/scripts/fix-db.js` to ensure zero-downtime deployment on container boot.
