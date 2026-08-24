import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  RefreshCw,
  Phone,
  Mail,
  Building2,
  FileCheck,
  Plus
} from "lucide-react";
import { fetchAdminApi } from "../../api/adminApi";
import { useDebounce } from "../../hooks/useDebounce";

interface SupplierItem {
  id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  paymentTerms?: string;
  status: string;
  address?: string;
}

export function InventorySuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchAdminApi(`/inventory/suppliers`);
      if (res?.success !== false) {
        setSuppliers(res.data || []);
      } else {
        setError(res?.message || "Failed to load suppliers.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              Suppliers & Vendor Directory
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
              B2B manufacturers, material distributors, credit terms & tax profiles
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSuppliers}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Suppliers Grid */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] p-12 text-center text-slate-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-purple-500" />
          Loading supplier directory...
        </div>
      ) : suppliers.length === 0 ? (
        <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] p-12 text-center text-slate-400">
          No registered suppliers found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {suppliers.map((sup) => (
            <div
              key={sup.id}
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
                        {sup.name}
                      </h3>
                      <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-semibold">
                        {sup.code || "VENDOR-PRC"}
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                    {sup.status || "ACTIVE"}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-[#A1A1AA] pt-2 border-t border-slate-100 dark:border-[#27272A]">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400" />
                    <span>{sup.email || "vendor@prchardware.com"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" />
                    <span>{sup.phone || "+91 (033) 2200-XXXX"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileCheck size={14} className="text-slate-400" />
                    <span>GSTIN: {sup.gstin || "19AAACP0000A1Z5"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#27272A] flex items-center justify-between text-[11px] text-slate-500">
                <span>Terms: {sup.paymentTerms || "NET 30 Days"}</span>
                <span className="font-medium text-purple-600 dark:text-purple-400">Verified Vendor</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
