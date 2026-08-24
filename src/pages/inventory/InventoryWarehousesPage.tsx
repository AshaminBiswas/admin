import React, { useState, useEffect, useCallback } from "react";
import {
  Warehouse,
  Plus,
  Search,
  RefreshCw,
  MapPin,
  CheckCircle2,
  Boxes,
  Store,
  Phone,
  Mail,
  Building2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { fetchAdminApi } from "../../api/adminApi";
import { useDebounce } from "../../hooks/useDebounce";
import { useAdminAuth } from "../../context/AdminAuthContext";

interface WarehouseItem {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  isDefault: boolean;
  status: string;
  _count?: {
    stocks: number;
    posStores: number;
  };
}

export function InventoryWarehousesPage() {
  const { setCurrentView } = useAdminAuth();
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [error, setError] = useState<string | null>(null);

  const fetchWarehouses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        ...(debouncedSearch && { search: debouncedSearch })
      });
      const res = await fetchAdminApi(`/inventory/warehouses?${qs.toString()}`);
      if (res?.success !== false) {
        setWarehouses(res.data || []);
      } else {
        setError(res?.message || "Failed to load warehouses.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Warehouse size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              Warehouse & Fulfillment Centers
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
              Regional distribution centers, inventory holding locations and POS store nodes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView("inventory-stock")}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Boxes size={16} />
            View Live Stock
          </button>
          <button
            onClick={fetchWarehouses}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative w-full sm:w-80">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by warehouse name, code, city..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#121214] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {/* Warehouse Cards Grid */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] p-12 text-center text-slate-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-purple-500" />
          Loading warehouse profiles...
        </div>
      ) : warehouses.length === 0 ? (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] p-12 text-center text-slate-400">
          No warehouses configured. Default venture fulfillment node will auto-initialize on first product stock movement.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {warehouses.map((wh) => (
            <div
              key={wh.id}
              className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] p-6 shadow-sm flex flex-col justify-between hover:border-purple-500/40 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-[#FAFAFA] text-sm leading-tight">
                        {wh.name}
                      </h3>
                      <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
                        CODE: {wh.code}
                      </span>
                    </div>
                  </div>

                  {wh.isDefault && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <CheckCircle2 size={11} />
                      DEFAULT
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-[#A1A1AA] pt-2 border-t border-slate-100 dark:border-[#27272A]">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                    <span>{wh.address || wh.city || "Primary Logistics Hub"}, {wh.pincode || "PIN: 700001"}</span>
                  </div>
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex items-center gap-1.5">
                      <Boxes size={14} className="text-slate-400" />
                      <span>{wh._count?.stocks || 0} Stock Lines</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Store size={14} className="text-slate-400" />
                      <span>{wh._count?.posStores || 0} POS Stores</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-[#27272A] flex items-center justify-between">
                <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-[#27272A] text-slate-600 dark:text-[#A1A1AA]">
                  {wh.status || "ACTIVE"}
                </span>
                <button
                  onClick={() => setCurrentView("inventory-stock")}
                  className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Manage Stock &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
