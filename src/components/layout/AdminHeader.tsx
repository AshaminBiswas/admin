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
  Menu,
  Edit2,
  Users,
  User,
  Shield,
  X,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Building,
} from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { useTheme } from "../../context/ThemeContext";
import { usersApi } from "../../api/adminApi";
import { AdminNotificationDropdown } from "../notifications/AdminNotificationDropdown";

interface AdminHeaderProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onToggleMobile?: () => void;
}

export function AdminHeader({ isCollapsed, onToggleCollapse, onToggleMobile }: AdminHeaderProps) {
  const { currentView, setCurrentView, logout, adminUser, refreshUserProfile } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Real-Time Notification Dropdown States
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Edit Profile Modal States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState(adminUser?.firstName || "");
  const [editLastName, setEditLastName] = useState(adminUser?.lastName || "");
  const [editPhone, setEditPhone] = useState(adminUser?.phone || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Synchronize edit form when adminUser changes or modal opens
  useEffect(() => {
    if (adminUser) {
      setEditFirstName(adminUser.firstName || "");
      setEditLastName(adminUser.lastName || "");
      setEditPhone(adminUser.phone || "");
    }
  }, [adminUser, isEditProfileOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getViewTitle = () => {
    switch (currentView) {
      case "dashboard": return "Executive Operations Dashboard";
      case "analytics": return "Business Analytics & Growth Performance";
      case "reports": return "Financial Reports & Table Data Exports";
      case "admins": return "Executive Admin Users & Role Assignment";
      case "roles": return "Roles & Permissions (RBAC)";
      case "users": return "Customers & Users Management";
      case "products": return "Hardware Products & SKU Inventory Catalog";
      case "orders": return "Customer Orders & B2B Fulfillment Control";
      case "quotes": return "B2B Bulk Price Quotations & Approvals";
      case "appointments": return "Installation & Repair Service Appointments";
      case "enquiries": return "Customer Enquiries & Ticket Management";
      case "audit": return "System Security & Audit Activity Logs";
      case "settings": return "Security & Two-Factor Authentication (2FA)";
      default: return "PRC Admin Console";
    }
  };

  const handleOpenAuditLogs = () => {
    setCurrentView("audit");
    setIsProfileOpen(false);
  };

  const handleOpenRoles = () => {
    setCurrentView("roles");
    setIsProfileOpen(false);
  };

  const handleOpenAdmins = () => {
    setCurrentView("admins");
    setIsProfileOpen(false);
  };

  const handleOpenUsers = () => {
    setCurrentView("users");
    setIsProfileOpen(false);
  };

  const handleLogout = async () => {
    setIsProfileOpen(false);
    await logout();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);

    if (!editFirstName.trim() || !editLastName.trim()) {
      setProfileFeedback({ type: "error", text: "First name and last name are required." });
      return;
    }

    setIsSavingProfile(true);
    const res = await usersApi.updateProfile({
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      phone: editPhone.trim() || undefined,
    });
    setIsSavingProfile(false);

    if (res && res.success !== false) {
      setProfileFeedback({ type: "success", text: "Profile details updated successfully!" });
      await refreshUserProfile();
      setTimeout(() => {
        setIsEditProfileOpen(false);
        setProfileFeedback(null);
      }, 1200);
    } else {
      setProfileFeedback({ type: "error", text: res?.message || "Failed to update profile." });
    }
  };

  const displayName = adminUser?.firstName
    ? `${adminUser.firstName} ${adminUser.lastName || ""}`.trim()
    : "Administrator";
  const displayEmail = adminUser?.email || "";
  const displayPhone = adminUser?.phone || "";
  const rawRole = adminUser?.role as any;
  const roleString = typeof rawRole === "object" && rawRole !== null
    ? (rawRole.slug ?? rawRole.name ?? "super_admin")
    : (rawRole ?? "super_admin");
  const displayRole = roleString.replace(/_/g, " ").toUpperCase();
  const displayInitial = adminUser?.firstName ? adminUser.firstName[0].toUpperCase() : "E";
  const isSuperAdmin = roleString === "super_admin";

  return (
    <>
      <header className="h-16 bg-white dark:bg-[#18181B] border-b border-slate-200 dark:border-[#27272A] px-4 md:px-6 flex items-center justify-between flex-shrink-0 sticky top-0 z-30 shadow-sm dark:shadow-md transition-colors w-full min-w-0">
        {/* Left: Mobile Menu Toggle & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          {onToggleMobile && (
            <button
              type="button"
              onClick={onToggleMobile}
              className="md:hidden text-slate-600 dark:text-[#A1A1AA] hover:text-[#8B5CF6] p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#27272A]"
              aria-label="Toggle Mobile Menu"
            >
              <Menu size={20} />
            </button>
          )}

          <h2 className="text-sm md:text-lg font-bold text-slate-900 dark:text-[#FAFAFA] font-serif tracking-tight truncate">
            {getViewTitle()}
          </h2>
        </div>

        {/* Right: Actions & Profile Avatar */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Search */}
          <div className="relative hidden lg:block w-56 xl:w-64">
            <input
              type="text"
              placeholder="Search orders, SKUs..."
              className="w-full bg-slate-100 dark:bg-[#09090B] text-slate-900 dark:text-[#FAFAFA] placeholder-slate-400 dark:placeholder-[#A1A1AA]/50 pl-9 pr-3 py-1.5 rounded-tr-lg rounded-bl-lg text-xs border border-slate-200 dark:border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B5CF6]" />
          </div>

          {/* Notifications Bell Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setIsNotificationsOpen((prev) => !prev);
                setIsProfileOpen(false);
              }}
              className="relative text-slate-500 dark:text-[#A1A1AA] hover:text-[#8B5CF6] p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors"
              aria-label="Notifications"
              title="Real-Time Operations Alerts"
            >
              <Bell size={18} />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#8B5CF6] text-white text-[9px] font-black flex items-center justify-center shadow-sm shadow-[#8B5CF6]/50 animate-pulse">
                  {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                </span>
              )}
            </button>

            <AdminNotificationDropdown
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              onUnreadCountChange={setUnreadNotifCount}
              onNavigateToView={(view) => setCurrentView(view)}
            />
          </div>

          {/* Storefront Link */}
          <a
            href={(import.meta as any).env?.VITE_STOREFRONT_URL || ((import.meta as any).env?.PROD ? "https://frontend-sage-pi-65.vercel.app" : "http://localhost:5173")}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/15 border border-[#8B5CF6]/40 hover:bg-[#8B5CF6] hover:text-white text-[#8B5CF6] dark:text-[#A855F7] font-bold text-xs px-3 py-1.5 rounded-tr-lg rounded-bl-lg transition-all duration-200"
          >
            <span>Storefront</span>
            <ExternalLink size={13} />
          </a>

          {/* Interactive Profile Avatar Button & Dropdown Menu */}
          <div className="relative pl-2 md:pl-3 border-l border-slate-200 dark:border-[#27272A]" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-[#27272A] transition-all focus:outline-none"
              title="Account Profile & Settings"
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#8B5CF6]/20 border-2 border-[#8B5CF6] flex items-center justify-center text-[#8B5CF6] dark:text-[#FAFAFA] font-black text-xs md:text-sm shadow-md shadow-[#8B5CF6]/20 hover:scale-105 transition-transform">
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
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsEditProfileOpen(true);
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-[#8B5CF6] hover:text-[#7C3AED] hover:underline"
                    >
                      <Edit2 size={11} /> Edit Profile
                    </button>
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
                      <span className="font-semibold text-slate-900 dark:text-[#FAFAFA] truncate block">
                        {isSuperAdmin ? "Full Super Admin Access" : "Authorized Operator Access"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Management Shortcuts */}
                <div className="p-2 border-b border-slate-200 dark:border-[#27272A] bg-purple-50/30 dark:bg-purple-950/10 space-y-1">
                  <button
                    type="button"
                    onClick={handleOpenAdmins}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] hover:bg-slate-200/70 dark:hover:bg-[#27272A] hover:text-[#8B5CF6] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Users size={14} className="text-[#8B5CF6]" />
                      <span>Admin Users & Staff</span>
                    </div>
                    <span className="text-[9px] font-bold text-[#8B5CF6] bg-[#8B5CF6]/10 px-1.5 py-0.5 rounded">CRUD</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenUsers}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] hover:bg-slate-200/70 dark:hover:bg-[#27272A] hover:text-[#8B5CF6] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <User size={14} className="text-[#8B5CF6]" />
                      <span>Customers & Users</span>
                    </div>
                    <span className="text-[9px] font-bold text-[#8B5CF6] bg-[#8B5CF6]/10 px-1.5 py-0.5 rounded">CRUD</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenRoles}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-[#FAFAFA] hover:bg-slate-200/70 dark:hover:bg-[#27272A] hover:text-[#8B5CF6] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Shield size={14} className="text-[#8B5CF6]" />
                      <span>Roles & Permissions (RBAC)</span>
                    </div>
                    <span className="text-[9px] font-bold text-[#8B5CF6] bg-[#8B5CF6]/10 px-1.5 py-0.5 rounded">Manage</span>
                  </button>
                </div>

                {/* Actions Section */}
                <div className="p-2 space-y-1 bg-slate-50 dark:bg-[#09090B]">
                  {/* Theme Switcher */}
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

      {/* ══ EDIT PROFILE MODAL ═════════════════════════════════════════════════ */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#18181B] w-full max-w-md rounded-tr-2xl rounded-bl-2xl shadow-2xl border border-slate-200 dark:border-[#27272A] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#27272A]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center text-[#8B5CF6]">
                  <Edit2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#FAFAFA]">
                    Edit Admin Profile
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-[#71717A]">
                    Update your executive contact information
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {profileFeedback && (
              <div className={`mx-5 mt-4 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
                profileFeedback.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300"
                  : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300"
              }`}>
                {profileFeedback.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
                <span>{profileFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    required
                    placeholder="First Name"
                    className="w-full bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    required
                    placeholder="Last Name"
                    className="w-full bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={displayEmail}
                  disabled
                  className="w-full bg-slate-100 dark:bg-[#18181B] border border-slate-200 dark:border-[#3F3F46] rounded-lg px-3 py-2 text-xs text-slate-500 dark:text-[#71717A] cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 dark:text-[#71717A] mt-1 block">
                  Email is linked to your authentication credentials.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-[#A1A1AA] mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91-9876543210"
                  className="w-full bg-slate-50 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-60 text-white text-xs font-bold py-2.5 rounded-tr-xl rounded-bl-xl shadow-md shadow-[#8B5CF6]/25 transition-colors"
                >
                  {isSavingProfile ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>Save Changes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
