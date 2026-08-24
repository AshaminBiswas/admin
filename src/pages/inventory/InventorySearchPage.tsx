import React, { useState } from "react";
import {
  Search,
  Package,
  Barcode,
  RefreshCw,
  Boxes,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { fetchAdminApi } from "../../api/adminApi";
import { useAdminAuth } from "../../context/AdminAuthContext";

export function InventorySearchPage() {
  const { setCurrentView } = useAdminAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await fetchAdminApi(`/inventory/products?search=${encodeURIComponent(query.trim())}`);
      if (res?.success !== false) {
        setResults(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121214] p-6 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Search size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
              Global Stock & SKU Quick-Finder
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A1A1AA]">
              Universal high-speed lookup across SKUs, barcodes, batch tracking & multi-warehouse allocations
            </p>
          </div>
        </div>
      </div>

      {/* Big Search Input */}
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Scan barcode or type SKU, serial, product keyword..."
          className="w-full px-5 py-4 pl-12 bg-white dark:bg-[#121214] border border-slate-200 dark:border-[#27272A] rounded-2xl text-sm font-medium text-slate-900 dark:text-[#FAFAFA] shadow-sm focus:outline-none focus:border-purple-500 transition-colors"
        />
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all"
        >
          {isLoading ? "Searching..." : "Lookup SKU"}
        </button>
      </form>

      {/* Results Container */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-purple-500" />
            Searching inventory database...
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-[#121214] rounded-2xl border border-slate-200 dark:border-[#27272A]">
            No inventory items found matching "{query}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-[#121214] p-5 rounded-2xl border border-slate-200 dark:border-[#27272A] shadow-sm flex flex-col justify-between hover:border-purple-500/40 transition-all"
              >
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
                      <Package size={18} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-[#FAFAFA] text-sm truncate">
                        {item.product?.name || "Product SKU"}
                      </h3>
                      <div className="font-mono text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
                        {item.sku}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-[#27272A] text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px]">Current Stock:</span>
                      <div className="font-mono font-bold text-slate-900 dark:text-[#FAFAFA]">
                        {item.currentStock} Units
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Selling Price:</span>
                      <div className="font-mono font-bold text-slate-900 dark:text-[#FAFAFA]">
                        ₹{Number(item.sellingPrice || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#27272A] flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Status: {item.status || "ACTIVE"}
                  </span>
                  <button
                    onClick={() => setCurrentView("inventory-stock")}
                    className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    Adjust <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
