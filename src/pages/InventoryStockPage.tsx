import React, { useState, useEffect, useCallback } from "react";
import {
  Package,
  Search,
  Settings2,
  RefreshCw,
  Box,
  MapPin,
  AlertTriangle,
  FileText,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { fetchAdminApi } from "../api/adminApi";
import { useDebounce } from "../hooks/useDebounce";

interface InventoryStock {
  id: string;
  inventoryProductId: string;
  warehouseId: string;
  quantity: number;
  reservedQty: number;
  damagedQty: number;
  lastUpdatedAt: string;
  inventoryProduct: {
    sku: string;
    product: {
      id: string;
      name: string;
      thumbnail: string | null;
    };
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
}

export function InventoryStockPage() {
  const [stocks, setStocks] = useState<InventoryStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<InventoryStock | null>(null);
  const [qtyChanged, setQtyChanged] = useState<number | "">("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchStock = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(debouncedSearch && { search: debouncedSearch })
      });
      const res = await fetchAdminApi(`/inventory/stock?${qs.toString()}`);
      
      if (res?.success !== false) {
        setStocks(res.data || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
        }
      } else {
        setError(res.message || "Failed to load stock.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock || !qtyChanged || qtyChanged === 0 || !reason) return;
    
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        inventoryProductId: selectedStock.inventoryProductId,
        warehouseId: selectedStock.warehouseId,
        qtyChanged: Number(qtyChanged),
        reason
      };
      
      const res = await fetchAdminApi("/inventory/stock/adjustment", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (res?.success !== false) {
        setFeedback({ type: "success", text: "Stock adjusted successfully!" });
        setAdjustModalOpen(false);
        fetchStock();
      } else {
        setFeedback({ type: "error", text: res.message || "Adjustment failed." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Error adjusting stock." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAdjustModal = (stock: InventoryStock) => {
    setSelectedStock(stock);
    setQtyChanged("");
    setReason("");
    setAdjustModalOpen(true);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-[#FAFAFA] font-serif tracking-tight flex items-center gap-2">
            <Box className="text-[#8B5CF6]" size={28} />
            Inventory Stock
          </h1>
          <p className="text-sm text-slate-500 dark:text-[#A1A1AA] mt-1">
            Monitor and adjust product quantities across all warehouses.
          </p>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
              : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <p className="text-sm font-semibold">{feedback.text}</p>
          <button onClick={() => setFeedback(null)} className="ml-auto opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tools */}
      <div className="bg-white dark:bg-[#18181B] p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-[#27272A] mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            placeholder="Search SKU or Product Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-sm text-slate-900 dark:text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50 focus:border-[#8B5CF6] transition-all"
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#A1A1AA]" />
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={async () => {
              try {
                setFeedback({ type: "success", text: "Syncing missing products..." });
                const res = await fetchAdminApi("/inventory/stock/sync-legacy", { method: "POST" });
                if (res?.success !== false) {
                  setFeedback({ type: "success", text: `Successfully synced ${res.data?.synced || 0} products to inventory.` });
                  fetchStock();
                } else {
                  setFeedback({ type: "error", text: res.message || "Failed to sync products." });
                }
              } catch(e: any) {
                setFeedback({ type: "error", text: e.message || "Error syncing products." });
              }
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-xl font-bold text-sm transition-all"
          >
            <RefreshCw size={16} />
            Sync Missing Products
          </button>
          
          <button
            onClick={fetchStock}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-[#27272A] hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-[#FAFAFA] rounded-xl font-bold text-sm transition-all"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#18181B] rounded-2xl shadow-sm border border-slate-200 dark:border-[#27272A] overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-[#1F1929] text-slate-500 dark:text-[#A1A1AA] border-b border-slate-200 dark:border-[#27272A]">
              <tr>
                <th className="px-6 py-4 font-bold">Product & SKU</th>
                <th className="px-6 py-4 font-bold">Warehouse</th>
                <th className="px-6 py-4 font-bold text-right">Available Qty</th>
                <th className="px-6 py-4 font-bold text-right">Reserved</th>
                <th className="px-6 py-4 font-bold text-right">Damaged</th>
                <th className="px-6 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#27272A]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <Loader2 size={32} className="animate-spin text-[#8B5CF6] mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-[#A1A1AA]">Loading stock...</p>
                  </td>
                </tr>
              ) : stocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <Box size={48} className="text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-[#FAFAFA] mb-1">No stock found</h3>
                    <p className="text-slate-500 dark:text-[#A1A1AA]">No inventory records match your criteria.</p>
                  </td>
                </tr>
              ) : (
                stocks.map((stock) => (
                  <tr key={stock.id} className="hover:bg-slate-50/80 dark:hover:bg-[#27272A]/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-[#09090B] flex items-center justify-center overflow-hidden border border-slate-200 dark:border-[#27272A]">
                          {stock.inventoryProduct?.product?.thumbnail ? (
                            <img src={stock.inventoryProduct.product.thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package size={16} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-[#FAFAFA] max-w-[200px] truncate">
                            {stock.inventoryProduct?.product?.name || "Unknown Product"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-[#71717A] mt-0.5 font-mono">
                            {stock.inventoryProduct?.sku}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-[#E4E4E7]">
                        <MapPin size={14} className="text-[#8B5CF6]" />
                        <span className="font-medium">{stock.warehouse?.name}</span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-[#71717A] mt-0.5 ml-5">
                        {stock.warehouse?.code}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded-md font-bold ${
                        stock.quantity > 10
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : stock.quantity > 0
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                      }`}>
                        {stock.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 dark:text-[#A1A1AA] font-medium">
                      {stock.reservedQty}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {stock.damagedQty > 0 ? (
                        <span className="flex items-center justify-end gap-1 text-rose-600 dark:text-rose-400">
                          <AlertTriangle size={12} />
                          {stock.damagedQty}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-[#71717A]">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => openAdjustModal(stock)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#27272A] hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-400 text-slate-700 dark:text-[#E4E4E7] rounded-lg font-bold text-xs transition-colors"
                      >
                        <Settings2 size={14} />
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-[#27272A] flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-[#A1A1AA]">
              Page <strong className="text-slate-900 dark:text-[#FAFAFA]">{page}</strong> of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-[#27272A] disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-[#27272A] transition-colors"
              >
                <ChevronLeft size={16} className="text-slate-600 dark:text-[#A1A1AA]" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 dark:border-[#27272A] disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-[#27272A] transition-colors"
              >
                <ChevronRight size={16} className="text-slate-600 dark:text-[#A1A1AA]" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Adjust Modal */}
      {adjustModalOpen && selectedStock && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setAdjustModalOpen(false)} />
          <div className="relative bg-white dark:bg-[#18181B] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-[#27272A] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between bg-slate-50 dark:bg-[#1F1929]">
              <h3 className="text-lg font-bold text-slate-900 dark:text-[#FAFAFA] flex items-center gap-2">
                <Settings2 className="text-[#8B5CF6]" size={18} />
                Adjust Stock
              </h3>
              <button onClick={() => setAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA] transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAdjustSubmit} className="p-6">
              <div className="mb-6 p-4 rounded-xl bg-slate-100 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A]">
                <p className="text-xs text-slate-500 dark:text-[#A1A1AA] uppercase font-bold tracking-wider mb-1">Product</p>
                <p className="font-bold text-slate-900 dark:text-[#FAFAFA]">{selectedStock.inventoryProduct.product.name}</p>
                <p className="text-xs font-mono text-[#8B5CF6] mt-1">{selectedStock.inventoryProduct.sku}</p>
                
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-[#27272A] flex justify-between items-center">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">Location</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-[#E4E4E7]">{selectedStock.warehouse.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">Current Available</p>
                    <p className="text-lg font-black text-slate-900 dark:text-[#FAFAFA]">{selectedStock.quantity}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#E4E4E7] mb-1.5 uppercase tracking-wider">
                    Quantity Change <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={qtyChanged}
                      onChange={(e) => setQtyChanged(e.target.value ? Number(e.target.value) : "")}
                      placeholder="e.g. 10 or -5"
                      className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] text-slate-900 dark:text-[#FAFAFA] font-mono text-lg transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                      {Number(qtyChanged) > 0 && <TrendingUp size={16} className="text-emerald-500" />}
                      {Number(qtyChanged) < 0 && <TrendingDown size={16} className="text-rose-500" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Use a negative number to subtract stock.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-[#E4E4E7] mb-1.5 uppercase tracking-wider">
                    Reason <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g. Restock delivery, Damage return..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#09090B] border border-slate-300 dark:border-[#27272A] focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] text-slate-900 dark:text-[#FAFAFA] transition-all"
                    />
                    <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-[#A1A1AA] hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !qtyChanged || qtyChanged === 0 || !reason}
                  className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#8B5CF6]/20 transition-all flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
