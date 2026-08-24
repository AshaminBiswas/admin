import React, { useState, useEffect, useCallback } from "react";
import {
  Package,
  Search,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Barcode,
  Layers,
  IndianRupee,
  Plus
} from "lucide-react";
import { fetchAdminApi } from "../../api/adminApi";
import { useDebounce } from "../../hooks/useDebounce";
import { useAdminAuth } from "../../context/AdminAuthContext";

interface InventoryProductItem {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  purchasePrice: number;
  sellingPrice: number;
  mrp: number | null;
  currentStock: number;
  availableStock: number;
  reservedStock: number;
  minStock: number;
  maxStock: number;
  reorderLevel: number;
  status: string;
  product?: {
    id: string;
    name: string;
    thumbnail: string | null;
    category?: { name: string };
  };
}

export function InventoryProductsPage() {
  const { setCurrentView } = useAdminAuth();
  const [products, setProducts] = useState<InventoryProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter !== "ALL" && { status: statusFilter })
      });
      const res = await fetchAdminApi(`/inventory/products?${qs.toString()}`);
      if (res?.success !== false) {
        setProducts(res.data || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
        }
      } else {
        setError(res?.message || "Failed to load inventory products.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Package size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              Inventory Product Catalog (SKUs)
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
              ERP inventory parameters, reorder thresholds & cost prices across multi-warehouse locations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView("products")}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Plus size={16} />
            Add New Product
          </button>
          <button
            onClick={fetchProducts}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#FAFAFA] rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter / Search bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search SKU, product title, barcode..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#121214] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2.5 bg-white dark:bg-[#121214] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs text-slate-700 dark:text-[#FAFAFA] focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-[#FAFAFA]">
            <thead className="bg-slate-50 dark:bg-[#18181B] text-slate-500 dark:text-[#A1A1AA] uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-[#27272A]">
              <tr>
                <th className="px-5 py-3.5">Product & SKU</th>
                <th className="px-5 py-3.5">Barcode / HSN</th>
                <th className="px-5 py-3.5 text-right">Purchase Price</th>
                <th className="px-5 py-3.5 text-right">Selling Price</th>
                <th className="px-5 py-3.5 text-center">Current Stock</th>
                <th className="px-5 py-3.5 text-center">Available</th>
                <th className="px-5 py-3.5 text-center">Reorder Level</th>
                <th className="px-5 py-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-purple-500" />
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    No inventory products found matching the criteria.
                  </td>
                </tr>
              ) : (
                products.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-[#18181B]/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {item.product?.thumbnail ? (
                          <img
                            src={item.product.thumbnail}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-[#27272A]"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-[#27272A] flex items-center justify-center text-slate-400">
                            <Package size={16} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-[#FAFAFA] truncate max-w-[220px]">
                            {item.product?.name || "Unnamed Product"}
                          </div>
                          <div className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-medium">
                            {item.sku}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-mono text-slate-600 dark:text-[#A1A1AA] flex items-center gap-1.5">
                        <Barcode size={14} className="text-slate-400" />
                        <span>{item.barcode || "—"}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right font-mono font-medium">
                      ₹{Number(item.purchasePrice || 0).toLocaleString("en-IN")}
                    </td>

                    <td className="px-5 py-4 text-right font-mono font-semibold text-slate-900 dark:text-[#FAFAFA]">
                      ₹{Number(item.sellingPrice || 0).toLocaleString("en-IN")}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full font-mono font-bold text-xs ${
                        item.currentStock <= 0 
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                          : item.currentStock <= item.reorderLevel
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      }`}>
                        {item.currentStock}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center font-mono font-medium text-slate-600 dark:text-[#A1A1AA]">
                      {item.availableStock}
                    </td>

                    <td className="px-5 py-4 text-center font-mono text-slate-500">
                      {item.reorderLevel}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-[#27272A] text-slate-600 dark:text-[#A1A1AA]">
                        {item.status || "ACTIVE"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-[#27272A] text-xs text-slate-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#27272A] hover:bg-slate-50 dark:hover:bg-[#18181B] disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#27272A] hover:bg-slate-50 dark:hover:bg-[#18181B] disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
