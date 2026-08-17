import { fetchAdminApi, API_BASE_URL, getAdminToken } from "./adminApi";

export interface AdminQuoteLineItem {
  id?: string;
  productId: string;
  variantId?: string | null;
  productNameSnapshot: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  product?: {
    id: string;
    name: string;
    sku?: string;
    price: number;
    salePrice?: number | null;
    thumbnail?: string;
  };
}

export interface AdminQuoteActivityLog {
  id: string;
  changeType: string;
  note?: string | null;
  oldValue?: any;
  newValue?: any;
  createdAt: string;
  adminUser?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface AdminQuoteDetail {
  id: string;
  quoteNumber: string;
  referenceNo: string;
  financialYear: string;
  sequenceNo: number;
  projectName: string;
  firstName: string;
  lastName: string;
  companyName: string;
  gstNo: string;
  email: string;
  phone: string;
  userId?: string | null;
  status: "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CONVERTED" | "EXPIRED";
  statusReason?: string | null;
  basicPrice: number;
  gstAmount: number;
  shippingCost?: number | null;
  subtotal: number;
  discountTotal?: number;
  taxTotal: number;
  grandTotal: number;
  notes?: string | null;
  adminNotes?: string | null;
  termsAccepted: boolean;
  customerResponse: "pending" | "accepted" | "declined";
  customerResponseNotes?: string | null;
  customerResponseAt?: string | null;
  accessToken?: string;
  digitalSignature?: string | null;
  signedBy?: string | null;
  signedAt?: string | null;
  qrCodeData?: string | null;
  validUntil?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  items: AdminQuoteLineItem[];
  activityLogs: AdminQuoteActivityLog[];
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    gstin?: string;
  };
}

export interface QuoteMetrics {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  digitallySigned: number;
}

export interface ListQuotesResponse {
  data: AdminQuoteDetail[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  metrics?: QuoteMetrics;
}

export interface SignatureVerificationResult {
  isValid: boolean;
  tamperDetected: boolean;
  referenceNo: string;
  companyName: string;
  gstNo: string;
  projectName: string;
  grandTotal: number;
  signedBy: string;
  signedAt: string;
  digitalSignature: string;
  message: string;
}

export const quotesService = {
  /**
   * List quotes with pagination, metrics, search, and status filters
   */
  async listQuotes(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    includeDeleted?: boolean;
  } = {}): Promise<ListQuotesResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append("page", String(params.page));
    if (params.limit) query.append("limit", String(params.limit));
    if (params.status && params.status !== "ALL") query.append("status", params.status);
    if (params.search) query.append("search", params.search);
    if (params.fromDate) query.append("fromDate", params.fromDate);
    if (params.toDate) query.append("toDate", params.toDate);
    if (params.includeDeleted) query.append("includeDeleted", "true");

    const endpoint = `/quotes?${query.toString()}`;
    const res = await fetchAdminApi<any>(endpoint);
    return {
      data: res.data || [],
      pagination: res.pagination || { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
      metrics: res.metrics,
    };
  },

  /**
   * Get single quote with full line items, client info, and audit history
   */
  async getQuoteById(id: string): Promise<AdminQuoteDetail> {
    const res = await fetchAdminApi<AdminQuoteDetail>(`/quotes/${id}`);
    return res.data!;
  },

  /**
   * Update quotation status with mandatory reason note
   */
  async updateQuoteStatus(id: string, payload: { status: string; statusReason?: string }): Promise<AdminQuoteDetail> {
    const res = await fetchAdminApi<AdminQuoteDetail>(`/quotes/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  /**
   * Edit line items, quantities, rates, and shipping cost
   */
  async updateQuoteItems(
    id: string,
    payload: {
      items: Array<{
        productId: string;
        variantId?: string | null;
        productNameSnapshot?: string;
        unit?: string;
        quantity: number;
        rate: number;
      }>;
      shippingCost?: number | null;
      notes?: string | null;
      adminNotes?: string | null;
    }
  ): Promise<AdminQuoteDetail> {
    const res = await fetchAdminApi<AdminQuoteDetail>(`/quotes/${id}/items`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  /**
   * Digitally sign, generate QR code, and approve quotation
   */
  async digitallySignQuote(
    id: string,
    payload: {
      shippingCost?: number | null;
      adminNotes?: string | null;
    } = {}
  ): Promise<AdminQuoteDetail> {
    const res = await fetchAdminApi<AdminQuoteDetail>(`/quotes/${id}/sign`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data!;
  },

  /**
   * Verify digital signature authenticity
   */
  async verifySignature(referenceNo: string, digitalSignature?: string): Promise<SignatureVerificationResult> {
    const res = await fetchAdminApi<SignatureVerificationResult>("/quotes/verify-signature", {
      method: "POST",
      body: JSON.stringify({ referenceNo, digitalSignature }),
    });
    return res.data!;
  },

  /**
   * Soft delete quotation
   */
  async deleteQuote(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetchAdminApi<{ success: boolean; message: string }>(`/quotes/${id}`, {
      method: "DELETE",
    });
    return res.data!;
  },

  /**
   * Search active products to add to quotation
   */
  async searchProducts(search = ""): Promise<any[]> {
    try {
      const res = await fetchAdminApi<any>(`/products?search=${encodeURIComponent(search)}&limit=25`);
      return res.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Download official Quotation PDF by ID
   */
  async downloadQuotePdf(id: string, referenceNo = "quote"): Promise<void> {
    const token = getAdminToken();
    const url = `${API_BASE_URL}/quotes/${id}/pdf`;
    const response = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      let msg = `Failed to download PDF (HTTP ${response.status})`;
      try {
        const json = JSON.parse(errText);
        if (json?.message) msg = json.message;
      } catch {}
      throw new Error(msg);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    const safeRef = String(referenceNo).replace(/[\/\\]/g, '-');
    a.download = `Quotation-${safeRef}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  },
};
