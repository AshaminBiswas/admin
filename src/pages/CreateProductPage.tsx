import React, { useState, useEffect } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { fetchAdminApi } from "../api/adminApi";
import { MediaPickerModal } from "../components/MediaPickerModal";
import {
  ChevronLeft,
  Package,
  Save,
  Loader2,
  AlertTriangle,
  RotateCcw,
  IndianRupee,
  Hash,
  ToggleLeft,
  ToggleRight,
  Factory,
  Tag,
  Image as ImageIcon,
  Box,
  Settings,
  Search as SearchIcon,
  X
} from "lucide-react";
import { Category } from "../types/admin";

export function CreateProductPage() {
  const { setCurrentView } = useAdminAuth();

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem("prc_admin_categories_list");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [categoryId, setCategoryId] = useState("");
  
  // Pricing
  const [price, setPrice] = useState("");
  const [salesPrice, setSalesPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  
  // Inventory
  const [stock, setStock] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  
  // Media
  const [thumbnail, setThumbnail] = useState("");
  const [images, setImages] = useState(""); // Comma separated

  // Status & Booleans
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "OUT_OF_STOCK">("ACTIVE");
  const [isVisible, setIsVisible] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isInOffer, setIsInOffer] = useState(false);
  
  // Manufacturer Info
  const [mfgGenericName, setMfgGenericName] = useState("");
  const [mfgCountry, setMfgCountry] = useState("India");
  const [mfgName, setMfgName] = useState("");
  const [mfgAddress, setMfgAddress] = useState("");
  
  // Specs
  const [compatibleFor, setCompatibleFor] = useState(""); // Comma separated
  const [warranty, setWarranty] = useState("");
  const [weight, setWeight] = useState("");
  
  // Dimensions
  const [dimLength, setDimLength] = useState("");
  const [dimWidth, setDimWidth] = useState("");
  const [dimHeight, setDimHeight] = useState("");
  const [dimUnit, setDimUnit] = useState("mm");
  
  // Custom Attributes (Dynamic Key-Value)
  const [attributes, setAttributes] = useState<{key: string, value: string}[]>([{key: "", value: ""}]);

  // Arrays
  const [colours, setColours] = useState("");
  const [tags, setTags] = useState("");

  // SEO
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [activeMediaField, setActiveMediaField] = useState<"thumbnail" | "images" | null>(null);

  useEffect(() => {
    const fetchCats = async () => {
      if (categories.length === 0) {
        try {
          const res = await fetchAdminApi<any>("/categories");
          if (res?.success !== false) {
            const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.categories) ? res.categories : Array.isArray(res) ? res : [];
            setCategories(list);
            if (list.length > 0) setCategoryId(String(list[0].id));
          }
        } catch (e) {}
      } else {
        if (!categoryId && categories.length > 0) setCategoryId(String(categories[0].id));
      }
    };
    fetchCats();
  }, []);

  const handleAttributeChange = (index: number, field: 'key' | 'value', val: string) => {
    const newAttrs = [...attributes];
    newAttrs[index][field] = val;
    setAttributes(newAttrs);
  };

  const addAttribute = () => setAttributes([...attributes, {key: "", value: ""}]);
  const removeAttribute = (index: number) => {
    const newAttrs = [...attributes];
    newAttrs.splice(index, 1);
    if (newAttrs.length === 0) newAttrs.push({key: "", value: ""});
    setAttributes(newAttrs);
  };

  const handleReset = () => {
    setName(""); setSku(""); setDescription(""); setShortDesc("");
    if (categories.length > 0) setCategoryId(String(categories[0].id));
    setPrice(""); setSalesPrice(""); setOfferPrice("");
    setStock(""); setReorderLevel("");
    setThumbnail(""); setImages("");
    setStatus("ACTIVE"); setIsVisible(true); setIsFeatured(false); setIsInOffer(false);
    setMfgGenericName(""); setMfgCountry("India"); setMfgName(""); setMfgAddress("");
    setCompatibleFor(""); setWarranty(""); setWeight("");
    setDimLength(""); setDimWidth(""); setDimHeight(""); setDimUnit("mm");
    setAttributes([{key: "", value: ""}]);
    setColours(""); setTags("");
    setMetaTitle(""); setMetaDescription("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || name.trim().length < 3) return setError("Product Name must be at least 3 characters");
    if (name.trim().length > 100) return setError("Product Name cannot exceed 100 characters");
    if (!sku.trim() || sku.trim().length < 3) return setError("SKU must be at least 3 characters");
    if (!categoryId) return setError("Category must be selected");
    
    const parsedPrice = Number(price);
    if (!price || isNaN(parsedPrice) || parsedPrice < 0) return setError("Valid Regular Price is required");
    
    if (salesPrice) {
      const parsedSales = Number(salesPrice);
      if (isNaN(parsedSales) || parsedSales < 0) return setError("Sales Price must be a valid positive number");
      if (parsedSales >= parsedPrice) return setError("Sales Price must be less than Regular Price");
    }
    
    if (offerPrice) {
      const parsedOffer = Number(offerPrice);
      if (isNaN(parsedOffer) || parsedOffer < 0) return setError("Offer Price must be a valid positive number");
      if (parsedOffer >= parsedPrice) return setError("Offer Price must be less than Regular Price");
    }
    
    const parsedStock = Number(stock);
    if (!stock || isNaN(parsedStock) || !Number.isInteger(parsedStock) || parsedStock < 0) return setError("Valid Stock quantity (positive integer) is required");
    
    if (reorderLevel) {
      const parsedReorder = Number(reorderLevel);
      if (isNaN(parsedReorder) || !Number.isInteger(parsedReorder) || parsedReorder < 0) return setError("Reorder Level must be a positive integer");
    }

    if (weight) {
      const parsedWeight = Number(weight);
      if (isNaN(parsedWeight) || parsedWeight < 0) return setError("Weight must be a valid positive number");
    }

    if (thumbnail && !/^https?:\/\/.+/.test(thumbnail.trim())) {
      return setError("Thumbnail must be a valid HTTP/HTTPS URL");
    }

    if (images.trim()) {
      const imgArray = images.split(",");
      for (const img of imgArray) {
        if (!/^https?:\/\/.+/.test(img.trim())) {
          return setError("All gallery images must be valid HTTP/HTTPS URLs");
        }
      }
    }

    if (metaTitle && metaTitle.length > 70) return setError("Meta Title should not exceed 70 characters");
    if (metaDescription && metaDescription.length > 160) return setError("Meta Description should not exceed 160 characters");

    const attrsObj: Record<string, string> = {};
    attributes.forEach(attr => {
      if (attr.key.trim() && attr.value.trim()) {
        attrsObj[attr.key.trim()] = attr.value.trim();
      }
    });

    const payload = {
      name: name.trim(),
      sku: sku.trim(),
      description: description.trim(),
      shortDesc: shortDesc.trim(),
      categoryId: categoryId || undefined,
      
      price: Number(price),
      salePrice: salesPrice ? Number(salesPrice) : undefined,
      offerPrice: offerPrice ? Number(offerPrice) : undefined,
      
      stock: Number(stock),
      reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
      
      thumbnail: thumbnail.trim() || undefined,
      images: images.split(",").map(i => i.trim()).filter(Boolean),
      
      status,
      isVisible,
      isFeatured,
      isInOffer,
      
      manufacturerInfo: {
        "Generic Name": mfgGenericName.trim(),
        "Country of Origin": mfgCountry.trim(),
        manufacturerName: mfgName.trim(),
        manufacturerAddress: mfgAddress.trim()
      },
      
      compatibleFor: compatibleFor.split(",").map(c => c.trim()).filter(Boolean),
      warranty: warranty.trim(),
      weight: weight ? Number(weight) : undefined,
      
      dimensions: (dimLength && dimWidth && dimHeight) ? {
        length: Number(dimLength),
        width: Number(dimWidth),
        height: Number(dimHeight),
        unit: dimUnit
      } : undefined,
      
      attributes: Object.keys(attrsObj).length > 0 ? attrsObj : undefined,
      colours: colours.split(",").map(c => c.trim()).filter(Boolean),
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      
      seo: {
        metaTitle: metaTitle.trim(),
        metaDescription: metaDescription.trim()
      }
    };

    setLoading(true);
    try {
      const res = await fetchAdminApi("/products", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (res?.success === false) {
        setError(res.message || "Failed to create product");
      } else {
        try {
          const newProduct = res?.data || res?.product || { id: `TMP-${Date.now()}`, ...payload };
          const cached = localStorage.getItem("prc_admin_products_list");
          let list = cached ? JSON.parse(cached) : [];
          list.unshift(newProduct);
          localStorage.setItem("prc_admin_products_list", JSON.stringify(list));
        } catch (e) {}

        setCurrentView("products");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-[#09090B] text-slate-900 dark:text-[#FAFAFA] px-4 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-[#27272A] focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/20 transition-all";
  const labelClass = "block text-xs font-bold text-slate-700 dark:text-[#A1A1AA] mb-1.5";
  const sectionTitleClass = "text-sm font-bold text-slate-900 dark:text-[#FAFAFA] mb-4 flex items-center gap-2";
  const sectionContainerClass = "bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl p-6 shadow-sm";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <button
            onClick={() => setCurrentView("products")}
            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#8B5CF6] transition-colors mb-2"
          >
            <ChevronLeft size={12} />
            Back to Products
          </button>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
            Create New Product
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#71717A] mt-1">
            Add a new product to your catalog with comprehensive details
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Left Column (Main Form) ── */}
        <div className="lg:col-span-2 space-y-6">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className={sectionContainerClass}>
            <h4 className={sectionTitleClass}><Package size={16} className="text-[#8B5CF6]" />Basic Information</h4>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Product Name <span className="text-rose-500">*</span></label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Luxury Solid Brass Handle" className={inputClass} required />
              </div>

              <div>
                <label className={labelClass}>SKU <span className="text-rose-500">*</span></label>
                <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. PRC-HDL-BRS" className={`${inputClass} font-mono`} required />
              </div>

              <div>
                <label className={labelClass}>Short Description</label>
                <input type="text" value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} placeholder="Brief summary for listings" className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Full Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detailed product description..." rows={4} className={`${inputClass} resize-none`} />
              </div>
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={sectionContainerClass}>
              <h4 className={sectionTitleClass}><IndianRupee size={16} className="text-emerald-500" />Pricing</h4>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Regular Price (₹) <span className="text-rose-500">*</span></label>
                  <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" min="0" className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Sales Price (₹)</label>
                  <input type="number" step="0.01" value={salesPrice} onChange={(e) => setSalesPrice(e.target.value)} placeholder="0.00" min="0" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Offer Price (₹)</label>
                  <input type="number" step="0.01" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} placeholder="0.00" min="0" className={inputClass} />
                </div>
              </div>
            </div>

            <div className={sectionContainerClass}>
              <h4 className={sectionTitleClass}><Hash size={16} className="text-amber-500" />Inventory</h4>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Stock Quantity <span className="text-rose-500">*</span></label>
                  <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" min="0" className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Reorder Level</label>
                  <input type="number" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} placeholder="20" min="0" className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          {/* Media */}
          <div className={sectionContainerClass}>
            <h4 className={sectionTitleClass}><ImageIcon size={16} className="text-blue-500" />Media URLs</h4>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Thumbnail Image URL</label>
                <div className="flex gap-2">
                  <input type="url" value={thumbnail} onChange={(e) => setThumbnail(e.target.value)} placeholder="https://..." className={inputClass} />
                  <button type="button" onClick={() => { setActiveMediaField("thumbnail"); setIsMediaPickerOpen(true); }} className="px-4 py-2 bg-slate-100 dark:bg-[#27272A] border border-slate-200 dark:border-[#27272A] rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-[#3F3F46] whitespace-nowrap transition-colors">
                    Browse Library
                  </button>
                </div>
                {thumbnail && <img src={thumbnail} alt="Thumbnail preview" className="mt-3 w-20 h-20 object-cover rounded-xl border border-slate-200 dark:border-[#27272A]" />}
              </div>
              <div>
                <label className={labelClass}>Product Gallery URLs (comma separated)</label>
                <div className="flex gap-2">
                  <textarea value={images} onChange={(e) => setImages(e.target.value)} placeholder="https://image1.jpg, https://image2.jpg" rows={2} className={`${inputClass} resize-none`} />
                  <button type="button" onClick={() => { setActiveMediaField("images"); setIsMediaPickerOpen(true); }} className="px-4 py-2 h-[42px] bg-slate-100 dark:bg-[#27272A] border border-slate-200 dark:border-[#27272A] rounded-xl text-sm font-semibold hover:bg-slate-200 dark:hover:bg-[#3F3F46] whitespace-nowrap transition-colors">
                    Browse Library
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className={sectionContainerClass}>
            <h4 className={sectionTitleClass}><Box size={16} className="text-fuchsia-500" />Specifications & Dimensions</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Weight (kg)</label>
                  <input type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0.35" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Warranty</label>
                  <input type="text" value={warranty} onChange={(e) => setWarranty(e.target.value)} placeholder="e.g. 5 Years Warranty" className={inputClass} />
                </div>
              </div>
              
              <div>
                <label className={labelClass}>Dimensions</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.1" value={dimLength} onChange={(e) => setDimLength(e.target.value)} placeholder="Length" className={inputClass} />
                  <span className="text-slate-400">×</span>
                  <input type="number" step="0.1" value={dimWidth} onChange={(e) => setDimWidth(e.target.value)} placeholder="Width" className={inputClass} />
                  <span className="text-slate-400">×</span>
                  <input type="number" step="0.1" value={dimHeight} onChange={(e) => setDimHeight(e.target.value)} placeholder="Height" className={inputClass} />
                  <select value={dimUnit} onChange={(e) => setDimUnit(e.target.value)} className="bg-slate-50 dark:bg-[#09090B] px-3 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-[#27272A] outline-none">
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                    <option value="in">in</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Compatible For (comma separated)</label>
                <input type="text" value={compatibleFor} onChange={(e) => setCompatibleFor(e.target.value)} placeholder="e.g. Wooden Cabinets, Drawers" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Custom Attributes */}
          <div className={sectionContainerClass}>
            <h4 className={sectionTitleClass}><Settings size={16} className="text-slate-500" />Custom Attributes</h4>
            <div className="space-y-3">
              {attributes.map((attr, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input type="text" value={attr.key} onChange={(e) => handleAttributeChange(idx, 'key', e.target.value)} placeholder="Attribute (e.g. Material)" className={inputClass} />
                  <input type="text" value={attr.value} onChange={(e) => handleAttributeChange(idx, 'value', e.target.value)} placeholder="Value (e.g. Solid Brass)" className={inputClass} />
                  <button type="button" onClick={() => removeAttribute(idx)} className="p-2.5 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors">
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addAttribute} className="text-xs font-bold text-[#8B5CF6] hover:underline">
                + Add Another Attribute
              </button>
            </div>
          </div>

          {/* Manufacturer Info */}
          <div className={sectionContainerClass}>
            <h4 className={sectionTitleClass}><Factory size={16} className="text-indigo-500" />Manufacturer Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Generic Name</label>
                <input type="text" value={mfgGenericName} onChange={(e) => setMfgGenericName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Country of Origin</label>
                <input type="text" value={mfgCountry} onChange={(e) => setMfgCountry(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Manufacturer Name</label>
                <input type="text" value={mfgName} onChange={(e) => setMfgName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input type="text" value={mfgAddress} onChange={(e) => setMfgAddress(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* SEO Info */}
          <div className={sectionContainerClass}>
            <h4 className={sectionTitleClass}><SearchIcon size={16} className="text-teal-500" />Search Engine Optimization (SEO)</h4>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Meta Title</label>
                <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="Page Title..." className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Meta Description</label>
                <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="SEO description..." rows={2} className={`${inputClass} resize-none`} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column (Sidebar) ── */}
        <div className="space-y-6">
          <div className={`${sectionContainerClass} space-y-6`}>
            
            <div>
              <label className={labelClass}>Category <span className="text-rose-500">*</span></label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass} required>
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)} className={inputClass}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-[#27272A] space-y-3">
              <button type="button" onClick={() => setIsVisible(!isVisible)} className="w-full flex items-center justify-between group">
                <span className="text-sm font-semibold text-slate-700 dark:text-[#A1A1AA]">Visible to public</span>
                {isVisible ? <ToggleRight size={28} className="text-[#8B5CF6]" /> : <ToggleLeft size={28} className="text-slate-300 dark:text-[#52525B]" />}
              </button>
              <button type="button" onClick={() => setIsFeatured(!isFeatured)} className="w-full flex items-center justify-between group">
                <span className="text-sm font-semibold text-slate-700 dark:text-[#A1A1AA]">Featured Product</span>
                {isFeatured ? <ToggleRight size={28} className="text-fuchsia-500" /> : <ToggleLeft size={28} className="text-slate-300 dark:text-[#52525B]" />}
              </button>
              <button type="button" onClick={() => setIsInOffer(!isInOffer)} className="w-full flex items-center justify-between group">
                <span className="text-sm font-semibold text-slate-700 dark:text-[#A1A1AA]">In Offer</span>
                {isInOffer ? <ToggleRight size={28} className="text-rose-500" /> : <ToggleLeft size={28} className="text-slate-300 dark:text-[#52525B]" />}
              </button>
            </div>
          </div>

          <div className={sectionContainerClass}>
            <h4 className={sectionTitleClass}><Tag size={16} className="text-rose-500" />Grouping</h4>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Colours (comma separated)</label>
                <input type="text" value={colours} onChange={(e) => setColours(e.target.value)} placeholder="e.g. Gold, Rose Gold" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tags (comma separated)</label>
                <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. brass, luxury" className={inputClass} />
              </div>
            </div>
          </div>

          <div className={`${sectionContainerClass} flex flex-col gap-3 !p-4`}>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] shadow-lg shadow-[#8B5CF6]/25 transition-all disabled:opacity-60">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {loading ? "Creating..." : "Save Product"}
            </button>
            <button type="button" onClick={handleReset} disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-slate-600 dark:text-[#A1A1AA] bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] hover:bg-slate-100 dark:hover:bg-[#27272A] transition-colors">
              <RotateCcw size={14} />
              Reset Form
            </button>
          </div>
        </div>
      </form>

      <MediaPickerModal 
        isOpen={isMediaPickerOpen}
        onClose={() => {
          setIsMediaPickerOpen(false);
          setActiveMediaField(null);
        }}
        onSelect={(url) => {
          if (activeMediaField === "thumbnail") {
            setThumbnail(url);
          } else if (activeMediaField === "images") {
            setImages(prev => prev ? `${prev}, ${url}` : url);
          }
          setIsMediaPickerOpen(false);
          setActiveMediaField(null);
        }}
      />
    </div>
  );
}
