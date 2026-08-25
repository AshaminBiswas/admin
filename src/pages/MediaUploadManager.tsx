import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  UploadCloud,
  X,
  Image as ImageIcon,
  Copy,
  Trash2,
  CheckCircle2,
  Search,
  Filter,
  Eye,
  Loader2,
  Package,
  FolderTree,
  User,
  AlertTriangle
} from "lucide-react";
import { fetchAdminApi } from "../api/adminApi";
import { getAdminToken, API_BASE_URL } from "../api/adminApi";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
type UploadMode = "product" | "product_bulk" | "category" | "avatar";

interface UploadedAsset {
  id: string;
  url: string;
  filename: string;
  size: number;
  mode: UploadMode;
  timestamp: number;
}

// ------------------------------------------------------------------
// API Helpers (using native fetch for FormData)
// ------------------------------------------------------------------
async function uploadMediaFile(endpoint: string, file: File): Promise<{ success: boolean; data?: any; message?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  
  const token = getAdminToken();
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

async function uploadBulkMediaFiles(endpoint: string, files: File[]): Promise<{ success: boolean; data?: any; message?: string }> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file)); // or 'file' depending on backend. Usually 'files' for array.
  
  const token = getAdminToken();
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function MediaUploadManager() {
  const [activeMode, setActiveMode] = useState<UploadMode>("product");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<UploadMode | "all">("all");
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from local storage
  useEffect(() => {
    try {
      const history = localStorage.getItem("prc_admin_media_history");
      if (history) {
        setAssets(JSON.parse(history));
      }
    } catch {}
  }, []);

  const saveHistory = (newAssets: UploadedAsset[]) => {
    setAssets(newAssets);
    localStorage.setItem("prc_admin_media_history", JSON.stringify(newAssets));
  };

  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const validFiles = files.filter(f => validMimes.includes(f.type) && f.size <= 5 * 1024 * 1024);
    
    if (validFiles.length !== files.length) {
      alert("Some files were rejected. Only JPG, PNG, WEBP, GIF up to 5MB are supported.");
    }
    
    if (validFiles.length === 0) return;

    if (activeMode !== "product_bulk" && validFiles.length > 1) {
      alert("Please select Bulk Mode to upload multiple files.");
      return;
    }
    if (activeMode === "product_bulk" && validFiles.length > 10) {
      alert("Bulk mode supports a maximum of 10 files at once.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(p => {
        if (p >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return p + 10;
      });
    }, 100);

    try {
      let results: { url: string, filename: string, size: number }[] = [];
      
      if (activeMode === "product_bulk") {
        const res = await uploadBulkMediaFiles('/upload/product/multiple', validFiles);
        if (res.success) {
          const urls = res.data?.urls || res.data || [];
          results = validFiles.map((f, i) => ({
            url: urls[i] || urls[0], // fallback
            filename: f.name,
            size: f.size
          }));
        } else {
          alert("Upload failed: " + (res.message || "Unknown error"));
        }
      } else {
        const file = validFiles[0];
        let endpoint = "/upload/product";
        if (activeMode === "category") endpoint = "/upload/category";
        if (activeMode === "avatar") endpoint = "/upload/avatar";
        
        const res = await uploadMediaFile(endpoint, file);
        if (res.success) {
          const url = res.data?.url || res.data || (res as any).url;
          if (url) {
            results = [{ url, filename: file.name, size: file.size }];
          }
        } else {
          alert("Upload failed: " + (res.message || "Unknown error"));
        }
      }

      setUploadProgress(100);
      
      if (results.length > 0) {
        const newAssets: UploadedAsset[] = results.map(r => ({
          id: Math.random().toString(36).substr(2, 9),
          url: r.url,
          filename: r.filename,
          size: r.size,
          mode: activeMode,
          timestamp: Date.now()
        }));
        saveHistory([...newAssets, ...assets]);
      }
    } catch (e) {
      console.error(e);
      alert("A network error occurred during upload.");
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }, 500);
    }
  };

  const copyToClipboard = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const deleteAsset = (id: string) => {
    if (!window.confirm("Remove this asset from history? (Note: It may still exist on the CDN)")) return;
    saveHistory(assets.filter(a => a.id !== id));
  };

  const filteredAssets = assets.filter(a => {
    if (filterMode !== "all" && a.mode !== filterMode) return false;
    if (searchQuery && !a.filename.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const MODES = [
    { id: "product", label: "Product Image", icon: <Package size={16} />, desc: "Single asset" },
    { id: "product_bulk", label: "Bulk Gallery", icon: <Package size={16} />, desc: "Up to 10 files" },
    { id: "category", label: "Category Image", icon: <FolderTree size={16} />, desc: "Single asset" },
    { id: "avatar", label: "User Avatar", icon: <User size={16} />, desc: "Single asset" },
  ];

  return (
    <div className="font-sans space-y-3 sm:space-y-5 md:space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-base sm:text-xl font-bold tracking-tight text-[#18181B] dark:text-[#FAFAFA]">Media & Upload Center</h1>
        <p className="text-[11px] sm:text-xs text-[#52525B] dark:text-[#A1A1AA] mt-0.5">Upload and manage media assets directly to your connected CDN.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-6">
        
        {/* Upload Zone (Left Column) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Tabs */}
          <div className="bg-[#FFFFFF] dark:bg-[#18181B] border border-[#E2E2D3] dark:border-[#27272A] rounded-xl p-2 shadow-sm flex flex-col gap-1">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setActiveMode(m.id as UploadMode)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-left ${
                  activeMode === m.id 
                    ? "bg-[#8B5CF6]/10 text-[#8B5CF6] font-semibold border border-[#8B5CF6]/20" 
                    : "text-[#52525B] dark:text-[#A1A1AA] hover:bg-[#F7F7EB] dark:hover:bg-[#27272A] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  {m.icon}
                  <span className="text-sm">{m.label}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider opacity-60">{m.desc}</span>
              </button>
            ))}
          </div>

          {/* Dropzone */}
          <div 
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`
              bg-[#FFFFFF] dark:bg-[#18181B] 
              border-2 border-dashed rounded-2xl p-8 
              flex flex-col items-center justify-center text-center transition-all min-h-[320px] cursor-pointer shadow-sm
              ${isDragging ? 'border-[#8B5CF6] bg-[#8B5CF6]/5 scale-[1.02]' : 'border-[#E2E2D3] dark:border-[#27272A] hover:border-[#8B5CF6]'}
              ${uploading ? 'pointer-events-none opacity-80' : ''}
            `}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple={activeMode === "product_bulk"}
              accept="image/jpeg, image/png, image/webp, image/gif" 
              onChange={handleFileSelect} 
            />
            
            {uploading ? (
              <div className="w-full max-w-xs space-y-4">
                <Loader2 size={48} className="mx-auto text-[#8B5CF6] animate-spin mb-4" />
                <p className="text-sm font-semibold text-[#18181B] dark:text-[#FAFAFA]">Uploading Assets...</p>
                <div className="h-2 w-full bg-[#E2E2D3] dark:bg-[#27272A] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#8B5CF6] transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-[#52525B] dark:text-[#A1A1AA]">{uploadProgress}% complete</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-[#F7F7EB] dark:bg-[#09090B] border border-[#E2E2D3] dark:border-[#27272A] flex items-center justify-center text-[#52525B] dark:text-[#A1A1AA] group-hover:text-[#8B5CF6] mb-4 shadow-sm group-hover:-translate-y-1 transition-transform">
                  <UploadCloud size={32} className={`${isDragging ? 'text-[#8B5CF6] animate-bounce' : ''}`} />
                </div>
                <h3 className="text-base font-bold text-[#18181B] dark:text-[#FAFAFA] mb-2">
                  Drag and drop image here
                </h3>
                <p className="text-sm text-[#52525B] dark:text-[#A1A1AA] mb-4">or click to browse from your computer</p>
                
                <div className="flex items-center gap-2 text-xs font-medium text-[#D39858] bg-[#D39858]/10 px-3 py-1.5 rounded-full mt-auto">
                  <AlertTriangle size={12} />
                  Supports JPG, PNG, WEBP, GIF up to 5MB
                </div>
              </>
            )}
          </div>
        </div>

        {/* History / Gallery (Right Column) */}
        <div className="lg:col-span-2 bg-[#FFFFFF] dark:bg-[#18181B] border border-[#E2E2D3] dark:border-[#27272A] rounded-xl p-6 shadow-sm flex flex-col h-[600px]">
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
            <h2 className="text-base font-bold text-[#18181B] dark:text-[#FAFAFA] flex items-center gap-2">
              <ImageIcon size={18} className="text-[#8B5CF6]" /> Asset Library
            </h2>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B] dark:text-[#A1A1AA]" />
                <input 
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#F7F7EB] dark:bg-[#09090B] border border-[#E2E2D3] dark:border-[#27272A] rounded-lg text-sm focus:outline-none focus:border-[#8B5CF6] transition-colors"
                />
              </div>
              <button 
                onClick={() => setAssets([])}
                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors ml-auto"
                title="Clear all history"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {[{id: "all", label: "All Assets"}, ...MODES].map(m => (
              <button
                key={m.id}
                onClick={() => setFilterMode(m.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                  filterMode === m.id
                    ? "bg-[#8B5CF6] text-white border-[#8B5CF6] shadow-sm shadow-[#8B5CF6]/20"
                    : "bg-[#F7F7EB] dark:bg-[#09090B] text-[#52525B] dark:text-[#A1A1AA] border-[#E2E2D3] dark:border-[#27272A] hover:border-[#8B5CF6]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto pr-2">
            {filteredAssets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[#52525B] dark:text-[#A1A1AA]">
                <ImageIcon size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">No assets found</p>
                <p className="text-xs opacity-60 mt-1">Upload files to see them here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAssets.map(asset => (
                  <div key={asset.id} className="group bg-[#F7F7EB] dark:bg-[#09090B] border border-[#E2E2D3] dark:border-[#27272A] rounded-xl overflow-hidden hover:border-[#8B5CF6] transition-all relative flex flex-col">
                    <div className="relative aspect-square overflow-hidden bg-[#E2E2D3] dark:bg-[#27272A]">
                      <img src={asset.url} alt={asset.filename} className="w-full h-full object-cover" />
                      
                      {/* CDN Badge */}
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                        CDN
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setPreviewUrl(asset.url)}
                          className="w-8 h-8 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={() => copyToClipboard(asset.url, asset.id)}
                          className="w-8 h-8 bg-[#8B5CF6]/80 hover:bg-[#8B5CF6] text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                        >
                          {copiedId === asset.id ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                        </button>
                        <button 
                          onClick={() => deleteAsset(asset.id)}
                          className="w-8 h-8 bg-rose-500/80 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-[#18181B] dark:text-[#FAFAFA] truncate" title={asset.filename}>{asset.filename}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-[#52525B] dark:text-[#A1A1AA]">{formatBytes(asset.size)}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#E2E2D3] dark:bg-[#27272A] text-[#52525B] dark:text-[#A1A1AA] uppercase">{asset.mode.replace('_bulk', '')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative max-w-5xl w-full flex items-center justify-center">
            <button 
              onClick={() => setPreviewUrl(null)}
              className="absolute -top-12 right-0 md:-right-12 text-white/50 hover:text-white p-2"
            >
              <X size={32} />
            </button>
            <img src={previewUrl} alt="Full Preview" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
