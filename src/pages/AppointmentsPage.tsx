import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar, MapPin, User, Search, Filter, RefreshCw, Plus, Edit3, X,
  CheckCircle2, Clock, AlertCircle, Wrench, ShieldAlert, Phone, Mail, FileText
} from "lucide-react";
import {
  adminAppointmentService, AdminAppointmentItem, AdminCreateServicePayload
} from "../api/adminAppointmentService";

export function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<"BOOKINGS" | "SERVICES">("BOOKINGS");

  // Bookings State
  const [appointments, setAppointments] = useState<AdminAppointmentItem[]>([]);
  const [loadingBookings, setLoadingBookings] = useState<boolean>(true);
  const [errorBookings, setErrorBookings] = useState<string>("");

  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Selected Appointment Modal
  const [selectedApt, setSelectedApt] = useState<AdminAppointmentItem | null>(null);
  const [newStatus, setNewStatus] = useState<string>("CONFIRMED");
  const [statusComment, setStatusComment] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>("");

  // Services State
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState<boolean>(false);

  // Service Modal State
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

  // 1. Fetch Appointments
  const fetchAppointments = useCallback(async () => {
    setLoadingBookings(true);
    setErrorBookings("");
    try {
      const res = await adminAppointmentService.listAppointments({
        page,
        limit,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: searchTerm.trim() || undefined,
      });

      console.log("[Admin Appointments API Response]:", res);

      if (res && res.success !== false) {
        const itemsData = Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.items || (res.data as any)?.appointments || (Array.isArray(res) ? res : []);
        const meta = (res.data as any)?.meta || (res as any)?.meta || {};

        setAppointments(itemsData || []);
        setTotalPages(meta.totalPages || Math.ceil((meta.total || itemsData.length || 1) / limit) || 1);
      } else {
        setErrorBookings(res.message || res.error?.message || "Failed to fetch appointment bookings.");
      }
    } catch (err: any) {
      console.error("[Fetch Admin Appointments Error]:", err);
      setErrorBookings(err.message || "Failed to connect to appointments backend.");
    } finally {
      setLoadingBookings(false);
    }
  }, [page, limit, statusFilter, searchTerm]);

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
    if (activeTab === "BOOKINGS") {
      fetchAppointments();
    } else {
      fetchServices();
    }
  }, [activeTab, fetchAppointments, fetchServices]);

  // Handle Status Update
  const handleUpdateStatus = async () => {
    if (!selectedApt) return;
    setUpdatingStatus(true);
    setStatusMsg("");

    try {
      const res = await adminAppointmentService.updateAppointmentStatus(selectedApt.id, {
        status: newStatus,
        comment: statusComment.trim() || undefined,
      });

      if (res && res.success !== false) {
        setStatusMsg("Appointment status updated successfully!");
        fetchAppointments();
        setTimeout(() => setStatusMsg(""), 3000);
      } else {
        alert(res.message || res.error?.message || "Failed to update appointment status.");
      }
    } catch (err: any) {
      alert("Error updating status: " + (err.message || "Unknown error"));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Create / Edit Service Submit
  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name.trim()) return;

    setSavingService(true);
    try {
      if (editingServiceId) {
        await adminAppointmentService.updateService(editingServiceId, serviceForm);
      } else {
        await adminAppointmentService.createService(serviceForm);
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
      fetchServices();
    } catch (err: any) {
      alert("Failed to save service: " + (err.message || "Unknown error"));
    } finally {
      setSavingService(false);
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    switch ((status || "PENDING").toUpperCase()) {
      case "CONFIRMED":
        return "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40";
      case "COMPLETED":
        return "bg-blue-950/80 text-blue-400 border border-blue-500/40";
      case "CANCELLED":
        return "bg-red-950/80 text-red-400 border border-red-500/40";
      default:
        return "bg-amber-950/80 text-amber-400 border border-amber-500/40";
    }
  };

  return (
    <div className="space-y-6">

      {/* ═══════════════ TOP BANNER & TAB TOGGLE ═══════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#18181B] via-[#1F1929] to-[#18181B] border border-[#27272A] shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Wrench size={22} className="text-[#8B5CF6]" />
            <h1 className="text-2xl font-extrabold text-[#FAFAFA] tracking-tight">
              Hardware Service & Installation Schedule
            </h1>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            Track site inspections, door fitting alignments, digital lock repairs, and configure offered services.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 bg-[#09090B] p-1.5 rounded-xl border border-[#27272A]">
          <button
            onClick={() => setActiveTab("BOOKINGS")}
            className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "BOOKINGS"
                ? "bg-[#8B5CF6] text-white shadow-md"
                : "text-[#A1A1AA] hover:text-[#FAFAFA]"
            }`}
          >
            <Calendar size={14} /> Customer Bookings
          </button>
          <button
            onClick={() => setActiveTab("SERVICES")}
            className={`px-4 py-2 text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "SERVICES"
                ? "bg-[#8B5CF6] text-white shadow-md"
                : "text-[#A1A1AA] hover:text-[#FAFAFA]"
            }`}
          >
            <Wrench size={14} /> Services Config
          </button>
        </div>
      </div>

      {/* ═══════════════ TAB 1: CUSTOMER BOOKINGS ═══════════════ */}
      {activeTab === "BOOKINGS" && (
        <div className="space-y-4">

          {/* Search & Status Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 rounded-xl bg-[#18181B] border border-[#27272A]">
            <div className="sm:col-span-8 relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by customer name, email, phone, tracking code..."
                className="w-full bg-[#09090B] text-[#FAFAFA] placeholder-[#71717A] pl-10 pr-4 py-2.5 rounded-lg text-xs font-medium border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
              />
            </div>

            <div className="sm:col-span-4 relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#09090B] text-[#FAFAFA] pl-9 pr-3 py-2.5 rounded-lg text-xs font-bold border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
              >
                <option value="ALL">All Booking Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          {/* Error Message */}
          {errorBookings && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                <span>{errorBookings}</span>
              </div>
              <button
                onClick={() => fetchAppointments()}
                className="px-3 py-1 bg-red-900/50 hover:bg-red-900 text-red-200 rounded-lg text-[11px] font-bold"
              >
                Retry
              </button>
            </div>
          )}

          {/* Bookings Data Grid */}
          {loadingBookings && appointments.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-[#18181B] rounded-xl border border-[#27272A]">
              <RefreshCw size={28} className="animate-spin text-[#8B5CF6] mx-auto" />
              <p className="text-xs text-[#A1A1AA] font-medium">Fetching appointment schedules from server...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-[#18181B] rounded-xl border border-[#27272A]">
              <Calendar size={32} className="text-[#3F3F46] mx-auto" />
              <p className="text-sm font-bold text-[#FAFAFA]">No Appointment Bookings Found</p>
              <p className="text-xs text-[#71717A] max-w-sm mx-auto">
                Customer service bookings scheduled on the frontend will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-5 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-lg space-y-3 flex flex-col justify-between hover:border-[#8B5CF6]/50 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#8B5CF6]">
                        {apt.trackingId || apt.id}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${getStatusBadgeClass(apt.status)}`}>
                        {apt.status || "PENDING"}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-[#FAFAFA] leading-snug">
                        {apt.service?.name || apt.serviceName || "Technical Service Inspection"}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-[#A1A1AA] mt-1">
                        <User size={13} className="text-[#8B5CF6]" />
                        <span className="font-bold text-[#FAFAFA]">{apt.customerName}</span>
                      </div>
                      <div className="text-[10px] text-[#71717A] flex items-center gap-2 mt-0.5">
                        <span>✉️ {apt.customerEmail}</span>
                        <span>📞 {apt.customerPhone}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-[#09090B] rounded-xl text-xs space-y-1.5 border border-[#27272A]">
                      <div className="flex items-center gap-2 text-[#FAFAFA] font-mono text-[11px]">
                        <Calendar size={13} className="text-[#8B5CF6]" />
                        <span>{apt.date} at {apt.startTime} IST</span>
                      </div>
                      {apt.notes && (
                        <p className="text-[10px] text-[#A1A1AA] line-clamp-2">
                          <strong>Notes:</strong> {apt.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#27272A] flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedApt(apt);
                        setNewStatus(apt.status || "CONFIRMED");
                        setStatusComment(apt.comment || "");
                        setStatusMsg("");
                      }}
                      className="px-3 py-1.5 bg-[#27272A] hover:bg-[#8B5CF6] hover:text-white text-[#FAFAFA] text-xs font-bold rounded-lg transition-all border border-[#3F3F46] flex items-center gap-1.5"
                    >
                      <Edit3 size={13} /> Update Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ═══════════════ TAB 2: SERVICES CONFIGURATION ═══════════════ */}
      {activeTab === "SERVICES" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-[#FAFAFA]">
              Configured Architectural Services Catalog
            </h3>

            <button
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
              className="px-4 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
            >
              <Plus size={15} /> Add New Service
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((srv) => (
              <div
                key={srv.id}
                className="p-5 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="text-sm font-bold text-[#FAFAFA]">{srv.name}</h4>
                    <span className="text-[10px] font-mono bg-[#8B5CF6]/20 text-[#A855F7] px-2 py-0.5 rounded-full font-bold">
                      {srv.durationMinutes} mins
                    </span>
                  </div>
                  <p className="text-xs text-[#A1A1AA] leading-relaxed">
                    {srv.description || "Architectural technical service."}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#27272A] flex items-center justify-between text-xs">
                  <span className="font-bold text-[#FAFAFA]">
                    {srv.price > 0 ? `₹${srv.price}` : "Free Consultation"}
                  </span>

                  <button
                    onClick={() => {
                      setEditingServiceId(srv.id);
                      setServiceForm({
                        name: srv.name,
                        description: srv.description || "",
                        durationMinutes: srv.durationMinutes || 30,
                        bufferMinutes: srv.bufferMinutes || 15,
                        maxParallelBookings: srv.maxParallelBookings || 1,
                        price: srv.price || 0,
                        isPaid: srv.isPaid || false,
                        isActive: srv.isActive !== false,
                      });
                      setShowServiceModal(true);
                    }}
                    className="px-3 py-1 bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] text-xs font-bold rounded-lg border border-[#3F3F46]"
                  >
                    Edit Config
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ APPOINTMENT STATUS UPDATE MODAL ═══════════════ */}
      {selectedApt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl relative text-[#FAFAFA] max-h-[90vh] overflow-y-auto">

            <button
              onClick={() => setSelectedApt(null)}
              className="absolute top-4 right-4 text-[#71717A] hover:text-[#FAFAFA] p-1.5 rounded-lg bg-[#27272A]"
            >
              <X size={16} />
            </button>

            <div className="border-b border-[#27272A] pb-3 space-y-1">
              <span className="text-[10px] font-mono font-bold text-[#8B5CF6]">
                REF: {selectedApt.trackingId || selectedApt.id}
              </span>
              <h3 className="text-base font-extrabold text-[#FAFAFA]">
                Update Booking Status
              </h3>
            </div>

            <div className="text-xs space-y-1 text-[#A1A1AA]">
              <p><strong>Customer:</strong> {selectedApt.customerName} ({selectedApt.customerPhone})</p>
              <p><strong>Scheduled:</strong> {selectedApt.date} at {selectedApt.startTime} IST</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-[#A1A1AA] block mb-1">
                  Select New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-[#09090B] text-[#FAFAFA] text-xs font-bold p-2.5 rounded-lg border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-[#A1A1AA] block mb-1">
                  Admin Comment / Note
                </label>
                <input
                  type="text"
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  placeholder="e.g. Technician assigned: Vikram Singh"
                  className="w-full bg-[#09090B] text-[#FAFAFA] text-xs p-2.5 rounded-lg border border-[#27272A] focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>
            </div>

            {statusMsg && (
              <div className="p-2 bg-emerald-950/40 border border-emerald-700/50 text-emerald-400 text-xs font-bold rounded-lg text-center">
                {statusMsg}
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setSelectedApt(null)}
                className="px-4 py-2 bg-[#27272A] text-[#FAFAFA] text-xs font-bold rounded-lg"
              >
                Close
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={updatingStatus}
                className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold rounded-lg shadow-md disabled:opacity-50"
              >
                {updatingStatus ? "Saving..." : "Save Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ SERVICE CREATE / EDIT MODAL ═══════════════ */}
      {showServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative text-[#FAFAFA]">
            <button
              onClick={() => setShowServiceModal(false)}
              className="absolute top-4 right-4 text-[#71717A] hover:text-[#FAFAFA] p-1.5 rounded-lg bg-[#27272A]"
            >
              <X size={16} />
            </button>

            <h3 className="text-base font-extrabold text-[#FAFAFA]">
              {editingServiceId ? "Edit Architectural Service" : "Add New Architectural Service"}
            </h3>

            <form onSubmit={handleServiceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#A1A1AA] mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="e.g. Glass Partition Alignment"
                  className="w-full bg-[#09090B] text-[#FAFAFA] p-2.5 rounded-lg border border-[#27272A]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#A1A1AA] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  placeholder="Service description..."
                  className="w-full bg-[#09090B] text-[#FAFAFA] p-2.5 rounded-lg border border-[#27272A] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#A1A1AA] mb-1">Duration (Mins) *</label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={serviceForm.durationMinutes}
                    onChange={(e) => setServiceForm({ ...serviceForm, durationMinutes: Number(e.target.value) })}
                    className="w-full bg-[#09090B] text-[#FAFAFA] p-2.5 rounded-lg border border-[#27272A]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#A1A1AA] mb-1">Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })}
                    className="w-full bg-[#09090B] text-[#FAFAFA] p-2.5 rounded-lg border border-[#27272A]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-4 py-2 bg-[#27272A] text-[#FAFAFA] text-xs font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingService}
                  className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-bold rounded-lg shadow-md disabled:opacity-50"
                >
                  {savingService ? "Saving..." : "Save Service Config"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
