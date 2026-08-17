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

export function QuotesPage() {
  const [quotes, setQuotes] = useState<AdminQuoteDetail[]>([]);
  const [metrics, setMetrics] = useState<QuoteMetrics>({
    total: 0,
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    digitallySigned: 0,
  });
  const [loading, setLoading] = useState(true);
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

  // Load Quotes
  const fetchQuotes = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await quotesService.listQuotes({
        page: currentPage,
        limit: 20,
        status: selectedStatus,
        search: searchQuery.trim(),
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setQuotes(res.data);
      setTotalPages(res.pagination.totalPages || 1);
      if (res.metrics) {
        setMetrics(res.metrics);
      }
    } catch {
      setErrorMsg("Failed to load quotations. Please check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [selectedStatus, currentPage, fromDate, toDate]);

  // Handle Search Debounce
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
      const updated = await quotesService.updateQuoteItems(selectedQuote.id, {
        items: editItems.map((i) => ({
          productId: i.productId,
          productNameSnapshot: i.productNameSnapshot,
          unit: i.unit,
          quantity: i.quantity,
          rate: i.rate,
        })),
        shippingCost: shippingNum,
      });
      setSelectedQuote(updated);
      setIsEditingItems(false);
      setSuccessMsg("Line items and pricing successfully updated!");
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
      const updated = await quotesService.digitallySignQuote(selectedQuote.id, {
        shippingCost: shippingNum,
      });
      setSelectedQuote(updated);
      setSuccessMsg("✔ Quotation digitally signed with HMAC-SHA256 and QR code generated!");
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

  return (
    <div className="space-y-6 text-[#FAFAFA]" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Header & Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[#18181B] border border-[#27272A] shadow-md">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#A855F7] bg-[#A855F7]/10 px-2.5 py-0.5 rounded border border-[#A855F7]/20">
            PRC Commercial Operations
          </span>
          <h2 className="text-xl font-bold font-serif text-[#FAFAFA] mt-1">
            B2B Bulk Quotation (RFQ) Console
          </h2>
          <p className="text-xs text-[#A1A1AA]">
            Review incoming project RFQs, customize contractor volume discounts, digitally sign, and issue QR-verified bids.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setVerifyRefNo("");
              setVerifyResult(null);
              setVerifyError("");
              setIsVerifyModalOpen(true);
            }}
            className="bg-[#27272A] hover:bg-[#3F3F46] text-[#FAFAFA] font-bold text-xs px-4 py-2 rounded-xl transition-all border border-[#3F3F46] flex items-center gap-2"
          >
            <ShieldCheck size={15} className="text-emerald-400" />
            <span>Verify Signature Tool</span>
          </button>
          <button
            type="button"
            onClick={fetchQuotes}
            className="p-2 bg-[#27272A] hover:bg-[#3F3F46] rounded-xl text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
            title="Refresh Quotes"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-[#A855F7]" : ""} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#A1A1AA]">Total RFQs</span>
          <p className="text-xl font-black text-[#FAFAFA]">{metrics.total}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1">
          <span className="text-[10px] uppercase font-bold text-amber-400">Pending Review</span>
          <p className="text-xl font-black text-amber-400">{metrics.pending}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1">
          <span className="text-[10px] uppercase font-bold text-blue-400">Under Review</span>
          <p className="text-xl font-black text-blue-400">{metrics.underReview}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1">
          <span className="text-[10px] uppercase font-bold text-emerald-400">Approved</span>
          <p className="text-xl font-black text-emerald-400">{metrics.approved}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1">
          <span className="text-[10px] uppercase font-bold text-rose-400">Rejected</span>
          <p className="text-xl font-black text-rose-400">{metrics.rejected}</p>
        </div>
        <div className="p-4 rounded-xl bg-[#18181B] border border-[#27272A] space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#A855F7]">Digitally Signed</span>
          <p className="text-xl font-black text-[#A855F7]">{metrics.digitallySigned}</p>
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

      {/* Search & Filter Controls */}
      <div className="p-4 rounded-2xl bg-[#18181B] border border-[#27272A] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-[#09090B] p-1 rounded-xl border border-[#27272A]">
            {["ALL", "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setSelectedStatus(status);
                  setCurrentPage(1);
                }}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                  selectedStatus === status
                    ? "bg-[#8B5CF6] text-white shadow"
                    : "text-[#A1A1AA] hover:text-[#FAFAFA]"
                }`}
              >
                {status === "ALL" ? "All Statuses" : status.replace("_", " ")}
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
              className="bg-[#09090B] border border-[#27272A] rounded-lg px-2 py-1 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            />
            <span className="text-[#A1A1AA]">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-[#09090B] border border-[#27272A] rounded-lg px-2 py-1 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#8B5CF6]"
            />
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                }}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-bold"
              >
                Clear
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
              className="w-full pl-10 pr-4 py-2.5 bg-[#09090B] border border-[#27272A] rounded-xl text-xs text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
            />
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
            <tbody className="divide-y divide-[#27272A]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-[#71717A]">
                    <RefreshCw size={20} className="animate-spin text-[#8B5CF6] mx-auto mb-2" />
                    Loading quotations registry...
                  </td>
                </tr>
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
                        <button
                          type="button"
                          onClick={(e) => handleDownloadPdf(q, e)}
                          disabled={downloadingPdfId === q.id}
                          className="bg-[#27272A] hover:bg-emerald-600 text-[#FAFAFA] hover:text-white font-bold text-xs px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 disabled:opacity-50"
                          title="Download Official Quotation PDF"
                        >
                          {downloadingPdfId === q.id ? (
                            <RefreshCw size={13} className="animate-spin text-emerald-400" />
                          ) : (
                            <Download size={13} />
                          )}
                          <span className="hidden sm:inline">PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(q.id)}
                          className="bg-[#27272A] hover:bg-[#8B5CF6] hover:text-white text-[#FAFAFA] font-bold text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                        >
                          <Eye size={13} />
                          <span>Review</span>
                        </button>
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
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(selectedQuote)}
                  disabled={downloadingPdfId === selectedQuote.id}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow disabled:opacity-50"
                  title="Download Official PDF"
                >
                  {downloadingPdfId === selectedQuote.id ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}
                  <span>Download PDF</span>
                </button>
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
              <div className="py-16 text-center text-xs text-[#A1A1AA]">
                <RefreshCw size={24} className="animate-spin text-[#8B5CF6] mx-auto mb-2" />
                Loading detailed quote breakdown...
              </div>
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
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(selectedQuote)}
                        disabled={downloadingPdfId === selectedQuote.id}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow flex items-center gap-1.5 ml-auto disabled:opacity-50"
                      >
                        {downloadingPdfId === selectedQuote.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Download size={14} />
                        )}
                        <span>Download Official PDF</span>
                      </button>
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
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedQuote.activityLogs?.length === 0 ? (
                      <p className="text-xs text-[#71717A]">No activity recorded yet.</p>
                    ) : (
                      selectedQuote.activityLogs?.map((log) => (
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
