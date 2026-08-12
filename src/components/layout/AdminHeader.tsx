import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  ExternalLink,
  Mail,
  Phone,
  ShieldCheck,
  FileText,
  LogOut,
  ChevronDown,
  Clock,
  Sun,
  Moon,
} from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { useTheme } from "../../context/ThemeContext";

interface AdminHeaderProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminHeader({ isCollapsed, onToggleCollapse }: AdminHeaderProps) {
  const { currentView, setCurrentView, logout, adminUser } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getViewTitle = () => {
    switch (currentView) {
      case "dashboard": return "Executive Operations Dashboard";
      case "analytics": return "Business Analytics & Growth Performance";
      case "reports": return "Financial Reports & Table Data Exports (Excel & PDF)";
      case "admins": return "Executive Admin Users & Role Assignment";
      case "products": return "Hardware Products & SKU Inventory Catalog";
      case "orders": return "Customer Orders & B2B Fulfillment Control";
      case "quotes": return "B2B Bulk Price Quotations & Approvals";
      case "appointments": return "Installation & Repair Service Appointments";
      case "audit": return "System Security & Audit Activity Logs";
      case "settings": return "Security & Two-Factor Authentication (2FA)";
      default: return "PRC Admin Console";
    }
  };

  const handleOpenAuditLogs = () => {
    setCurrentView("audit");
    setIsProfileOpen(false);
  };

  const handleLogout = async () => {
    setIsProfileOpen(false);
    await logout();
  };

  const displayName = adminUser?.firstName
    ? `${adminUser.firstName} ${adminUser.lastName || ""}`.trim()
    : "Executive Admin";
  const displayEmail = adminUser?.email || "admin@prchardware.com";
  const displayPhone = adminUser?.phone || "+91 9876543210";
  const displayRole = adminUser?.role
    ? adminUser.role.replace("_", " ").toUpperCase()
    : "SUPER ADMIN";
  const displayInitial = adminUser?.firstName ? adminUser.firstName[0].toUpperCase() : "E";

  return (
    <header className="h-16 bg-white dark:bg-[#18181B] border-b border-slate-200 dark:border-[#27272A] px-6 flex items-center justify-between flex-shrink-0 sticky top-0 z-30 shadow-sm dark:shadow-md transition-colors">
      {/* Left: Page Title */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-[#FAFAFA] font-serif tracking-tight">
            {getViewTitle()}
          </h2>
        </div>
      </div>

      {/* Right: Actions & Profile Avatar */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search */}
        <div className="relative hidden lg:block w-64">
          <input
            type="text"
            placeholder="Search orders, SKUs..."
            className="w-full bg-slate-100 dark:bg-[#09090B] text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 dark:placeholder-[#A1A1AA]/50 pl-9 pr-3 py-1.5 rounded-tr-lg rounded-bl-lg text-xs border border-slate-200 dark:border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
        </div>

        {/* Notifications Bell */}
        <button
          type="button"
          className="relative text-slate-500 dark:text-[#A1A1AA] hover:text-[#8B5CF6] p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#8B5CF6]" />
        </button>

        {/* Storefront Link */}
        <a
          href="http://localhost:5173"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:flex items-center gap-1.5 bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/15 border border-[#8B5CF6]/40 hover:bg-[#8B5CF6] hover:text-white text-[#8B5CF6] dark:text-[#A855F7] font-bold text-xs px-3 py-1.5 rounded-tr-lg rounded-bl-lg transition-all duration-200"
        >
          <span>Storefront</span>
          <ExternalLink size={13} />
        </a>

        {/* Interactive Profile Avatar Button & Dropdown Menu */}
        <div className="relative pl-3 border-l border-slate-200 dark:border-[#27272A]" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-[#27272A] transition-all focus:outline-none"
            title="Account Profile & Settings"
          >
            <div className="w-9 h-9 rounded-full bg-[#8B5CF6]/20 border-2 border-[#8B5CF6] flex items-center justify-center text-[#8B5CF6] dark:text-[#FAFAFA] font-black text-sm shadow-md shadow-[#8B5CF6]/20 hover:scale-105 transition-transform">
              {displayInitial}
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-500 dark:text-[#A1A1AA] transition-transform duration-200 ${
                isProfileOpen ? "rotate-180 text-[#8B5CF6]" : ""
              }`}
            />
          </button>

          {/* Profile Dropdown Modal */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header Info */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-white dark:from-[#1F1929] dark:to-[#18181B] border-b border-slate-200 dark:border-[#27272A] flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center font-black text-lg shadow-lg shadow-[#8B5CF6]/30">
                  {displayInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-[#FAFAFA] truncate">{displayName}</h3>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider bg-[#8B5CF6]/15 text-[#8B5CF6] dark:bg-[#8B5CF6]/20 dark:text-[#A855F7] border border-[#8B5CF6]/30">
                    {displayRole}
                  </span>
                </div>
              </div>

              {/* Account Details List */}
              <div className="p-4 space-y-3 border-b border-slate-200 dark:border-[#27272A] text-xs">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#71717A]">
                    Admin Details
                  </p>
                  <span className="text-[10px] text-[#8B5CF6] font-semibold">Active Session</span>
                </div>

                <div className="flex items-center gap-3 text-slate-600 dark:text-[#A1A1AA]">
                  <Mail size={15} className="text-[#8B5CF6] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 dark:text-[#71717A] block">Email Address</span>
                    <span className="font-semibold text-slate-900 dark:text-[#FAFAFA] truncate block">{displayEmail}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-600 dark:text-[#A1A1AA]">
                  <Phone size={15} className="text-[#8B5CF6] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 dark:text-[#71717A] block">Phone Number</span>
                    <span className="font-semibold text-slate-900 dark:text-[#FAFAFA] truncate block">{displayPhone}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-600 dark:text-[#A1A1AA]">
                  <ShieldCheck size={15} className="text-[#8B5CF6] flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 dark:text-[#71717A] block">Access Permission</span>
                    <span className="font-semibold text-slate-900 dark:text-[#FAFAFA] truncate block">Full System Access</span>
                  </div>
                </div>
              </div>

              {/* Actions Section */}
              <div className="p-2 space-y-1 bg-slate-50 dark:bg-[#09090B]">
                {/* Theme Switcher inside Profile Dropdown */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] hover:bg-slate-200 dark:hover:bg-[#27272A] hover:text-[#8B5CF6] transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    {theme === "dark" ? (
                      <Sun size={16} className="text-amber-500 group-hover:scale-110 transition-transform" />
                    ) : (
                      <Moon size={16} className="text-[#8B5CF6] group-hover:scale-110 transition-transform" />
                    )}
                    <span>Theme: {theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#8B5CF6]/15 text-[#8B5CF6] dark:bg-[#8B5CF6]/20 dark:text-[#A855F7] border border-[#8B5CF6]/30">
                    {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAuditLogs}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] hover:bg-slate-200 dark:hover:bg-[#27272A] hover:text-[#8B5CF6] transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText size={16} className="text-[#8B5CF6] group-hover:scale-110 transition-transform" />
                    <span>Log Records & Audit</span>
                  </div>
                  <Clock size={12} className="text-slate-400 dark:text-[#71717A]" />
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <LogOut size={16} className="group-hover:scale-110 transition-transform" />
                    <span>Sign Out / Logout</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
