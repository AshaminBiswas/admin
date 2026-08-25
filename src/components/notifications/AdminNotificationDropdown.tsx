import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Bell,
  CheckCheck,
  Check,
  Package,
  ShoppingBag,
  AlertTriangle,
  FileText,
  Clock,
  ExternalLink,
  Sparkles,
  RefreshCw,
  X,
  Sliders,
} from "lucide-react";
import { notificationsApi, AdminNotificationItem, API_BASE_URL, getAdminToken } from "../../api/adminApi";

interface AdminNotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
  onNavigateToView?: (view: any) => void;
}

export function AdminNotificationDropdown({
  isOpen,
  onClose,
  onUnreadCountChange,
  onNavigateToView,
}: AdminNotificationDropdownProps) {
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [sseConnected, setSseConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Helper for relative timestamps
  const getRelativeTime = (dateString: string) => {
    try {
      const now = new Date();
      const past = new Date(dateString);
      const diffSec = Math.floor((now.getTime() - past.getTime()) / 1000);

      if (diffSec < 60) return "Just now";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return "Recently";
    }
  };

  // Helper for type icons and colors
  const getNotificationIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("ORDER")) {
      return {
        icon: <ShoppingBag size={14} />,
        bgColor: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
      };
    }
    if (t.includes("STOCK") || t.includes("INVENTORY") || t.includes("ALERT")) {
      return {
        icon: <AlertTriangle size={14} />,
        bgColor: "bg-rose-500/15 border-rose-500/30 text-rose-400",
      };
    }
    if (t.includes("QUOTE")) {
      return {
        icon: <FileText size={14} />,
        bgColor: "bg-purple-500/15 border-purple-500/30 text-[#A855F7]",
      };
    }
    return {
      icon: <Bell size={14} />,
      bgColor: "bg-amber-500/15 border-amber-500/30 text-amber-400",
    };
  };

  // Load Notifications from Backend
  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await notificationsApi.list({ page: 1, limit: 30 });
      if (res && res.success !== false) {
        const items: AdminNotificationItem[] = Array.isArray(res.data) ? res.data : res.data?.items || [];
        const count = res.unreadCount ?? res.data?.unreadCount ?? items.filter((n) => !n.isRead).length;

        setNotifications(items);
        setUnreadCount(count);
        if (onUnreadCountChange) onUnreadCountChange(count);
      }
    } catch (err: any) {
      console.error("[Notifications Load Error]:", err);
    } finally {
      setIsLoading(false);
    }
  }, [onUnreadCountChange]);

  // Initial load
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Real-time Server-Sent Events (SSE) Listener
  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setSseConnected(false);
      return;
    }

    const sseUrl = `${API_BASE_URL}/events/stream?token=${encodeURIComponent(token)}`;

    try {
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener("connected", () => {
        setSseConnected(true);
      });

      // Handle generic or broadcast notification
      const handleIncomingNotification = (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          const newNotif: AdminNotificationItem = {
            id: payload.id || `sse-${Date.now()}`,
            type: payload.type || "SYSTEM",
            title: payload.title || "New Event",
            message: payload.message || "",
            data: payload.data,
            isRead: false,
            createdAt: payload.timestamp || payload.createdAt || new Date().toISOString(),
          };

          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => {
            const nextCount = prev + 1;
            if (onUnreadCountChange) onUnreadCountChange(nextCount);
            return nextCount;
          });
        } catch (e: any) {
          console.error("[SSE Parse Error]:", e.message);
        }
      };

      es.addEventListener("notification:new", handleIncomingNotification);
      es.addEventListener("notification:broadcast", handleIncomingNotification);
      es.addEventListener("order:new", handleIncomingNotification);
      es.addEventListener("quote:new", handleIncomingNotification);
      es.addEventListener("system:alert", handleIncomingNotification);

      es.onerror = () => {
        es.close();
        setSseConnected(false);
      };

      return () => {
        es.close();
        eventSourceRef.current = null;
      };
    } catch (err: any) {
      console.error("[SSE Setup Error]:", err);
    }
  }, [onUnreadCountChange]);

  // Mark single notification as read
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => {
        const next = Math.max(0, prev - 1);
        if (onUnreadCountChange) onUnreadCountChange(next);
        return next;
      });
    } catch (err: any) {
      console.error("[Mark Read Error]:", err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })));
      setUnreadCount(0);
      if (onUnreadCountChange) onUnreadCountChange(0);
    } catch (err: any) {
      console.error("[Mark All Read Error]:", err);
    }
  };

  // Handle clicking a notification item
  const handleNotificationClick = (notif: AdminNotificationItem) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif.id);
    }

    if (onNavigateToView) {
      const t = notif.type.toUpperCase();
      if (t.includes("ORDER")) onNavigateToView("orders");
      else if (t.includes("QUOTE")) onNavigateToView("quotes");
      else if (t.includes("STOCK") || t.includes("INVENTORY")) onNavigateToView("products");
      else if (t.includes("VARIANT")) onNavigateToView("variants");
    }
    onClose();
  };

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => (activeTab === "unread" ? !n.isRead : true));

  return (
    <div className="absolute right-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-96 max-w-[380px] bg-[#18181B] border border-[#27272A] rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col font-sans animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="p-3.5 bg-[#09090B] border-b border-[#27272A] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-[#A855F7] flex items-center justify-center border border-purple-500/30">
            <Bell size={14} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-[#FAFAFA]">Notifications</h4>
              {sseConnected && (
                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#71717A]">Real-time operational alerts</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="text-[10px] text-[#8B5CF6] hover:text-purple-300 font-bold px-2 py-1 rounded-lg hover:bg-[#27272A] transition-colors"
              title="Mark all as read"
            >
              Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={loadNotifications}
            className="p-1.5 text-[#71717A] hover:text-[#FAFAFA] rounded-lg hover:bg-[#27272A] transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin text-[#8B5CF6]" : ""} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#27272A] bg-[#18181B] px-3 pt-2 gap-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`pb-2 font-bold transition-all relative ${
            activeTab === "all" ? "text-[#FAFAFA]" : "text-[#71717A] hover:text-[#A1A1AA]"
          }`}
        >
          <span>All Alerts ({notifications.length})</span>
          {activeTab === "all" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B5CF6]" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("unread")}
          className={`pb-2 font-bold transition-all relative flex items-center gap-1 ${
            activeTab === "unread" ? "text-[#FAFAFA]" : "text-[#71717A] hover:text-[#A1A1AA]"
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="text-[9px] font-black px-1.5 py-0.2 bg-[#8B5CF6] text-white rounded-full">
              {unreadCount}
            </span>
          )}
          {activeTab === "unread" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B5CF6]" />}
        </button>
      </div>

      {/* Notification List Body */}
      <div className="max-h-80 overflow-y-auto divide-y divide-[#27272A]/70">
        {filteredNotifications.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#71717A] space-y-2">
            <Bell size={24} className="mx-auto text-[#3F3F46]" />
            <p className="font-bold text-xs text-[#FAFAFA]">No notifications</p>
            <p className="text-[11px] text-[#71717A]">
              {activeTab === "unread" ? "You're all caught up with alerts!" : "No operational activity recorded yet."}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const { icon, bgColor } = getNotificationIcon(n.type);
            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3 transition-colors cursor-pointer flex gap-3 group relative ${
                  n.isRead ? "hover:bg-[#27272A]/40" : "bg-[#27272A]/20 hover:bg-[#27272A]/50"
                }`}
              >
                {!n.isRead && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] absolute top-3.5 left-1.5 shadow-sm shadow-[#8B5CF6]" />
                )}

                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${bgColor}`}
                >
                  {icon}
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-xs truncate ${n.isRead ? "text-[#A1A1AA]" : "font-bold text-[#FAFAFA]"}`}>
                      {n.title}
                    </p>
                    <span className="text-[9px] text-[#71717A] flex-shrink-0 flex items-center gap-0.5">
                      <Clock size={10} />
                      <span>{getRelativeTime(n.createdAt)}</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-[#71717A] line-clamp-2 leading-relaxed">{n.message}</p>
                </div>

                {!n.isRead && (
                  <button
                    type="button"
                    onClick={(e) => handleMarkAsRead(n.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#71717A] hover:text-emerald-400 rounded transition-opacity"
                    title="Mark as read"
                  >
                    <Check size={13} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 bg-[#09090B] border-t border-[#27272A] text-center">
        <span className="text-[10px] text-[#71717A]">
          Connected to PRC EventBus Gateway
        </span>
      </div>
    </div>
  );
}
