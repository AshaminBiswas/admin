import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  HelpCircle,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  Search,
  RefreshCw,
  Building2,
  MessageSquare,
  AlertCircle,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  ShieldAlert,
  Plus,
  Trash2,
  Copy,
  Download,
  Send,
  User,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { enquiriesService, EnquiryItem } from "../api/enquiriesService";
import { AsyncActionButton } from "../components/common/AsyncActionButton";
import { useDebounce } from "../hooks/useDebounce";

/* ─── Skeleton Loading Body for Enquiries Page ───────────────────────────────── */

export function EnquiriesPageSkeleton() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-[#27272A]"></div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-64 bg-[#27272A] rounded"></div>
              <div className="h-4 w-28 bg-[#27272A] rounded-full"></div>
            </div>
            <div className="h-3 w-80 bg-[#27272A] rounded"></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-36 bg-[#27272A] rounded-tr-xl rounded-bl-xl"></div>
          <div className="h-9 w-9 bg-[#27272A] rounded-tr-lg rounded-bl-lg"></div>
        </div>
      </div>

      {/* 5 KPI Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-2">
            <div className="w-7 h-7 rounded-lg bg-[#27272A]"></div>
            <div className="h-5 w-12 bg-[#27272A] rounded"></div>
            <div className="h-2.5 w-20 bg-[#27272A] rounded"></div>
          </div>
        ))}
      </div>

      {/* Filter Tabs & Search Skeleton */}
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-24 bg-[#27272A] rounded-tr-lg rounded-bl-lg"></div>
          ))}
        </div>
        <div className="h-8 w-64 bg-[#27272A] rounded-tr-lg rounded-bl-lg"></div>
      </div>

      {/* Main Table Skeleton */}
      <div className="rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg">
        <div className="p-3.5 bg-[#09090B] border-b border-[#27272A] flex justify-between">
          <div className="h-3 w-40 bg-[#27272A] rounded"></div>
          <div className="h-3 w-20 bg-[#27272A] rounded"></div>
        </div>
        <div className="divide-y divide-[#27272A]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1.5 w-40">
                <div className="h-4 w-32 bg-[#27272A] rounded"></div>
                <div className="h-2.5 w-24 bg-[#27272A] rounded"></div>
              </div>
              <div className="space-y-1.5 w-44">
                <div className="h-4 w-36 bg-[#27272A] rounded"></div>
                <div className="h-2.5 w-28 bg-[#27272A] rounded"></div>
              </div>
              <div className="h-4 w-36 bg-[#27272A] rounded"></div>
              <div className="h-5 w-20 bg-[#27272A] rounded-full"></div>
              <div className="h-4 w-24 bg-[#27272A] rounded"></div>
              <div className="h-7 w-20 bg-[#27272A] rounded-lg"></div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-[#09090B] border-t border-[#27272A] flex items-center justify-between">
          <div className="h-3 w-36 bg-[#27272A] rounded"></div>
          <div className="flex gap-2">
            <div className="h-7 w-16 bg-[#27272A] rounded"></div>
            <div className="h-7 w-16 bg-[#27272A] rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Enquiries Page Component ──────────────────────────────────────────── */

export function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<EnquiryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Filter & Search state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Inspect / Detail Drawer state
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("NEW");
  const [adminNotes, setAdminNotes] = useState<string>("");

  // Create Enquiry Modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<Partial<EnquiryItem>>({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    subject: "",
    message: "",
    status: "NEW",
    adminNotes: "",
  });
  const [creating, setCreating] = useState<boolean>(false);

  // Delete Confirmation state
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // 1. Fetch Enquiries
  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await enquiriesService.listEnquiries({
        page,
        limit,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: debouncedSearch.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (res && res.success !== false) {
        const itemsData = Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.items || (res.data as any)?.enquiries || (Array.isArray(res) ? res : []);
        const meta = (res.data as any)?.meta || (res as any)?.meta || {};

        setEnquiries(itemsData || []);
        setTotalCount(meta.total || itemsData.length || 0);
        setTotalPages(meta.totalPages || Math.ceil((meta.total || itemsData.length || 1) / limit) || 1);
      } else {
        setError(res.message || res.error?.message || "Failed to fetch customer enquiries.");
      }
    } catch (err: any) {
      console.error("[Enquiries Fetch Error]:", err);
      setError(err.message || "An unexpected error occurred while fetching enquiries.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, debouncedSearch, startDate, endDate]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  // 2. Compute KPI Metrics
  const metrics = useMemo(() => {
    const total = enquiries.length;
    const newCount = enquiries.filter((e) => e.status === "NEW" || e.status === "OPEN").length;
    const inProgress = enquiries.filter((e) => e.status === "IN_PROGRESS").length;
    const resolved = enquiries.filter((e) => e.status === "RESOLVED").length;
    const closed = enquiries.filter((e) => e.status === "CLOSED").length;
    return { total, newCount, inProgress, resolved, closed };
  }, [enquiries]);

  // 3. Open Detail Drawer
  const handleOpenDetail = (item: EnquiryItem) => {
    setSelectedEnquiry(item);
    setSelectedStatus(item.status);
    setAdminNotes(item.adminNotes || item.notes || "");
    setIsDetailOpen(true);
  };

  // 4. Update Status & Admin Notes
  const handleUpdateStatus = async () => {
    if (!selectedEnquiry) return;
    setUpdatingStatus(true);
    try {
      await enquiriesService.updateEnquiry(selectedEnquiry.id, {
        status: selectedStatus as any,
        adminNotes: adminNotes,
      });

      setSuccessMsg(`Enquiry updated to ${selectedStatus}`);
      setSelectedEnquiry((prev) => (prev ? { ...prev, status: selectedStatus as any, adminNotes } : null));
      setEnquiries((prev) =>
        prev.map((e) => (e.id === selectedEnquiry.id ? { ...e, status: selectedStatus as any, adminNotes } : e))
      );
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to update enquiry");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 5. Create Manual Enquiry
  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.subject || !createForm.message) {
      alert("Please fill in Name, Email, Subject, and Message.");
      return;
    }
    setCreating(true);
    try {
      await enquiriesService.createEnquiry(createForm);
      setSuccessMsg("Customer enquiry logged successfully!");
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        email: "",
        phone: "",
        companyName: "",
        subject: "",
        message: "",
        status: "NEW",
        adminNotes: "",
      });
      await fetchEnquiries();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to create enquiry");
    } finally {
      setCreating(false);
    }
  };

  // 6. Delete Enquiry
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await enquiriesService.deleteEnquiry(itemToDelete.id);
      setEnquiries((prev) => prev.filter((e) => e.id !== itemToDelete.id));
      if (selectedEnquiry?.id === itemToDelete.id) {
        setIsDetailOpen(false);
        setSelectedEnquiry(null);
      }
      setSuccessMsg(`Enquiry from "${itemToDelete.name}" deleted successfully.`);
      setItemToDelete(null);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to delete enquiry");
    } finally {
      setIsDeleting(false);
    }
  };

  // 7. Export Enquiries to CSV
  const handleExportCSV = async () => {
    if (enquiries.length === 0) return;
    const headers = ["ID", "Name", "Email", "Phone", "Company", "Subject", "Message", "Status", "Created At"];
    const rows = enquiries.map((e) => [
      `"${e.id}"`,
      `"${e.name || ""}"`,
      `"${e.email || ""}"`,
      `"${e.phone || ""}"`,
      `"${e.companyName || ""}"`,
      `"${(e.subject || "").replace(/"/g, '""')}"`,
      `"${(e.message || "").replace(/"/g, '""')}"`,
      `"${e.status || ""}"`,
      `"${e.createdAt ? new Date(e.createdAt).toISOString() : ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PRC_Enquiries_Export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && enquiries.length === 0) {
    return <EnquiriesPageSkeleton />;
  }

  return (
    <div className="space-y-6 text-[#FAFAFA] max-w-[1600px] mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ─── Top Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[#A855F7]">
            <MessageSquare size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#FAFAFA]">
                Customer Enquiries & Leads Console
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-[#A855F7] border border-purple-500/30">
                PRC SUPPORT
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA]">
              Review inbound questions, wholesale inquiries, product customization requests, and customer communications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-xs px-4 py-2 rounded-tr-xl rounded-bl-xl transition-all shadow-sm flex items-center gap-2"
          >
            <Plus size={15} />
            <span>Log Customer Lead</span>
          </button>

          <AsyncActionButton
            mode="download"
            onAction={handleExportCSV}
            idleIcon={<Download size={14} />}
            idleLabel="Export CSV"
            loadingLabel="Exporting…"
            successLabel="Exported!"
            className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold text-xs px-3.5 py-2 rounded-tr-xl rounded-bl-xl transition-all border border-[#3F3F46] flex items-center gap-1.5 shadow-sm"
            variant="custom"
          />

          <button
            type="button"
            onClick={fetchEnquiries}
            className="p-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-tr-lg rounded-bl-lg text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#3F3F46] transition-colors"
            title="Refresh Enquiries"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-[#A855F7]" : ""} />
          </button>
        </div>
      </div>

      {/* ─── 5 KPI Summary Cards (Interactive Filters) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            statusFilter === "ALL"
              ? "border-[#8B5CF6] shadow-lg shadow-[#8B5CF6]/10 ring-1 ring-[#8B5CF6]"
              : "border-[#27272A] hover:border-[#3F3F46]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider">Total</span>
            <MessageSquare size={14} className="text-[#A1A1AA] group-hover:text-[#FAFAFA]" />
          </div>
          <p className="text-xl font-black font-mono text-[#FAFAFA]">{metrics.total}</p>
          <span className="text-[10px] text-[#71717A] block">All received queries</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("NEW")}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            statusFilter === "NEW"
              ? "border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500"
              : "border-[#27272A] hover:border-amber-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">New / Open</span>
            <Clock size={14} className="text-amber-400" />
          </div>
          <p className="text-xl font-black font-mono text-amber-400">{metrics.newCount}</p>
          <span className="text-[10px] text-[#71717A] block">Requires initial reply</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("IN_PROGRESS")}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            statusFilter === "IN_PROGRESS"
              ? "border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500"
              : "border-[#27272A] hover:border-blue-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">In Progress</span>
            <HelpCircle size={14} className="text-blue-400" />
          </div>
          <p className="text-xl font-black font-mono text-blue-400">{metrics.inProgress}</p>
          <span className="text-[10px] text-[#71717A] block">Under investigation</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("RESOLVED")}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            statusFilter === "RESOLVED"
              ? "border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500"
              : "border-[#27272A] hover:border-emerald-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Resolved</span>
            <CheckCircle2 size={14} className="text-emerald-400" />
          </div>
          <p className="text-xl font-black font-mono text-emerald-400">{metrics.resolved}</p>
          <span className="text-[10px] text-[#71717A] block">Answered & fulfilled</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("CLOSED")}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            statusFilter === "CLOSED"
              ? "border-zinc-500 shadow-lg shadow-zinc-500/10 ring-1 ring-zinc-500"
              : "border-[#27272A] hover:border-zinc-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider">Closed</span>
            <X size={14} className="text-[#A1A1AA]" />
          </div>
          <p className="text-xl font-black font-mono text-[#A1A1AA]">{metrics.closed}</p>
          <span className="text-[10px] text-[#71717A] block">Archived inquiries</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-rose-950/80 border border-rose-500/40 text-rose-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Search & Filter Toolbar ─── */}
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] space-y-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 bg-[#09090B] p-1 rounded-xl border border-[#27272A]">
            {[
              { id: "ALL", label: "All Enquiries" },
              { id: "NEW", label: "New" },
              { id: "IN_PROGRESS", label: "In Progress" },
              { id: "RESOLVED", label: "Resolved" },
              { id: "CLOSED", label: "Closed" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === tab.id
                    ? "bg-[#8B5CF6] text-white shadow"
                    : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#A1A1AA] flex items-center gap-1">
              <Calendar size={13} /> From:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-[#09090B] border border-[#27272A] rounded-lg px-2.5 py-1 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            />
            <span className="text-[#A1A1AA]">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-[#09090B] border border-[#27272A] rounded-lg px-2.5 py-1 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-bold ml-1"
              >
                Clear Dates
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Customer Name, Email, Phone, Company, or Subject..."
            className="w-full pl-10 pr-9 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-xs text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Enquiries Table ─── */}
      <div className="rounded-2xl bg-[#18181B] border border-[#27272A] shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#09090B] text-[#A1A1AA] border-b border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Customer & Organization</th>
                <th className="py-3.5 px-4">Subject / Purpose</th>
                <th className="py-3.5 px-4">Message Snippet</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-4">Received Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {enquiries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#71717A]">
                    <MessageSquare size={32} className="mx-auto mb-2 text-[#3F3F46]" />
                    No customer enquiries found matching criteria.
                  </td>
                </tr>
              ) : (
                enquiries.map((item) => (
                  <tr key={item.id} className="hover:bg-[#27272A]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#FAFAFA]">{item.name}</p>
                      {item.companyName && (
                        <p className="text-[11px] text-[#A855F7] font-semibold flex items-center gap-1">
                          <Building2 size={11} /> {item.companyName}
                        </p>
                      )}
                      <div className="flex flex-col text-[11px] text-[#A1A1AA] space-y-0.5 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail size={11} className="text-[#71717A]" />
                          {item.email}
                        </span>
                        {item.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone size={11} className="text-[#71717A]" />
                            {item.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#FAFAFA] block max-w-xs">{item.subject}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-[11px] text-[#A1A1AA] max-w-xs line-clamp-2">
                        {item.message}
                      </p>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                          item.status === "RESOLVED"
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                            : item.status === "IN_PROGRESS"
                            ? "bg-blue-950/80 text-blue-400 border border-blue-500/40"
                            : item.status === "CLOSED"
                            ? "bg-zinc-800 text-zinc-400 border border-zinc-700"
                            : "bg-amber-950/80 text-amber-400 border border-amber-500/40"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[11px] text-[#FAFAFA] font-bold flex items-center gap-1">
                        <Clock size={11} className="text-[#71717A]" />
                        <span>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Recent"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          className="px-2.5 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] rounded-lg font-bold flex items-center gap-1 transition-colors text-xs"
                          title="Inspect Enquiry Details"
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete({ id: item.id, name: `${item.name} (${item.subject})` })}
                          className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/30 rounded-lg transition-colors"
                          title="Delete Enquiry"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-[#09090B] border-t border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-[#A1A1AA]">
            Showing page <strong className="text-[#FAFAFA]">{page}</strong> of <strong className="text-[#FAFAFA]">{totalPages}</strong> ({totalCount} total enquiries)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A] disabled:opacity-40 disabled:cursor-not-allowed border border-[#27272A] rounded-lg text-[#FAFAFA] font-bold"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 bg-[#18181B] hover:bg-[#27272A] disabled:opacity-40 disabled:cursor-not-allowed border border-[#27272A] rounded-lg text-[#FAFAFA] font-bold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL 1: CREATE / LOG ENQUIRY MODAL ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center gap-2">
                <MessageSquare size={16} className="text-[#8B5CF6]" />
                <span>Log Customer Lead / Enquiry</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateEnquiry} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Contact Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g. Vikram Mehta"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="vikram@construct.com"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Phone Number</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+91 9988776655"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Company / Firm Name</label>
                  <input
                    type="text"
                    value={createForm.companyName}
                    onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
                    placeholder="Mehta Builders Pvt Ltd"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA] font-semibold">Subject / Purpose *</label>
                <input
                  type="text"
                  required
                  value={createForm.subject}
                  onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
                  placeholder="Bulk Enquiry for SS 304 Door Hinges & Mortise Locks"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA] font-semibold">Customer Message *</label>
                <textarea
                  rows={3}
                  required
                  value={createForm.message}
                  onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                  placeholder="Details regarding hardware requirements, project volume, delivery timeline..."
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl p-3 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA] font-semibold">Internal Admin Notes</label>
                <textarea
                  rows={2}
                  value={createForm.adminNotes}
                  onChange={(e) => setCreateForm({ ...createForm, adminNotes: e.target.value })}
                  placeholder="Assigned sales manager, follow-up timeline..."
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl p-2.5 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-[#FAFAFA] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white rounded-xl font-bold shadow"
                >
                  {creating ? "Logging..." : "Create Enquiry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DRAWER: ENQUIRY DETAIL & RESPONSE DRAWER ─── */}
      {isDetailOpen && selectedEnquiry && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border-l border-[#27272A] w-full max-w-xl h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto">
            <div className="space-y-6">

              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#A855F7] tracking-wider">
                    Enquiry Details
                  </span>
                  <h2 className="text-lg font-bold text-[#FAFAFA]">{selectedEnquiry.subject}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 rounded-lg bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Quick Status Update Bar */}
              <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-3">
                <span className="text-[10px] uppercase font-bold text-[#A1A1AA]">Update Enquiry Status</span>
                <div className="flex flex-wrap gap-2">
                  {["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setSelectedStatus(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedStatus === st
                          ? st === "RESOLVED"
                            ? "bg-emerald-600 text-white shadow"
                            : st === "IN_PROGRESS"
                            ? "bg-blue-600 text-white shadow"
                            : st === "CLOSED"
                            ? "bg-zinc-600 text-white shadow"
                            : "bg-amber-600 text-white shadow"
                          : "bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#27272A]"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes or customer resolution message..."
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg p-2.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
                <button
                  type="button"
                  onClick={handleUpdateStatus}
                  disabled={updatingStatus}
                  className="w-full py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow"
                >
                  {updatingStatus ? "Saving Status..." : "Apply Status Update"}
                </button>
              </div>

              {/* Client Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#71717A] uppercase font-bold">Contact Name</span>
                  </div>
                  <p className="font-bold text-[#FAFAFA]">{selectedEnquiry.name}</p>
                </div>
                <div className="p-3.5 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Company</span>
                  <p className="font-bold text-[#FAFAFA]">{selectedEnquiry.companyName || "N/A"}</p>
                </div>
                <div className="p-3.5 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#71717A] uppercase font-bold">Email Address</span>
                    <AsyncActionButton
                      mode="copy"
                      onAction={() => navigator.clipboard.writeText(selectedEnquiry.email)}
                      idleIcon={<Copy size={11} />}
                      idleLabel="Copy"
                      successLabel="Copied"
                      className="text-[10px] text-[#8B5CF6] hover:text-[#A855F7] font-bold"
                      variant="custom"
                    />
                  </div>
                  <p className="font-bold text-[#FAFAFA] break-all">{selectedEnquiry.email}</p>
                </div>
                <div className="p-3.5 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#71717A] uppercase font-bold">Phone Number</span>
                    {selectedEnquiry.phone && (
                      <AsyncActionButton
                        mode="copy"
                        onAction={() => navigator.clipboard.writeText(selectedEnquiry.phone || "")}
                        idleIcon={<Copy size={11} />}
                        idleLabel="Copy"
                        successLabel="Copied"
                        className="text-[10px] text-[#8B5CF6] hover:text-[#A855F7] font-bold"
                        variant="custom"
                      />
                    )}
                  </div>
                  <p className="font-bold font-mono text-[#FAFAFA]">{selectedEnquiry.phone || "N/A"}</p>
                </div>
              </div>

              {/* Message Content */}
              <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-[#A1A1AA]">Full Inbound Message</span>
                <p className="text-[#FAFAFA] whitespace-pre-wrap leading-relaxed bg-[#18181B] p-3.5 rounded-lg border border-[#27272A]">
                  {selectedEnquiry.message}
                </p>
              </div>

              {/* Internal Notes History */}
              {selectedEnquiry.adminNotes && (
                <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-bold text-[#A855F7]">Internal Resolution Notes</span>
                  <p className="text-[#A1A1AA] whitespace-pre-wrap leading-relaxed">
                    {selectedEnquiry.adminNotes}
                  </p>
                </div>
              )}

            </div>

            {/* Drawer Footer Actions */}
            <div className="flex items-center justify-between border-t border-[#27272A] pt-4 mt-6">
              <button
                type="button"
                onClick={() => setItemToDelete({ id: selectedEnquiry.id, name: `${selectedEnquiry.name} (${selectedEnquiry.subject})` })}
                className="px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={13} />
                <span>Delete Enquiry</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-xs text-[#FAFAFA] font-bold"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: DELETE CONFIRMATION MODAL ─── */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-rose-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
              <Trash2 size={24} />
            </div>
            <h3 className="font-bold text-sm text-[#FAFAFA]">Delete Enquiry?</h3>
            <p className="text-xs text-[#A1A1AA]">
              Are you sure you want to delete enquiry from <strong>{itemToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-xs text-[#FAFAFA] font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
