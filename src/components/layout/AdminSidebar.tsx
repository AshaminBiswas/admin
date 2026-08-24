import React, { useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Package,
  ShoppingCart,
  FileText,
  Calendar,
  FileCheck,
  ShieldAlert,
  KeyRound,
  Users,
  Boxes,
  PanelLeftClose,
  PanelLeftOpen,
  Layers,
  Image as ImageIcon,
  ShoppingBag,
  FolderTree,
  CreditCard,
  FileCode,
  Ticket,
  HelpCircle,
  Home,
  Receipt,
  Truck,
  Bell,
  DollarSign,
  Star,
  Search,
  Upload,
  UserCheck,
  Sliders,
  Heart,
  Navigation,
  Coins,
  FileSpreadsheet,
  X, ChevronDown,
} from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { AdminView } from "../../types/admin";

interface NavItem {
  id: AdminView;
  label: string;
  category: string;
  icon: React.ReactNode;
  badge?: string | number;
  subItems?: { id: AdminView; label: string }[];
}

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}: AdminSidebarProps) {
  const { currentView, setCurrentView } = useAdminAuth();
  const [navSearch, setNavSearch] = useState("");
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({ "inventory": true });

  const ALL_NAV_ITEMS: NavItem[] = [
    // Core & Intelligence
    { id: "dashboard", label: "Dashboard", category: "Core & Intelligence", icon: <LayoutDashboard size={18} /> },
    { id: "reports", label: "Reports & BI", category: "Core & Intelligence", icon: <BarChart3 size={18} />, badge: "XLS" },
    { id: "search", label: "Search Index", category: "Core & Intelligence", icon: <Search size={18} /> },
    { id: "notification", label: "Notifications", category: "Core & Intelligence", icon: <Bell size={18} />, badge: "2" },

    // Catalog & Stock
    { id: "products", label: "Products Catalog", category: "Catalog & Stock", icon: <Package size={18} />, badge: "5" },
    { id: "categories", label: "Categories", category: "Catalog & Stock", icon: <FolderTree size={18} /> },
    { id: "variants", label: "Variants & SKUs", category: "Catalog & Stock", icon: <Sliders size={18} /> },
    { id: "inventory", label: "Inventory Module", category: "Catalog & Stock", icon: <Boxes size={18} />, subItems: [
      { id: "inventory-dashboard", label: "Dashboard" },
      { id: "inventory-stock", label: "Stock" },
      { id: "inventory-products", label: "Products" },
      { id: "inventory-warehouses", label: "Warehouses" },
      { id: "inventory-allocation", label: "Allocation" },
      { id: "inventory-dispatches", label: "Dispatches" },
      { id: "inventory-transfers", label: "Transfers" },
      { id: "inventory-purchases", label: "Purchases" },
      { id: "inventory-suppliers", label: "Suppliers" },
      { id: "inventory-pos", label: "POS" },
      { id: "inventory-reports", label: "Reports" },
      { id: "inventory-analytics", label: "Analytics" },
      { id: "inventory-audit", label: "Audit" },
      { id: "inventory-barcode", label: "Barcode" },
      { id: "inventory-search", label: "Search" },
      { id: "inventory-ventures", label: "Ventures" }
    ] },
    { id: "allocation", label: "Stock Allocation", category: "Catalog & Stock", icon: <Layers size={18} /> },
    { id: "upload", label: "Media Uploads", category: "Catalog & Stock", icon: <Upload size={18} /> },

    // Sales & Fulfillment
    { id: "orders", label: "Orders", category: "Sales & Fulfillment", icon: <ShoppingCart size={18} />, badge: "4" },
    { id: "checkouts", label: "Checkout Sessions", category: "Sales & Fulfillment", icon: <CreditCard size={18} /> },
    { id: "cart", label: "Shopping Carts", category: "Sales & Fulfillment", icon: <ShoppingBag size={18} /> },
    { id: "quotes", label: "B2B Quotes", category: "Sales & Fulfillment", icon: <FileText size={18} />, badge: "2" },


    { id: "appointments", label: "Appointments", category: "Sales & Fulfillment", icon: <Calendar size={18} /> },
    { id: "enquiries", label: "Enquiries", category: "Sales & Fulfillment", icon: <HelpCircle size={18} /> },
    { id: "invoice", label: "Invoices & GST", category: "Sales & Fulfillment", icon: <Receipt size={18} />, badge: "GST" },

    // Customers & Access
    { id: "admins", label: "Admin Users & Staff", category: "Customers & Access", icon: <KeyRound size={18} />, badge: "Admin" },
    { id: "users", label: "Users & Customers", category: "Customers & Access", icon: <UserCheck size={18} /> },
    { id: "b2b-pricing", label: "B2B Custom Pricing", category: "Customers & Access", icon: <Coins size={18} />, badge: "B2B" },
    { id: "roles", label: "Roles & RBAC", category: "Customers & Access", icon: <Users size={18} />, badge: "RBAC" },
    { id: "auth", label: "Auth & Audits", category: "Customers & Access", icon: <ShieldAlert size={18} /> },
    { id: "reviews", label: "Reviews & Ratings", category: "Customers & Access", icon: <Star size={18} /> },
    { id: "wishlist", label: "Saved Wishlists", category: "Customers & Access", icon: <Heart size={18} /> },

    // Storefront & CMS
    { id: "cms", label: "CMS Pages", category: "Storefront & CMS", icon: <FileCode size={18} /> },
    { id: "homepage", label: "Homepage Builder", category: "Storefront & CMS", icon: <Home size={18} /> },
    { id: "banner", label: "Banners & Hero", category: "Storefront & CMS", icon: <ImageIcon size={18} /> },
    { id: "coupons", label: "Coupons & Promos", category: "Storefront & CMS", icon: <Ticket size={18} /> },

    // Logistics & Operations
    { id: "shippings", label: "Shipping Zones", category: "Logistics & Operations", icon: <Navigation size={18} /> },
    { id: "logistics", label: "Logistics Partners", category: "Logistics & Operations", icon: <Truck size={18} /> },
    { id: "payment", label: "Payment Gateways", category: "Logistics & Operations", icon: <DollarSign size={18} /> },
    { id: "settings", label: "System Settings", category: "Logistics & Operations", icon: <KeyRound size={18} /> },
  ];

  const filteredItems = ALL_NAV_ITEMS.filter(
    (item) =>
      item.label.toLowerCase().includes(navSearch.toLowerCase()) ||
      item.id.toLowerCase().includes(navSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(navSearch.toLowerCase())
  );

  const categories = Array.from(new Set(filteredItems.map((i) => i.category)));

  const handleNavClick = (viewId: AdminView) => {
    setCurrentView(viewId);
    if (onCloseMobile) onCloseMobile();
  };

  const navContent = (
    <aside
      className={`h-full bg-white dark:bg-[#18181B] border-r border-slate-200 dark:border-[#27272A] flex flex-col flex-shrink-0 z-40 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-72"
      }`}
    >
      {/* Brand Header */}
      <div
        className={`p-4 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between h-16 ${
          isCollapsed ? "justify-center" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700/60 p-1 flex items-center justify-center shadow-md flex-shrink-0">
            <img src="/logo.png" alt="PRC Logo" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <span className="font-extrabold text-sm text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              PRC ADMIN
            </span>
          )}
        </div>

        {/* Desktop Collapse Button */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className="hidden md:flex text-slate-500 dark:text-[#A1A1AA] hover:text-[#8B5CF6] p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors"
          >
            {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        )}

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden text-slate-500 dark:text-[#A1A1AA] p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#27272A]"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav Search Filter */}
      {!isCollapsed && (
        <div className="px-3 my-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#A1A1AA]" />
            <input
              type="text"
              placeholder="Search 30 models..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-xs text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 dark:placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-4 overflow-y-auto no-scrollbar py-2">
        {categories.map((cat) => {
          const itemsInCat = filteredItems.filter((i) => i.category === cat);
          if (itemsInCat.length === 0) return null;

          return (
            <div key={cat} className="space-y-1">
              {!isCollapsed && (
                <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#71717A] mb-1">
                  {cat}
                </p>
              )}
              {itemsInCat.map((item) => {
                const isActive =
                  currentView === item.id ||
                  (item.id === "variants" && currentView === "varients") ||
                  (item.id === "varients" && currentView === "variants");
                  
                const isExpanded = expandedMenus[item.id];
                const hasActiveSub = item.subItems?.some(s => s.id === currentView);
                const isParentActive = isActive || hasActiveSub;
                
                return (
                  <div key={item.id} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => {
                        if (item.subItems && !isCollapsed) {
                          setExpandedMenus(prev => ({ ...prev, [item.id]: !prev[item.id] }));
                        } else {
                          handleNavClick(item.id);
                        }
                      }}
                      title={isCollapsed ? `${item.label} (${item.category})` : undefined}
                      className={`w-full flex items-center py-2 rounded-tr-xl rounded-bl-xl text-xs font-semibold transition-all duration-150 group relative ${
                        isCollapsed ? "justify-center px-2" : "justify-between px-3"
                      } ${
                        (isParentActive && !item.subItems)
                          ? "bg-[#8B5CF6] text-white shadow-md shadow-[#8B5CF6]/25 font-bold"
                          : isParentActive
                          ? "text-[#8B5CF6] bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/10"
                          : "text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] hover:text-slate-900 dark:hover:text-[#FAFAFA]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={(isParentActive && !item.subItems) ? "text-white" : "text-[#8B5CF6] group-hover:scale-110 transition-transform"}>
                          {item.icon}
                        </span>
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </div>
                      
                      {!isCollapsed && (
                        <div className="flex items-center gap-1.5">
                          {item.badge && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                (isParentActive && !item.subItems)
                                  ? "bg-slate-900 dark:bg-[#09090B] text-white"
                                  : "bg-[#8B5CF6]/15 text-[#8B5CF6] dark:bg-[#8B5CF6]/20 dark:text-[#A855F7]"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          {item.subItems && (
                            <ChevronDown size={14} className={`transition-transform text-slate-400 ${isExpanded ? "rotate-180" : ""}`} />
                          )}
                        </div>
                      )}
                    </button>
                    
                    {/* Sub-items Dropdown */}
                    {item.subItems && isExpanded && !isCollapsed && (
                      <div className="mt-1 ml-6 pl-2 border-l border-slate-200 dark:border-[#27272A] space-y-1">
                        {item.subItems.map(subItem => (
                          <button
                            key={subItem.id}
                            type="button"
                            onClick={() => handleNavClick(subItem.id as any)}
                            className={`w-full flex items-center px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                              currentView === subItem.id
                                ? "bg-[#8B5CF6] text-white shadow-sm shadow-[#8B5CF6]/25"
                                : "text-slate-500 dark:text-[#A1A1AA] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#27272A]"
                            }`}
                          >
                            {subItem.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block h-full">{navContent}</div>

      {/* Mobile Slide-Over Drawer with Backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-50 h-full w-72 max-w-[80vw]">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}

