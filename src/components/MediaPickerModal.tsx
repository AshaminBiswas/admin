import React, { useState, useEffect } from "react";
import { X, Search, Image as ImageIcon, Plus } from "lucide-react";

interface UploadedAsset {
  id: string;
  url: string;
  filename: string;
  size: number;
  mode: string;
  timestamp: number;
}

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export function MediaPickerModal({ isOpen, onClose, onSelect }: MediaPickerModalProps) {
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<string>("all");

  useEffect(() => {
    if (isOpen) {
      try {
        const history = localStorage.getItem("prc_admin_media_history");
        if (history) {
          setAssets(JSON.parse(history));
        }
      } catch {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredAssets = assets.filter(a => {
    if (filterMode !== "all" && a.mode !== filterMode) return false;
    if (searchQuery && !a.filename.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl shadow-2xl overflow-hidden flex flex-col h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-[#27272A]">
          <h2 className="text-lg font-bold text-slate-900 dark:text-[#FAFAFA] flex items-center gap-2">
            <ImageIcon size={20} className="text-[#8B5CF6]" />
            Select Media Asset
          </h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-[#27272A] flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-slate-50 dark:bg-[#09090B]">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#A1A1AA]" />
            <input 
              type="text" 
              placeholder="Search images..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-lg text-sm focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-hide">
            {["all", "product", "product_bulk", "category", "avatar"].map(m => (
              <button
                key={m}
                onClick={() => setFilterMode(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                  filterMode === m
                    ? "bg-[#8B5CF6] text-white border-[#8B5CF6]"
                    : "bg-white dark:bg-[#18181B] text-slate-600 dark:text-[#A1A1AA] border-slate-200 dark:border-[#27272A] hover:border-[#8B5CF6]"
                }`}
              >
                {m === "all" ? "All Assets" : m.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-[#09090B]">
          {filteredAssets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-[#A1A1AA]">
              <ImageIcon size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">No assets found</p>
              <p className="text-xs opacity-60 mt-1">Upload files in the Media Uploads center first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredAssets.map(asset => (
                <div 
                  key={asset.id} 
                  onClick={() => onSelect(asset.url)}
                  className="group bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl overflow-hidden hover:border-[#8B5CF6] transition-all cursor-pointer relative"
                >
                  <div className="aspect-square bg-slate-100 dark:bg-[#27272A] relative">
                    <img src={asset.url} alt={asset.filename} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-[#8B5CF6]/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                      <Plus size={32} className="mb-2" />
                      <span className="text-sm font-bold">Select Image</span>
                    </div>
                  </div>
                  <div className="p-2 border-t border-slate-200 dark:border-[#27272A]">
                    <p className="text-xs font-semibold text-slate-900 dark:text-[#FAFAFA] truncate" title={asset.filename}>
                      {asset.filename}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
