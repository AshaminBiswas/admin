# PRC Hardware - Comprehensive Architecture & Project Context

> **CRITICAL PROTOCOL FOR ALL AI AGENTS & DEVELOPERS**:
> 1. **Read this file FIRST** before planning or executing any tasks across `PRC-Backend`, `admin`, or `frontend`.
> 2. **Update this file** whenever you add, modify, or delete any models, API routes, modules, UI pages, services, or system workflows.
> 3. Ensure all changes maintain strict end-to-end consistency across the Backend API, Admin Console, and Customer Storefront.

---

## 1. System Ecosystem Overview

The PRC Hardware platform consists of three core sub-projects located under `D:\`:

```
D:\
├── PRC-Backend/    # Express + TypeScript + Prisma REST API Backend (Port 5000)
├── admin/          # React + Vite + Tailwind Admin Console Dashboard (Port 5173/5174)
└── frontend/       # React + Vite + Tailwind Customer E-Commerce Storefront (Port 5175/3000)
```

---

## 2. Technology Stack & Infrastructure

### 2.1 Backend (`PRC-Backend`)
- **Runtime & Language**: Node.js (>= 18), TypeScript (Strict mode), Express.js.
- **ORM & Database**: Prisma Client `v5.22.0`, PostgreSQL (Hosted on Supabase).
- **Database Connection Architecture**:
  - `DATABASE_URL`: Supabase Transaction Pooler via PgBouncer on port `6543` (`?pgbouncer=true`). Used for application queries.
  - `DIRECT_URL`: Supabase Direct Session Pooler on port `5432`. Required for DDL migrations and schema changes.
- **Database Self-Healing**: `src/scripts/fix-db.js` runs automatically on `npm start` to idempotently patch missing columns and indexes before Express boots.
- **Caching & KV**: Upstash Redis (REST HTTP client) and `ioredis`.
- **Background Jobs & Queues**: BullMQ worker queues for async jobs, emails, and batch processing (`src/queues/bullmq.worker.ts`).
- **Real-Time Communication**: Server-Sent Events (SSE) at `/api/v1/notifications/stream` and internal `eventBus` (`src/events/eventBus.ts`).
- **Authentication**: JWT (Access + Refresh tokens), 2FA TOTP (Speakeasy + QR codes), Email OTP, RBAC with granular permissions.
- **Payments**: Razorpay SDK and PhonePe Gateway integration with webhook signature verification.
- **Invoicing & GST**: Indian GST tax engine (Intrastate CGST+SGST, Interstate IGST), HSN/SAC code mapping, IRN / E-Invoice readiness.

### 2.2 Admin Console (`D:\admin`)
- **Framework**: React 18, Vite 6, TypeScript.
- **Styling**: Tailwind CSS, Radix UI primitives, Lucide React icons.
- **State & Auth**: `AdminAuthContext` (JWT in localStorage), `ThemeContext` (Light/Dark mode).
- **Architecture**: Dynamic lazy-loaded modular pages (`AdminLayout.tsx`, `AdminSidebar.tsx`, `AdminHeader.tsx`).
- **Features**: Dashboard analytics, product/category/variant CRUD, customer orders, B2B quotes & approvals, B2B custom pricing, GST Tax Invoice Hub, RBAC roles & permissions, CMS/Banner management, media upload studio.

### 2.3 Storefront (`D:\frontend`)
- **Framework**: React 18, Vite 6, React Router v7, TypeScript.
- **Styling**: Tailwind CSS 4, Radix UI, tw-animate-css, Lucide React.
- **Mobile App Architecture**:
  - Persistent bottom mobile navigation bar (`MobileBottomNav.tsx`) with animated badge counters for Cart and Wishlist.
  - Mobile-first compact typography, tighter padding/margins, and touch manipulation optimization (`-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`).
  - Horizontal touch-swipe carousels (`no-scrollbar snap-x snap-mandatory`) for hero sliders, aesthetic collections, and product strips.
  - 2-Column compact mobile product grids (`grid-cols-2 gap-2 sm:gap-4`) across all catalog and listing pages (`ProductsCatalogPage`, `CategoryProductsPage`, `BestSellersPage`, `NewArrivalsPage`, `OffersPage`, `WishlistPage`).
  - Mobile sticky bottom action bars for single-tap Add-to-Cart / Buy-Now on Product Detail and instant 1-tap checkout on Cart and Checkout pages.
  - **User Profile (`UserProfilePage.tsx`)**: Horizontal touch scroll tab bar (`no-scrollbar`), compact hero avatar & badges, responsive mobile order cards with status chips and quick actions.
  - **Quotation Suite (`RequestQuotePage.tsx` & `CustomerQuoteApprovalPage.tsx`)**: Responsive 1-column mobile inputs, touch-friendly product search & selection, responsive line item cards with stepper controls, and compact digital signature seal.
  - **Appointments & Service (`AppointmentsPage.tsx`)**: Compact service selection cards, 3/4-column time slot grid, and responsive booking confirmation cards.
  - **Warranty & Claims (`WarrantyClaimPage.tsx`)**: Touch upload file zone, mobile certificate verification and generator modal.
  - **Order Tracking & Notifications (`TrackOrderPage.tsx` & `NotificationsPage.tsx`)**: Mobile vertical order milestone stepper and compact notification cards.
  - **Policies & Information Suite (`AboutPage.tsx`, `ContactPage.tsx`, `FaqPage.tsx`, `PolicyPage.tsx`, `TermsOfServicePage.tsx`, `PrivacyPolicyPage.tsx`, `RefundPolicyPage.tsx`, `ShippingPolicyPage.tsx`)**: Mobile horizontal pill bars for quick policy switching, compact FAQ accordions, and responsive inquiry submission forms.
  - **Dynamic Banner Loading (`HeroSlider.tsx` & `UpcomingSlider.tsx`)**: Zero hardcoded image flashing on refresh; skeleton shimmer placeholders during live database banner retrieval.
- **State & Services**: Custom React contexts (`AuthContext`, `CartContext`, etc.), modular API services in `src/services/`.
- **Features**: Product catalog with dynamic filters, category browsing, instant search, persistent cart, multi-step checkout, B2B quotation request, installation appointment booking, customer order tracking, reviews & ratings, wishlist.

---

## 3. Database Schema & Prisma Models (`prisma/schema.prisma`)

### Core Models Registry (60 Active Models):

1. **Authentication, Users & RBAC**:
   - `User`: Customers, staff, and superadmins (`email`, `phone`, `role`, `status`, `isTwoFactorEnabled`, `twoFactorSecret`, `b2bCompanyName`, `b2bGstin`).
   - `Role`: System and custom RBAC roles (`name`, `slug`, `isSystem`).
   - `Permission`: Fine-grained permission strings (e.g. `products.create`, `orders.manage`, `allocation.manage`).
   - `RolePermission` & `UserRole`: Many-to-many junction tables for RBAC.
   - `RefreshToken`, `EmailVerification`, `PasswordReset`, `UserActivityLog`: Session and audit records.

2. **Catalog & Products**:
   - `Category`: Categories hierarchy (`parentId`, `slug`, `position`, `isVisible`, `isBestseller`).
   - `Product`: Main product catalog (`name`, `slug`, `sku`, `price`, `salesPrice`, `offerPrice`, `stock`, `status`, `manufacturerInfo`, `dimensions`, `tags`, `attributes`).
   - `ProductVariant`: SKU variants for colors, sizes, materials, and finishes (`sku`, `price`, `stock`, `attributes`, `images`).

3. **B2B & Pricing Engine**:
   - `B2BCustomerPrice`: Custom negotiated product pricing per B2B customer account (`customerId`, `productId`, `customPrice`, `minQuantity`, `discountPercent`).
   - `Quote`: B2B bulk quotation requests (`quoteNumber`, `clientId`, `companyName`, `status`, `totalEstimatedValue`, `validUntil`).
   - `QuotationRevision`, `QuoteItem`, `QuoteActivityLog`, `QuoteSequence`: Versioned quotation revisions and items.

4. **Cart, Orders & Fulfillment**:
   - `Cart` & `CartItem`: Persistent shopping cart for guest and registered users.
   - `Order` & `OrderItem`: Customer orders (`orderNumber`, `orderStatus`, `paymentStatus`, `totalAmount`, `isB2B`, `shippingAddress`, `billingAddress`).
   - `OrderStatusHistory`: Immutable order lifecycle audit log.
   - `Warehouse`: Fulfillment centers with geolocation and priority.
   - `PinCode`: Serviceable postal codes mapped to warehouses with delivery SLA and shipping rates.
   - `AllocationLog`: Automated order routing decision records based on weighted scoring formula.

5. **Coupons, Discounts & Payments**:
   - `Coupon`: Promo codes (`code`, `discountType`, `discountValue`, `minOrderAmount`, `maxDiscountAmount`, `applicable_product_ids`, `applicable_category_ids`, `usageLimit`).
   - `CouponUsage`: Tracks per-user coupon redemption.
   - `Payment`: Gateway transaction records (`orderId`, `gateway`, `paymentMethod`, `transactionId`, `status`, `amount`, `currency`).

6. **Invoicing & GST Tax Hub**:
   - `Invoice` & `InvoiceItem`: GST compliant tax invoices (`invoiceNumber`, `placeOfSupply`, `supplyType`, `cgstAmount`, `sgstAmount`, `igstAmount`, `irn`, `signedQrCode`, `status`).
   - `InvoiceHistory` & `InvoiceSequence`: Financial year sequence tracking (`PRC/2026-27/0001`).

7. **Logistics & Shipping**:
   - `Courier`, `ShippingZone`, `WarehouseZoneMapping`, `CourierRate`, `Shipment`, `ShippingRate`: Multi-carrier logistics routing (BlueDart, Delhivery, GATI).

8. **Service Appointments**:
   - `AppointmentService`: Hardware repair, installation, and inspection services.
   - `StaffAvailability`, `BlackoutDate`, `Appointment`, `AppointmentStatusHistory`: Booking slots and engineer dispatch.

9. **Storefront Content & Engagement**:
   - `CmsPage`, `BlogPost`, `FaqCategory`, `Faq`, `Banner`, `HomepageSection`: Dynamic content management.
   - `Review`: Verified buyer product reviews and star ratings.
   - `Enquiry`: Customer contact forms and support tickets.
   - `Wishlist` & `WishlistItem`: Customer saved items.
   - `Notification`: In-app and system alerts.
   - `Setting` & `AuditLog`: Platform settings and immutable security log.

> **Note on Removed Subsystems**: The multi-tenant enterprise inventory and POS subsystem (21 legacy models including `Venture`, `InventoryStock`, `PosSale`, etc.) was permanently removed in favor of direct SKU catalog management and intelligent warehouse order allocation.

---

## 4. Backend Module Architecture (`src/modules/`)

All modules follow a uniform, production-grade layered architecture:
`routes.ts` -> `controller.ts` -> `service.ts` -> `schema.ts` (Zod validation) -> Database (`database.ts` Prisma client).

| Module | Route Prefix | Primary Purpose |
|---|---|---|
| `allocation` | `/api/v1/allocation` | Order routing algorithm, warehouse scoring, pincode SLA mapping |
| `appointments` | `/api/v1/appointments` | Hardware service & installation scheduling |
| `auth` | `/api/v1/auth` | JWT auth, 2FA TOTP, email verification, password resets |
| `b2b-pricing` | `/api/v1/b2b-pricing` | Customer-specific pricing matrices & bulk rate lookup |
| `banners` | `/api/v1/banners` | Promotional hero banners, position targeting, CTR metrics |
| `cart` | `/api/v1/cart` | Shopping cart sync, item mutations, stock availability |
| `categories` | `/api/v1/categories` | Hierarchical category taxonomy & bestseller flags |
| `checkout` | `/api/v1/checkout` | Order calculation, tax computation, address validation |
| `cms` | `/api/v1/cms` | Dynamic pages, blogs, and FAQ content |
| `coupons` | `/api/v1/coupons` | Promo code validation, discounts, defensive self-healing |
| `dashboard` | `/api/v1/dashboard` | Admin executive analytics, revenue KPIs, growth rates |
| `enquiries` | `/api/v1/enquiries` | Customer tickets, contact queries, resolution workflow |
| `homepage` | `/api/v1/homepage` | Dynamic storefront layout sections & module ordering |
| `invoices` | `/api/v1/invoices` | GST tax invoices, IRN generation, E-Invoicing, PDF export |
| `logistics` | `/api/v1/logistics` | Courier integration, waybill generation, SLA tracking |
| `notifications` | `/api/v1/notifications` | Real-time SSE event stream, user inbox, admin alerts |
| `orders` | `/api/v1/orders` | Full order lifecycle, status transitions, cancellation restock |
| `payments` | `/api/v1/payments` | Razorpay & PhonePe checkouts, webhooks, refund processing |
| `products` | `/api/v1/products` | Hardware SKU catalog, prices, specs, tags, filters |
| `quotes` | `/api/v1/quotes` | B2B bulk quotations, negotiations, approvals, PDF quotes |
| `reports` | `/api/v1/reports` | Financial & sales data exports (CSV, XLSX, PDF) |
| `reviews` | `/api/v1/reviews` | Product reviews, star ratings, moderation workflow |
| `roles` | `/api/v1/roles` | RBAC role definitions, permission matrix assignment |
| `search` | `/api/v1/search` | Search indexing, fuzzy matching, query analytics |
| `settings` | `/api/v1/settings` | System-wide configuration, company GSTIN, maintenance |
| `shipping` | `/api/v1/shipping` | Shipping zone calculation, pincode validation |
| `upload` | `/api/v1/upload` | Media asset upload manager, image optimization |
| `users` | `/api/v1/users` | Customer profiles, admin staff management, addresses |
| `variants` | `/api/v1/variants` | Product variant matrix (color, size, finish), SKUs |
| `wishlist` | `/api/v1/wishlist` | Customer saved wishlists & demand forecast tracking |

---

## 5. Security & Authentication Flow

1. **Access Tokens**: Short-lived JWTs passed in `Authorization: Bearer <token>` or HTTP-only cookies.
2. **Refresh Tokens**: Long-lived tokens rotated on refresh at `/api/v1/auth/refresh`.
3. **Two-Factor Authentication (2FA)**:
   - TOTP Authenticator apps (Google Authenticator, Authy) supported.
   - Enforced in `auth.middleware.ts` before sensitive operations.
4. **RBAC Middleware**:
   - `requireAuth`: Ensures valid authenticated user session.
   - `requireRole(['super_admin', 'admin'])`: Restricts endpoint to specific roles.
   - `requirePermission('products.create')`: Granular capability verification against `RolePermission`.

---

## 6. Development Guidelines & Modification Protocol

Whenever introducing changes to the codebase, follow these rules:

1. **Database Changes**:
   - Update `prisma/schema.prisma`.
   - Add idempotent DDL patch to `src/scripts/fix-db.js` if deploying to live Supabase pooler without full migration downtime.
   - Run `npx prisma generate` to rebuild Prisma Client.
   - Validate with `npx prisma validate`.
2. **Type Safety**:
   - Always run `npx tsc --noEmit` on the affected projects (`PRC-Backend`, `admin`, or `frontend`) to guarantee 0 compile errors.
3. **Cross-Project Synchronization**:
   - If an API endpoint or response structure changes in `PRC-Backend`, immediately update:
     - The corresponding service in `D:\admin\src\api\` and types in `D:\admin\src\types\admin.ts`.
     - The corresponding service in `D:\frontend\src\services\` and types in `D:\frontend\src\types\`.
4. **Update This File**:
   - Record any new models, endpoints, or architectural changes in this `PROJECT_CONTEXT.md` document.

---

## 7. Storefront Mobile-First UX Architecture (`D:\frontend`)

The Storefront was architected and optimized for native app-like responsiveness on small mobile devices (320px–420px):
- **Responsive Top Navigation**: Removed cluttered search and profile buttons on small screens, shifting brand logo to right with left hamburger drawer.
- **Dedicated Bottom App Bar & Search Overlay**: Bottom navigation bar triggers interactive search overlay (`SearchOverlay.tsx`) modal without unnecessary page transitions.
- **Ultra-Compact Product Cards (`ProductCard.tsx`)**: Re-engineered with `p-1.5` internal padding, scaled micro-typography, compact stock badges, and responsive action triggers (`Add` on mobile vs `Add to Cart` on desktop).
- **Product Detail Viewing Page (`ProductDetailPage.tsx`)**: Responsive image gallery viewport (`h-64 sm:h-80 md:h-[450px]`), touch-scrollable horizontal specifications and review tab bar (`no-scrollbar touch-pan-x`), compact pricing and finish options, and a fixed bottom sticky purchase bar for mobile checkout.
- **Showcase & Aesthetic Banners (`ShopByAestheticSection.tsx`, `CubicleHardwareSection.tsx`, `LockerHardwareSection.tsx`)**: Clean responsive CSS grid with smooth hardware-accelerated scroll-reveal animations on mobile (even cards slide in from left, odd cards from right) and `overflow-hidden` containers to eliminate jitter and horizontal overflow.
- **Product Showcase Sliders (`SuperSaverSection.tsx`, `BestSellerSection.tsx`, `ValueMoneySection.tsx`)**: Upward scroll-triggered animation (`opacity-0 translate-y-12` -> `opacity-100 translate-y-0`) with staggered product card elevation as the user scrolls into view.
- **Responsive Order & Quotation Suite (`UserProfilePage.tsx`, `RequestQuotePage.tsx`, `CustomerQuoteApprovalPage.tsx`, `B2BQuotationManager.tsx`)**: Optimized orders tab, B2B quotation submission form, line item cards, financial cost breakdown, and digital signature verification seal with compact typography, scaled paddings, and mobile-first touch actions for small devices (320px–420px).
- **Reversible Bidirectional Scroll Animations (`useInView.ts`, Showcase Sections)**: Implemented continuous reversible scroll observation across all showcase banners and product sliders. When scrolling into view (up or down), cards and headers glide in smoothly with staggered elevation; when scrolling past or away, components gracefully reset their transforms so they continuously re-animate on every scroll interaction.
- **Mobile-First Single-Phase Home Page Skeleton (`HeroSlider.tsx`, `UpcomingSlider.tsx`, `HomePageSkeleton`, `PageSkeleton.tsx`)**: Measured and locked small-device hero banner height (`min-h-[175px] xs:min-h-[210px] sm:min-h-[260px] md:aspect-[1024/383]`) and upcoming banner height (`h-[140px] xs:h-[160px] sm:h-[220px] md:h-[280px]`). Eliminated nested secondary Suspense boundaries so the page transitions cleanly in ONE single unified phase on initial reload with zero jump and zero CLS.
- **User Address Management Suite (`/api/v1/users/addresses`)**: Implemented complete CRUD endpoints for user addresses (`GET`, `POST`, `PATCH`, `PUT`, `DELETE` on `/users/addresses` & `/users/addresses/:addressId`) mounted before `/:id` admin routes. Added dual payload compatibility (`addressLine1`/`line1`, `postalCode`/`pincode`), contact fields (`phone`, `email`, `altPhone`), **WhatsApp availability toggle** (`hasWhatsapp`), **GPS geolocation / Map location picker coordinates** (`latitude`, `longitude`), address label chips, and idempotent PostgreSQL DDL table patches in `fix-db.js` and `database.ts`.
- **Customer B2B Upgrade & Downgrade Safeguard (`UserProfilePage.tsx`, `users.service.ts`)**: Implemented explicit self-serve upgrade workflow allowing B2C retail customers to upgrade into B2B Wholesale Partners by providing Company Name and 15-character GSTIN. Once upgraded or registered as B2B, the account is permanently locked to B2B status (downgrading back to B2C is strictly blocked on backend and locked in frontend UI to preserve wholesale pricing agreements, quote archives, and GST billing records).
- **Government GSTIN, Phone & Email Validation Suite (`validation.utils.ts`, `validation.ts`)**: Implemented complete multi-layer validation:
  1. **GSTIN Validation**: Official GSTN Luhn Mod-36 checksum calculation, 37 Indian State/UT code validation with live state resolution (e.g. `27` -> Maharashtra), and PAN entity type decoding.
  2. **Phone Number Validation**: Strict 10-digit Indian mobile validation (`^[6-9]\d{9}$`), normalization (stripping `+91`/`0`/formatting), and rejection of dummy/sequence numbers.
  3. **Email Deliverability & Disposable Blocker**: Zero-cost DNS MX record verification (`dns.promises.resolveMx`) and 30+ disposable email domain blocklist (`tempmail`, `mailinator`, `10minutemail`, `yopmail`, etc.).
- **Duplicate Account Prevention, Phone Multi-Account Limit & Unified Password Recovery (`auth.service.ts`, `AuthModal.tsx`)**:
  1. **Registration Duplicate Prevention**: Pre-checks Email, GSTIN, and Company Name before creation. Rejects duplicates with a 1-click **"Reset Password →"** action that pre-fills their identifier into account recovery.
  2. **Phone Number Multi-Account Limit**: Enforces a strict maximum of **3 accounts per phone number**; 4th registration triggers `PHONE_LIMIT_EXCEEDED`.
  3. **Unified Password Reset via Email OR GSTIN with 6-Digit OTP**: Customers can initiate recovery by typing either their Email or GSTIN. A 6-digit OTP is dispatched to their registered email with interactive OTP entry and instant password reset.

---

*Last Updated: 2026-08-25 (Duplicate Account Prevention, Max 3 Phone Limit & Email/GSTIN OTP Recovery)*
