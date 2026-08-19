import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Bell,
  Send,
  CheckCheck,
  Check,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  ShoppingBag,
  AlertTriangle,
  FileText,
  Sparkles,
  Radio,
  Clock,
  ExternalLink,
  Users,
  ShieldCheck,
  Layers,
  X,
  Plus,
  SlidersHorizontal,
  ChevronRight,
  Eye,
  Info,
  Zap,
} from "lucide-react";
import {
  notificationsApi,
  AdminNotificationItem,
  API_BASE_URL,
  getAdminToken,
} from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";
import { AsyncActionButton } from "../components/common/AsyncActionButton";

/* ─── Skeleton Loading Body for Notifications Hub ──────────────────────────── */

export function NotificationsPageSkeleton() {
  return (
    <div className="p-6 md:p-8 space-y-6 animate-pulse max-w-7xl mx-auto font-sans">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-64 bg-[#27272A] rounded-xl" />
            <div className="h-6 w-24 bg-[#27272A] rounded-full" />
          </div>
          <div className="h-4 w-96 bg-[#27272A]/60 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-36 bg-[#27272A] rounded-xl" />
          <div className="h-10 w-28 bg-[#27272A] rounded-xl" />
        </div>
      </div>

      {/* 4 KPI Metrics Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-20 bg-[#27272A] rounded" />
              <div className="w-8 h-8 rounded-xl bg-[#27272A]" />
            </div>
            <div className="h-7 w-24 bg-[#27272A] rounded" />
            <div className="h-3 w-32 bg-[#27272A]/50 rounded" />
          </div>
        ))}
      </div>

      {/* Toolbar Skeleton */}
      <div className="p-4 bg-[#18181B] rounded-2xl border border-[#27272A] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-24 bg-[#27272A] rounded-xl" />
          ))}
        </div>
        <div className="h-9 w-64 bg-[#27272A] rounded-xl" />
      </div>

      {/* Notification Cards Skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-[#18181B] border border-[#27272A] flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-[#27272A] flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-48 bg-[#27272A] rounded" />
                <div className="h-3 w-20 bg-[#27272A] rounded" />
              </div>
              <div className="h-3 w-full bg-[#27272A]/70 rounded" />
              <div className="h-3 w-2/3 bg-[#27272A]/50 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component: Enterprise Notifications Command Center ──────────────── */

export function NotificationsPage() {
  const { adminUser, setCurrentView } = useAdminAuth();

  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"ALL" | "UNREAD" | "ORDER" | "INVENTORY" | "SYSTEM">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Modal: Send / Broadcast Notification
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [targetType, setTargetType] = useState<"broadcast" | "user">("broadcast");
  const [targetUserId, setTargetUserId] = useState("");
  const [notifType, setNotifType] = useState("GENERAL");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifDataJson, setNotifDataJson] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modal: Payload Inspector
  const [inspectingNotif, setInspectingNotif] = useState<AdminNotificationItem | null>(null);

  // Helper for relative timestamps
  const getRelativeTime = (dateString: string) => {
    try {
      const now = new Date();
      const past = new Date(dateString);
      const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);

      if (diffSec < 60) return "Just now";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago (${past.toLocaleDateString("en-IN")})`;
    } catch {
      return "Recently";
    }
  };

  // Helper for type styling
  const getTypeStyle = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("ORDER")) {
      return {
        label: "Order Event",
        icon: <ShoppingBag size={16} />,
        badgeColor: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
        iconBg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      };
    }
    if (t.includes("STOCK") || t.includes("INVENTORY") || t.includes("ALERT")) {
      return {
        label: "Stock Alert",
        icon: <AlertTriangle size={16} />,
        badgeColor: "bg-rose-500/15 border-rose-500/30 text-rose-400",
        iconBg: "bg-rose-500/20 text-rose-400 border-rose-500/30",
      };
    }
    if (t.includes("QUOTE")) {
      return {
        label: "Quotation",
        icon: <FileText size={16} />,
        badgeColor: "bg-purple-500/15 border-purple-500/30 text-[#A855F7]",
        iconBg: "bg-purple-500/20 text-[#A855F7] border-purple-500/30",
      };
    }
    if (t.includes("PROMO")) {
      return {
        label: "Promotion",
        icon: <Sparkles size={16} />,
        badgeColor: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
        iconBg: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      };
    }
    return {
      label: "System Notice",
      icon: <Bell size={16} />,
      badgeColor: "bg-amber-500/15 border-amber-500/30 text-amber-400",
      iconBg: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
  };

  // Load Notifications
  const fetchNotifications = useCallback(async (showFullLoader = false) => {
    if (showFullLoader) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await notificationsApi.list({ page: 1, limit: 50 });
      if (res && res.success !== false) {
        const items: AdminNotificationItem[] = Array.isArray(res.data)
          ? res.data
          : res.data?.items || [];
        const count =
          res.unreadCount ??
          res.data?.unreadCount ??
          items.filter((n) => !n.isRead).length;

        setNotifications(items);
        setUnreadCount(count);
      }
    } catch (err: any) {
      console.error("[Notifications Fetch Error]:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  // Real-Time SSE Listener
  useEffect(() => {
    const token =
      getAdminToken() ||
      localStorage.getItem("admin_access_token") ||
      localStorage.getItem("token");
    if (!token) return;

    const sseUrl = `${API_BASE_URL}/events/stream?token=${encodeURIComponent(token)}`;

    try {
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener("connected", () => {
        setSseConnected(true);
      });

      const handleRealtimeEvent = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          const newNotif: AdminNotificationItem = {
            id: payload.id || `live-event-${Date.now()}`,
            type: payload.type || "SYSTEM",
            title: payload.title || "Real-Time Event",
            message: payload.message || "",
            data: payload.data,
            isRead: false,
            createdAt: payload.timestamp || payload.createdAt || new Date().toISOString(),
          };

          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);
        } catch (e: any) {
          console.error("[SSE Parse Error]:", e.message);
        }
      };

      es.addEventListener("notification:new", handleRealtimeEvent);
      es.addEventListener("notification:broadcast", handleRealtimeEvent);
      es.addEventListener("order:new", handleRealtimeEvent);
      es.addEventListener("quote:new", handleRealtimeEvent);
      es.addEventListener("inventory:low_stock", handleRealtimeEvent);
      es.addEventListener("system:alert", handleRealtimeEvent);

      es.onerror = () => {
        setSseConnected(false);
      };

      return () => {
        es.close();
        eventSourceRef.current = null;
      };
    } catch (err) {
      console.error("[SSE Init Error]:", err);
    }
  }, []);

  // Mark Single Notification Read
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error("[Mark Read Error]:", err);
    }
  };

  // Mark All Read
  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err: any) {
      console.error("[Mark All Read Error]:", err);
    }
  };

  // Delete Notification
  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Permanently remove this notification entry?")) return;

    try {
      await notificationsApi.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => {
        const notif = notifications.find((n) => n.id === id);
        return notif && !notif.isRead ? Math.max(0, prev - 1) : prev;
      });
    } catch (err: any) {
      alert(err.message || "Failed to delete notification");
    }
  };

  // Submit New Notification / Broadcast
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      setSendFeedback({ type: "error", text: "Title and message are required." });
      return;
    }

    if (targetType === "user" && !targetUserId.trim()) {
      setSendFeedback({ type: "error", text: "Target User UUID is required for targeted notifications." });
      return;
    }

    let parsedData: any = undefined;
    if (notifDataJson.trim()) {
      try {
        parsedData = JSON.parse(notifDataJson);
      } catch {
        setSendFeedback({ type: "error", text: "Custom metadata payload must be valid JSON." });
        return;
      }
    }

    setIsSending(true);
    setSendFeedback(null);

    try {
      await notificationsApi.create({
        broadcast: targetType === "broadcast",
        userId: targetType === "user" ? targetUserId.trim() : undefined,
        type: notifType,
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        data: parsedData,
      });

      setSendFeedback({
        type: "success",
        text: targetType === "broadcast" ? "Broadcast alert emitted to all active users!" : "Targeted notification dispatched successfully!",
      });

      // Reset form
      setTimeout(() => {
        setIsSendModalOpen(false);
        setNotifTitle("");
        setNotifMessage("");
        setNotifDataJson("");
        setTargetUserId("");
        setSendFeedback(null);
        fetchNotifications(false);
      }, 1200);
    } catch (err: any) {
      setSendFeedback({ type: "error", text: err.message || "Failed to dispatch notification." });
    } finally {
      setIsSending(false);
    }
  };

  // Computed Filtered List
  const filteredNotifications = useMemo(() => {
    let list = [...notifications];

    // Status / Category Tab
    if (activeTab === "UNREAD") {
      list = list.filter((n) => !n.isRead);
    } else if (activeTab === "ORDER") {
      list = list.filter((n) => n.type.toUpperCase().includes("ORDER"));
    } else if (activeTab === "INVENTORY") {
      list = list.filter((n) =>
        n.type.toUpperCase().includes("STOCK") || n.type.toUpperCase().includes("INVENTORY")
      );
    } else if (activeTab === "SYSTEM") {
      list = list.filter((n) =>
        n.type.toUpperCase().includes("SYSTEM") || n.type.toUpperCase().includes("PROMO") || n.type.toUpperCase().includes("GENERAL")
      );
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.message?.toLowerCase().includes(q) ||
          n.type?.toLowerCase().includes(q) ||
          n.id?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [notifications, activeTab, searchQuery]);

  // Aggregated KPI Stats
  const metrics = useMemo(() => {
    const total = notifications.length;
    const unread = unreadCount;
    const orders = notifications.filter((n) => n.type.toUpperCase().includes("ORDER")).length;
    const inventory = notifications.filter((n) =>
      n.type.toUpperCase().includes("STOCK") || n.type.toUpperCase().includes("INVENTORY")
    ).length;

    return { total, unread, orders, inventory };
  }, [notifications, unreadCount]);

  if (isLoading && notifications.length === 0) {
    return <NotificationsPageSkeleton />;
  }

  return (
    <div className="p-6 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto font-sans text-[#FAFAFA] animate-in fade-in duration-150">
      {/* ─── Top Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#27272A] pb-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#FAFAFA] tracking-tight flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30 flex items-center justify-center">
                <Bell size={18} />
              </span>
              <span>Notifications & Real-Time Alerts</span>
            </h1>
            {sseConnected ? (
              <span className="flex items-center gap-1.5 text-xs font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                GATEWAY ACTIVE
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-[#71717A] bg-[#27272A] px-2.5 py-0.5 rounded-full">
                POLLING MODE
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
            Monitor real-time domain events, broadcast customer-wide promotions, and audit operations alerts pushed via EventBus & SSE.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsSendModalOpen(true)}
            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-[#8B5CF6]/20 flex items-center gap-2"
          >
            <Send size={15} />
            <span>Dispatch Notification</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] text-xs font-bold px-3.5 py-2.5 rounded-xl border border-[#3F3F46] transition-colors flex items-center gap-1.5"
            >
              <CheckCheck size={15} className="text-[#8B5CF6]" />
              <span>Mark All Read</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchNotifications(false)}
            className="p-2.5 rounded-xl bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
            title="Refresh list"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin text-[#8B5CF6]" : ""} />
          </button>
        </div>
      </div>

      {/* ─── 4 KPI Metrics Summary Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
              Total Alerts
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#27272A] flex items-center justify-center text-[#8B5CF6]">
              <Bell size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-[#FAFAFA]">
            {metrics.total}
          </p>
          <span className="text-[11px] text-[#71717A] block">
            Archived notifications & alerts
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Unread Priority
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Radio size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
            {metrics.unread}
          </p>
          <span className="text-[11px] text-amber-400/70 block">
            Awaiting acknowledgement
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Order Triggers
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShoppingBag size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
            {metrics.orders}
          </p>
          <span className="text-[11px] text-emerald-400/70 block">
            Automated checkout events
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Stock Warnings
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-rose-400">
            {metrics.inventory}
          </p>
          <span className="text-[11px] text-rose-400/70 block">
            Low inventory threshold hits
          </span>
        </div>
      </div>

      {/* ─── Search & Status Filters ─── */}
      <div className="p-4 bg-[#18181B] rounded-2xl border border-[#27272A] flex flex-wrap items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold pb-1 sm:pb-0 scrollbar-thin">
          {[
            { id: "ALL", label: `All (${metrics.total})` },
            { id: "UNREAD", label: `Unread (${metrics.unread})` },
            { id: "ORDER", label: `Orders (${metrics.orders})` },
            { id: "INVENTORY", label: `Stock Warnings (${metrics.inventory})` },
            { id: "SYSTEM", label: "System & Broadcasts" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-[#8B5CF6] text-white shadow-sm shadow-[#8B5CF6]/20 font-black"
                  : "text-[#A1A1AA] hover:bg-[#27272A] hover:text-[#FAFAFA]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px] flex-1 sm:flex-initial">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts, messages, types..."
            className="w-full pl-10 pr-8 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Notifications Feed ─── */}
      {filteredNotifications.length === 0 ? (
        <div className="p-12 sm:p-16 rounded-3xl bg-[#18181B] border border-[#27272A] text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#27272A] text-[#71717A] flex items-center justify-center mx-auto border border-[#3F3F46]/40 shadow-inner">
            <Bell size={28} />
          </div>
          <h3 className="text-lg font-bold text-[#FAFAFA]">No Notifications Found</h3>
          <p className="text-xs sm:text-sm text-[#71717A] max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? `No alerts matching "${searchQuery}". Clear your search term to see all records.`
              : "There are no notifications matching the selected filter criteria."}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-xs font-bold text-[#FAFAFA] transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const style = getTypeStyle(notif.type);

            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.isRead) handleMarkAsRead(notif.id);
                }}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative group flex flex-col sm:flex-row items-start justify-between gap-4 ${
                  notif.isRead
                    ? "bg-[#18181B] border-[#27272A] hover:border-[#3F3F46]"
                    : "bg-[#18181B] border-[#8B5CF6]/40 shadow-sm shadow-[#8B5CF6]/5 hover:border-[#8B5CF6]"
                }`}
              >
                {/* Left: Icon & Message Details */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${style.iconBg}`}
                  >
                    {style.icon}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${style.badgeColor}`}>
                        {style.label}
                      </span>
                      {!notif.isRead && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-[#8B5CF6] bg-[#8B5CF6]/15 px-2 py-0.5 rounded-full border border-[#8B5CF6]/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse" />
                          UNREAD
                        </span>
                      )}
                      <span className="text-[11px] text-[#71717A] flex items-center gap-1 font-mono">
                        <Clock size={11} />
                        {getRelativeTime(notif.createdAt)}
                      </span>
                    </div>

                    <h4 className={`text-sm ${notif.isRead ? "text-[#FAFAFA]" : "font-bold text-white text-base"}`}>
                      {notif.title}
                    </h4>

                    <p className="text-xs text-[#A1A1AA] leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Quick Metadata Snippet */}
                    {notif.data && Object.keys(notif.data).length > 0 && (
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        {notif.data.orderNumber && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-[#27272A] text-emerald-400 border border-[#3F3F46]">
                            Order #{notif.data.orderNumber}
                          </span>
                        )}
                        {notif.data.sku && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-[#27272A] text-rose-400 border border-[#3F3F46]">
                            SKU: {notif.data.sku}
                          </span>
                        )}
                        {notif.data.currentStock !== undefined && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-[#27272A] text-amber-400 border border-[#3F3F46]">
                            Stock: {notif.data.currentStock} Units
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div
                  className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#27272A] w-full sm:w-auto justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  {notif.data && (
                    <button
                      type="button"
                      onClick={() => setInspectingNotif(notif)}
                      className="px-2.5 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                      title="Inspect payload"
                    >
                      <Eye size={13} />
                      <span>Data</span>
                    </button>
                  )}

                  {!notif.isRead ? (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(notif.id, e)}
                      className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                      title="Mark as read"
                    >
                      <Check size={13} />
                      <span>Read</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#71717A] px-2 font-mono">
                      Read
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDeleteNotification(notif.id, e)}
                    className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-colors"
                    title="Delete permanently"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL: DISPATCH CUSTOM NOTIFICATION ─── */}
      {isSendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#18181B] border border-[#27272A] rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col font-sans">
            {/* Modal Header */}
            <div className="p-5 bg-[#09090B] border-b border-[#27272A] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#8B5CF6]/20 text-[#8B5CF6] border border-[#8B5CF6]/30 flex items-center justify-center">
                  <Send size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#FAFAFA]">Dispatch Notification</h3>
                  <p className="text-[11px] text-[#71717A]">
                    Send in-app notifications to all users or target a specific customer UUID.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSendModalOpen(false)}
                className="p-1.5 text-[#71717A] hover:text-[#FAFAFA] rounded-xl hover:bg-[#27272A] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSendNotification} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
              {sendFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold border ${
                    sendFeedback.type === "success"
                      ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-400"
                      : "bg-rose-950/60 border-rose-500/30 text-rose-400"
                  }`}
                >
                  {sendFeedback.text}
                </div>
              )}

              {/* Target Type */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#A1A1AA]">Recipient Target</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetType("broadcast")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      targetType === "broadcast"
                        ? "bg-[#8B5CF6]/15 border-[#8B5CF6] text-white"
                        : "bg-[#09090B] border-[#27272A] text-[#A1A1AA]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users size={14} className={targetType === "broadcast" ? "text-[#8B5CF6]" : ""} />
                      <span className="font-bold">Broadcast All</span>
                    </div>
                    <p className="text-[10px] text-[#71717A] mt-1">Send to all active customers & staff</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType("user")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      targetType === "user"
                        ? "bg-[#8B5CF6]/15 border-[#8B5CF6] text-white"
                        : "bg-[#09090B] border-[#27272A] text-[#A1A1AA]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Radio size={14} className={targetType === "user" ? "text-[#8B5CF6]" : ""} />
                      <span className="font-bold">Targeted User</span>
                    </div>
                    <p className="text-[10px] text-[#71717A] mt-1">Send to a single customer ID</p>
                  </button>
                </div>
              </div>

              {/* Target User ID (if single user) */}
              {targetType === "user" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#A1A1AA]">Recipient User ID (UUID) *</label>
                  <input
                    type="text"
                    required
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-[#FAFAFA] font-mono focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              )}

              {/* Category / Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#A1A1AA]">Notification Type</label>
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-[#FAFAFA] font-bold focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="GENERAL">General Notice</option>
                  <option value="PROMO">Promotional / Discount Alert</option>
                  <option value="ORDER">Order Status Update</option>
                  <option value="SYSTEM">System Maintenance / Operational Alert</option>
                </select>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#A1A1AA]">Notification Title *</label>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="e.g. Weekend Flash Sale on Door Fittings"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-[#FAFAFA] font-bold focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {/* Message */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#A1A1AA]">Message Content *</label>
                <textarea
                  required
                  rows={3}
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Enter the notification message body..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] resize-none"
                />
              </div>

              {/* Optional JSON Payload */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#A1A1AA] flex items-center justify-between">
                  <span>Custom Metadata Payload (Optional JSON)</span>
                  <span className="text-[10px] text-[#71717A]">e.g. {`{"discount": 15}`}</span>
                </label>
                <input
                  type="text"
                  value={notifDataJson}
                  onChange={(e) => setNotifDataJson(e.target.value)}
                  placeholder='{"promoCode": "FLASH15", "orderId": "..."}'
                  className="w-full px-3.5 py-2 rounded-xl bg-[#09090B] border border-[#27272A] text-[#FAFAFA] font-mono focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-[#27272A] flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setIsSendModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-5 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold transition-all shadow-md shadow-[#8B5CF6]/30 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Emitting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Dispatch Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: PAYLOAD INSPECTOR ─── */}
      {inspectingNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#18181B] border border-[#27272A] rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col font-sans">
            <div className="p-4 bg-[#09090B] border-b border-[#27272A] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#FAFAFA] flex items-center gap-2">
                <Info size={14} className="text-[#8B5CF6]" />
                <span>Notification Event Payload</span>
              </h3>
              <button
                type="button"
                onClick={() => setInspectingNotif(null)}
                className="p-1 text-[#71717A] hover:text-[#FAFAFA] rounded-lg"
              >
                <X size={15} />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs overflow-y-auto max-h-96 font-mono">
              <div className="space-y-1 text-[#A1A1AA]">
                <p><strong>ID:</strong> {inspectingNotif.id}</p>
                <p><strong>Type:</strong> {inspectingNotif.type}</p>
                <p><strong>Title:</strong> {inspectingNotif.title}</p>
                <p><strong>Created:</strong> {inspectingNotif.createdAt}</p>
              </div>
              <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A]">
                <span className="text-[10px] text-[#71717A] block mb-1">DATA PAYLOAD</span>
                <pre className="text-emerald-400 text-[11px] overflow-x-auto">
                  {JSON.stringify(inspectingNotif.data || {}, null, 2)}
                </pre>
              </div>
            </div>
            <div className="p-3 bg-[#09090B] border-t border-[#27272A] text-right">
              <button
                type="button"
                onClick={() => setInspectingNotif(null)}
                className="px-4 py-1.5 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
