import { fetchAdminApi, API_BASE_URL, getAdminToken } from './adminApi';
import {
  ProformaInvoice,
  CreateProformaInvoicePayload,
  PROFORMA_FACILITIES,
  ProformaFacility,
  GST_STATE_MAPPING,
  getStateFromGstin,
} from '../types/proforma';

export interface ListProformaParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  facilityCode?: string;
  startDate?: string;
  endDate?: string;
}

export interface CustomerSavedAddressSummary {
  id: string;
  type?: string;
  label?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  fullAddress: string;
  isDefault?: boolean;
}

export interface B2BCustomerSearchResult {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  companyName: string;
  email: string;
  phone: string;
  gstin?: string;
  billingAddress: string;
  shippingAddress: string;
  city?: string;
  state?: string;
  pincode?: string;
  stateCode?: string;
  addresses?: CustomerSavedAddressSummary[];
}

export interface ProductSearchResult {
  id: string;
  name: string;
  sku: string;
  description?: string;
  hsnCode: string;
  unit: string;
  price: number;
  stock: number;
  gstRate: number;
  thumbnail?: string;
  images?: string[];
  category?: string;
  categorySlug?: string;
}

/**
 * Transforms any backend ProformaInvoice entity into the Admin ProformaInvoice model
 */
export function transformBackendInvoiceToPI(inv: any): ProformaInvoice {
  const branchCode = inv.branchCode || 'DELHI_WORKS';
  const facility = PROFORMA_FACILITIES[branchCode] || PROFORMA_FACILITIES.DELHI_WORKS;
  const piNumber = inv.piNumber || inv.invoiceNumber || 'PRC-PI';
  
  const customerName = (
    inv.customerName ||
    (inv.customer ? `${inv.customer.firstName || ''} ${inv.customer.lastName || ''}`.trim() : '') ||
    'B2B Enterprise Client'
  ).trim();
  
  const companyName = (inv.companyName || inv.customer?.companyName || customerName).trim();
  const advancePercentage = Number(inv.advancePercentage ?? 30);
  const grandTotal = Number(inv.grandTotal || 0);
  const advanceAmount = Number(inv.advanceAmount ?? (grandTotal * advancePercentage) / 100);
  const balanceDue = Number(inv.balanceDue ?? (grandTotal - advanceAmount));

  return {
    id: inv.id,
    piNumber,
    invoiceNumber: piNumber,
    financialYear: inv.financialYear || '2026-2027',
    status: (inv.status || 'SENT') as any,
    facilityCode: branchCode as any,
    facility,
    customerId: inv.customerId || undefined,
    customerName,
    companyName,
    customerEmail: inv.customerEmail || inv.customer?.email || '',
    customerPhone: inv.customerPhone || inv.customer?.phone || '',
    customerGstin: inv.gstin || inv.customerGstin || inv.customer?.gstin || '',
    placeOfSupply: inv.placeOfSupply || 'Delhi',
    placeOfSupplyCode: inv.placeOfSupplyCode || '07',
    billingAddress: inv.billingAddress || 'Standard Commercial Address',
    shippingAddress: inv.shippingAddress || inv.billingAddress || 'Site Delivery Destination',
    issueDate: inv.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    validUntil: inv.validUntil ? new Date(inv.validUntil).toISOString().slice(0, 10) : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    poReference: inv.poNumber || inv.customerPoNumber || inv.poReference || undefined,
    quoteReference: inv.quoteNumber || inv.quoteReference || undefined,
    deliveryTimeline: inv.deliveryTimeline || 'Within 7-10 working days upon advance clearance',
    paymentTerms: inv.paymentTerms || `${advancePercentage}% Advance against PI, Balance before dispatch`,
    subtotal: Number(inv.subtotal || 0),
    discountTotal: Number(inv.discount || 0),
    shippingCharges: Number(inv.shippingCost || 0),
    taxableAmount: Number(inv.taxableAmount || inv.subtotal || 0),
    cgstTotal: Number(inv.cgst || 0),
    sgstTotal: Number(inv.sgst || 0),
    igstTotal: Number(inv.igst || 0),
    roundOff: Number(inv.roundOff || 0),
    grandTotal,
    advancePercentage,
    advancePayable: advanceAmount,
    balancePayable: balanceDue,
    verificationToken: inv.verificationToken || inv.id,
    verificationId: inv.verificationId || inv.piNumber,
    qrCodeDataUrl: inv.qrCodeDataUrl,
    digitalSignature: inv.digitalSignature,
    signedBy: inv.signedBy || 'Executive Desk',
    signedAt: inv.signedAt,
    notes: inv.notes,
    items: Array.isArray(inv.items)
      ? inv.items.map((it: any, i: number) => ({
          id: it.id || `item-${i + 1}`,
          sku: it.sku || 'SKU-001',
          productName: it.productName || 'Hardware Product',
          description: it.description,
          hsnCode: it.hsnCode || '8302',
          unit: it.unit || 'PCS',
          quantity: Number(it.quantity || 1),
          unitPrice: Number(it.unitRate || it.unitPrice || it.rate || 0),
          discount: Number(it.discountPercent || it.discount || 0),
          taxableAmount: Number(it.taxableAmount || 0),
          gstRate: Number(it.gstRate || it.taxRate || 18),
          cgstAmount: Number(it.cgstAmount || it.cgst || 0),
          sgstAmount: Number(it.sgstAmount || it.sgst || 0),
          igstAmount: Number(it.igstAmount || it.igst || 0),
          totalAmount: Number(it.lineTotal || it.totalAmount || it.amount || 0),
        }))
      : [],
    createdAt: inv.createdAt || new Date().toISOString(),
    updatedAt: inv.updatedAt || new Date().toISOString(),
  };
}

export const proformaService = {
  /**
   * Stream / download official Proforma Invoice PDF directly from backend
   */
  async downloadProformaPdf(id: string, piNumber: string) {
    try {
      const token = getAdminToken() || localStorage.getItem('token') || '';
      const response = await fetch(`${API_BASE_URL}/proforma-invoices/${encodeURIComponent(id)}/pdf`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error(`Download failed with status: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proforma-Invoice-${(piNumber || 'PRC-PI').replace(/[\/\\]/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('[proformaService] Binary PDF download failed, falling back to print dialog:', err);
      const pi = await this.getProformaInvoiceById(id);
      if (pi) {
        const { printProformaInvoice } = await import('../utils/proformaPdfGenerator');
        printProformaInvoice(pi);
      }
    }
  },

  /**
   * List Proforma Invoices from backend
   */
  async listProformaInvoices(params: ListProformaParams = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'ALL') query.append('status', params.status);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    try {
      const res = await fetchAdminApi<any>(`/proforma-invoices?${query.toString()}`);
      const items = res?.data?.items || res?.data || res?.items || res || [];
      if (Array.isArray(items)) {
        return {
          data: items.map(transformBackendInvoiceToPI),
          pagination: res.pagination || { total: items.length, page: 1, limit: 50, totalPages: 1 },
          metrics: res.metrics,
        };
      }
      return { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    } catch (err) {
      console.error('[proformaService] list error:', err);
      return { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    }
  },

  /**
   * Get single Proforma Invoice by ID
   */
  async getProformaInvoiceById(id: string): Promise<ProformaInvoice | null> {
    try {
      const res = await fetchAdminApi<any>(`/proforma-invoices/${encodeURIComponent(id)}`);
      const data = res?.data || res;
      if (data && data.id) {
        return transformBackendInvoiceToPI(data);
      }
      return null;
    } catch (err) {
      console.error('[proformaService] get error:', err);
      return null;
    }
  },

  /**
   * Create Proforma Invoice and persist directly to database
   */
  async createProformaInvoice(payload: CreateProformaInvoicePayload): Promise<ProformaInvoice> {
    const facility = payload.facility || PROFORMA_FACILITIES[payload.facilityCode] || PROFORMA_FACILITIES.DELHI_WORKS;
    const customerEmail = (payload.customerEmail || '').trim() || 'billing@pacifichardware.com';

    const backendPayload = {
      customerId: payload.customerId || undefined,
      customerName: (payload.customerName || payload.companyName || 'B2B Commercial Client').trim(),
      companyName: (payload.companyName || payload.customerName || '').trim() || undefined,
      customerEmail,
      customerPhone: (payload.customerPhone || '').trim() || undefined,
      gstin: (payload.customerGstin || '').trim().toUpperCase() || undefined,
      billingAddress: (payload.billingAddress || '').trim() || undefined,
      shippingAddress: (payload.shippingAddress || payload.billingAddress || '').trim() || undefined,
      placeOfSupply: payload.placeOfSupply || 'Delhi',
      supplierState: facility.state || 'Delhi',
      branchCode: payload.facilityCode || 'DELHI_WORKS',
      shippingCost: Number(payload.shippingCharges || 0),
      advancePercentage: Number(payload.advancePercentage || 30),
      paymentTerms: payload.paymentTerms || undefined,
      deliveryTimeline: payload.deliveryTimeline || undefined,
      validUntil: payload.validUntil || undefined,
      notes: payload.notes || undefined,
      poNumber: payload.poReference || undefined,
      customerPoNumber: payload.poReference || undefined,
      quoteNumber: payload.quoteReference || undefined,
      items: payload.items.map((it) => ({
        productId: it.productId || undefined,
        sku: it.sku || 'SKU-001',
        productName: it.productName,
        description: it.description || undefined,
        hsnCode: it.hsnCode || '8302',
        unit: it.unit || 'PCS',
        quantity: Number(it.quantity || 1),
        unitRate: Number(it.unitPrice || 0),
        discountPercent: Number(it.discount || 0),
        gstRate: Number(it.gstRate || 18),
      })),
    };

    const res = await fetchAdminApi<any>('/proforma-invoices', {
      method: 'POST',
      body: JSON.stringify(backendPayload),
    });

    const data = res?.data || res;
    if (!data || !data.id) {
      throw new Error(res?.message || 'Failed to create Proforma Invoice on server.');
    }

    return transformBackendInvoiceToPI(data);
  },

  /**
   * Dispatch Proforma Invoice directly to client via email
   */
  async sendProformaInvoiceEmail(
    pi: ProformaInvoice,
    recipientEmail?: string,
    notes?: string
  ): Promise<{ success: boolean; emailedTo: string; message: string }> {
    const targetEmail = (recipientEmail || pi.customerEmail || '').trim();
    if (!targetEmail) {
      throw new Error('Recipient email is required to send Proforma Invoice.');
    }

    const res = await fetchAdminApi<any>(`/proforma-invoices/${encodeURIComponent(pi.id)}/email`, {
      method: 'POST',
      body: JSON.stringify({
        email: targetEmail,
        message: notes || pi.notes || undefined,
      }),
    });

    return {
      success: true,
      emailedTo: targetEmail,
      message: res?.message || `Proforma Invoice ${pi.piNumber} successfully sent to ${targetEmail}`,
    };
  },

  /**
   * Search B2B Customers by GSTIN, Email, Phone, or Company Name
   */
  async searchB2BCustomers(
    queryText: string,
    searchType: 'ALL' | 'GSTIN' | 'EMAIL' | 'PHONE' | 'COMPANY' = 'ALL'
  ): Promise<B2BCustomerSearchResult[]> {
    const q = queryText.toLowerCase().trim();
    if (!q) return [];

    const resultsMap = new Map<string, B2BCustomerSearchResult>();

    const formatAddr = (a: any): string => {
      if (!a) return '';
      if (typeof a === 'string') return a.trim();
      const parts = [
        a.addressLine1 || a.line1 || a.street || a.address,
        a.addressLine2 || a.line2,
        a.landmark,
        a.city,
        a.state,
        a.postalCode || a.pincode ? `- ${a.postalCode || a.pincode}` : '',
      ].filter(Boolean);
      return parts.join(', ');
    };

    try {
      const usersRes = await fetchAdminApi<any>(
        `/users?type=b2b&isB2B=true&limit=100&search=${encodeURIComponent(q)}`
      );
      const users = Array.isArray(usersRes)
        ? usersRes
        : (usersRes?.data?.items || usersRes?.data || usersRes?.users || []);

      if (Array.isArray(users) && users.length > 0) {
        users.forEach((u: any) => {
          const compName = (
            u.companyName ||
            u.businessName ||
            (u.company && u.company.name) ||
            ''
          ).trim();

          const gstin = (
            u.gstin ||
            u.gstNumber ||
            u.gstNo ||
            (u.addresses && u.addresses.find((a: any) => a.gstin)?.gstin) ||
            ''
          ).trim();

          const resolvedCompanyName = compName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'B2B Enterprise Client';

          const allUserAddresses = [
            ...(Array.isArray(u.addresses) ? u.addresses : []),
            ...(Array.isArray(u.SavedAddress) ? u.SavedAddress : []),
            ...(Array.isArray(u.savedAddresses) ? u.savedAddresses : []),
          ];

          const formattedAddressList: CustomerSavedAddressSummary[] = allUserAddresses.map((a: any) => ({
            id: a.id || Math.random().toString(),
            type: a.type || (a.isDefaultBilling ? 'BILLING' : 'SHIPPING'),
            label: a.label || (a.isDefaultBilling ? 'Billing Address' : 'Site / Delivery Address'),
            addressLine1: a.addressLine1 || a.address || '',
            addressLine2: a.addressLine2 || '',
            city: a.city || '',
            state: a.state || '',
            postalCode: a.postalCode || a.pincode || '',
            fullAddress: formatAddr(a),
            isDefault: Boolean(a.isDefault || a.isDefaultBilling || a.isDefaultDelivery),
          }));

          const billObj =
            formattedAddressList.find(
              (a) => (a.type || '').toUpperCase() === 'BILLING' || a.isDefault
            ) || formattedAddressList[0];
          const shipObj =
            formattedAddressList.find((a) => (a.type || '').toUpperCase() === 'SHIPPING') ||
            billObj;

          const billingAddress = billObj?.fullAddress || formatAddr(u) || 'Standard Registered Address';
          const shippingAddress = shipObj?.fullAddress || billingAddress;

          resultsMap.set(u.id, {
            id: u.id,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || resolvedCompanyName,
            firstName: u.firstName,
            lastName: u.lastName,
            companyName: resolvedCompanyName,
            email: u.email || '',
            phone: u.phone || '',
            gstin: gstin || undefined,
            billingAddress,
            shippingAddress,
            city: billObj?.city || u.city,
            state: billObj?.state || u.state,
            pincode: billObj?.postalCode || u.pincode,
            stateCode: getStateFromGstin(gstin).stateCode,
            addresses: formattedAddressList,
          });
        });
      }
    } catch (err) {
      console.warn('[proformaService] B2B search error:', err);
    }

    return Array.from(resultsMap.values());
  },

  /**
   * Fetch full 360 details of a customer
   */
  async getCustomerFullDetails(customerId: string): Promise<B2BCustomerSearchResult | null> {
    try {
      const res = await fetchAdminApi<any>(`/users/${encodeURIComponent(customerId)}`);
      const u = res?.data || res;
      if (!u || !u.id) return null;

      const results = await this.searchB2BCustomers(u.email || u.gstin || u.id);
      return results.find((r) => r.id === customerId) || results[0] || null;
    } catch (err) {
      console.warn('[proformaService] Customer 360 error:', err);
      return null;
    }
  },

  /**
   * Search Products Catalog
   */
  async searchProducts(queryText: string, categorySlug?: string): Promise<ProductSearchResult[]> {
    const q = queryText.toLowerCase().trim();
    try {
      const query = new URLSearchParams();
      if (q) query.append('search', q);
      if (categorySlug) query.append('category', categorySlug);
      query.append('limit', '50');

      const res = await fetchAdminApi<any>(`/products?${query.toString()}`);
      const items = res?.data?.items || res?.data || res?.items || res || [];
      if (Array.isArray(items) && items.length > 0) {
        return items.map((p: any) => ({
          id: p.id,
          name: p.name || p.title,
          sku: p.sku || p.code || 'SKU-001',
          description: p.description || p.shortDescription,
          hsnCode: p.hsnCode || '83024110',
          unit: p.unit || 'PCS',
          price: Number(p.price || p.regularPrice || 0),
          stock: Number(p.stock || p.inventoryCount || 100),
          gstRate: Number(p.gstRate || p.taxRate || 18),
          thumbnail: p.thumbnail || (p.images && p.images[0]) || '',
          images: p.images || [],
          category: p.category?.name || p.categoryName || '',
          categorySlug: p.category?.slug || p.categorySlug || '',
        }));
      }
    } catch (err) {
      console.warn('[proformaService] Product search error:', err);
    }
    return [];
  },
};
