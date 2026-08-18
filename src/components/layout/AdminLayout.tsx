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
const PurchaseOrdersPage = lazy(() => import("../../pages/PurchaseOrdersPage").then((m) => ({ default: m.PurchaseOrdersPage })));
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
const B2BPricingPage = lazy(() => import("../../pages/B2BPricingPage").then((m) => ({ default: m.B2BPricingPage })));

function ViewLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
      <RefreshCw className="w-8 h-8 text-[#8B5CF6] animate-spin" />
      <p className="text-xs font-semibold text-slate-500 dark:text-[#71717A]">
        Loading view modules...
      </p>
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
        return (
          <ModelManagementPage
            modelKey="notification"
            title="System Notifications & Alerts"
            subtitle="Alert Center"
            description="Manage automated SMS, Email, Push notifications, inventory stock alerts, and webhook triggers."
          />
        );

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
      case "varients":
        return (
          <ModelManagementPage
            modelKey="varients"
            title="Product Variants & Options"
            subtitle="SKU Matrix"
            description="Manage product color variations, material finishes, size configurations, and individual SKU pricing."
          />
        );
      case "inventory":
        return (
          <ModelManagementPage
            modelKey="inventory"
            title="Stock & Warehouse Inventory"
            subtitle="Stock Tracking"
            description="Track real-time stock levels across regional warehouses, set min stock alerts, and manage reorders."
          />
        );
      case "allocation":
        return (
          <ModelManagementPage
            modelKey="allocation"
            title="Stock Allocation & Distribution"
            subtitle="Warehouse Allocation"
            description="Allocate inventory across distribution centers, reserve stock for B2B orders, and manage cross-docking."
          />
        );

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
      case "purchase-orders":
        return <PurchaseOrdersPage />;
      case "appointments":
        return <AppointmentsPage />;
      case "enquiries":
        return <EnquiriesPage />;
      case "invoice":
        return (
          <ModelManagementPage
            modelKey="invoice"
            title="Invoices & GST Tax Billing"
            subtitle="Financial Invoicing"
            description="Generate B2B GST tax invoices, manage automated billing PDFs, and track payment dues."
          />
        );

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
