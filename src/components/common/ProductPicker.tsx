import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2, Package, Check, X, Building2, AlertCircle } from "lucide-react";
import { fetchAdminApi, inventoryApi } from "../../api/adminApi";
import { useDebounce } from "../../hooks/useDebounce";
import { getStockStatus } from "../../utils/stockStatus";

export interface SelectedProductSummary {
  id: string;
  name: string;
  sku: string;
  price?: number;
  stock: number;
  branchOnHand?: number;
  branchReserved?: number;
  branchAvailable?: number;
  thumbnail?: string;
}

export interface ProductPickerProps {
  branchId?: string;
  value: string | null;
  onChange: (product: SelectedProductSummary) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  label?: string;
  showBranchMetrics?: boolean;
}

export const ProductPicker: React.FC<ProductPickerProps> = ({
  branchId,
  value,
  onChange,
  placeholder = "Search product by name or SKU...",
  disabled = false,
  className = "",
  required = false,
  label,
  showBranchMetrics = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<SelectedProductSummary | null>(null);
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch product inventory details (total + branch breakdown)
  const fetchProductStockInfo = useCallback(
    async (productId: string) => {
      if (!productId) return;
      setIsLoadingStock(true);
      try {
        const res = await inventoryApi.getProductInventory(productId);
        if (res?.success !== false && res?.data) {
          const invData = res.data;
          const targetBranch = branchId
            ? invData.branches?.find((b: any) => String(b.branchId) === String(branchId))
            : null;

          const onHand = targetBranch ? Number(targetBranch.quantity || 0) : undefined;
          const reserved = targetBranch ? Number(targetBranch.reservedQuantity || 0) : undefined;
          const available = targetBranch ? Math.max(0, (onHand || 0) - (reserved || 0)) : undefined;

          const summary: SelectedProductSummary = {
            id: String(invData.product?.id || productId),
            name: invData.product?.name || "Product",
            sku: invData.product?.sku || "SKU",
            price: Number(invData.product?.price || 0),
            stock: Number(invData.totalAvailable ?? invData.totalOnHand ?? invData.product?.stock ?? 0),
            branchOnHand: onHand,
            branchReserved: reserved,
            branchAvailable: available,
            thumbnail: invData.product?.thumbnail,
          };

          setSelectedProduct(summary);
          onChange(summary);
        }
      } catch (err) {
        console.warn("[ProductPicker] Failed to fetch live product inventory:", err);
      } finally {
        setIsLoadingStock(false);
      }
    },
    [branchId, onChange]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Re-fetch stock when branchId or value changes
  useEffect(() => {
    if (value) {
      fetchProductStockInfo(value);
    }
  }, [branchId, value, fetchProductStockInfo]);

  // Execute live search
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const searchProducts = async () => {
      setIsSearching(true);
      try {
        const queryParam = debouncedSearch.trim()
          ? `search=${encodeURIComponent(debouncedSearch.trim())}&limit=12`
          : "limit=12";
        const res = await fetchAdminApi<any>(`/products?${queryParam}`);
        if (isMounted) {
          if (res?.success !== false) {
            const raw = res?.data || res?.products || res;
            const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
            setSearchResults(list);
          } else {
            setSearchResults([]);
          }
        }
      } catch {
        if (isMounted) setSearchResults([]);
      } finally {
        if (isMounted) setIsSearching(false);
      }
    };

    searchProducts();
    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, isOpen]);

  const handleSelect = (p: any) => {
    const productId = String(p.id);
    setSearchTerm(p.name);
    setIsOpen(false);
    fetchProductStockInfo(productId);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProduct(null);
    setSearchTerm("");
    onChange({
      id: "",
      name: "",
      sku: "",
      stock: 0,
      price: 0,
    });
  };

  const totalStockStatus = getStockStatus(selectedProduct?.stock || 0);
  const branchStockStatus =
    selectedProduct?.branchAvailable !== undefined
      ? getStockStatus(selectedProduct.branchAvailable)
      : null;

  return (
    <div ref={containerRef} className={`relative flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-[#A1A1AA]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Main Trigger Input */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
        className={`relative flex items-center bg-slate-50 dark:bg-[#18181B] border rounded-xl px-3 py-2 text-xs transition-all cursor-pointer ${
          isOpen
            ? "border-[#8B5CF6] ring-2 ring-[#8B5CF6]/10"
            : "border-slate-200 dark:border-[#27272A] hover:border-slate-300 dark:hover:border-[#3F3F46]"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-[#09090B]" : ""}`}
      >
        <Search className="w-4 h-4 text-slate-400 dark:text-[#71717A] mr-2 flex-shrink-0" />

        <input
          ref={inputRef}
          type="text"
          value={
            isOpen
              ? searchTerm
              : selectedProduct
              ? `${selectedProduct.name} (${selectedProduct.sku})`
              : searchTerm
          }
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm("");
          }}
          placeholder={
            selectedProduct
              ? `${selectedProduct.name} (${selectedProduct.sku})`
              : placeholder
          }
          disabled={disabled}
          className="w-full bg-transparent text-xs font-medium text-slate-800 dark:text-[#FAFAFA] placeholder:text-slate-400 dark:placeholder:text-[#71717A] focus:outline-none"
        />

        {isLoadingStock ? (
          <Loader2 className="w-4 h-4 text-[#8B5CF6] animate-spin ml-2 flex-shrink-0" />
        ) : selectedProduct ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#FAFAFA] rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Live Stock Badges */}
      {selectedProduct && selectedProduct.id && showBranchMetrics && (
        <div className="flex items-center gap-2 flex-wrap text-[11px] font-medium pt-0.5">
          {/* Branch-Specific Stock (if branchId supplied) */}
          {selectedProduct.branchAvailable !== undefined ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/40 text-indigo-900 dark:text-indigo-200">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                Branch Available:{" "}
                <strong className="font-bold text-indigo-950 dark:text-indigo-100">
                  {selectedProduct.branchAvailable}
                </strong>{" "}
                units
              </span>
              {selectedProduct.branchReserved && selectedProduct.branchReserved > 0 ? (
                <span className="text-[10px] text-amber-600 dark:text-amber-400">
                  ({selectedProduct.branchReserved} reserved)
                </span>
              ) : null}
              {branchStockStatus && (
                <span
                  className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${branchStockStatus.badgeClass}`}
                >
                  {branchStockStatus.label}
                </span>
              )}
            </div>
          ) : null}

          {/* Network Total Stock */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#27272A] border border-slate-200 dark:border-[#3F3F46] text-slate-700 dark:text-[#A1A1AA]">
            <Package className="w-3.5 h-3.5 text-slate-500" />
            <span>
              Total Network Stock:{" "}
              <strong className="font-bold text-slate-900 dark:text-[#FAFAFA]">
                {selectedProduct.stock}
              </strong>{" "}
              units
            </span>
            <span
              className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${totalStockStatus.badgeClass}`}
            >
              {totalStockStatus.label}
            </span>
          </div>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto animate-in fade-in zoom-in-95">
          {isSearching ? (
            <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-[#71717A]">
              <Loader2 className="w-4 h-4 animate-spin text-[#8B5CF6]" />
              <span>Searching catalog...</span>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-[#27272A]">
              {searchResults.map((item) => {
                const isSelected = String(item.id) === String(selectedProduct?.id);
                const itemStockStatus = getStockStatus(Number(item.stock || 0));

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[#8B5CF6]/10 text-[#8B5CF6]"
                        : "hover:bg-slate-50 dark:hover:bg-[#27272A]/70 text-slate-800 dark:text-[#FAFAFA]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.thumbnail || item.image || item.images?.[0] ? (
                        <img
                          src={item.thumbnail || item.image || item.images?.[0]}
                          alt={item.name}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200 dark:border-[#27272A] flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#27272A] flex items-center justify-center flex-shrink-0 text-slate-400">
                          <Package className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-[#71717A] font-mono">
                          SKU: {item.sku || "N/A"}
                          {item.price ? ` • ₹${Number(item.price).toLocaleString("en-IN")}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`px-1.5 py-0.5 text-[9.5px] font-bold rounded border ${itemStockStatus.badgeClass}`}
                      >
                        {item.stock ?? 0} in stock
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[#8B5CF6]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-slate-500 dark:text-[#71717A] flex flex-col items-center gap-1">
              <AlertCircle className="w-5 h-5 text-slate-400" />
              <span>No products found matching "{searchTerm}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
