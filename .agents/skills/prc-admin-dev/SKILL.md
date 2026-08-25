---
name: prc-admin-dev
description: >-
  Use this skill when adding or updating views, components, data tables, or API integrations
  in the PRC Admin Console (D:\admin).
---

# PRC Admin Console Development Guide

## Architecture Overview (`admin/src/`)

- `components/layout/`:
  - `AdminLayout.tsx`: Master view router with lazy-loaded Suspense boundaries and skeletons.
  - `AdminSidebar.tsx`: Navigation sidebar with grouped categories and permission filtering.
  - `AdminHeader.tsx`: Top navigation bar with user profile, theme toggle, and real-time SSE notifications.
- `pages/`: Individual view screens (Products, Categories, Orders, Invoices, B2B Pricing, etc.).
- `api/`: Admin API client (`adminApi.ts`, `modelServices.ts`, etc.).
- `types/admin.ts`: TypeScript definitions for views, users, entities, and forms.

## Step-by-Step Guide to Add a New Admin View

1. **Define View Identifier**:
   Add the new view key to `AdminView` union in `src/types/admin.ts`.
2. **Create Page Component**:
   Create `src/pages/MyNewPage.tsx` with loading states, error handling, and Tailwind styling.
3. **Add Navigation Item**:
   Add the entry to `ALL_NAV_ITEMS` in `src/components/layout/AdminSidebar.tsx`.
4. **Wire in Layout**:
   Add lazy import and `case "my-view": return <MyNewPage />;` in `src/components/layout/AdminLayout.tsx`.
5. **Set Header Title**:
   Add title string to `getViewTitle()` in `src/components/layout/AdminHeader.tsx`.
6. **Compile & Build Test**:
   ```bash
   cd D:\admin
   npx tsc --noEmit
   npm run build
   ```
