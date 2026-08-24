import React, { useState, Suspense, lazy } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { RefreshCw } from "lucide-react";

// ─── Code-Split Admin Views with Dynamic lazy() Imports ──────────────────────

const DashboardPage = lazy(() => import("../../pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const AnalyticsPage = lazy(() => import("../../pages/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })));
const ReportsPage = lazy(() => import("../../pages/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const ProductsPage = lazy(() => import("../../pages/ProductsPage").then((m) => ({ default: m.ProductsPage })));
const CreateProductPage = lazy(() => import("../../pages/CreateProductPage").then((m) => ({ default: m.CreateProductPage })));
const EditProductPage = lazy(() => import("../../pages/EditProductPage").then((m) => ({ default: m.EditProductPage })));
const OrdersPage = lazy(() => import("../../pages/OrdersPage").then((m) => ({ default: m.OrdersPage })));
const QuotesPage = lazy(() => import("../../pages/QuotesPage").then((m) => ({ default: m.QuotesPage })));

const AppointmentsPage = lazy(() => import("../../pages/AppointmentsPage").then((m) => ({ default: m.AppointmentsPage })));
const AuditPage = lazy(() => import("../../pages/AuditPage").then((m) => ({ default: m.AuditPage })));
const AdminManagementPage = lazy(() => import("../../pages/AdminManagementPage").then((m) => ({ default: m.AdminManagementPage })));
const RolesPage = lazy(() => import("../../pages/RolesPage").then((m) => ({ default: m.RolesPage })));
const AdminSecuritySettings = lazy(() => import("../settings/AdminSecuritySettings").then((m) => ({ default: m.AdminSecuritySettings })));

// Specialized pages
const CategoriesPage = lazy(() => import("../../pages/CategoriesPage").then((m) => ({ default: m.CategoriesPage })));
const CreateCategoryPage = lazy(() => import("../../pages/CreateCategoryPage").then((m) => ({ default: m.CreateCategoryPage })));
const EditCategoryPage = lazy(() => import("../../pages/EditCategoryPage").then((m) => ({ default: m.EditCategoryPage })));
const BannersPage = lazy(() => import("../../pages/BannersPage").then((m) => ({ default: m.BannersPage })));
const CMSPage = lazy(() => import("../../pages/CMSPage").then((m) => ({ default: m.CMSPage })));
const CouponsPage = lazy(() => import("../../pages/CouponsPage").then((m) => ({ default: m.CouponsPage })));
const MediaUploadManager = lazy(() => import("../../pages/MediaUploadManager").then((m) => ({ default: m.MediaUploadManager })));
const EnquiriesPage = lazy(() => import("../../pages/EnquiriesPage").then((m) => ({ default: m.EnquiriesPage })));
const ReviewsPage = lazy(() => import("../../pages/ReviewsPage").then((m) => ({ default: m.ReviewsPage })));
const UsersPage = lazy(() => import("../../pages/UsersPage").then((m) => ({ default: m.UsersPage })));
const ShippingsPage = lazy(() => import("../../pages/ShippingsPage").then((m) => ({ default: m.ShippingsPage })));
const ModelManagementPage = lazy(() => import("../../pages/ModelManagementPage").then((m) => ({ default: m.ModelManagementPage })));
const InventoryStockPage = lazy(() => import('../../pages/InventoryStockPage').then((m) => ({ default: m.InventoryStockPage })));
const InventoryDashboardPage = lazy(() => import("../../pages/inventory/InventoryDashboardPage").then((m) => ({ default: m.InventoryDashboardPage })));
const InventoryProductsPage = lazy(() => import("../../pages/inventory/InventoryProductsPage").then((m) => ({ default: m.InventoryProductsPage })));
const InventoryWarehousesPage = lazy(() => import("../../pages/inventory/InventoryWarehousesPage").then((m) => ({ default: m.InventoryWarehousesPage })));
const InventoryAllocationPage = lazy(() => import("../../pages/inventory/InventoryAllocationPage").then((m) => ({ default: m.InventoryAllocationPage })));
const InventoryDispatchesPage = lazy(() => import("../../pages/inventory/InventoryDispatchesPage").then((m) => ({ default: m.InventoryDispatchesPage })));
const InventoryTransfersPage = lazy(() => import("../../pages/inventory/InventoryTransfersPage").then((m) => ({ default: m.InventoryTransfersPage })));
const InventoryPurchasesPage = lazy(() => import("../../pages/inventory/InventoryPurchasesPage").then((m) => ({ default: m.InventoryPurchasesPage })));
const InventorySuppliersPage = lazy(() => import("../../pages/inventory/InventorySuppliersPage").then((m) => ({ default: m.InventorySuppliersPage })));
const InventoryPOSPage = lazy(() => import("../../pages/inventory/InventoryPOSPage").then((m) => ({ default: m.InventoryPOSPage })));
const InventoryReportsPage = lazy(() => import("../../pages/inventory/InventoryReportsPage").then((m) => ({ default: m.InventoryReportsPage })));
const InventoryAnalyticsPage = lazy(() => import("../../pages/inventory/InventoryAnalyticsPage").then((m) => ({ default: m.InventoryAnalyticsPage })));
const InventoryAuditPage = lazy(() => import("../../pages/inventory/InventoryAuditPage").then((m) => ({ default: m.InventoryAuditPage })));
const InventoryBarcodePage = lazy(() => import("../../pages/inventory/InventoryBarcodePage").then((m) => ({ default: m.InventoryBarcodePage })));
const InventorySearchPage = lazy(() => import("../../pages/inventory/InventorySearchPage").then((m) => ({ default: m.InventorySearchPage })));
const InventoryVenturesPage = lazy(() => import("../../pages/inventory/InventoryVenturesPage").then((m) => ({ default: m.InventoryVenturesPage })));
const B2BPricingPage = lazy(() => import("../../pages/B2BPricingPage").then((m) => ({ default: m.B2BPricingPage })));
const VariantsPage = lazy(() => import("../../pages/VariantsPage").then((m) => ({ default: m.VariantsPage })));
const NotificationsPage = lazy(() => import("../../pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const GSTInvoiceHub = lazy(() => import("../../pages/GSTInvoiceHub"));

function ViewLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse max-w-[1600px] mx-auto">
      {/* Header bar skeleton */}
      <div className="flex items-center justify-between pb-4 border-b border-[#27272A]">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-[#27272A] rounded" />
          <div className="h-3 w-72 bg-[#27272A] rounded" />
        </div>
        <div className="h-9 w-28 bg-[#27272A] rounded-xl" />
      </div>

      {/* 4 KPI cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-2">
            <div className="w-7 h-7 rounded-lg bg-[#27272A]" />
            <div className="h-5 w-14 bg-[#27272A] rounded" />
            <div className="h-2.5 w-20 bg-[#27272A] rounded" />
          </div>
        ))}
      </div>

      {/* Body panel skeleton */}
      <div className="p-6 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-4">
        <div className="h-4 w-36 bg-[#27272A] rounded" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-[#27272A] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { currentView, setCurrentView } = useAdminAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [b2bTargetCustomerId, setB2bTargetCustomerId] = useState<string | undefined>();

  const toggleSidebar = () => setIsCollapsed((prev) => !prev);
  const toggleMobileSidebar = () => setIsMobileOpen((prev) => !prev);
  const closeMobileSidebar = () => setIsMobileOpen(false);

  const renderCurrentView = () => {
    switch (currentView) {
      // 1. Core & Intelligence
      case "dashboard":
        return <DashboardPage />;
      case "analytics":
      case "reports":
        return <ReportsPage />;
      case "search":
        return (
          <ModelManagementPage
            modelKey="search"
            title="Search Index & Analytics"
            subtitle="Query Metrics"
            description="Monitor customer search terms, zero-result queries, click conversions, and search index optimization."
          />
        );
      case "notification":
      case "notifications":
        return <NotificationsPage />;

      // 2. Catalog & Stock
      case "products":
        return <ProductsPage />;
      case "products-create":
        return <CreateProductPage />;
      case "products-edit":
        return <EditProductPage />;
      case "categories":
        return <CategoriesPage />;
      case "categories-create":
        return <CreateCategoryPage />;
      case "categories-edit":
        return <EditCategoryPage />;
      case "banner":
        return <BannersPage />;
      case "variants":
      case "varients":
        return <VariantsPage />;
      
      // ─── Modular Enterprise Inventory Suite ────────────────────────
      case "inventory-dashboard":
      case "inventory":
        return <InventoryDashboardPage />;
      case "inventory-stock":
        return <InventoryStockPage />;
      case "inventory-products":
        return <InventoryProductsPage />;
      case "inventory-warehouses":
        return <InventoryWarehousesPage />;
      case "inventory-allocation":
      case "allocation":
        return <InventoryAllocationPage />;
      case "inventory-dispatches":
        return <InventoryDispatchesPage />;
      case "inventory-transfers":
        return <InventoryTransfersPage />;
      case "inventory-purchases":
        return <InventoryPurchasesPage />;
      case "inventory-suppliers":
        return <InventorySuppliersPage />;
      case "inventory-pos":
        return <InventoryPOSPage />;
      case "inventory-reports":
        return <InventoryReportsPage />;
      case "inventory-analytics":
        return <InventoryAnalyticsPage />;
      case "inventory-audit":
        return <InventoryAuditPage />;
      case "inventory-barcode":
        return <InventoryBarcodePage />;
      case "inventory-search":
        return <InventorySearchPage />;
      case "inventory-ventures":
        return <InventoryVenturesPage />;

      // 3. Sales & Fulfillment
      case "orders":
        return <OrdersPage />;
      case "checkouts":
        return (
          <ModelManagementPage
            modelKey="checkouts"
            title="Checkout Sessions & Drop-offs"
            subtitle="Checkout Analytics"
            description="Monitor active customer checkout sessions, address step drop-offs, and express checkout success rates."
          />
        );
      case "cart":
        return (
          <ModelManagementPage
            modelKey="cart"
            title="Active & Abandoned Carts"
            subtitle="Cart Management"
            description="Track active customer shopping carts, analyze abandoned cart values, and trigger recovery emails."
          />
        );
      case "quotes":
        return <QuotesPage />;
      case "appointments":
        return <AppointmentsPage />;
      case "enquiries":
        return <EnquiriesPage />;
      case "invoice":
      case "invoice-create":
      case "invoice-detail":
        return <GSTInvoiceHub />;

      // 4. Customers & Access
      case "users":
        return (
          <UsersPage
            onNavigateB2BPricing={(custId) => {
              setB2bTargetCustomerId(custId);
              setCurrentView("b2b-pricing");
            }}
          />
        );
      case "b2b-pricing":
        return (
          <B2BPricingPage
            initialCustomerId={b2bTargetCustomerId}
            onNavigateUsers={() => setCurrentView("users")}
          />
        );
      case "roles":
        return <RolesPage />;
      case "admins":
        return <AdminManagementPage />;
      case "auth":
      case "audit":
        return <AuditPage />;
      case "reviews":
        return <ReviewsPage />;
      case "wishlist":
        return (
          <ModelManagementPage
            modelKey="wishlist"
            title="Saved Customer Wishlists"
            subtitle="Wishlist Insights"
            description="Analyze saved product items by retail customers and B2B buyers to forecast demand trends."
          />
        );

      // 5. Storefront & CMS
      case "cms":
        return <CMSPage />;
      case "homepage":
        return (
          <ModelManagementPage
            modelKey="homepage"
            title="Homepage Layout Builder"
            subtitle="Storefront Layout"
            description="Configure storefront hero banners, featured collection grids, promo strips, and A/B test layouts."
          />
        );
      case "coupons":
        return <CouponsPage />;
      case "upload":
        return <MediaUploadManager />;

      // 6. Logistics & Operations
      case "shippings":
        return <ShippingsPage />;
      case "logistics":
        return (
          <ModelManagementPage
            modelKey="logistics"
            title="Logistics & Delivery Partners"
            subtitle="Courier Operations"
            description="Integrate with BlueDart, Delhivery, GATI express carriers, track waybills, and monitor SLA performance."
          />
        );
      case "payment":
        return (
          <ModelManagementPage
            modelKey="payment"
            title="Payment Gateways & Txns"
            subtitle="Transaction Gateway"
            description="Monitor Razorpay, Stripe, and COD payment transaction logs, settlement status, and refunds."
          />
        );
      case "settings":
        return <AdminSecuritySettings />;

      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FDFDF4] dark:bg-[#09090B] text-[#18181B] dark:text-[#FAFAFA] transition-colors relative">
      {/* Sidebar with Desktop + Mobile Support */}
      <AdminSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleSidebar}
        isMobileOpen={isMobileOpen}
        onCloseMobile={closeMobileSidebar}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden w-full">
        <AdminHeader
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleSidebar}
          onToggleMobile={toggleMobileSidebar}
        />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto overflow-x-hidden min-h-0 w-full">
          <div className="max-w-7xl mx-auto space-y-6 w-full min-w-0">
            <Suspense fallback={<ViewLoadingSkeleton />}>
              {renderCurrentView()}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

