import React, { useState, useEffect } from "react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { fetchAdminApi, inventoryApi, materialsApi } from "../api/adminApi";
import { MediaPickerModal } from "../components/MediaPickerModal";
import { syncProductUpdate } from "../utils/productSync";
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
  X,
  Lock,
  Warehouse,
  Boxes,
  ArrowUpRight,
  Sparkles,
  Flame,
  Percent,
  Globe,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  Link2,
} from "lucide-react";
import { Category, ProductItem, MaterialItem } from "../types/admin";

export function EditProductPage() {
  const { setCurrentView } = useAdminAuth();

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem("prc_admin_categories_list");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [initialProduct, setInitialProduct] = useState<ProductItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper for auto slug generation
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Form State
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isCustomSlug, setIsCustomSlug] = useState(false);
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [materialId, setMaterialId] = useState("");

  // Frequently Paired Hardware State
  const [pairedIds, setPairedIds] = useState<string[]>([]);
  const [pairedProducts, setPairedProducts] = useState<ProductItem[]>([]);
  const [pairedSearchQuery, setPairedSearchQuery] = useState("");
  const [pairedSearchResults, setPairedSearchResults] = useState<ProductItem[]>([]);
  const [isSearchingPaired, setIsSearchingPaired] = useState(false);
  
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
  const [isBestseller, setIsBestseller] = useState(false);
  const [isInOffer, setIsInOffer] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);
  
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
  
  // Custom Attributes (Dynamic Key-Value with Boolean Dropdown Defaulting to False)
  const [attributes, setAttributes] = useState<{key: string, value: string}[]>([{key: "", value: "false"}]);

  // Arrays
  const [colours, setColours] = useState("");
  const [tags, setTags] = useState("");

  // SEO & Keywords
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");

  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [activeMediaField, setActiveMediaField] = useState<"thumbnail" | "images" | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("prc_admin_edit_product");
      if (saved) {
        const prod: ProductItem = JSON.parse(saved);
        setInitialProduct(prod);
        
        setName(prod.name || "");
        setSlug(prod.slug || generateSlug(prod.name || ""));
        setIsCustomSlug(Boolean(prod.slug));
        setSku(prod.sku || "");
        setDescription(prod.description || "");
        setShortDesc(prod.shortDesc || "");
        setCategoryId(prod.categoryId ? String(prod.categoryId) : "");
        
        setPrice(prod.price !== undefined ? String(prod.price) : "");
        setSalesPrice(prod.salesPrice !== undefined ? String(prod.salesPrice) : prod.salePrice !== undefined ? String(prod.salePrice) : "");
        setOfferPrice(prod.offerPrice !== undefined ? String(prod.offerPrice) : "");
        
        setStock(prod.stock !== undefined ? String(prod.stock) : "0");
        setReorderLevel(prod.reorderLevel !== undefined ? String(prod.reorderLevel) : "10");
        
        setMaterialId(prod.materialId ? String(prod.materialId) : "");
        const initPaired = Array.isArray(prod.frequentlyPairedIds)
          ? prod.frequentlyPairedIds
          : Array.isArray(prod.pairedProductIds)
          ? prod.pairedProductIds
          : [];
        setPairedIds(initPaired);

        // Resolve paired products if any exist
        if (initPaired.length > 0) {
          fetchAdminApi<any>("/products?limit=300").then((catRes) => {
            if (catRes && catRes.data) {
              const allList: ProductItem[] = Array.isArray(catRes.data.products)
                ? catRes.data.products
                : Array.isArray(catRes.data)
                ? catRes.data
                : [];
              const map = new Map(allList.map((p) => [String(p.id), p]));
              const resolved = initPaired.map((pid) => map.get(String(pid))).filter(Boolean) as ProductItem[];
              setPairedProducts(resolved);
            }
          }).catch(() => {});
        }
        
        // Fetch true live multi-branch inventory breakdown
        if (prod.id) {
          inventoryApi.getProductInventory(String(prod.id)).then((invRes) => {
            if (invRes.success && invRes.data) {
              setStock(String(invRes.data.totalAvailable ?? invRes.data.product?.stock ?? prod.stock ?? 0));
              setReorderLevel(String(invRes.data.product?.reorderLevel ?? prod.reorderLevel ?? 10));
            }
          }).catch(() => {});
        }
        
        setThumbnail(prod.thumbnail || prod.image || "");
        if (Array.isArray(prod.images)) setImages(prod.images.join(", "));
        
        setStatus((prod.status?.toUpperCase() as any) || "ACTIVE");
        setIsVisible(prod.isVisible !== false);
        setIsFeatured(!!prod.isFeatured);
        setIsBestseller(!!prod.isBestseller || !!prod.isBestsaller);
        setIsInOffer(!!prod.isInOffer);
        setIsNewArrival(!!prod.isNewArrival);
        
        if (prod.manufacturerInfo) {
          setMfgGenericName(prod.manufacturerInfo["Generic Name"] || "");
          setMfgCountry(prod.manufacturerInfo["Country of Origin"] || "India");
          setMfgName(prod.manufacturerInfo.manufacturerName || "");
          setMfgAddress(prod.manufacturerInfo.manufacturerAddress || "");
        }
        
        if (Array.isArray(prod.compatibleFor)) setCompatibleFor(prod.compatibleFor.join(", "));
        setWarranty(prod.warranty || "");
        setWeight(prod.weight !== undefined ? String(prod.weight) : "");
        
        if (prod.dimensions) {
          setDimLength(prod.dimensions.length !== undefined ? String(prod.dimensions.length) : "");
          setDimWidth(prod.dimensions.width !== undefined ? String(prod.dimensions.width) : "");
          setDimHeight(prod.dimensions.height !== undefined ? String(prod.dimensions.height) : "");
          setDimUnit(prod.dimensions.unit || "mm");
        }
        
        if (prod.attributes && typeof prod.attributes === "object") {
          const attrs = Object.entries(prod.attributes).map(([k, v]) => {
            const vStr = String(v).toLowerCase();
            return {
              key: k,
              value: vStr === "true" ? "true" : (vStr === "false" ? "false" : String(v))
            };
          });
          setAttributes(attrs);
        } else {
          setAttributes([{key: "", value: "false"}]);
        }
        
        if (Array.isArray(prod.colours)) setColours(prod.colours.join(", "));
        if (Array.isArray(prod.tags)) setTags(prod.tags.join(", "));
        
        if (prod.metaKeywords || prod.seo?.metaKeywords) {
          setMetaKeywords(prod.metaKeywords || prod.seo?.metaKeywords || "");
        }
        if (prod.seo) {
          setMetaTitle(prod.seo.metaTitle || "");
          setMetaDescription(prod.seo.metaDescription || "");
        }
      } else {
        setCurrentView("products");
      }
    } catch (e) {
      setCurrentView("products");
    }
  }, [setCurrentView]);

  useEffect(() => {
    const fetchCats = async () => {
      if (categories.length === 0) {
        try {
          const res = await fetchAdminApi<any>("/categories");
          if (res?.success !== false) {
            const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.categories) ? res.categories : Array.isArray(res) ? res : [];
            setCategories(list);
          }
        } catch (e) {}
      }
    };
    fetchCats();

    materialsApi.list().then((res) => {
      if (res && res.success && Array.isArray(res.data)) {
        setMaterials(res.data);
      }
    }).catch(() => {});
  }, [categories.length]);

  const handleSearchPaired = async (q: string) => {
    setPairedSearchQuery(q);
    if (!q.trim() || q.trim().length < 2) {
      setPairedSearchResults([]);
      return;
    }
    setIsSearchingPaired(true);
    try {
      const res = await fetchAdminApi<any>(`/products?search=${encodeURIComponent(q.trim())}&limit=12`);
      if (res && res.data) {
        const list: ProductItem[] = Array.isArray(res.data.products)
          ? res.data.products
          : Array.isArray(res.data)
          ? res.data
          : [];
        const currentProdId = initialProduct?.id ? String(initialProduct.id) : "";
        const filtered = list.filter(
          (p) => String(p.id) !== currentProdId && !pairedIds.includes(String(p.id))
        );
        setPairedSearchResults(filtered);
      }
    } catch {
      setPairedSearchResults([]);
    } finally {
      setIsSearchingPaired(false);
    }
  };

  const handleAddPairedProduct = (prodToAdd: ProductItem) => {
    const pid = String(prodToAdd.id);
    if (!pairedIds.includes(pid)) {
      setPairedIds((prev) => [...prev, pid]);
      setPairedProducts((prev) => [...prev, prodToAdd]);
    }
    setPairedSearchQuery("");
    setPairedSearchResults([]);
  };

  const handleRemovePairedProduct = (pid: string) => {
    setPairedIds((prev) => prev.filter((id) => id !== pid));
    setPairedProducts((prev) => prev.filter((p) => String(p.id) !== pid));
  };

  const handleMovePaired = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pairedProducts.length) return;

    const newPairedProds = [...pairedProducts];
    const [moved] = newPairedProds.splice(index, 1);
    newPairedProds.splice(targetIndex, 0, moved);

    setPairedProducts(newPairedProds);
    setPairedIds(newPairedProds.map((p) => String(p.id)));
  };

  const handleAttributeChange = (index: number, field: 'key' | 'value', val: string) => {
    const newAttrs = [...attributes];
    newAttrs[index][field] = val;
    setAttributes(newAttrs);
  };

  const addAttribute = () => setAttributes([...attributes, {key: "", value: "false"}]);
  const removeAttribute = (index: number) => {
    const newAttrs = [...attributes];
    newAttrs.splice(index, 1);
    if (newAttrs.length === 0) newAttrs.push({key: "", value: "false"});
    setAttributes(newAttrs);
  };

  const handleReset = () => {
    if (initialProduct) {
      // Very crude reload from local storage
      const event = new Event('reset');
      // A full reset logic is extensive here; reload for simplicity
      window.location.reload(); 
    }
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

    const attrsObj: Record<string, any> = {};
    attributes.forEach(attr => {
      if (attr.key.trim()) {
        const valTrimmed = (attr.value || "false").trim().toLowerCase();
        attrsObj[attr.key.trim()] = valTrimmed === "true" ? true : (valTrimmed === "false" ? false : attr.value.trim());
      }
    });

    const cleanPayload: Record<string, any> = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      sku: sku.trim() || undefined,
      description: description.trim() || undefined,
      shortDesc: shortDesc.trim() || undefined,
      categoryId: categoryId || undefined,
      materialId: materialId || null,
      frequentlyPairedIds: pairedIds,
      pairedProductIds: pairedIds,
      price: Number(price) || 0,
      salePrice: salesPrice ? Number(salesPrice) : undefined,
      offerPrice: offerPrice ? Number(offerPrice) : undefined,
      reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
      thumbnail: thumbnail.trim() || undefined,
      image: thumbnail.trim() || (images.split(",").map(i => i.trim()).filter(Boolean)[0]) || undefined,
      images: images.split(",").map(i => i.trim()).filter(Boolean),
      status: status || "ACTIVE",
      isVisible: isVisible ?? true,
      isFeatured: Boolean(isFeatured),
      isBestseller: Boolean(isBestseller),
      isInOffer: Boolean(isInOffer),
      isNewArrival: Boolean(isNewArrival),
      manufacturerInfo: (mfgGenericName || mfgName || mfgAddress) ? {
        "Generic Name": mfgGenericName.trim(),
        "Country of Origin": mfgCountry.trim() || "India",
        manufacturerName: mfgName.trim(),
        manufacturerAddress: mfgAddress.trim()
      } : undefined,
      compatibleFor: compatibleFor.split(",").map(c => c.trim()).filter(Boolean),
      warranty: warranty.trim() || undefined,
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
      metaKeywords: metaKeywords.trim() || undefined,
      metaTitle: metaTitle.trim() || undefined,
      metaDescription: metaDescription.trim() || undefined,
      seo: (metaTitle || metaDescription || metaKeywords) ? {
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        metaKeywords: metaKeywords.trim() || undefined,
      } : undefined
    };

    // Strip undefined keys
    Object.keys(cleanPayload).forEach(key => {
      if (cleanPayload[key] === undefined) {
        delete cleanPayload[key];
      }
    });

    setLoading(true);
    try {
      let res = await fetchAdminApi(`/products/${initialProduct?.id}`, {
        method: "PATCH",
        body: JSON.stringify(cleanPayload)
      });

      // If item is not in backend database yet (404), persist it via POST
      if (res?.success === false && (res?.error?.code === "NOT_FOUND" || res?.statusCode === 404 || res?.message?.includes("not found"))) {
        res = await fetchAdminApi(`/products`, {
          method: "POST",
          body: JSON.stringify(cleanPayload)
        });
      }

      if (res?.success === false) {
        setError(res?.error?.message || res?.message || "Failed to update product in database");
      } else {
        try {
          const apiData = res?.data && typeof res.data === "object" && res.data.name ? res.data : {};
          const updatedProduct = {
            ...initialProduct,
            ...apiData,
            ...cleanPayload,
            id: apiData.id || initialProduct?.id,
            salesPrice: salesPrice ? Number(salesPrice) : undefined,
            salePrice: salesPrice ? Number(salesPrice) : undefined,
            offerPrice: offerPrice ? Number(offerPrice) : undefined,
            price: Number(price),
            originalPrice: Number(price),
            stock: Number(stock),
            image: thumbnail.trim() || (images.split(",").map(i => i.trim()).filter(Boolean)[0]) || initialProduct?.image,
            thumbnail: thumbnail.trim() || initialProduct?.thumbnail
          };
          localStorage.setItem("prc_admin_edit_product", JSON.stringify(updatedProduct));
          syncProductUpdate(updatedProduct, "UPDATE");
        } catch (e) {}

        setCurrentView("products");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-[#09090B] text-slate-900 dark:text-[#FAFAFA] px-3 py-1.5 sm:py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272A] focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6]/20 transition-all";
  const labelClass = "block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-[#A1A1AA] mb-1";
  const sectionTitleClass = "text-xs sm:text-sm font-bold text-slate-900 dark:text-[#FAFAFA] mb-3 flex items-center gap-1.5";
  const sectionContainerClass = "bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] rounded-2xl p-3.5 sm:p-5 shadow-sm";

  if (!initialProduct) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-3 sm:space-y-5 md:space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div>
          <button
            onClick={() => setCurrentView("products")}
            className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-slate-500 hover:text-[#8B5CF6] transition-colors mb-1"
          >
            <ChevronLeft size={12} />
            Back to Products
          </button>
          <h3 className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-[#FAFAFA] tracking-tight">
            Edit Product
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#71717A] mt-0.5">
            Editing: {initialProduct.name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-6">
        
        {/* ── Left Column (Main Form) ── */}
        <div className="lg:col-span-2 space-y-3.5 sm:space-y-6">
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
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!isCustomSlug) setSlug(generateSlug(e.target.value));
                  }}
                  placeholder="e.g. Luxury Solid Brass Handle"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelClass}>
                    Product URL Slug (Frontend Route) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomSlug(false);
                      setSlug(generateSlug(name));
                    }}
                    className="text-[10px] font-bold text-[#8B5CF6] hover:underline"
                  >
                    Auto-generate from Name
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-2 bg-slate-100 dark:bg-[#27272A] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono text-slate-500 dark:text-[#A1A1AA] flex-shrink-0 select-none">
                    /product/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setIsCustomSlug(true);
                      setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                    }}
                    placeholder="e.g. luxury-solid-brass-handle"
                    className={`${inputClass} font-mono text-xs`}
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Storefront URLs use this slug (e.g. <code>/product/{slug || "your-product-slug"}</code>) instead of the product ID.
                </p>
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
              <div className="flex items-center justify-between mb-3">
                <h4 className={sectionTitleClass}><Hash size={16} className="text-amber-500" />Inventory Control</h4>
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  <Lock size={10} />
                  <span>Ledger-Locked</span>
                </span>
              </div>

              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelClass}>Live Stock Across Warehouses</label>
                    <span className="text-[10px] text-slate-400 font-mono">Read-Only</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={stock}
                      readOnly
                      disabled
                      className="w-full bg-slate-100 dark:bg-[#141417] text-slate-600 dark:text-[#A1A1AA] px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#27272A] cursor-not-allowed font-mono font-bold select-none"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-bold text-[#8B5CF6]">
                      <Boxes size={13} />
                      <span>{Number(stock) > 0 ? `${stock} Units` : '0 Units'}</span>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-[#71717A] mt-1.5 leading-tight">
                    Stock can only be adjusted through the <strong className="text-slate-700 dark:text-[#FAFAFA]">Inventory Stock Page</strong> (Procurement Stock-In, Transfers, or Adjustments).
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-[#27272A] flex items-center justify-between">
                  <div>
                    <label className={labelClass}>Reorder Alert Threshold</label>
                    <span className="text-[10px] text-slate-400">Trigger low-stock alert</span>
                  </div>
                  <input
                    type="number"
                    value={reorderLevel}
                    onChange={(e) => setReorderLevel(e.target.value)}
                    placeholder="10"
                    min="0"
                    className="w-20 px-2.5 py-1.5 bg-slate-50 dark:bg-[#09090B] border border-slate-200 dark:border-[#27272A] rounded-xl text-xs font-mono text-right font-bold text-slate-800 dark:text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentView("inventory")}
                  className="w-full py-2 px-3 bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/20 border border-[#8B5CF6]/25 text-[#8B5CF6] dark:text-[#A855F7] rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 mt-1"
                >
                  <Warehouse size={13} />
                  <span>Manage Stock in Inventory Hub</span>
                  <ArrowUpRight size={13} />
                </button>
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
            <div className="flex items-center justify-between mb-3">
              <h4 className={sectionTitleClass}><Settings size={16} className="text-slate-500" />Custom Attributes</h4>
              <span className="text-xs text-slate-400">Select boolean value (defaults to False)</span>
            </div>
            <div className="space-y-3">
              {attributes.map((attr, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={attr.key}
                      onChange={(e) => handleAttributeChange(idx, 'key', e.target.value)}
                      placeholder="Attribute Name (e.g. Waterproof, Scratch Resistant)"
                      className={inputClass}
                    />
                  </div>
                  <div className="w-44 sm:w-52 flex-shrink-0">
                    <select
                      value={attr.value || "false"}
                      onChange={(e) => handleAttributeChange(idx, 'value', e.target.value)}
                      className={`${inputClass} font-semibold cursor-pointer`}
                    >
                      <option value="false">False (No)</option>
                      <option value="true">True (Yes)</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttribute(idx)}
                    className="p-2.5 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors flex-shrink-0"
                    title="Remove attribute"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addAttribute}
                className="text-xs font-bold text-[#8B5CF6] hover:underline flex items-center gap-1 mt-1"
              >
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

          {/* Frequently Paired Hardware Recommendations */}
          <div className={sectionContainerClass}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#27272A]">
              <div>
                <h4 className={sectionTitleClass}>
                  <Link2 size={16} className="text-amber-500" />
                  Frequently Paired Hardware
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Complementary hardware recommended to customers on the product details page.
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                {pairedProducts.length} Paired
              </span>
            </div>

            {/* Product Search for Pairing */}
            <div className="space-y-2 pt-2">
              <label className={labelClass}>Search & Add Complementary Products</label>
              <div className="relative">
                <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <input
                  type="text"
                  value={pairedSearchQuery}
                  onChange={(e) => handleSearchPaired(e.target.value)}
                  placeholder="Type product name or SKU to pair..."
                  className={`${inputClass} pl-9`}
                />
                {isSearchingPaired && (
                  <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-500 animate-spin" />
                )}
              </div>

              {/* Search Results Dropdown */}
              {pairedSearchResults.length > 0 && (
                <div className="p-2 rounded-xl bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] shadow-xl max-h-56 overflow-y-auto space-y-1.5 z-10">
                  {pairedSearchResults.map((prod) => (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.thumbnail || prod.image || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&fit=crop"}
                          alt={prod.name}
                          className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-zinc-100 line-clamp-1">{prod.name}</div>
                          <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">SKU: {prod.sku} • ₹{Number(prod.price).toLocaleString("en-IN")}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddPairedProduct(prod)}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Paired Products List with Reordering */}
            <div className="space-y-2 pt-2">
              <label className={labelClass}>Currently Paired Hardware List (Display Order)</label>
              {pairedProducts.length === 0 ? (
                <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-xs">
                  No paired hardware selected. Search above to add complementary hinges, handles, screws, or accessories.
                </div>
              ) : (
                <div className="space-y-2">
                  {pairedProducts.map((p, index) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#121214] border border-slate-200 dark:border-[#27272A] group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center font-mono text-xs text-slate-400 dark:text-zinc-600 font-bold">
                          #{index + 1}
                        </span>
                        <img
                          src={p.thumbnail || p.image || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&fit=crop"}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-zinc-100 line-clamp-1">{p.name}</div>
                          <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                            SKU: {p.sku} • ₹{Number(p.price).toLocaleString("en-IN")}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMovePaired(index, "up")}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                          title="Move Up"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={index === pairedProducts.length - 1}
                          onClick={() => handleMovePaired(index, "down")}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors"
                          title="Move Down"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePairedProduct(String(p.id))}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors ml-1"
                          title="Remove from paired"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SEO Info */}
          <div className={sectionContainerClass}>
            <h4 className={sectionTitleClass}><SearchIcon size={16} className="text-teal-500" />Search Engine Optimization (SEO) & Metadata</h4>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Meta Title</label>
                <input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="e.g. Luxury Brass Door Handles | PRC Hardware" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Meta Description</label>
                <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="SEO description displayed on search results..." rows={2} className={`${inputClass} resize-none`} />
              </div>
              <div>
                <label className={labelClass}>SEO Keywords / Search Terms</label>
                <input type="text" value={metaKeywords} onChange={(e) => setMetaKeywords(e.target.value)} placeholder="e.g. brass handles, mortise lock, architectural hardware, door pulls" className={inputClass} />
                <p className="text-[10px] text-slate-400 mt-1">Comma-separated keywords for search engine discovery and internal search indexing.</p>
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
              <label className={labelClass}>
                Material <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-normal">(Single source of truth)</span>
              </label>
              <select value={materialId} onChange={(e) => setMaterialId(e.target.value)} className={inputClass}>
                <option value="">Select Material (Optional)</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.gradeBadge ? `(${m.gradeBadge})` : ""}
                  </option>
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

            {/* Feature & Promotion Toggles */}
            <div className="pt-2 border-t border-slate-100 dark:border-[#27272A] space-y-3">
              <button type="button" onClick={() => setIsVisible(!isVisible)} className="w-full flex items-center justify-between group p-1 hover:bg-slate-50 dark:hover:bg-[#27272A]/50 rounded-xl transition">
                <span className="text-xs font-bold text-slate-700 dark:text-[#FAFAFA]">Visible to Public</span>
                {isVisible ? <ToggleRight size={28} className="text-[#8B5CF6]" /> : <ToggleLeft size={28} className="text-slate-300 dark:text-[#52525B]" />}
              </button>

              <button type="button" onClick={() => setIsFeatured(!isFeatured)} className="w-full flex items-center justify-between group p-1 hover:bg-slate-50 dark:hover:bg-[#27272A]/50 rounded-xl transition">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-fuchsia-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-[#FAFAFA]">Value for Money</span>
                </div>
                {isFeatured ? <ToggleRight size={28} className="text-fuchsia-500" /> : <ToggleLeft size={28} className="text-slate-300 dark:text-[#52525B]" />}
              </button>

              <button type="button" onClick={() => setIsBestseller(!isBestseller)} className="w-full flex items-center justify-between group p-1 hover:bg-slate-50 dark:hover:bg-[#27272A]/50 rounded-xl transition">
                <div className="flex items-center gap-2">
                  <Flame size={14} className="text-amber-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-[#FAFAFA]">Bestsellers</span>
                </div>
                {isBestseller ? <ToggleRight size={28} className="text-amber-500" /> : <ToggleLeft size={28} className="text-slate-300 dark:text-[#52525B]" />}
              </button>

              <button type="button" onClick={() => setIsInOffer(!isInOffer)} className="w-full flex items-center justify-between group p-1 hover:bg-slate-50 dark:hover:bg-[#27272A]/50 rounded-xl transition">
                <div className="flex items-center gap-2">
                  <Percent size={14} className="text-rose-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-[#FAFAFA]">On Offer</span>
                </div>
                {isInOffer ? <ToggleRight size={28} className="text-rose-500" /> : <ToggleLeft size={28} className="text-slate-300 dark:text-[#52525B]" />}
              </button>

              <button type="button" onClick={() => setIsNewArrival(!isNewArrival)} className="w-full flex items-center justify-between group p-1 hover:bg-slate-50 dark:hover:bg-[#27272A]/50 rounded-xl transition">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-sky-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-[#FAFAFA]">New Arrivals</span>
                </div>
                {isNewArrival ? <ToggleRight size={28} className="text-sky-500" /> : <ToggleLeft size={28} className="text-slate-300 dark:text-[#52525B]" />}
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
              {loading ? "Updating..." : "Update Product"}
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
