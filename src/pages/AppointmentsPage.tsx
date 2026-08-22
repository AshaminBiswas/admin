import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  MapPin,
  User,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Edit3,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wrench,
  ShieldAlert,
  Phone,
  Mail,
  FileText,
  Trash2,
  Eye,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Layers,
  Sparkles,
  Check,
  ArrowRight,
} from "lucide-react";
import {
  adminAppointmentService,
  AdminAppointmentItem,
  AdminCreateServicePayload,
} from "../api/adminAppointmentService";
import { AsyncActionButton } from "../components/common/AsyncActionButton";
import { useDebounce } from "../hooks/useDebounce";

/* ─── Skeleton Loading Body for Appointments Page ────────────────────────────── */

export function AppointmentsPageSkeleton() {
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
          <div className="h-9 w-40 bg-[#27272A] rounded-tr-xl rounded-bl-xl"></div>
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
        <div className="h-8 w-60 bg-[#27272A] rounded-tr-lg rounded-bl-lg"></div>
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
                <div className="h-2.5 w-20 bg-[#27272A] rounded"></div>
              </div>
              <div className="space-y-1.5 w-44">
                <div className="h-4 w-36 bg-[#27272A] rounded"></div>
                <div className="h-2.5 w-24 bg-[#27272A] rounded"></div>
              </div>
              <div className="h-4 w-28 bg-[#27272A] rounded"></div>
              <div className="h-4 w-24 bg-[#27272A] rounded"></div>
              <div className="h-5 w-24 bg-[#27272A] rounded-full"></div>
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

/* ─── Main Appointments Page Component ───────────────────────────────────────── */

export function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<"BOOKINGS" | "SERVICES">("BOOKINGS");

  // Bookings State
  const [appointments, setAppointments] = useState<AdminAppointmentItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState<boolean>(false);
  const [errorBookings, setErrorBookings] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Services State
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);

  // Detail / Inspect / Edit Drawer State
  const [selectedApt, setSelectedApt] = useState<AdminAppointmentItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [isEditingApt, setIsEditingApt] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<Partial<AdminAppointmentItem>>({});
  const [savingApt, setSavingApt] = useState<boolean>(false);

  // Status Change State
  const [newStatus, setNewStatus] = useState<string>("CONFIRMED");
  const [statusComment, setStatusComment] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  // Create Appointment Modal State
  const [showCreateAptModal, setShowCreateAptModal] = useState<boolean>(false);
  const [createAptForm, setCreateAptForm] = useState<Partial<AdminAppointmentItem>>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    serviceId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "10:00",
    endTime: "10:30",
    status: "CONFIRMED",
    notes: "",
  });
  const [creatingApt, setCreatingApt] = useState<boolean>(false);

  // Service Modal State (Create / Edit)
  const [showServiceModal, setShowServiceModal] = useState<boolean>(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState<AdminCreateServicePayload>({
    name: "",
    description: "",
    durationMinutes: 30,
    bufferMinutes: 15,
    maxParallelBookings: 1,
    price: 0,
    isPaid: false,
    isActive: true,
  });
  const [savingService, setSavingService] = useState<boolean>(false);

  // Delete Confirmation State
  const [itemToDelete, setItemToDelete] = useState<{ type: "APPOINTMENT" | "SERVICE"; id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // 1. Fetch Appointments
  const fetchAppointments = useCallback(async () => {
    setLoadingBookings(true);
    setErrorBookings("");
    try {
      const res = await adminAppointmentService.listAppointments({
        page,
        limit,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        serviceId: selectedServiceId !== "ALL" ? selectedServiceId : undefined,
        search: debouncedSearch.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (res && res.success !== false) {
        const itemsData = Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.items || (res.data as any)?.appointments || (Array.isArray(res) ? res : []);
        const meta = (res.data as any)?.meta || (res as any)?.meta || {};

        if (itemsData.length > 0) {
          setAppointments(itemsData);
          setTotalPages(meta.totalPages || Math.ceil((meta.total || itemsData.length || 1) / limit) || 1);
        }
      }
    } catch (err: any) {
      console.warn("[Fetch Admin Appointments Error]:", err);
    } finally {
      setLoadingBookings(false);
    }
  }, [page, limit, statusFilter, selectedServiceId, debouncedSearch, startDate, endDate]);

  // 2. Fetch Services
  const fetchServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const res = await adminAppointmentService.listServices();
      if (res && res.success !== false) {
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.items || (res.data as any)?.services || (Array.isArray(res) ? res : []);
        setServices(list || []);
      }
    } catch (err) {
      console.error("[Fetch Services Error]:", err);
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // 3. Compute KPI metrics
  const metrics = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter((a) => a.status === "PENDING").length;
    const confirmed = appointments.filter((a) => a.status === "CONFIRMED").length;
    const completed = appointments.filter((a) => a.status === "COMPLETED").length;
    const cancelled = appointments.filter((a) => a.status === "CANCELLED").length;
    return { total, pending, confirmed, completed, cancelled };
  }, [appointments]);

  // 4. Open Detail Drawer
  const handleOpenDetail = async (apt: AdminAppointmentItem) => {
    setSelectedApt(apt);
    setNewStatus(apt.status);
    setStatusComment(apt.comment || "");
    setEditForm({ ...apt });
    setIsEditingApt(false);
    setIsDetailOpen(true);
  };

  // 5. Update Status
  const handleUpdateStatus = async () => {
    if (!selectedApt) return;
    setUpdatingStatus(true);
    try {
      const res = await adminAppointmentService.updateAppointmentStatus(selectedApt.id, {
        status: newStatus,
        comment: statusComment,
      });
      setSuccessMsg(`Appointment status updated to ${newStatus}`);
      setSelectedApt((prev) => (prev ? { ...prev, status: newStatus as any, comment: statusComment } : null));
      setAppointments((prev) =>
        prev.map((a) => (a.id === selectedApt.id ? { ...a, status: newStatus as any, comment: statusComment } : a))
      );
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to update appointment status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 6. Save Edited Appointment Details
  const handleSaveAptDetails = async () => {
    if (!selectedApt) return;
    setSavingApt(true);
    try {
      await adminAppointmentService.updateAppointment(selectedApt.id, editForm);
      setSuccessMsg("Appointment updated successfully");
      setSelectedApt((prev) => (prev ? { ...prev, ...editForm } : null));
      setAppointments((prev) => prev.map((a) => (a.id === selectedApt.id ? { ...a, ...editForm } : a)));
      setIsEditingApt(false);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to save appointment changes");
    } finally {
      setSavingApt(false);
    }
  };

  // 7. Create New Appointment
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createAptForm.customerName || !createAptForm.customerEmail || !createAptForm.serviceId) {
      alert("Please fill in customer name, email, and select a service.");
      return;
    }
    setCreatingApt(true);
    try {
      await adminAppointmentService.createAppointment(createAptForm);
      setSuccessMsg("New appointment scheduled successfully!");
      setShowCreateAptModal(false);
      setCreateAptForm({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        serviceId: "",
        date: new Date().toISOString().split("T")[0],
        startTime: "10:00",
        endTime: "10:30",
        status: "CONFIRMED",
        notes: "",
      });
      await fetchAppointments();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to create appointment");
    } finally {
      setCreatingApt(false);
    }
  };

  // 8. Create or Update Service
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingService(true);
    try {
      if (editingServiceId) {
        await adminAppointmentService.updateService(editingServiceId, serviceForm);
        setSuccessMsg("Service updated successfully!");
      } else {
        await adminAppointmentService.createService(serviceForm);
        setSuccessMsg("New service created successfully!");
      }
      setShowServiceModal(false);
      setEditingServiceId(null);
      setServiceForm({
        name: "",
        description: "",
        durationMinutes: 30,
        bufferMinutes: 15,
        maxParallelBookings: 1,
        price: 0,
        isPaid: false,
        isActive: true,
      });
      await fetchServices();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to save service");
    } finally {
      setSavingService(false);
    }
  };

  // 9. Execute Deletion
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      if (itemToDelete.type === "APPOINTMENT") {
        await adminAppointmentService.deleteAppointment(itemToDelete.id);
        setAppointments((prev) => prev.filter((a) => a.id !== itemToDelete.id));
        if (selectedApt?.id === itemToDelete.id) {
          setIsDetailOpen(false);
          setSelectedApt(null);
        }
        setSuccessMsg(`Appointment "${itemToDelete.name}" deleted successfully.`);
      } else {
        await adminAppointmentService.deleteService(itemToDelete.id);
        setServices((prev) => prev.filter((s) => s.id !== itemToDelete.id));
        setSuccessMsg(`Service "${itemToDelete.name}" deleted successfully.`);
      }
      setItemToDelete(null);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(err.message || `Failed to delete ${itemToDelete.type.toLowerCase()}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loadingBookings && appointments.length === 0) {
    return <AppointmentsPageSkeleton />;
  }

  return (
    <div className="space-y-6 text-[#FAFAFA] max-w-[1600px] mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ─── Top Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[#A855F7]">
            <Calendar size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#FAFAFA]">
                Commercial Consultation & Appointments Hub
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-[#A855F7] border border-purple-500/30">
                PRC BOOKINGS
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA]">
              Manage hardware consultations, on-site measurements, architecture review sessions, and service catalog.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "BOOKINGS" ? (
            <button
              type="button"
              onClick={() => setShowCreateAptModal(true)}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-xs px-4 py-2 rounded-tr-xl rounded-bl-xl transition-all shadow-sm flex items-center gap-2"
            >
              <Plus size={15} />
              <span>Book Appointment</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingServiceId(null);
                setServiceForm({
                  name: "",
                  description: "",
                  durationMinutes: 30,
                  bufferMinutes: 15,
                  maxParallelBookings: 1,
                  price: 0,
                  isPaid: false,
                  isActive: true,
                });
                setShowServiceModal(true);
              }}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-xs px-4 py-2 rounded-tr-xl rounded-bl-xl transition-all shadow-sm flex items-center gap-2"
            >
              <Plus size={15} />
              <span>New Service Offering</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              fetchAppointments();
              fetchServices();
            }}
            className="p-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-tr-lg rounded-bl-lg text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#3F3F46] transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loadingBookings || loadingServices ? "animate-spin text-[#A855F7]" : ""} />
          </button>
        </div>
      </div>

      {/* ─── Navigation Switcher (Bookings vs Services) ─── */}
      <div className="flex items-center gap-2 border-b border-[#27272A] pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("BOOKINGS")}
          className={`px-4 py-2 text-xs font-bold rounded-tr-xl rounded-bl-xl transition-all flex items-center gap-2 ${
            activeTab === "BOOKINGS"
              ? "bg-[#8B5CF6] text-white shadow"
              : "bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#27272A]"
          }`}
        >
          <Calendar size={14} />
          <span>Client Bookings ({metrics.total})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("SERVICES")}
          className={`px-4 py-2 text-xs font-bold rounded-tr-xl rounded-bl-xl transition-all flex items-center gap-2 ${
            activeTab === "SERVICES"
              ? "bg-[#8B5CF6] text-white shadow"
              : "bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#27272A]"
          }`}
        >
          <Wrench size={14} />
          <span>Service Catalog ({services.length})</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorBookings && (
        <div className="p-4 bg-rose-950/80 border border-rose-500/40 text-rose-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorBookings}</span>
        </div>
      )}

      {/* ─── TAB 1: BOOKINGS LIST & CRUD ─── */}
      {activeTab === "BOOKINGS" && (
        <div className="space-y-6">

          {/* 5 KPI Metric Cards (Interactive Filters) */}
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
                <Calendar size={14} className="text-[#A1A1AA] group-hover:text-[#FAFAFA]" />
              </div>
              <p className="text-xl font-black font-mono text-[#FAFAFA]">{metrics.total}</p>
              <span className="text-[10px] text-[#71717A] block">All appointments</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("PENDING")}
              className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
                statusFilter === "PENDING"
                  ? "border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500"
                  : "border-[#27272A] hover:border-amber-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Pending</span>
                <Clock size={14} className="text-amber-400" />
              </div>
              <p className="text-xl font-black font-mono text-amber-400">{metrics.pending}</p>
              <span className="text-[10px] text-[#71717A] block">Needs confirmation</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("CONFIRMED")}
              className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
                statusFilter === "CONFIRMED"
                  ? "border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500"
                  : "border-[#27272A] hover:border-blue-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Confirmed</span>
                <CheckCircle2 size={14} className="text-blue-400" />
              </div>
              <p className="text-xl font-black font-mono text-blue-400">{metrics.confirmed}</p>
              <span className="text-[10px] text-[#71717A] block">Scheduled on calendar</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("COMPLETED")}
              className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
                statusFilter === "COMPLETED"
                  ? "border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500"
                  : "border-[#27272A] hover:border-emerald-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Completed</span>
                <CheckCircle2 size={14} className="text-emerald-400" />
              </div>
              <p className="text-xl font-black font-mono text-emerald-400">{metrics.completed}</p>
              <span className="text-[10px] text-[#71717A] block">Consultation delivered</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("CANCELLED")}
              className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
                statusFilter === "CANCELLED"
                  ? "border-rose-500 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500"
                  : "border-[#27272A] hover:border-rose-500/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Cancelled</span>
                <X size={14} className="text-rose-400" />
              </div>
              <p className="text-xl font-black font-mono text-rose-400">{metrics.cancelled}</p>
              <span className="text-[10px] text-[#71717A] block">Voided sessions</span>
            </button>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Status Tabs */}
              <div className="flex flex-wrap gap-1 bg-[#09090B] p-1 rounded-xl border border-[#27272A]">
                {[
                  { id: "ALL", label: "All Statuses" },
                  { id: "PENDING", label: "Pending" },
                  { id: "CONFIRMED", label: "Confirmed" },
                  { id: "COMPLETED", label: "Completed" },
                  { id: "CANCELLED", label: "Cancelled" },
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

              {/* Service Dropdown Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#A1A1AA]">Service:</span>
                <select
                  value={selectedServiceId}
                  onChange={(e) => {
                    setSelectedServiceId(e.target.value);
                    setPage(1);
                  }}
                  className="bg-[#09090B] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="ALL">All Services</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
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
                  className="bg-[#09090B] border border-[#27272A] rounded-lg px-2 py-1 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
                <span className="text-[#A1A1AA]">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-[#09090B] border border-[#27272A] rounded-lg px-2 py-1 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-bold"
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
                placeholder="Search by Customer Name, Email, Phone, or Booking Tracking ID..."
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

          {/* Main Bookings Table */}
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#09090B] text-[#A1A1AA] border-b border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Client & Contact</th>
                    <th className="py-3.5 px-4">Service Required</th>
                    <th className="py-3.5 px-4">Date & Time Slot</th>
                    <th className="py-3.5 px-3 text-center">Status</th>
                    <th className="py-3.5 px-4">Notes / Requirements</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-[#71717A]">
                        <Calendar size={32} className="mx-auto mb-2 text-[#3F3F46]" />
                        No appointment bookings found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    appointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-[#27272A]/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-[#FAFAFA]">{apt.customerName}</p>
                          <div className="flex flex-col text-[11px] text-[#A1A1AA] space-y-0.5 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail size={11} className="text-[#71717A]" />
                              {apt.customerEmail}
                            </span>
                            {apt.customerPhone && (
                              <span className="flex items-center gap-1 font-mono">
                                <Phone size={11} className="text-[#71717A]" />
                                {apt.customerPhone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-[#FAFAFA] block">{apt.service?.name || apt.serviceName || "Consultation"}</span>
                          {apt.service?.durationMinutes && (
                            <span className="text-[10px] text-[#71717A] flex items-center gap-1">
                              <Clock size={10} />
                              {apt.service.durationMinutes} mins
                              {apt.service.price > 0 && ` • ₹${apt.service.price}`}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-[#FAFAFA] font-bold">
                            <Calendar size={13} className="text-[#A855F7]" />
                            <span>{new Date(apt.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                          </div>
                          <div className="text-[11px] text-[#A1A1AA] flex items-center gap-1 mt-0.5 font-mono">
                            <Clock size={11} className="text-[#71717A]" />
                            <span>{apt.startTime} {apt.endTime ? `- ${apt.endTime}` : ""}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                              apt.status === "CONFIRMED"
                                ? "bg-blue-950/80 text-blue-400 border border-blue-500/40"
                                : apt.status === "COMPLETED"
                                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                                : apt.status === "CANCELLED"
                                ? "bg-rose-950/80 text-rose-400 border border-rose-500/40"
                                : "bg-amber-950/80 text-amber-400 border border-amber-500/40"
                            }`}
                          >
                            {apt.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="text-[11px] text-[#A1A1AA] max-w-xs truncate">
                            {apt.notes || apt.comment || "No special notes."}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(apt)}
                              className="px-2.5 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] rounded-lg font-bold flex items-center gap-1 transition-colors text-xs"
                              title="Inspect & Manage Appointment"
                            >
                              <Eye size={13} />
                              <span>Inspect</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemToDelete({ type: "APPOINTMENT", id: apt.id, name: `${apt.customerName} (${apt.date})` })}
                              className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/30 rounded-lg transition-colors"
                              title="Delete Appointment"
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
                Showing page <strong className="text-[#FAFAFA]">{page}</strong> of <strong className="text-[#FAFAFA]">{totalPages}</strong>
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

        </div>
      )}

      {/* ─── TAB 2: SERVICE CATALOG & OFFERINGS ─── */}
      {activeTab === "SERVICES" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#FAFAFA]">Active Consultation Services</h2>
              <p className="text-xs text-[#A1A1AA]">Configure offerings available for customer online bookings.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingServiceId(null);
                setServiceForm({
                  name: "",
                  description: "",
                  durationMinutes: 30,
                  bufferMinutes: 15,
                  maxParallelBookings: 1,
                  price: 0,
                  isPaid: false,
                  isActive: true,
                });
                setShowServiceModal(true);
              }}
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow"
            >
              <Plus size={14} />
              <span>Add New Service</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="p-5 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-4 hover:border-[#3F3F46] transition-all shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-sm text-[#FAFAFA]">{svc.name}</h3>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        svc.isActive !== false
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}
                    >
                      {svc.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-xs text-[#A1A1AA] line-clamp-2">
                    {svc.description || "No description provided."}
                  </p>
                </div>

                <div className="bg-[#09090B] p-3 rounded-xl border border-[#27272A] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#71717A] block">Duration</span>
                    <span className="font-bold text-[#FAFAFA] flex items-center gap-1">
                      <Clock size={11} /> {svc.durationMinutes} mins
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#71717A] block">Fee</span>
                    <span className="font-mono font-bold text-[#FAFAFA]">
                      {svc.price > 0 ? `₹${svc.price}` : "Free"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#27272A] text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingServiceId(svc.id);
                      setServiceForm({
                        name: svc.name,
                        description: svc.description || "",
                        durationMinutes: svc.durationMinutes || 30,
                        bufferMinutes: svc.bufferMinutes || 15,
                        maxParallelBookings: svc.maxParallelBookings || 1,
                        price: svc.price || 0,
                        isPaid: !!svc.isPaid,
                        isActive: svc.isActive !== false,
                      });
                      setShowServiceModal(true);
                    }}
                    className="text-[#8B5CF6] hover:text-[#A855F7] font-bold flex items-center gap-1"
                  >
                    <Edit3 size={13} />
                    <span>Edit Service</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setItemToDelete({ type: "SERVICE", id: svc.id, name: svc.name })}
                    className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: CREATE NEW APPOINTMENT MODAL ─── */}
      {showCreateAptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center gap-2">
                <Calendar size={16} className="text-[#8B5CF6]" />
                <span>Schedule New Appointment</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateAptModal(false)}
                className="text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createAptForm.customerName}
                    onChange={(e) => setCreateAptForm({ ...createAptForm, customerName: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Customer Email *</label>
                  <input
                    type="email"
                    required
                    value={createAptForm.customerEmail}
                    onChange={(e) => setCreateAptForm({ ...createAptForm, customerEmail: e.target.value })}
                    placeholder="rahul@example.com"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Phone Number</label>
                  <input
                    type="text"
                    value={createAptForm.customerPhone}
                    onChange={(e) => setCreateAptForm({ ...createAptForm, customerPhone: e.target.value })}
                    placeholder="+91 9876543210"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Service Type *</label>
                  <select
                    required
                    value={createAptForm.serviceId}
                    onChange={(e) => setCreateAptForm({ ...createAptForm, serviceId: e.target.value })}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  >
                    <option value="">-- Select Service --</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.durationMinutes}m)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Date *</label>
                  <input
                    type="date"
                    required
                    value={createAptForm.date}
                    onChange={(e) => setCreateAptForm({ ...createAptForm, date: e.target.value })}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={createAptForm.startTime}
                    onChange={(e) => setCreateAptForm({ ...createAptForm, startTime: e.target.value })}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">End Time</label>
                  <input
                    type="time"
                    value={createAptForm.endTime}
                    onChange={(e) => setCreateAptForm({ ...createAptForm, endTime: e.target.value })}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA] font-semibold">Consultation Notes / Scope</label>
                <textarea
                  rows={3}
                  value={createAptForm.notes}
                  onChange={(e) => setCreateAptForm({ ...createAptForm, notes: e.target.value })}
                  placeholder="Architectural specs, door hardware requirements, site visit notes..."
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl p-3 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setShowCreateAptModal(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-[#FAFAFA] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingApt}
                  className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white rounded-xl font-bold shadow"
                >
                  {creatingApt ? "Booking..." : "Schedule Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DRAWER: APPOINTMENT DETAIL & EDIT DRAWER ─── */}
      {isDetailOpen && selectedApt && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border-l border-[#27272A] w-full max-w-xl h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto">
            <div className="space-y-6">

              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-[#27272A] pb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#A855F7] tracking-wider">
                    Appointment Details
                  </span>
                  <h2 className="text-lg font-bold text-[#FAFAFA]">{selectedApt.customerName}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 rounded-lg bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status Update Quick Bar */}
              <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-3">
                <span className="text-[10px] uppercase font-bold text-[#A1A1AA]">Update Booking Status</span>
                <div className="flex flex-wrap gap-2">
                  {["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        newStatus === st
                          ? st === "CONFIRMED"
                            ? "bg-blue-600 text-white shadow"
                            : st === "COMPLETED"
                            ? "bg-emerald-600 text-white shadow"
                            : st === "CANCELLED"
                            ? "bg-rose-600 text-white shadow"
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
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="Optional admin comment on this status update..."
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

              {/* Client & Service Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Client Email</span>
                  <p className="font-bold text-[#FAFAFA] break-all">{selectedApt.customerEmail}</p>
                </div>
                <div className="p-3.5 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Client Phone</span>
                  <p className="font-bold font-mono text-[#FAFAFA]">{selectedApt.customerPhone || "N/A"}</p>
                </div>
                <div className="p-3.5 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Scheduled Date</span>
                  <p className="font-bold text-[#FAFAFA]">{new Date(selectedApt.date).toLocaleDateString("en-IN")}</p>
                </div>
                <div className="p-3.5 bg-[#09090B] rounded-xl border border-[#27272A] space-y-1">
                  <span className="text-[10px] text-[#71717A] uppercase font-bold">Time Window</span>
                  <p className="font-bold font-mono text-[#FAFAFA]">{selectedApt.startTime} - {selectedApt.endTime || "TBD"}</p>
                </div>
              </div>

              {/* Consultation Notes */}
              <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-[#A1A1AA]">Notes & Requirements</span>
                <p className="text-[#A1A1AA] whitespace-pre-wrap leading-relaxed">
                  {selectedApt.notes || "No notes provided for this consultation."}
                </p>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="flex items-center justify-between border-t border-[#27272A] pt-4 mt-6">
              <button
                type="button"
                onClick={() => setItemToDelete({ type: "APPOINTMENT", id: selectedApt.id, name: selectedApt.customerName })}
                className="px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={13} />
                <span>Delete Appointment</span>
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

      {/* ─── MODAL 2: SERVICE OFFERING MODAL (CREATE / EDIT) ─── */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <h3 className="font-bold text-sm text-[#FAFAFA] flex items-center gap-2">
                <Wrench size={16} className="text-[#8B5CF6]" />
                <span>{editingServiceId ? "Edit Service Offering" : "Create New Service"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA] font-semibold">Service Name *</label>
                <input
                  type="text"
                  required
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="e.g. On-Site Hardware Audit"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-[#A1A1AA] font-semibold">Description</label>
                <textarea
                  rows={2}
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="Description of the consultation scope..."
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-xl p-2.5 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={10}
                    value={serviceForm.durationMinutes}
                    onChange={(e) => setServiceForm({ ...serviceForm, durationMinutes: Number(e.target.value) })}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#A1A1AA] font-semibold">Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })}
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2 text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={serviceForm.isActive}
                  onChange={(e) => setServiceForm({ ...serviceForm, isActive: e.target.checked })}
                  className="rounded border-[#27272A] bg-[#09090B] text-[#8B5CF6] focus:ring-0"
                />
                <label htmlFor="isActive" className="text-xs text-[#FAFAFA] cursor-pointer">
                  Active & Available for Public Booking
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-4 py-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-[#FAFAFA] font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingService}
                  className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white rounded-xl font-bold shadow"
                >
                  {savingService ? "Saving..." : "Save Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: DELETE CONFIRMATION MODAL ─── */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181B] border border-rose-500/40 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
              <Trash2 size={24} />
            </div>
            <h3 className="font-bold text-sm text-[#FAFAFA]">
              Delete {itemToDelete.type === "APPOINTMENT" ? "Appointment" : "Service"}?
            </h3>
            <p className="text-xs text-[#A1A1AA]">
              Are you sure you want to permanently delete <strong>{itemToDelete.name}</strong>? This action cannot be undone.
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
