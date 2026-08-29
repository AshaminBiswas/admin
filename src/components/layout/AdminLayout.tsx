import React, { useState, Suspense } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { RefreshCw, LayoutDashboard, ShoppingCart, Package, FileText, Menu } from "lucide-react";
import { lazyWithRetry } from "../../utils/lazyWithRetry";
import { ViewErrorBoundary } from "../common/ViewErrorBoundary";

// ─── Code-Split Admin Views with Dynamic lazyWithRetry() Imports ─────────────

const DashboardPage = lazyWithRetry(() => import("../../pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const AnalyticsPage = lazyWithRetry(() => import("../../pages/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage })));
const ReportsPage = lazyWithRetry(() => import("../../pages/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const ProductsPage = lazyWithRetry(() => import("../../pages/ProductsPage").then((m) => ({ default: m.ProductsPage })));
const CreateProductPage = lazyWithRetry(() => import("../../pages/CreateProductPage").then((m) => ({ default: m.CreateProductPage })));
const EditProductPage = lazyWithRetry(() => import("../../pages/EditProductPage").then((m) => ({ default: m.EditProductPage })));
const OrdersPage = lazyWithRetry(() => import("../../pages/OrdersPage").then((m) => ({ default: m.OrdersPage })));
const QuotesPage = lazyWithRetry(() => import("../../pages/QuotesPage").then((m) => ({ default: m.QuotesPage })));

const AppointmentsPage = lazyWithRetry(() => import("../../pages/AppointmentsPage").then((m) => ({ default: m.AppointmentsPage })));
const AuditPage = lazyWithRetry(() => import("../../pages/AuditPage").then((m) => ({ default: m.AuditPage })));
const AdminManagementPage = lazyWithRetry(() => import("../../pages/AdminManagementPage").then((m) => ({ default: m.AdminManagementPage })));
const RolesPage = lazyWithRetry(() => import("../../pages/RolesPage").then((m) => ({ default: m.RolesPage })));
const AdminSecuritySettings = lazyWithRetry(() => import("../settings/AdminSecuritySettings").then((m) => ({ default: m.AdminSecuritySettings })));

// Specialized pages
const CategoriesPage = lazyWithRetry(() => import("../../pages/CategoriesPage").then((m) => ({ default: m.CategoriesPage })));
const MaterialsPage = lazyWithRetry(() => import("../../pages/MaterialsPage").then((m) => ({ default: m.MaterialsPage })));
const CreateCategoryPage = lazyWithRetry(() => import("../../pages/CreateCategoryPage").then((m) => ({ default: m.CreateCategoryPage })));
const EditCategoryPage = lazyWithRetry(() => import("../../pages/EditCategoryPage").then((m) => ({ default: m.EditCategoryPage })));
const BannersPage = lazyWithRetry(() => import("../../pages/BannersPage").then((m) => ({ default: m.BannersPage })));
const CMSPage = lazyWithRetry(() => import("../../pages/CMSPage").then((m) => ({ default: m.CMSPage })));
const CouponsPage = lazyWithRetry(() => import("../../pages/CouponsPage").then((m) => ({ default: m.CouponsPage })));
const MediaUploadManager = lazyWithRetry(() => import("../../pages/MediaUploadManager").then((m) => ({ default: m.MediaUploadManager })));
const EnquiriesPage = lazyWithRetry(() => import("../../pages/EnquiriesPage").then((m) => ({ default: m.EnquiriesPage })));
const ReviewsPage = lazyWithRetry(() => import("../../pages/ReviewsPage").then((m) => ({ default: m.ReviewsPage })));
const UsersPage = lazyWithRetry(() => import("../../pages/UsersPage").then((m) => ({ default: m.UsersPage })));
const CustomerDossierPage = lazyWithRetry(() => import("../../pages/CustomerDossierPage").then((m) => ({ default: m.CustomerDossierPage })));
const AdminDossierPage = lazyWithRetry(() => import("../../pages/AdminDossierPage").then((m) => ({ default: m.AdminDossierPage })));
const ShippingsPage = lazyWithRetry(() => import("../../pages/ShippingsPage").then((m) => ({ default: m.ShippingsPage })));
const ModelManagementPage = lazyWithRetry(() => import("../../pages/ModelManagementPage").then((m) => ({ default: m.ModelManagementPage })));
const B2BPricingPage = lazyWithRetry(() => import("../../pages/B2BPricingPage").then((m) => ({ default: m.B2BPricingPage })));
const VariantsPage = lazyWithRetry(() => import("../../pages/VariantsPage").then((m) => ({ default: m.VariantsPage })));
const NotificationsPage = lazyWithRetry(() => import("../../pages/NotificationsPage").then((m) => ({ default: m.NotificationsPage })));
const InventoryPage = lazyWithRetry(() => import("../../pages/InventoryPage").then((m) => ({ default: m.InventoryPage })));
const ProductDossierPage = lazyWithRetry(() => import("../../pages/ProductDossierPage").then((m) => ({ default: m.ProductDossierPage })));
const GSTInvoiceHub = lazyWithRetry(() => import("../../pages/GSTInvoiceHub"));
const ProjectsPage = lazyWithRetry(() => import("../../pages/ProjectsPage").then((m) => ({ default: m.ProjectsPage })));
const POManagementPage = lazyWithRetry(() => import("../../pages/POManagementPage").then((m) => ({ default: m.POManagementPage })));
const PODetailPage = lazyWithRetry(() => import("../../pages/PODetailPage").then((m) => ({ default: m.PODetailPage })));

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
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prc_admin_selected_customer_id") || undefined;
    }
    return undefined;
  });
  const [selectedAdminId, setSelectedAdminId] = useState<string | undefined>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prc_admin_selected_admin_id") || undefined;
    }
    return undefined;
  });
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prc_admin_selected_product_id") || undefined;
    }
    return undefined;
  });
  const [selectedPoId, setSelectedPoId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("prc_admin_selected_po_id");
    }
    return null;
  });

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
      case "materials":
        return <MaterialsPage />;
      case "categories-create":
        return <CreateCategoryPage />;
      case "categories-edit":
        return <EditCategoryPage />;
      case "banner":
        return <BannersPage />;
      case "variants":
      case "varients":
        return <VariantsPage />;
      case "inventory":
        return <InventoryPage />;
      case "product-dossier":
      case "product-audit":
      case "inventory-dossier":
      case "audit-hub":
        return (
          <ProductDossierPage
            productId={selectedProductId}
            onBack={() => setCurrentView("inventory")}
          />
        );
      case "allocation":
        return (
          <ModelManagementPage
            modelKey="allocation"
            title="Stock Allocation & Routing"
            subtitle="Warehouse Allocation"
            description="Intelligent order routing and fulfillment center allocation based on proximity and shipping cost."
          />
        );

      // 3. Sales & Fulfillment
      case "orders":
        return <OrdersPage />;
      case "po-management":
        return (
          <POManagementPage
            onViewPo={(poId) => {
              setSelectedPoId(poId);
              if (typeof window !== "undefined") {
                localStorage.setItem("prc_admin_selected_po_id", poId);
              }
              setCurrentView("po-detail");
            }}
          />
        );
      case "po-detail":
        return (
          <PODetailPage
            poId={selectedPoId}
            onBack={() => setCurrentView("po-management")}
          />
        );
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
            onViewCustomer={(custId) => {
              setSelectedCustomerId(custId);
              if (typeof window !== "undefined") {
                localStorage.setItem("prc_admin_selected_customer_id", custId);
              }
              setCurrentView("user-detail");
            }}
          />
        );
      case "user-detail":
      case "customer-detail":
        return (
          <CustomerDossierPage
            userId={selectedCustomerId}
            onBack={() => setCurrentView("users")}
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
        return (
          <AdminManagementPage
            onViewAdmin={(adminId) => {
              setSelectedAdminId(adminId);
              if (typeof window !== "undefined") {
                localStorage.setItem("prc_admin_selected_admin_id", adminId);
              }
              setCurrentView("admin-detail");
            }}
          />
        );
      case "admin-detail":
        return (
          <AdminDossierPage
            adminId={selectedAdminId}
            onBack={() => setCurrentView("admins")}
          />
        );
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
      case "projects":
        return <ProjectsPage />;
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
        <main className="flex-1 p-2 sm:p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto overflow-x-hidden min-h-0 w-full">
          <div className="max-w-7xl mx-auto space-y-3 sm:space-y-5 md:space-y-6 w-full min-w-0">
            <ViewErrorBoundary onResetView={() => setCurrentView("dashboard")}>
              <Suspense fallback={<ViewLoadingSkeleton />}>
                {renderCurrentView()}
              </Suspense>
            </ViewErrorBoundary>
          </div>
        </main>
      </div>

      {/* ─── Mobile Native App Bottom Navigation Dock ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-lg border-t border-slate-200 dark:border-[#27272A] px-1 py-1 flex items-center justify-around shadow-2xl safe-area-pb">
        {[
          { id: "dashboard", label: "Home", icon: <LayoutDashboard size={16} /> },
          { id: "orders", label: "Orders", icon: <ShoppingCart size={16} /> },
          { id: "products", label: "Products", icon: <Package size={16} /> },
          { id: "quotes", label: "Quotes", icon: <FileText size={16} /> },
          { id: "menu", label: "All Menu", icon: <Menu size={16} />, isAction: true },
        ].map((item) => {
          const isActive =
            !item.isAction &&
            (currentView === item.id ||
              (item.id === "products" && String(currentView).startsWith("product")));
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.isAction) {
                  toggleMobileSidebar();
                } else {
                  setCurrentView(item.id as any);
                  closeMobileSidebar();
                }
              }}
              className={`flex flex-col items-center justify-center py-0.5 px-2 rounded-lg transition-all duration-200 min-w-[50px] relative active:scale-95 ${
                isActive
                  ? "text-[#8B5CF6] font-bold"
                  : "text-slate-500 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-[#FAFAFA]"
              }`}
            >
              <span className={`transition-transform ${isActive ? "scale-105 text-[#8B5CF6]" : ""}`}>
                {item.icon}
              </span>
              <span className="text-[9px] mt-0.5 tracking-tight font-semibold">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -top-1 w-5 h-0.5 rounded-full bg-[#8B5CF6] shadow-sm shadow-[#8B5CF6]/50" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

