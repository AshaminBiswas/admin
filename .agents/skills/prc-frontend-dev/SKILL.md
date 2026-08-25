---
name: prc-frontend-dev
description: >-
  Use this skill when building or updating customer-facing pages, catalog browsing, cart,
  checkout, quotation requests, or API services in the PRC Storefront (D:\frontend).
---

# PRC Storefront Development Guide

## Architecture Overview (`frontend/src/`)

- `pages/`: Customer storefront pages (Home, Products Catalog, Product Details, Cart, Checkout, Quotes, Appointments, Account).
- `services/`: Backend API consumers (`productService.ts`, `cartService.ts`, `quoteService.ts`, etc.).
- `context/`: Global React state (`AuthContext`, `CartContext`, etc.).
- `components/`: Reusable UI elements, modals, cards, headers, footers.
- `types/`: Domain models and frontend API payload definitions.

## Key Development Rules

1. **State Consistency**: Cart items and customer wishlist must sync gracefully between guest localStorage and backend user accounts upon login.
2. **Responsive Design**: Ensure mobile-first responsiveness using Tailwind CSS.
3. **Validation & Verification**:
   ```bash
   cd D:\frontend
   npm run build
   ```
