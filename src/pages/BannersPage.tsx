import React, { useState, useEffect, useRef } from "react";
import {
  UploadCloud,
  X,
  Monitor,
  Tablet,
  Smartphone,
  Save,
  GripVertical,
  Trash2,
  Edit2,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { getAdminToken, API_BASE_URL, fetchAdminApi } from "../api/adminApi";
import { BannerItem } from "../types/admin";

const POSITIONS = [
  { id: "HERO_SLIDER", label: "Hero Slider", desc: "Main Homepage Banner", desktop: "1920x1080 (16:9)", mobile: "750x1000 (3:4)" },
  { id: "HOME_UPCOMING", label: "Home Upcoming", desc: "Upcoming Collections", desktop: "1920x800", mobile: "750x800" },
  { id: "BESTSELLERS_TOP", label: "Bestsellers Top", desc: "Above Bestsellers", desktop: "1920x600", mobile: "750x600" },
  { id: "BESTSELLERS_MID", label: "Bestsellers Mid", desc: "Inside Bestsellers", desktop: "1200x400", mobile: "750x400" },
  { id: "NEW_ARRIVALS_TOP", label: "New Arrivals Top", desc: "Above New Arrivals", desktop: "1920x600", mobile: "750x600" },
  { id: "NEW_ARRIVALS_MID", label: "New Arrivals Mid", desc: "Inside New Arrivals", desktop: "1200x400", mobile: "750x400" },
  { id: "OFFERS_TOP", label: "Offers Top", desc: "Offers Page Header", desktop: "1920x600", mobile: "750x600" },
  { id: "OFFERS_SIDE", label: "Offers Side", desc: "Offers Page Sidebar", desktop: "400x800", mobile: "400x800" },
  { id: "SHOP_BY_AESTHETIC", label: "Shop By Aesthetic", desc: "Aesthetic Section", desktop: "1920x1080", mobile: "750x1000" },
  { id: "CUBICLE_COLLECTION", label: "Cubicle Collection", desc: "Category Header", desktop: "1920x600", mobile: "750x600" },
  { id: "LOCKER_COLLECTION", label: "Locker Collection", desc: "Category Header", desktop: "1920x600", mobile: "750x600" },
  { id: "ABOUT_HERO", label: "About Hero", desc: "About Us Header", desktop: "1920x800", mobile: "750x800" },
  { id: "CONTACT_HERO", label: "Contact Hero", desc: "Contact Us Header", desktop: "1920x800", mobile: "750x800" },
  { id: "FAQ_HERO", label: "FAQ Hero", desc: "FAQ Page Header", desktop: "1920x800", mobile: "750x800" },
];

const INITIAL_FORM = {
  id: "",
  title: "",
  subtitle: "",
  badgeText: "",
  desktopImage: "",
  tabletImage: "",
  mobileImage: "",
  linkUrl: "",
  ctaText: "Explore Now",
  isActive: true,
  startDate: "",
  endDate: ""
};

export function BannersPage() {
  const [activePosition, setActivePosition] = useState(POSITIONS[0].id);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState(INITIAL_FORM);
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  
  // Drag and Drop state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  useEffect(() => {
    fetchBanners(activePosition);
  }, [activePosition]);

  const fetchBanners = async (pos: string) => {
    setLoading(true);
    try {
      const res = await fetchAdminApi(`/banners/all?position=${pos}`);
      if (res?.success !== false) {
        let list = Array.isArray(res?.data) ? res.data : Array.isArray((res as any)?.banners) ? (res as any).banners : Array.isArray(res) ? res : [];
        list.sort((a: any, b: any) => a.order - b.order);
        setBanners(list);
      } else {
        setBanners([]);
      }
    } catch (e) {
      console.error(e);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, device: "desktop" | "tablet" | "mobile") => {
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = getAdminToken();
      const response = await fetch(`${API_BASE_URL}/upload/product`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const resData = await response.json();
      if (resData.success) {
        const url = resData.data?.url || resData.url;
        if (url) {
          setForm(prev => ({ ...prev, [`${device}Image`]: url }));
        }
      } else {
        alert(resData.message || "Failed to upload image");
      }
    } catch (e) {
      console.error(e);
      alert("Network error during upload");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.desktopImage) {
      alert("Desktop image is required.");
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        ...form,
        position: activePosition,
        order: form.id ? banners.find(b => b.id === form.id)?.order || 0 : banners.length
      };

      const method = form.id ? "PATCH" : "POST";
      const url = form.id ? `/banners/${form.id}` : `/banners`;

      const res = await fetchAdminApi(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (res?.success !== false) {
        alert(`Banner ${form.id ? "updated" : "created"} successfully!`);
        setForm(INITIAL_FORM);
        fetchBanners(activePosition);
      } else {
        alert(res.message || "Failed to save banner");
      }
    } catch (e) {
      alert("Error saving banner");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this banner?")) return;
    try {
      await fetchAdminApi(`/banners/${id}`, { method: "DELETE" });
      fetchBanners(activePosition);
    } catch (e) {
      alert("Failed to delete");
    }
  };

  const handleEdit = (b: BannerItem) => {
    setForm({
      id: b.id,
      title: b.title || "",
      subtitle: b.subtitle || "",
      badgeText: b.badgeText || "",
      desktopImage: b.desktopImage || "",
      tabletImage: b.tabletImage || "",
      mobileImage: b.mobileImage || "",
      linkUrl: b.linkUrl || "",
      ctaText: b.ctaText || "Explore Now",
      isActive: b.isActive !== false,
      startDate: b.startDate || "",
      endDate: b.endDate || ""
    });
  };

  const handleDragStart = (idx: number) => setDraggedIdx(idx);
  
  const handleDragEnter = (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) return;
    
    const newBanners = [...banners];
    const item = newBanners[draggedIdx];
    newBanners.splice(draggedIdx, 1);
    newBanners.splice(idx, 0, item);
    
    newBanners.forEach((b, i) => b.order = i);
    
    setDraggedIdx(idx);
    setBanners(newBanners);
  };
  
  const handleDragEnd = async () => {
    setDraggedIdx(null);
    try {
      const items = banners.map(b => ({ id: b.id, order: b.order }));
      await fetchAdminApi(`/banners/reorder`, {
        method: "PATCH",
        body: JSON.stringify({ items })
      });
    } catch (e) {
      console.error("Failed to reorder", e);
    }
  };

  const activePosDef = POSITIONS.find(p => p.id === activePosition);

  const Dropzone = ({ label, device, value }: { label: string, device: "desktop" | "tablet" | "mobile", value: string }) => {
    const fileRef = useRef<HTMLInputElement>(null);
    return (
      <div className="flex-1 bg-slate-50 dark:bg-[#09090B] border-2 border-dashed border-slate-300 dark:border-[#27272A] rounded-xl p-4 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-[#8B5CF6] transition-colors h-48">
        {value ? (
          <>
            <img src={value} alt={label} className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity group-hover:opacity-40 transition-opacity" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <button 
                type="button" 
                onClick={() => setForm(prev => ({ ...prev, [`${device}Image`]: "" }))}
                className="bg-rose-500 text-white p-2 rounded-full hover:bg-rose-600 transition-colors shadow-lg"
              >
                <X size={16} />
              </button>
            </div>
          </>
        ) : (
          <div 
            className="cursor-pointer flex flex-col items-center justify-center gap-3 w-full h-full"
            onClick={() => fileRef.current?.click()}
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#18181B] flex items-center justify-center text-slate-500 dark:text-[#A1A1AA] group-hover:text-[#8B5CF6]">
              <UploadCloud size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-[#FAFAFA]">{label}</p>
              <p className="text-[10px] text-slate-500 dark:text-[#A1A1AA] mt-1">JPG, PNG, WEBP (Max 5MB)</p>
            </div>
          </div>
        )}
        <input 
          type="file" 
          ref={fileRef} 
          className="hidden" 
          accept="image/jpeg, image/png, image/webp" 
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0], device);
            }
          }} 
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090B] text-slate-900 dark:text-[#FAFAFA] font-sans pb-20 p-6 space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Banner Portal</h1>
        <p className="text-sm text-slate-500 dark:text-[#A1A1AA] mt-1">Upload, manage, and schedule banners across all viewports.</p>
      </div>

      {/* Position Selector */}
      <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 dark:text-[#71717A] uppercase tracking-wider mb-2">Placement Position</label>
            <select 
              value={activePosition} 
              onChange={(e) => setActivePosition(e.target.value)}
              className="w-full md:max-w-md bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] text-slate-900 dark:text-[#FAFAFA] px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#8B5CF6] transition-colors"
            >
              {POSITIONS.map(p => (
                <option key={p.id} value={p.id}>{p.label} — {p.desc}</option>
              ))}
            </select>
          </div>
          
          {activePosDef && (
            <div className="flex items-center gap-6 bg-slate-50 dark:bg-[#09090B] p-4 rounded-xl border border-slate-200 dark:border-[#27272A]">
              <div className="flex items-center gap-3">
                <Monitor className="text-slate-400 dark:text-[#71717A]" size={20} />
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-[#A1A1AA] uppercase">Desktop Target</div>
                  <div className="text-sm font-semibold">{activePosDef.desktop}</div>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-200 dark:bg-[#27272A]"></div>
              <div className="flex items-center gap-3">
                <Smartphone className="text-slate-400 dark:text-[#71717A]" size={20} />
                <div>
                  <div className="text-[10px] text-slate-500 dark:text-[#A1A1AA] uppercase">Mobile Target</div>
                  <div className="text-sm font-semibold">{activePosDef.mobile}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Main Form Area */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Uploaders */}
          <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2">
              <ImageIcon size={18} className="text-[#8B5CF6]" /> Creative Assets
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <Dropzone label="Desktop (Required)" device="desktop" value={form.desktopImage} />
              <Dropzone label="Tablet (Optional)" device="tablet" value={form.tabletImage} />
              <Dropzone label="Mobile (Optional)" device="mobile" value={form.mobileImage} />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl p-6 shadow-sm space-y-5">
            <h2 className="text-base font-bold mb-2 flex items-center gap-2">
              <Edit2 size={18} className="text-[#8B5CF6]" /> Content & Meta
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] mb-1.5">Headline Title</label>
                <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-lg px-4 py-2 focus:border-[#8B5CF6] outline-none transition-colors" placeholder="e.g. Luxury Brass Handles Collection" required />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] mb-1.5">Subtitle / Body</label>
                <input type="text" value={form.subtitle} onChange={e => setForm({...form, subtitle: e.target.value})} className="w-full bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-lg px-4 py-2 focus:border-[#8B5CF6] outline-none transition-colors" placeholder="Handcrafted solid brass for modern homes" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] mb-1.5">Badge Text</label>
                <input type="text" value={form.badgeText} onChange={e => setForm({...form, badgeText: e.target.value})} className="w-full bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-lg px-4 py-2 focus:border-[#8B5CF6] outline-none transition-colors" placeholder="e.g. HOT DEAL" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] mb-1.5">CTA Button Text</label>
                <input type="text" value={form.ctaText} onChange={e => setForm({...form, ctaText: e.target.value})} className="w-full bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-lg px-4 py-2 focus:border-[#8B5CF6] outline-none transition-colors" placeholder="Explore Now" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] mb-1.5">Target Link URL</label>
                <input type="text" value={form.linkUrl} onChange={e => setForm({...form, linkUrl: e.target.value})} className="w-full bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-lg px-4 py-2 focus:border-[#8B5CF6] outline-none transition-colors" placeholder="/products?category=HANDLES" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] mb-1.5">Start Date (Optional)</label>
                <input type="datetime-local" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-lg px-4 py-2 focus:border-[#8B5CF6] outline-none transition-colors" style={{ colorScheme: 'dark' }} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-[#A1A1AA] mb-1.5">End Date (Optional)</label>
                <input type="datetime-local" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} className="w-full bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-lg px-4 py-2 focus:border-[#8B5CF6] outline-none transition-colors" style={{ colorScheme: 'dark' }} />
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-200 dark:border-[#27272A] flex items-center justify-between">
              <button type="button" onClick={() => setForm({...form, isActive: !form.isActive})} className="flex items-center gap-3 text-sm font-semibold hover:text-[#8B5CF6] transition-colors">
                {form.isActive ? <ToggleRight size={28} className="text-[#8B5CF6]" /> : <ToggleLeft size={28} className="text-slate-400 dark:text-[#71717A]" />}
                {form.isActive ? "Active (Live)" : "Draft (Hidden)"}
              </button>
              
              <div className="flex gap-3">
                {form.id && (
                  <button type="button" onClick={() => setForm(INITIAL_FORM)} className="px-5 py-2 rounded-lg font-semibold text-sm bg-slate-100 dark:bg-[#27272A] text-slate-700 dark:text-[#A1A1AA] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    Cancel
                  </button>
                )}
                <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg font-bold text-sm bg-[#8B5CF6] text-white hover:bg-purple-600 transition-colors flex items-center gap-2 shadow-md shadow-[#8B5CF6]/20">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {form.id ? "Update Banner" : "Create Banner"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Preview & List */}
        <div className="space-y-6">
          
          {/* Live Preview */}
          <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold">Live Preview</h2>
              <div className="flex bg-slate-100 dark:bg-[#09090B] rounded-lg p-1 border border-slate-200 dark:border-[#27272A]">
                <button onClick={() => setPreviewMode("desktop")} className={`p-1.5 rounded-md ${previewMode === "desktop" ? "bg-white dark:bg-[#27272A] text-[#8B5CF6] shadow-sm" : "text-slate-500 dark:text-[#71717A] hover:text-[#8B5CF6]"}`}><Monitor size={14}/></button>
                <button onClick={() => setPreviewMode("tablet")} className={`p-1.5 rounded-md ${previewMode === "tablet" ? "bg-white dark:bg-[#27272A] text-[#8B5CF6] shadow-sm" : "text-slate-500 dark:text-[#71717A] hover:text-[#8B5CF6]"}`}><Tablet size={14}/></button>
                <button onClick={() => setPreviewMode("mobile")} className={`p-1.5 rounded-md ${previewMode === "mobile" ? "bg-white dark:bg-[#27272A] text-[#8B5CF6] shadow-sm" : "text-slate-500 dark:text-[#71717A] hover:text-[#8B5CF6]"}`}><Smartphone size={14}/></button>
              </div>
            </div>
            
            <div className="w-full bg-slate-100 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] flex items-center justify-center overflow-hidden rounded-lg relative" style={{ height: previewMode === "mobile" ? "380px" : "240px" }}>
              {form.desktopImage || form.mobileImage ? (
                <div className="relative w-full h-full group">
                  <img 
                    src={(previewMode === "mobile" && form.mobileImage) ? form.mobileImage : (previewMode === "tablet" && form.tabletImage) ? form.tabletImage : form.desktopImage} 
                    alt="Preview" 
                    className="absolute inset-0 w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-black/40 flex flex-col justify-center p-6 text-left">
                    {form.badgeText && <span className="inline-block px-2 py-1 bg-[#8B5CF6] text-white text-[9px] font-bold tracking-widest uppercase mb-3 w-fit rounded-full">{form.badgeText}</span>}
                    {form.title && <h3 className="text-2xl font-bold text-white leading-tight mb-2 max-w-[80%] shadow-black drop-shadow-md">{form.title}</h3>}
                    {form.subtitle && <p className="text-xs font-medium text-white/90 mb-4 max-w-[90%] shadow-black drop-shadow-md">{form.subtitle}</p>}
                    {form.ctaText && <button className="px-5 py-2 bg-white text-slate-900 rounded-lg text-xs font-bold mt-auto w-fit hover:bg-slate-100">{form.ctaText}</button>}
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 dark:text-[#71717A] flex flex-col items-center">
                  <ImageIcon size={32} className="mb-2 opacity-50" />
                  <span className="text-xs uppercase tracking-widest font-semibold">No Image Selected</span>
                </div>
              )}
            </div>
          </div>

          {/* Reorder List */}
          <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-xl p-6 flex flex-col shadow-sm" style={{ maxHeight: '600px' }}>
            <h2 className="text-base font-bold mb-4 flex items-center justify-between">
              <span>Active Banners ({banners.length})</span>
              {loading && <Loader2 size={14} className="animate-spin text-[#8B5CF6]" />}
            </h2>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-4">
              {banners.length === 0 && !loading && (
                <p className="text-sm text-slate-500 dark:text-[#71717A] text-center py-8">No banners found for this position.</p>
              )}
              {banners.map((b, idx) => (
                <div 
                  key={b.id} 
                  draggable 
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={`bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-lg p-3 flex items-center gap-3 cursor-move hover:border-[#8B5CF6] transition-colors ${draggedIdx === idx ? 'opacity-50' : ''}`}
                >
                  <GripVertical size={16} className="text-slate-400 dark:text-[#71717A]" />
                  <img src={b.desktopImage} alt="Thumb" className="w-12 h-12 object-cover rounded-md border border-slate-200 dark:border-[#27272A]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{b.title || "Untitled Banner"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${b.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      <span className="text-[10px] text-slate-500 dark:text-[#71717A] font-medium uppercase tracking-wider">Order: {b.order}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => handleEdit(b)} className="p-1.5 text-slate-500 dark:text-[#A1A1AA] hover:text-[#8B5CF6] hover:bg-slate-200 dark:hover:bg-[#27272A] rounded-md transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(b.id)} className="p-1.5 text-slate-500 dark:text-[#A1A1AA] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
