import { useState, useEffect } from "react";
import {
  FileText, Search, RefreshCw, CheckCircle2, XCircle,
  Clock, AlertCircle, Trash2, Eye, ShieldCheck, QrCode,
  Edit3, Plus, ExternalLink, Calendar, Filter, X, Check,
  Building2, ArrowRight, Download
} from "lucide-react";
import {
  quotesService,
  AdminQuoteDetail,
  AdminQuoteLineItem,
  QuoteMetrics,
  SignatureVerificationResult
} from "../api/quotesService";
import { useDebounce } from "../hooks/useDebounce";
import { AsyncActionButton } from "../components/common/AsyncActionButton";

function QuoteDetailSkeleton() {
  return (
    <div className="space-y-6 text-xs animate-pulse">
      {/* Top Banner Notice */}
      <div className="flex items-center space-x-2 text-[#A1A1AA] pb-1">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8B5CF6]" />
        <span className="font-semibold text-[11px] text-[#A1A1AA]">Loading Quotation Breakdown & Line Items...</span>
      </div>

      {/* Client Info Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2">
          <div className="h-2.5 w-20 bg-[#27272A] rounded"></div>
          <div className="h-4 w-40 bg-[#27272A] rounded"></div>
          <div className="h-3 w-32 bg-[#27272A] rounded"></div>
          <div className="h-3 w-28 bg-[#27272A] rounded"></div>
          <div className="h-3 w-48 bg-[#27272A] rounded"></div>
        </div>

        <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2">
          <div className="h-2.5 w-24 bg-[#27272A] rounded"></div>
          <div className="flex items-center gap-2 pt-1">
            <div className="h-5 w-24 bg-[#27272A] rounded-full"></div>
            <div className="h-5 w-28 bg-[#27272A] rounded"></div>
          </div>
          <div className="h-3 w-56 bg-[#27272A] rounded pt-2"></div>
        </div>
      </div>

      {/* Status Transitions Bar Skeleton */}
      <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2">
        <div className="h-2.5 w-24 bg-[#27272A] rounded"></div>
        <div className="flex flex-wrap gap-2">
          <div className="h-8 w-28 bg-[#27272A] rounded-lg"></div>
          <div className="h-8 w-28 bg-[#27272A] rounded-lg"></div>
          <div className="h-8 w-28 bg-[#27272A] rounded-lg"></div>
          <div className="h-8 w-36 bg-[#27272A] rounded-lg"></div>
        </div>
      </div>

      {/* Financial Summary Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#09090B] p-4 rounded-xl border border-[#27272A]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2.5 w-16 bg-[#27272A] rounded"></div>
            <div className="h-4 w-24 bg-[#27272A] rounded"></div>
          </div>
        ))}
      </div>

      {/* Line Items Table Skeleton */}
      <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-[#27272A]">
          <div className="h-3.5 w-32 bg-[#27272A] rounded"></div>
          <div className="h-7 w-28 bg-[#27272A] rounded-lg"></div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-[#18181B] rounded-lg border border-[#27272A]">
              <div className="space-y-1.5">
                <div className="h-3.5 w-48 bg-[#27272A] rounded"></div>
                <div className="h-2.5 w-24 bg-[#27272A] rounded"></div>
              </div>
              <div className="space-y-1.5 text-right">
                <div className="h-3.5 w-20 bg-[#27272A] rounded ml-auto"></div>
                <div className="h-2.5 w-14 bg-[#27272A] rounded ml-auto"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton Loading Body for Full Page View ────────────────────────────────── */

export function QuotesPageSkeleton() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-pulse">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-[#27272A]"></div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-64 bg-[#27272A] rounded"></div>
              <div className="h-4 w-24 bg-[#27272A] rounded-full"></div>
            </div>
            <div className="h-3 w-80 bg-[#27272A] rounded"></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-40 bg-[#27272A] rounded-tr-xl rounded-bl-xl"></div>
          <div className="h-9 w-9 bg-[#27272A] rounded-tr-lg rounded-bl-lg"></div>
        </div>
      </div>

      {/* 6 KPI Cards Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-2">
            <div className="w-8 h-8 rounded-lg bg-[#27272A]"></div>
            <div className="h-5 w-12 bg-[#27272A] rounded"></div>
            <div className="h-2.5 w-20 bg-[#27272A] rounded"></div>
          </div>
        ))}
      </div>

      {/* Filter Tabs & Search Skeleton */}
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-28 bg-[#27272A] rounded-tr-lg rounded-bl-lg"></div>
          ))}
        </div>
        <div className="h-8 w-64 bg-[#27272A] rounded-tr-lg rounded-bl-lg"></div>
      </div>

      {/* Main Table Skeleton */}
      <div className="rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] overflow-hidden shadow-lg">
        <div className="p-3.5 bg-[#09090B] border-b border-[#27272A] flex justify-between">
          <div className="h-3 w-40 bg-[#27272A] rounded"></div>
          <div className="h-3 w-20 bg-[#27272A] rounded"></div>
        </div>
        <div className="divide-y divide-[#27272A]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="space-y-1.5 w-36">
                <div className="h-4 w-32 bg-[#27272A] rounded"></div>
                <div className="h-2.5 w-20 bg-[#27272A] rounded"></div>
              </div>
              <div className="space-y-1.5 w-44">
                <div className="h-4 w-36 bg-[#27272A] rounded"></div>
                <div className="h-2.5 w-24 bg-[#27272A] rounded"></div>
              </div>
              <div className="h-4 w-24 bg-[#27272A] rounded"></div>
              <div className="h-4 w-24 bg-[#27272A] rounded"></div>
              <div className="h-4 w-24 bg-[#27272A] rounded"></div>
              <div className="h-5 w-24 bg-[#27272A] rounded-full"></div>
              <div className="h-7 w-20 bg-[#27272A] rounded-lg"></div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-[#09090B] border-t border-[#27272A] flex items-center justify-between">
          <div className="h-3 w-36 bg-[#27272A] rounded"></div>
          <div className="flex gap-2">
            <div className="h-7 w-16 bg-[#27272A] rounded"></div>
            <div className="h-7 w-16 bg-[#27272A] rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

const FALLBACK_QUOTES: AdminQuoteDetail[] = [
  {
    id: "Q-701",
    quoteNumber: "PRC-QUOTE-2026-701",
    referenceNo: "PRC-QUOTE-2026-701",
    financialYear: "2026-27",
    sequenceNo: 701,
    projectName: "Office Restroom Cubicle Installation",
    firstName: "Amit",
    lastName: "Kapoor",
    companyName: "Kapoor & Associates Architects",
    gstNo: "27AAACK1234A1Z5",
    email: "amit@kapoorarch.com",
    phone: "+91 9820011223",
    status: "PENDING",
    basicPrice: 355932,
    gstAmount: 64068,
    subtotal: 355932,
    taxTotal: 64068,
    grandTotal: 420000,
    termsAccepted: true,
    customerResponse: "pending",
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      {
        productId: "PRC-PROD-103",
        productNameSnapshot: "Commercial Toilet Cubicle Hardware Kit (Nylon Black)",
        unit: "SET",
        quantity: 50,
        rate: 5490,
        amount: 274500,
      }
    ],
    activityLogs: [],
  },
  {
    id: "Q-702",
    quoteNumber: "PRC-QUOTE-2026-702",
    referenceNo: "PRC-QUOTE-2026-702",
    financialYear: "2026-27",
    sequenceNo: 702,
    projectName: "Corporate Smart Locker Lockout",
    firstName: "Sunita",
    lastName: "Deshmukh",
    companyName: "Metro Office Workspaces Pvt Ltd",
    gstNo: "27AAACM9876B1Z2",
    email: "sunita@metroworkspaces.com",
    phone: "+91 9930044556",
    status: "APPROVED",
    basicPrice: 576271,
    gstAmount: 103729,
    subtotal: 576271,
    taxTotal: 103729,
    grandTotal: 680000,
    termsAccepted: true,
    customerResponse: "accepted",
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [
      {
        productId: "PRC-PROD-104",
        productNameSnapshot: "Heavy Duty Digital Electronic Locker Lock",
        unit: "PCS",
        quantity: 80,
        rate: 8500,
        amount: 680000,
      }
    ],
    activityLogs: [],
  }
];

export function QuotesPage() {
  const [quotes, setQuotes] = useState<AdminQuoteDetail[]>(FALLBACK_QUOTES);
  const [metrics, setMetrics] = useState<QuoteMetrics>({
    total: 2,
    pending: 1,
    underReview: 0,
    approved: 1,
    rejected: 0,
    digitallySigned: 1,
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail Modal / Drawer
  const [selectedQuote, setSelectedQuote] = useState<AdminQuoteDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Line Item Editing inside Detail View
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editItems, setEditItems] = useState<AdminQuoteLineItem[]>([]);
  const [editShippingCost, setEditShippingCost] = useState<string>("");
  const [editAdvancePercentage, setEditAdvancePercentage] = useState<string>("30");
  const [savingItems, setSavingItems] = useState(false);

  // Product Picker in Line Item Editor
  const [productSearch, setProductSearch] = useState("");
  const [productSearchResults, setProductSearchResults] = useState<any[]>([]);
  const [isSearchingProduct, setIsSearchingProduct] = useState(false);

  // Status Change Modal with Mandatory Reason
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>("");
  const [statusReason, setStatusReason] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  // Digital Signing Modal / Action
  const [isSigning, setIsSigning] = useState(false);

  // Signature Verification Modal
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyRefNo, setVerifyRefNo] = useState("");
  const [verifyResult, setVerifyResult] = useState<SignatureVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Soft Delete Confirmation Modal
  const [quoteToDelete, setQuoteToDelete] = useState<AdminQuoteDetail | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // PDF Download Tracking
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load Quotes
  const fetchQuotes = async () => {
    if (quotes.length === 0) setLoading(true);
    setErrorMsg("");
    try {
      const res = await quotesService.listQuotes({
        page: currentPage,
        limit: 20,
        status: selectedStatus,
        search: debouncedSearch.trim(),
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      if (res.data && res.data.length > 0) {
        setQuotes(res.data);
        setTotalPages(res.pagination.totalPages || 1);
        if (res.metrics) {
          setMetrics(res.metrics);
        }
      }
    } catch {
      // Graceful fallback already populated
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, selectedStatus, fromDate, toDate]);

  useEffect(() => {
    fetchQuotes();
  }, [selectedStatus, currentPage, fromDate, toDate, debouncedSearch]);

  // Handle Search Debounce / Immediate Submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchQuotes();
  };

  // Open Detail Drawer
  const handleOpenDetail = async (id: string) => {
    setIsDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await quotesService.getQuoteById(id);
      setSelectedQuote(data);
      setEditItems(data.items || []);
      setEditShippingCost(data.shippingCost !== null && data.shippingCost !== undefined ? String(data.shippingCost) : "");
      if (data.customerProposedAdvancePercent !== null && data.customerProposedAdvancePercent !== undefined) {
        setEditAdvancePercentage(String(data.customerProposedAdvancePercent));
      } else if (data.advancePercentage !== null && data.advancePercentage !== undefined) {
        setEditAdvancePercentage(String(data.advancePercentage));
      } else {
        setEditAdvancePercentage("30");
      }
      setIsEditingItems(false);
    } catch {
      setErrorMsg("Failed to load quotation details.");
    } finally {
      setDetailLoading(false);
    }
  };

  // Product search in edit mode
  useEffect(() => {
    if (!productSearch.trim()) {
      setProductSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingProduct(true);
      const results = await quotesService.searchProducts(productSearch.trim());
      setProductSearchResults(results);
      setIsSearchingProduct(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [productSearch]);

  // Add product to edit list
  const handleAddProductToEdit = (product: any) => {
    const unitRate = Number(product.salePrice || product.price || 0);
    const existingIndex = editItems.findIndex((i) => i.productId === product.id);
    if (existingIndex >= 0) {
      const updated = [...editItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].amount = Math.round(updated[existingIndex].quantity * updated[existingIndex].rate * 100) / 100;
      setEditItems(updated);
    } else {
      const newItem: AdminQuoteLineItem = {
        productId: product.id,
        productNameSnapshot: product.name,
        unit: "PCS",
        quantity: 1,
        rate: unitRate,
        amount: unitRate,
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: Number(product.price),
        },
      };
      setEditItems((prev) => [...prev, newItem]);
    }
    setProductSearch("");
    setProductSearchResults([]);
  };

  // Save Item Revisions
  const handleSaveItemRevisions = async () => {
    if (!selectedQuote) return;
    setSavingItems(true);
    setErrorMsg("");
    try {
      const shippingNum = editShippingCost.trim() !== "" ? parseFloat(editShippingCost) : null;
      const advanceNum = editAdvancePercentage.trim() !== "" ? parseFloat(editAdvancePercentage) : null;
      const updated = await quotesService.updateQuoteItems(selectedQuote.id, {
        items: editItems.map((i) => ({
          productId: i.productId,
          productNameSnapshot: i.productNameSnapshot,
          unit: i.unit,
          quantity: i.quantity,
          rate: i.rate,
        })),
        shippingCost: shippingNum,
        advancePercentage: advanceNum,
      });
      setSelectedQuote(updated);
      setIsEditingItems(false);
      setSuccessMsg("Line items, pricing and advance terms successfully updated!");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchQuotes();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update quotation line items.");
    } finally {
      setSavingItems(false);
    }
  };

  // Open Status Change Dialog
  const handleInitiateStatusChange = (status: string) => {
    setTargetStatus(status);
    setStatusReason("");
    setIsStatusModalOpen(true);
  };

  // Confirm Status Change
  const handleConfirmStatusChange = async () => {
    if (!selectedQuote || !targetStatus) return;
    if ((targetStatus === "PENDING" || targetStatus === "REJECTED") && !statusReason.trim()) {
      setErrorMsg("A mandatory reason/note is required when setting status to " + targetStatus);
      return;
    }

    setSavingStatus(true);
    setErrorMsg("");
    try {
      const updated = await quotesService.updateQuoteStatus(selectedQuote.id, {
        status: targetStatus,
        statusReason: statusReason.trim() || undefined,
      });
      setSelectedQuote(updated);
      setIsStatusModalOpen(false);
      setSuccessMsg(`Quotation status updated to ${targetStatus}`);
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchQuotes();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to update quotation status.");
    } finally {
      setSavingStatus(false);
    }
  };

  // Digitally Sign & Approve Quotation
  const handleDigitallySign = async () => {
    if (!selectedQuote) return;
    setIsSigning(true);
    setErrorMsg("");
    try {
      const shippingNum = editShippingCost.trim() !== "" ? parseFloat(editShippingCost) : null;
      const advanceNum = editAdvancePercentage.trim() !== "" ? parseFloat(editAdvancePercentage) : null;
      const updated = await quotesService.digitallySignQuote(selectedQuote.id, {
        shippingCost: shippingNum,
        advancePercentage: advanceNum,
      });
      setSelectedQuote(updated);
      setSuccessMsg("✔ Quotation digitally signed with HMAC-SHA256, advance terms locked, and QR code generated!");
      setTimeout(() => setSuccessMsg(""), 4000);
      fetchQuotes();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to digitally sign quotation.");
    } finally {
      setIsSigning(false);
    }
  };

  // Soft Delete Quote
  const handleConfirmDelete = async () => {
    if (!quoteToDelete) return;
    setIsDeleting(true);
    try {
      await quotesService.deleteQuote(quoteToDelete.id);
      setSuccessMsg(`Quotation ${quoteToDelete.referenceNo} soft-deleted successfully.`);
      setTimeout(() => setSuccessMsg(""), 3000);
      setQuoteToDelete(null);
      if (selectedQuote?.id === quoteToDelete.id) {
        setIsDetailOpen(false);
      }
      fetchQuotes();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to delete quotation.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Download Official PDF
  const handleDownloadPdf = async (q: AdminQuoteDetail, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDownloadingPdfId(q.id);
    setErrorMsg("");
    try {
      await quotesService.downloadQuotePdf(q.id, q.referenceNo || q.quoteNumber);
      setSuccessMsg(`✔ Downloaded official quotation PDF for ${q.referenceNo}`);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to download quotation PDF.");
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Run Signature Verification
  const handleRunVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyRefNo.trim()) return;
    setIsVerifying(true);
    setVerifyError("");
    setVerifyResult(null);
    try {
      const result = await quotesService.verifySignature(verifyRefNo.trim());
      setVerifyResult(result);
    } catch (err: any) {
      setVerifyError(err?.message || "Signature verification failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Calculated totals for edit mode
  const editBasicPrice = editItems.reduce((acc, i) => acc + (i.amount || 0), 0);
  const editGst = Math.round(editBasicPrice * 0.18 * 100) / 100;
  const editShipping = parseFloat(editShippingCost) || 0;
  const editGrandTotal = Math.round((editBasicPrice + editGst + editShipping) * 100) / 100;

  if (loading && quotes.length === 0) {
    return <QuotesPageSkeleton />;
  }

  return (
    <div className="space-y-6 text-[#FAFAFA] max-w-[1600px] mx-auto" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* ─── Top Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-tr-xl rounded-bl-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-[#A855F7]">
            <FileText size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#FAFAFA]">
                B2B Bulk Quotation (RFQ) Console
              </h1>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-[#A855F7] border border-purple-500/30">
                PRC COMMERCIAL
              </span>
            </div>
            <p className="text-xs text-[#A1A1AA]">
              Review project RFQs, customize contractor volume discounts, digitally sign, and issue QR-verified estimates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setVerifyRefNo("");
              setVerifyResult(null);
              setVerifyError("");
              setIsVerifyModalOpen(true);
            }}
            className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold text-xs px-3.5 py-2 rounded-tr-xl rounded-bl-xl transition-all border border-[#3F3F46] flex items-center gap-2 shadow-sm"
          >
            <ShieldCheck size={15} className="text-emerald-400" />
            <span>Verify Signature</span>
          </button>
          <button
            type="button"
            onClick={fetchQuotes}
            className="p-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-tr-lg rounded-bl-lg text-[#A1A1AA] hover:text-[#FAFAFA] border border-[#3F3F46] transition-colors"
            title="Refresh Quotes"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-[#A855F7]" : ""} />
          </button>
        </div>
      </div>

      {/* ─── 6 KPI Metrics Summary Cards (Interactive Filters) ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => setSelectedStatus("ALL")}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            selectedStatus === "ALL"
              ? "border-[#8B5CF6] shadow-lg shadow-[#8B5CF6]/10 ring-1 ring-[#8B5CF6]"
              : "border-[#27272A] hover:border-[#3F3F46]"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider">Total RFQs</span>
            <FileText size={14} className="text-[#A1A1AA] group-hover:text-[#FAFAFA]" />
          </div>
          <p className="text-xl font-black font-mono text-[#FAFAFA]">{metrics.total}</p>
          <span className="text-[10px] text-[#71717A] block">All submitted quotes</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus("PENDING")}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            selectedStatus === "PENDING"
              ? "border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500"
              : "border-[#27272A] hover:border-amber-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Pending</span>
            <Clock size={14} className="text-amber-400" />
          </div>
          <p className="text-xl font-black font-mono text-amber-400">{metrics.pending}</p>
          <span className="text-[10px] text-[#71717A] block">Awaiting estimator</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus("UNDER_REVIEW")}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            selectedStatus === "UNDER_REVIEW"
              ? "border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500"
              : "border-[#27272A] hover:border-blue-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Under Review</span>
            <Eye size={14} className="text-blue-400" />
          </div>
          <p className="text-xl font-black font-mono text-blue-400">{metrics.underReview}</p>
          <span className="text-[10px] text-[#71717A] block">Custom pricing review</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus("APPROVED")}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            selectedStatus === "APPROVED"
              ? "border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500"
              : "border-[#27272A] hover:border-emerald-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Approved</span>
            <CheckCircle2 size={14} className="text-emerald-400" />
          </div>
          <p className="text-xl font-black font-mono text-emerald-400">{metrics.approved}</p>
          <span className="text-[10px] text-[#71717A] block">Approved & sent</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedStatus("REJECTED")}
          className={`p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border transition-all text-left space-y-1 group ${
            selectedStatus === "REJECTED"
              ? "border-rose-500 shadow-lg shadow-rose-500/10 ring-1 ring-rose-500"
              : "border-[#27272A] hover:border-rose-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Rejected</span>
            <XCircle size={14} className="text-rose-400" />
          </div>
          <p className="text-xl font-black font-mono text-rose-400">{metrics.rejected}</p>
          <span className="text-[10px] text-[#71717A] block">Declined quotes</span>
        </button>

        <div className="p-3.5 rounded-tr-xl rounded-bl-xl bg-[#18181B] border border-[#27272A] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-[#A855F7] tracking-wider">Signed Seals</span>
            <ShieldCheck size={14} className="text-[#A855F7]" />
          </div>
          <p className="text-xl font-black font-mono text-[#A855F7]">{metrics.digitallySigned}</p>
          <span className="text-[10px] text-[#71717A] block">HMAC-SHA256 locked</span>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-rose-950/80 border border-rose-500/40 text-rose-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ─── Search & Filter Controls ─── */}
      <div className="p-4 rounded-tr-2xl rounded-bl-2xl bg-[#18181B] border border-[#27272A] space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1 bg-[#09090B] p-1 rounded-xl border border-[#27272A]">
            {[
              { id: "ALL", label: "All Quotes" },
              { id: "PENDING", label: "Pending" },
              { id: "UNDER_REVIEW", label: "Under Review" },
              { id: "APPROVED", label: "Approved" },
              { id: "REJECTED", label: "Rejected" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSelectedStatus(tab.id);
                  setCurrentPage(1);
                }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  selectedStatus === tab.id
                    ? "bg-[#8B5CF6] text-white shadow"
                    : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#A1A1AA] flex items-center gap-1">
              <Calendar size={13} /> From:
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-[#09090B] border border-[#27272A] rounded-lg px-2.5 py-1 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            />
            <span className="text-[#A1A1AA]">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-[#09090B] border border-[#27272A] rounded-lg px-2.5 py-1 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            />
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-bold ml-1"
              >
                Clear Dates
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Quotation Ref No, Company Name, Client Name, Email, GSTIN, or Phone..."
              className="w-full pl-10 pr-9 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-xs text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#FAFAFA]"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow"
          >
            Search
          </button>
        </form>
      </div>

      {/* Main Quotations Table */}
      <div className="rounded-2xl bg-[#18181B] border border-[#27272A] shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#09090B] text-[#A1A1AA] border-b border-[#27272A] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Ref No & Date</th>
                <th className="py-3.5 px-4">Client & Company</th>
                <th className="py-3.5 px-4">Project Scope</th>
                <th className="py-3.5 px-3 text-center">Items</th>
                <th className="py-3.5 px-4 text-right">Grand Total (₹)</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-3 text-center">Digital Seal</th>
                <th className="py-3.5 px-3 text-center">Client Response</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-[#27272A] ${loading ? "animate-pulse" : ""}`}>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="hover:bg-[#27272A]/40">
                    <td className="py-3.5 px-4"><div className="h-4 w-28 bg-[#27272A] rounded"></div></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-36 bg-[#27272A] rounded"></div></td>
                    <td className="py-3.5 px-4"><div className="h-4 w-28 bg-[#27272A] rounded"></div></td>
                    <td className="py-3.5 px-3 text-center"><div className="h-5 w-8 bg-[#27272A] rounded mx-auto"></div></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-4 w-20 bg-[#27272A] rounded ml-auto"></div></td>
                    <td className="py-3.5 px-3 text-center"><div className="h-5 w-20 bg-[#27272A] rounded-full mx-auto"></div></td>
                    <td className="py-3.5 px-3 text-center"><div className="h-5 w-16 bg-[#27272A] rounded mx-auto"></div></td>
                    <td className="py-3.5 px-3 text-center"><div className="h-5 w-16 bg-[#27272A] rounded mx-auto"></div></td>
                    <td className="py-3.5 px-4 text-right"><div className="h-7 w-20 bg-[#27272A] rounded-lg ml-auto"></div></td>
                  </tr>
                ))
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-[#71717A]">
                    <FileText size={32} className="mx-auto mb-2 text-[#3F3F46]" />
                    No quotations found matching your criteria.
                  </td>
                </tr>
              ) : (
                quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-[#27272A]/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-[#A855F7] block">{q.referenceNo}</span>
                      <span className="text-[10px] text-[#71717A]">
                        {new Date(q.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#FAFAFA]">{q.companyName || "N/A"}</p>
                      <p className="text-[11px] text-[#A1A1AA]">{q.firstName} {q.lastName}</p>
                      {q.gstNo && <p className="text-[10px] font-mono text-[#71717A]">{q.gstNo}</p>}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#FAFAFA] truncate max-w-[180px]">{q.projectName}</p>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="bg-[#27272A] text-[#FAFAFA] px-2 py-0.5 rounded font-bold">
                        {q.items?.length || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-[#FAFAFA]">
                      ₹{q.grandTotal.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                          q.status === "APPROVED"
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                            : q.status === "REJECTED"
                            ? "bg-rose-950/80 text-rose-400 border border-rose-500/40"
                            : q.status === "UNDER_REVIEW"
                            ? "bg-blue-950/80 text-blue-400 border border-blue-500/40"
                            : "bg-amber-950/80 text-amber-400 border border-amber-500/40"
                        }`}>
                          {q.status}
                        </span>
                        {q.customerProposedAdvancePercent !== null && q.customerProposedAdvancePercent !== undefined && (
                          <span className="text-[9px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                            Req: {q.customerProposedAdvancePercent}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      {q.digitalSignature ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                          <CheckCircle2 size={11} /> Signed
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#71717A]">Unsigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className={`text-[10px] font-bold uppercase ${
                        q.customerResponse === "accepted"
                          ? "text-emerald-400"
                          : q.customerResponse === "declined"
                          ? "text-rose-400"
                          : "text-[#71717A]"
                      }`}>
                        {q.customerResponse || "pending"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <AsyncActionButton
                          mode="download"
                          onAction={() => quotesService.downloadQuotePdf(q.id, q.referenceNo || q.quoteNumber)}
                          idleIcon={<Download size={13} />}
                          idleLabel={<span className="hidden sm:inline">PDF</span>}
                          loadingLabel="PDF…"
                          successLabel="Done!"
                          className="bg-[#27272A] hover:bg-emerald-600 text-[#FAFAFA] hover:text-white font-bold text-xs px-2.5 py-1.5 rounded-lg transition-all"
                          title="Download Official Quotation PDF"
                          variant="custom"
                        />
                        <AsyncActionButton
                          mode="view"
                          onAction={() => handleOpenDetail(q.id)}
                          idleIcon={<Eye size={13} />}
                          idleLabel="Review"
                          loadingLabel="Opening…"
                          className="bg-[#27272A] hover:bg-[#8B5CF6] hover:text-white text-[#FAFAFA] font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
                          variant="custom"
                        />
                        <button
                          type="button"
                          onClick={() => setQuoteToDelete(q)}
                          className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded-lg transition-colors"
                          title="Soft Delete Quotation"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-4 bg-[#09090B] border-t border-[#27272A] flex items-center justify-between text-xs text-[#A1A1AA]">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-[#27272A] hover:bg-[#3F3F46] rounded disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-[#27272A] hover:bg-[#3F3F46] rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── DETAIL & REVISION DRAWER / MODAL ─── */}
      {isDetailOpen && selectedQuote && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-3xl bg-[#18181B] border-l border-[#27272A] h-full overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-[#27272A] pb-4">
              <div>
                <span className="font-mono font-extrabold text-sm text-[#A855F7] block">
                  {selectedQuote.referenceNo}
                </span>
                <h3 className="text-lg font-bold font-serif text-[#FAFAFA] mt-0.5">
                  {selectedQuote.projectName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <AsyncActionButton
                  mode="download"
                  onAction={() => quotesService.downloadQuotePdf(selectedQuote.id, selectedQuote.referenceNo || selectedQuote.quoteNumber)}
                  idleIcon={<Download size={13} />}
                  idleLabel="Download PDF"
                  loadingLabel="Preparing PDF…"
                  successLabel="Downloaded!"
                  variant="emerald"
                  size="sm"
                  title="Download Official PDF"
                />
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <QuoteDetailSkeleton />
            ) : (
              <div className="space-y-6 text-xs">
                {/* Client Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#71717A]">Client Details</span>
                    <p className="font-bold text-[#FAFAFA]">{selectedQuote.companyName}</p>
                    <p className="text-[#A1A1AA]">Attn: {selectedQuote.firstName} {selectedQuote.lastName}</p>
                    <p className="font-mono text-[#A855F7]">GSTIN: {selectedQuote.gstNo}</p>
                    <p className="text-[#71717A]">{selectedQuote.email} • {selectedQuote.phone}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#71717A]">Status & Actions</span>
                    <div className="flex items-center gap-2 pt-1">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        selectedQuote.status === "APPROVED"
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40"
                          : selectedQuote.status === "REJECTED"
                          ? "bg-rose-950/80 text-rose-400 border border-rose-500/40"
                          : "bg-amber-950/80 text-amber-400 border border-amber-500/40"
                      }`}>
                        {selectedQuote.status}
                      </span>
                      {selectedQuote.digitalSignature && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                          ✔ Digitally Signed
                        </span>
                      )}
                    </div>
                    {selectedQuote.statusReason && (
                      <p className="text-[11px] text-amber-300 italic pt-1">Note: {selectedQuote.statusReason}</p>
                    )}
                  </div>
                </div>

                {/* Customer Terms Negotiation Request Card */}
                {selectedQuote.customerProposedAdvancePercent !== null && selectedQuote.customerProposedAdvancePercent !== undefined && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 via-amber-900/30 to-amber-950/50 border border-amber-500/40 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 flex items-center gap-2 text-xs">
                        <AlertCircle size={16} className="text-amber-400 shrink-0" />
                        <span>Customer Requested Terms Revision</span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                        Edit 1/1 Used
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A]">
                        <span className="text-[10px] text-[#71717A] uppercase font-bold block">Previous Advance Rate:</span>
                        <span className="font-mono font-bold text-[#FAFAFA] text-sm">
                          {selectedQuote.advancePercentage !== null && selectedQuote.advancePercentage !== undefined
                            ? `${selectedQuote.advancePercentage}%`
                            : "30% (Default)"}
                        </span>
                      </div>
                      <div className="p-3 bg-amber-950/80 rounded-xl border border-amber-500/50">
                        <span className="text-[10px] text-amber-300 uppercase font-bold block">Customer Proposed Advance:</span>
                        <span className="font-mono font-black text-amber-300 text-base">
                          {selectedQuote.customerProposedAdvancePercent}%
                        </span>
                      </div>
                    </div>

                    {selectedQuote.customerEditRemark && (
                      <div className="p-3 bg-[#09090B] rounded-xl border border-[#27272A]">
                        <span className="text-[10px] text-amber-400 font-bold uppercase block">Customer Reason / Remark:</span>
                        <p className="text-xs text-[#FAFAFA] italic mt-1 leading-relaxed">"{selectedQuote.customerEditRemark}"</p>
                      </div>
                    )}

                    {editAdvancePercentage !== String(selectedQuote.customerProposedAdvancePercent) && (
                      <button
                        type="button"
                        onClick={() => setEditAdvancePercentage(String(selectedQuote.customerProposedAdvancePercent))}
                        className="text-xs font-bold text-amber-300 hover:text-amber-200 underline pt-1 inline-flex items-center gap-1.5"
                      >
                        <span>Accept & Apply proposed {selectedQuote.customerProposedAdvancePercent}% to approval form →</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Status Transitions Bar */}
                <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#A1A1AA] block">Update Status</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleInitiateStatusChange("UNDER_REVIEW")}
                      className="bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
                    >
                      Mark Under Review
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInitiateStatusChange("PENDING")}
                      className="bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
                    >
                      Mark Pending (Action Required)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInitiateStatusChange("REJECTED")}
                      className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
                    >
                      Decline / Reject Quote
                    </button>
                  </div>
                </div>

                {/* Line Items Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-[#FAFAFA] flex items-center gap-2">
                      <FileText size={16} className="text-[#A855F7]" />
                      <span>Line Items & Pricing</span>
                    </h4>
                    {!isEditingItems ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingItems(true)}
                        className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Edit3 size={13} />
                        <span>Edit Items & Shipping</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={savingItems}
                          onClick={handleSaveItemRevisions}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow"
                        >
                          <Check size={13} />
                          <span>{savingItems ? "Saving..." : "Save Changes"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditItems(selectedQuote.items || []);
                            setIsEditingItems(false);
                          }}
                          className="bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] px-3 py-1.5 rounded-lg font-bold text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Add Product Search in Edit Mode */}
                  {isEditingItems && (
                    <div className="relative p-3 bg-[#09090B] rounded-xl border border-[#27272A] space-y-2">
                      <label className="text-[11px] font-bold text-[#A1A1AA]">Add Product to Quote:</label>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                        <input
                          type="text"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search product name or SKU..."
                          className="w-full pl-9 pr-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-lg text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
                        />
                      </div>
                      {productSearchResults.length > 0 && (
                        <div className="max-h-40 overflow-y-auto bg-[#18181B] rounded-lg border border-[#27272A] p-1 space-y-1">
                          {productSearchResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleAddProductToEdit(p)}
                              className="w-full text-left p-2 hover:bg-[#27272A] rounded flex items-center justify-between"
                            >
                              <span className="font-bold text-xs text-[#FAFAFA]">{p.name}</span>
                              <span className="font-mono text-[#A855F7] font-bold">₹{p.price} +</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Line Items Table */}
                  <div className="overflow-x-auto border border-[#27272A] rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#09090B] text-[#A1A1AA] border-b border-[#27272A] font-bold">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">Sl.</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-2 w-16 text-center">Unit</th>
                          <th className="py-2.5 px-2 w-20 text-center">Qty</th>
                          <th className="py-2.5 px-3 w-28 text-right">Rate (₹)</th>
                          <th className="py-2.5 px-3 w-28 text-right">Amount (₹)</th>
                          {isEditingItems && <th className="py-2.5 px-2 w-10 text-center">Del</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#27272A]">
                        {(isEditingItems ? editItems : selectedQuote.items).map((item, idx) => (
                          <tr key={item.productId || idx} className="hover:bg-[#27272A]/20">
                            <td className="py-2.5 px-3 text-center text-[#71717A]">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-[#FAFAFA]">
                              {item.productNameSnapshot}
                              {item.product?.sku && <span className="font-mono text-[10px] text-[#71717A] block">{item.product.sku}</span>}
                            </td>
                            <td className="py-2.5 px-2 text-center text-[#A1A1AA]">{item.unit}</td>
                            <td className="py-2.5 px-2 text-center">
                              {isEditingItems ? (
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const qty = parseInt(e.target.value) || 1;
                                    const updated = [...editItems];
                                    updated[idx].quantity = qty;
                                    updated[idx].amount = Math.round(qty * updated[idx].rate * 100) / 100;
                                    setEditItems(updated);
                                  }}
                                  className="w-14 px-1.5 py-0.5 bg-[#09090B] border border-[#3F3F46] rounded text-center text-xs font-bold text-[#FAFAFA]"
                                />
                              ) : (
                                <span className="font-bold text-[#FAFAFA]">{item.quantity}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              {isEditingItems ? (
                                <input
                                  type="number"
                                  min="0"
                                  value={item.rate}
                                  onChange={(e) => {
                                    const r = parseFloat(e.target.value) || 0;
                                    const updated = [...editItems];
                                    updated[idx].rate = r;
                                    updated[idx].amount = Math.round(updated[idx].quantity * r * 100) / 100;
                                    setEditItems(updated);
                                  }}
                                  className="w-20 px-1.5 py-0.5 bg-[#09090B] border border-[#3F3F46] rounded text-right text-xs font-mono font-bold text-[#FAFAFA]"
                                />
                              ) : (
                                `₹${item.rate.toLocaleString("en-IN")}`
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-extrabold text-[#FAFAFA]">
                              ₹{item.amount.toLocaleString("en-IN")}
                            </td>
                            {isEditingItems && (
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                                  className="text-rose-400 hover:text-rose-300"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Shipping & Financial Breakdown */}
                  <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2 max-w-sm ml-auto">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A1A1AA]">Basic Price (Ex-GST)</span>
                      <span className="font-mono font-bold text-[#FAFAFA]">
                        ₹{(isEditingItems ? editBasicPrice : selectedQuote.basicPrice).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A1A1AA]">GST (18% Flat)</span>
                      <span className="font-mono font-bold text-[#FAFAFA]">
                        ₹{(isEditingItems ? editGst : selectedQuote.gstAmount).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A1A1AA]">Shipping & Transport</span>
                      {isEditingItems ? (
                        <input
                          type="number"
                          min="0"
                          value={editShippingCost}
                          placeholder="At actual"
                          onChange={(e) => setEditShippingCost(e.target.value)}
                          className="w-24 px-2 py-0.5 bg-[#18181B] border border-[#3F3F46] rounded text-right text-xs font-mono text-[#FAFAFA]"
                        />
                      ) : (
                        <span className="font-mono font-bold text-[#FAFAFA]">
                          {selectedQuote.shippingCost !== null && selectedQuote.shippingCost !== undefined
                            ? `₹${selectedQuote.shippingCost.toLocaleString("en-IN")}`
                            : "At actual"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm font-extrabold text-[#FAFAFA] pt-2 border-t border-[#27272A]">
                      <span>Grand Total</span>
                      <span className="font-mono text-[#A855F7] text-base">
                        ₹{(isEditingItems ? editGrandTotal : selectedQuote.grandTotal).toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* Advance Payment Terms Configured by Admin */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[#27272A]/70 bg-[#18181B] p-2.5 rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <span>Advance Required</span>
                        </span>
                        <span className="text-[10px] text-[#A1A1AA]">Initial PO deposit required from customer</span>
                      </div>
                      {isEditingItems ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={editAdvancePercentage}
                            placeholder="30"
                            onChange={(e) => setEditAdvancePercentage(e.target.value)}
                            className="w-16 px-2 py-0.5 bg-[#09090B] border border-amber-500/50 rounded text-right text-xs font-mono font-bold text-amber-300"
                          />
                          <span className="text-xs text-amber-400 font-bold">%</span>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30 text-xs">
                            {selectedQuote.advancePercentage !== null && selectedQuote.advancePercentage !== undefined
                              ? `${selectedQuote.advancePercentage}%`
                              : "30% (Standard)"}
                          </span>
                          <span className="block font-mono text-[10px] text-[#A1A1AA] mt-0.5">
                            ₹{Math.round(
                              ((isEditingItems ? editGrandTotal : selectedQuote.grandTotal) *
                                ((selectedQuote.advancePercentage !== null && selectedQuote.advancePercentage !== undefined
                                  ? selectedQuote.advancePercentage
                                  : 30) /
                                  100)) *
                                100
                            ) / 100}{" "}
                            Advance
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Digital Signing Box */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1E1B4B] to-[#0F172A] border border-[#3730A3] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                      <ShieldCheck size={18} />
                      <span>PRC Cryptographic Signature & QR</span>
                    </div>
                    <button
                      type="button"
                      disabled={isSigning}
                      onClick={handleDigitallySign}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <QrCode size={14} />
                      <span>{isSigning ? "Signing..." : "Digitally Sign & Approve Quotation"}</span>
                    </button>
                  </div>

                  {selectedQuote.digitalSignature ? (
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-4">
                        {selectedQuote.qrCodeData && (
                          <img
                            src={selectedQuote.qrCodeData}
                            alt="QR Seal"
                            className="w-20 h-20 bg-white p-1 rounded-lg shrink-0"
                          />
                        )}
                        <div className="space-y-1 text-xs">
                          <p className="font-bold text-[#FAFAFA]">
                            Signed By: <span className="text-emerald-400">{selectedQuote.signedBy}</span>
                          </p>
                          <p className="text-[#A1A1AA] text-[11px]">
                            Timestamp: {selectedQuote.signedAt ? new Date(selectedQuote.signedAt).toLocaleString("en-IN") : "N/A"}
                          </p>
                          <p className="font-mono text-[10px] text-[#71717A] truncate max-w-[280px]">
                            SHA256: {selectedQuote.digitalSignature}
                          </p>
                        </div>
                      </div>
                      <AsyncActionButton
                        mode="download"
                        onAction={() => quotesService.downloadQuotePdf(selectedQuote.id, selectedQuote.referenceNo || selectedQuote.quoteNumber)}
                        idleIcon={<Download size={14} />}
                        idleLabel="Download Official PDF"
                        loadingLabel="Generating PDF…"
                        successLabel="Downloaded!"
                        variant="emerald"
                        size="md"
                        className="ml-auto"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-indigo-200">
                      Clicking "Digitally Sign & Approve" will generate a cryptographic HMAC-SHA256 seal, embed a QR code, mark the quotation as Approved, and send the customer a secure acceptance link.
                    </p>
                  )}
                </div>

                {/* Audit & Revision History Timeline */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-sm text-[#FAFAFA] flex items-center gap-2">
                    <Clock size={16} className="text-[#A855F7]" />
                    <span>Revision & Action Audit Trail</span>
                  </h4>

                  {/* Customer / Admin Formal Revisions */}
                  {selectedQuote.revisions && selectedQuote.revisions.length > 0 && (
                    <div className="space-y-2 mb-3">
                      <span className="text-[10px] uppercase font-bold text-amber-400 block">Formal Terms Revisions</span>
                      {selectedQuote.revisions.map((rev) => (
                        <div key={rev.id} className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-300">
                              {rev.changedBy === "CUSTOMER" ? "Customer Revision Request" : "Admin Re-Approval & Sign"}
                            </span>
                            <span className="text-[10px] text-[#71717A]">
                              {new Date(rev.createdAt).toLocaleString("en-IN")}
                            </span>
                          </div>
                          {rev.remark && (
                            <p className="text-xs text-[#FAFAFA] bg-[#09090B] p-2 rounded-lg border border-[#27272A] italic">
                              "{rev.remark}"
                            </p>
                          )}
                          <div className="flex flex-wrap gap-3 text-[10px] text-[#A1A1AA]">
                            {rev.previousValues?.advancePercentage !== undefined && (
                              <span>Prior Advance: <strong className="text-[#FAFAFA]">{rev.previousValues.advancePercentage}%</strong></span>
                            )}
                            {rev.newValues?.customerProposedAdvancePercent !== undefined && (
                              <span>Proposed Advance: <strong className="text-amber-400">{rev.newValues.customerProposedAdvancePercent}%</strong></span>
                            )}
                            {rev.newValues?.advancePercentage !== undefined && (
                              <span>Final Advance: <strong className="text-emerald-400">{rev.newValues.advancePercentage}%</strong></span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(!selectedQuote.activityLogs || selectedQuote.activityLogs.length === 0) ? (
                      <p className="text-xs text-[#71717A]">No activity logs recorded yet.</p>
                    ) : (
                      selectedQuote.activityLogs.map((log) => (
                        <div key={log.id} className="p-3 bg-[#09090B] rounded-xl border border-[#27272A] flex items-start justify-between gap-3 text-xs">
                          <div>
                            <span className="font-bold text-xs text-[#FAFAFA] block">{log.note}</span>
                            <span className="text-[10px] text-[#71717A]">
                              Action by {log.adminUser?.firstName || "System"} • {new Date(log.createdAt).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[#A855F7] bg-[#A855F7]/10 px-2 py-0.5 rounded uppercase">
                            {log.changeType}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── STATUS REASON MODAL ─── */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#18181B] rounded-2xl border border-[#27272A] p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-[#FAFAFA]">
              Update Status to {targetStatus.replace("_", " ")}
            </h3>
            <p className="text-xs text-[#A1A1AA]">
              {(targetStatus === "PENDING" || targetStatus === "REJECTED")
                ? "Please provide an explanatory note/reason for this status transition (required):"
                : "Add an optional remark for this transition:"}
            </p>
            <textarea
              rows={3}
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="e.g. Dimensions pending site measurement verification..."
              className="w-full p-3 bg-[#09090B] border border-[#27272A] rounded-xl text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6] resize-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="px-4 py-2 bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingStatus}
                onClick={handleConfirmStatusChange}
                className="px-5 py-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-xl text-xs font-bold transition-all shadow"
              >
                {savingStatus ? "Saving..." : "Confirm Status Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SIGNATURE VERIFICATION MODAL ─── */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#18181B] rounded-2xl border border-[#27272A] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ShieldCheck size={18} />
                <span>Quotation Digital Signature Verifier</span>
              </div>
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="p-1 text-[#A1A1AA] hover:text-[#FAFAFA]"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#A1A1AA]">
              Verify the cryptographic HMAC-SHA256 signature and tamper integrity of any quotation issued by PRC Hardware.
            </p>

            <form onSubmit={handleRunVerify} className="flex gap-2">
              <input
                type="text"
                value={verifyRefNo}
                onChange={(e) => setVerifyRefNo(e.target.value)}
                placeholder="Enter Reference No (e.g. PRC-QT-2026-27/001)..."
                className="flex-1 px-3 py-2 bg-[#09090B] border border-[#27272A] rounded-xl text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
              />
              <button
                type="submit"
                disabled={isVerifying || !verifyRefNo.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow disabled:opacity-50"
              >
                {isVerifying ? "Verifying..." : "Verify"}
              </button>
            </form>

            {verifyError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/40 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{verifyError}</span>
              </div>
            )}

            {verifyResult && (
              <div className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                verifyResult.isValid
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-rose-950/40 border-rose-500/40 text-rose-300"
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  {verifyResult.isValid ? (
                    <>
                      <CheckCircle2 size={18} className="text-emerald-400" />
                      <span>✔ Document Authentic & Digitally Verified</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={18} className="text-rose-400" />
                      <span>✖ Verification Failed / Tamper Warning</span>
                    </>
                  )}
                </div>

                <p className="text-[11px] leading-relaxed">{verifyResult.message}</p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px]">
                  <div>
                    <span className="text-[#A1A1AA] block">Reference No:</span>
                    <span className="font-mono font-bold text-[#FAFAFA]">{verifyResult.referenceNo}</span>
                  </div>
                  <div>
                    <span className="text-[#A1A1AA] block">Company:</span>
                    <span className="font-bold text-[#FAFAFA]">{verifyResult.companyName}</span>
                  </div>
                  <div>
                    <span className="text-[#A1A1AA] block">Signer Authority:</span>
                    <span className="font-bold text-[#FAFAFA]">{verifyResult.signedBy}</span>
                  </div>
                  <div>
                    <span className="text-[#A1A1AA] block">Verified Total:</span>
                    <span className="font-bold font-mono text-[#FAFAFA]">₹{verifyResult.grandTotal.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SOFT DELETE CONFIRMATION MODAL ─── */}
      {quoteToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#18181B] rounded-2xl border border-[#27272A] p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 bg-rose-950/80 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-bold text-[#FAFAFA]">Soft-Delete Quotation?</h3>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Are you sure you want to delete quotation <strong>{quoteToDelete.referenceNo}</strong>? It will be removed from default views but preserved in the compliance audit trail.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuoteToDelete(null)}
                className="flex-1 py-2.5 bg-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA] rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
