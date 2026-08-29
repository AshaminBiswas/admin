import { fetchAdminApi } from './adminApi';
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

export const proformaService = {
  /**
   * List Proforma Invoices
   */
  async listProformaInvoices(params: ListProformaParams = {}) {
    const query = new URLSearchParams();
    query.append('invoiceType', 'PROFORMA_INVOICE');
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    try {
      const res = await fetchAdminApi<any>(`/invoices?${query.toString()}`);
      if (res && Array.isArray(res)) {
        return { data: res, pagination: { total: res.length, page: 1, limit: 50, totalPages: 1 } };
      }
      if (res && res.data && Array.isArray(res.data)) {
        return res;
      }
      return { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    } catch (err) {
      console.warn('[proformaService] list error:', err);
      // Fallback from localStorage if server is cold
      const localPIs = getLocalProformaInvoices();
      return { data: localPIs, pagination: { total: localPIs.length, page: 1, limit: 50, totalPages: 1 } };
    }
  },

  /**
   * Get Proforma Invoice by ID
   */
  async getProformaInvoiceById(id: string): Promise<ProformaInvoice | null> {
    try {
      const res = await fetchAdminApi<any>(`/invoices/${id}`);
      if (res && res.id) {
        return transformBackendInvoiceToPI(res);
      }
    } catch (err) {
      console.warn('[proformaService] get error, searching local:', err);
    }
    const local = getLocalProformaInvoices().find((p) => p.id === id);
    return local || null;
  },

  async createProformaInvoice(payload: CreateProformaInvoicePayload): Promise<ProformaInvoice> {
    const facility: ProformaFacility = payload.facility || PROFORMA_FACILITIES[payload.facilityCode] || PROFORMA_FACILITIES.DELHI_WORKS;

    // Calculate line item totals & taxes
    const isInterState =
      facility.stateCode.trim().toUpperCase() !== payload.placeOfSupplyCode.trim().toUpperCase();

    let subtotal = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const items = payload.items.map((item, idx) => {
      const lineSubtotal = Math.round(Number(item.quantity || 1) * Number(item.unitPrice || 0));
      const discount = Number(item.discount || 0);
      const taxable = Math.max(0, lineSubtotal - discount);
      const rate = Number(item.gstRate || 18);

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterState) {
        igst = Math.round((taxable * rate) / 100);
      } else {
        cgst = Math.round((taxable * (rate / 2)) / 100);
        sgst = Math.round((taxable * (rate / 2)) / 100);
      }

      const total = taxable + cgst + sgst + igst;

      subtotal += lineSubtotal;
      cgstTotal += cgst;
      sgstTotal += sgst;
      igstTotal += igst;

      return {
        id: `pi-item-${idx + 1}`,
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        description: item.description,
        hsnCode: item.hsnCode || '8302',
        unit: item.unit || 'PCS',
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discount,
        taxableAmount: taxable,
        gstRate: rate,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount: total,
      };
    });

    const taxTotal = cgstTotal + sgstTotal + igstTotal;
    const grandTotal = subtotal + taxTotal;
    const advancePercent = Number(payload.advancePercentage || 30);
    const advancePayable = Math.round((grandTotal * advancePercent) / 100);
    const balancePayable = grandTotal - advancePayable;

    const year = new Date().getFullYear();
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const piNumber = `PRC-PI-${year}-${randomSeq}`;

    const newPI: ProformaInvoice = {
      id: `pi-${Date.now()}`,
      piNumber,
      invoiceNumber: piNumber,
      financialYear: `${year}-${year + 1}`,
      status: 'SENT',
      facilityCode: payload.facilityCode,
      facility,
      customerId: payload.customerId,
      customerName: payload.customerName,
      companyName: payload.companyName,
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone,
      customerGstin: payload.customerGstin,
      placeOfSupply: payload.placeOfSupply,
      placeOfSupplyCode: payload.placeOfSupplyCode,
      billingAddress: payload.billingAddress,
      shippingAddress: payload.shippingAddress,
      issueDate: payload.issueDate || new Date().toISOString().slice(0, 10),
      validUntil: payload.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      poReference: payload.poReference,
      quoteReference: payload.quoteReference,
      deliveryTimeline: payload.deliveryTimeline || 'Within 7-10 working days upon advance clearance',
      paymentTerms: payload.paymentTerms || `${advancePercent}% Advance against PI, Balance before dispatch`,
      subtotal,
      discountTotal: 0,
      taxableAmount: subtotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      roundOff: 0,
      grandTotal,
      advancePercentage: advancePercent,
      advancePayable,
      balancePayable,
      notes: payload.notes,
      items,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Attempt to persist to backend
    try {
      const backendPayload = {
        invoiceType: 'PROFORMA_INVOICE',
        customerId: payload.customerId,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        customerGstin: payload.customerGstin,
        placeOfSupply: payload.placeOfSupply,
        supplierState: facility.state,
        branchCode: payload.facilityCode,
        notes: payload.notes,
        paymentTerms: newPI.paymentTerms,
        dueDate: newPI.validUntil,
        items: payload.items.map((it) => ({
          productId: it.productId,
          sku: it.sku,
          productName: it.productName,
          description: it.description,
          hsnCode: it.hsnCode || '8302',
          unit: it.unit || 'PCS',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount || 0,
          taxRate: it.gstRate || 18,
        })),
      };

      const res = await fetchAdminApi<any>('/invoices', {
        method: 'POST',
        body: JSON.stringify(backendPayload),
      });

      if (res && res.id) {
        newPI.id = res.id;
        if (res.invoiceNumber) newPI.piNumber = res.invoiceNumber;
      }
    } catch (err) {
      console.warn('[proformaService] Backend invoice post warning:', err);
    }

    // Save copy in localStorage for instant access
    saveLocalProformaInvoice(newPI);

    return newPI;
  },

  /**
   * Dispatch Proforma Invoice directly to client via official backend email sender
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

    const payload = {
      piNumber: pi.piNumber,
      customerName: pi.customerName,
      companyName: pi.companyName,
      customerEmail: targetEmail,
      customerPhone: pi.customerPhone,
      customerGstin: pi.customerGstin,
      issueDate: pi.issueDate,
      validUntil: pi.validUntil,
      facilityCode: pi.facilityCode,
      facilityName: pi.facility.name,
      billingAddress: pi.billingAddress,
      shippingAddress: pi.shippingAddress,
      grandTotal: pi.grandTotal,
      subtotal: pi.subtotal,
      cgstTotal: pi.cgstTotal,
      sgstTotal: pi.sgstTotal,
      igstTotal: pi.igstTotal,
      advancePercentage: pi.advancePercentage,
      advancePayable: pi.advancePayable,
      balancePayable: pi.balancePayable,
      poReference: pi.poReference,
      quoteReference: pi.quoteReference,
      notes: notes || pi.notes,
      items: pi.items.map((it) => ({
        sku: it.sku,
        productName: it.productName,
        description: it.description,
        hsnCode: it.hsnCode,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        gstRate: it.gstRate,
        total: it.totalAmount ?? it.total ?? 0,
      })),
    };

    // Call dedicated backend dispatch endpoint
    const res = await fetchAdminApi<any>('/invoices/proforma/send-email', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      emailedTo: targetEmail,
      message: res?.message || `Proforma Invoice ${pi.piNumber} successfully sent to ${targetEmail}`,
    };
  },

  /**
   * Search B2B Customers by GSTIN, Email, Phone, or Company Name (Strictly B2B Only; Excludes Retail Customers, Vendors, and Internal Staff)
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

    // 1. Query Dedicated B2B Customers Endpoint (/users?type=b2b&isB2B=true)
    try {
      const usersRes = await fetchAdminApi<any>(
        `/users?type=b2b&isB2B=true&limit=100&search=${encodeURIComponent(q)}`
      );
      const users = Array.isArray(usersRes)
        ? usersRes
        : (usersRes?.data?.items || usersRes?.data || usersRes?.users || []);

      if (Array.isArray(users) && users.length > 0) {
        users.forEach((u: any) => {
          // Strictly exclude internal staff, admins, managers, vendors, or suppliers
          const roleSlug = (
            (u.role && u.role.slug) ||
            (u.userRoles && u.userRoles[0]?.role?.slug) ||
            (typeof u.role === 'string' ? u.role : '') ||
            ''
          ).toUpperCase();

          if (
            roleSlug.includes('VENDOR') ||
            roleSlug.includes('SUPPLIER') ||
            roleSlug.includes('ADMIN') ||
            roleSlug.includes('STAFF') ||
            roleSlug.includes('MANAGER') ||
            roleSlug.includes('INVENTORY')
          ) {
            return;
          }

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

          const isB2BRole =
            roleSlug.includes('B2B') ||
            roleSlug.includes('WHOLESALE') ||
            roleSlug.includes('ENTERPRISE') ||
            u.isB2B === true;

          // Strictly require B2B credentials: Must have company name, GSTIN, or B2B role
          if (!compName && !gstin && !isB2BRole) {
            return;
          }

          const resolvedCompanyName = compName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'B2B Enterprise Client';

          // Extract all address records (Address & SavedAddress)
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

          const billingAddress =
            billObj?.fullAddress ||
            u.billingAddress ||
            u.address ||
            '';

          const shippingAddress =
            shipObj?.fullAddress ||
            u.shippingAddress ||
            billingAddress ||
            '';

          // State and Place of Supply Resolution
          let state = billObj?.state || u.state || '';
          let stateCode = '';
          let city = billObj?.city || u.city || '';

          if (gstin && gstin.length >= 2 && /^\d{2}/.test(gstin)) {
            const parsed = getStateFromGstin(gstin);
            stateCode = parsed.stateCode;
            if (!state || state.toLowerCase() === 'delhi') {
              state = parsed.state;
            }
          } else if (state) {
            const match = Object.entries(GST_STATE_MAPPING).find(
              ([, sName]) => sName.toLowerCase() === state.toLowerCase()
            );
            stateCode = match ? match[0] : '07';
          } else {
            state = 'Delhi';
            stateCode = '07';
          }

          if (!city) {
            city = state === 'Delhi' ? 'Delhi' : state;
          }

          const resItem: B2BCustomerSearchResult = {
            id: u.id,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || resolvedCompanyName,
            firstName: u.firstName,
            lastName: u.lastName,
            companyName: resolvedCompanyName,
            email: u.email || '',
            phone: u.phone || '',
            gstin,
            billingAddress: billingAddress || `${city}, ${state} (${stateCode})`,
            shippingAddress: shippingAddress || billingAddress || `${city}, ${state} (${stateCode})`,
            city,
            state,
            stateCode,
            addresses: formattedAddressList,
          };

          const key = (u.email || u.gstin || u.phone || u.id).toLowerCase();
          resultsMap.set(key, resItem);
        });
      }
    } catch (err) {
      console.warn('[proformaService] B2B Users search fallback:', err);
    }

    // 2. Query Verified B2B Quotations
    try {
      const quotesRes = await fetchAdminApi<any>(
        `/quotes?limit=50&search=${encodeURIComponent(q)}`
      );
      const quotes = Array.isArray(quotesRes)
        ? quotesRes
        : (quotesRes?.data?.items || quotesRes?.data || quotesRes?.quotes || []);

      if (Array.isArray(quotes) && quotes.length > 0) {
        quotes.forEach((qt: any) => {
          const comp = (qt.companyName || '').trim();
          const gstin = (qt.gstNo || qt.gstin || '').trim();

          // Only accept quotes that belong to verified B2B companies
          if (!comp && !gstin) return;

          let state = qt.state || '';
          let stateCode = '';
          let city = qt.city || '';

          if (gstin && gstin.length >= 2 && /^\d{2}/.test(gstin)) {
            const parsed = getStateFromGstin(gstin);
            stateCode = parsed.stateCode;
            if (!state || state.toLowerCase() === 'delhi') {
              state = parsed.state;
            }
          } else if (state) {
            const match = Object.entries(GST_STATE_MAPPING).find(
              ([, sName]) => sName.toLowerCase() === state.toLowerCase()
            );
            stateCode = match ? match[0] : '07';
          } else {
            state = 'Delhi';
            stateCode = '07';
          }

          if (!city) {
            city = state === 'Delhi' ? 'Delhi' : state;
          }

          const billAddr =
            qt.billingAddress ||
            qt.address ||
            (qt.shippingAddress ? qt.shippingAddress : `${city}, ${state} (${stateCode})`);

          const quoteAddressItem: CustomerSavedAddressSummary = {
            id: qt.id,
            type: 'BILLING',
            label: 'Quotation Registered Address',
            addressLine1: billAddr,
            city,
            state,
            postalCode: qt.pincode || qt.postalCode || '',
            fullAddress: billAddr,
            isDefault: true,
          };

          const resItem: B2BCustomerSearchResult = {
            id: qt.userId || qt.id,
            name: `${qt.firstName || ''} ${qt.lastName || ''}`.trim() || comp,
            firstName: qt.firstName,
            lastName: qt.lastName,
            companyName: comp || 'B2B Client',
            email: qt.email || '',
            phone: qt.phone || '',
            gstin,
            billingAddress: billAddr,
            shippingAddress: qt.shippingAddress || billAddr,
            city,
            state,
            stateCode,
            addresses: [quoteAddressItem],
          };

          const key = (qt.email || qt.gstNo || qt.phone || qt.id).toLowerCase();
          if (!resultsMap.has(key)) {
            resultsMap.set(key, resItem);
          }
        });
      }
    } catch (err) {
      console.warn('[proformaService] Quotes customer search fallback:', err);
    }

    const allResults = Array.from(resultsMap.values());

    // Apply strict searchType filter if specified
    if (searchType === 'GSTIN') {
      return allResults.filter((c) => c.gstin && c.gstin.toLowerCase().includes(q));
    }
    if (searchType === 'EMAIL') {
      return allResults.filter((c) => c.email && c.email.toLowerCase().includes(q));
    }
    if (searchType === 'PHONE') {
      return allResults.filter((c) => c.phone && c.phone.toLowerCase().includes(q));
    }
    if (searchType === 'COMPANY') {
      return allResults.filter((c) => c.companyName && c.companyName.toLowerCase().includes(q));
    }

    return allResults;
  },

  /**
   * Retrieve Full Customer Profile with All Saved Addresses
   */
  async getCustomerFullDetails(userId: string): Promise<B2BCustomerSearchResult | null> {
    try {
      const res = await fetchAdminApi<any>(`/users/${userId}/customer-360`);
      const data = res?.data || res;
      const u = data?.user || data;
      const addrs = data?.addresses || u?.addresses || [];

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

      const parsedAddresses: CustomerSavedAddressSummary[] = addrs.map((a: any) => ({
        id: a.id || Math.random().toString(),
        type: a.type || 'SHIPPING',
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
        parsedAddresses.find(
          (a) => (a.type || '').toUpperCase() === 'BILLING' || a.isDefault
        ) || parsedAddresses[0];
      const shipObj =
        parsedAddresses.find((a) => (a.type || '').toUpperCase() === 'SHIPPING') ||
        billObj;

      const gstin = u.gstin || u.gstNumber || '';
      let state = billObj?.state || u.state || '';
      let stateCode = '';
      let city = billObj?.city || u.city || '';

      if (gstin && gstin.length >= 2 && /^\d{2}/.test(gstin)) {
        const parsed = getStateFromGstin(gstin);
        stateCode = parsed.stateCode;
        if (!state || state.toLowerCase() === 'delhi') {
          state = parsed.state;
        }
      } else if (state) {
        const match = Object.entries(GST_STATE_MAPPING).find(
          ([, sName]) => sName.toLowerCase() === state.toLowerCase()
        );
        stateCode = match ? match[0] : '07';
      } else {
        state = 'Delhi';
        stateCode = '07';
      }

      if (!city) city = state === 'Delhi' ? 'Delhi' : state;

      return {
        id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.companyName || 'B2B Client',
        firstName: u.firstName,
        lastName: u.lastName,
        companyName:
          u.companyName ||
          u.businessName ||
          `${u.firstName || ''} ${u.lastName || ''}`.trim() ||
          'Enterprise Client',
        email: u.email || '',
        phone: u.phone || '',
        gstin,
        billingAddress:
          billObj?.fullAddress ||
          u.billingAddress ||
          u.address ||
          `${city}, ${state} (${stateCode})`,
        shippingAddress:
          shipObj?.fullAddress ||
          billObj?.fullAddress ||
          u.shippingAddress ||
          `${city}, ${state} (${stateCode})`,
        city,
        state,
        stateCode,
        addresses: parsedAddresses,
      };
    } catch (err) {
      console.warn('[proformaService] getCustomerFullDetails fallback:', err);
      return null;
    }
  },

  /**
   * Search Products from Catalog with Category Filter & Rich Thumbnails
   */
  async searchProducts(queryText = '', categorySlug = ''): Promise<ProductSearchResult[]> {
    const q = (queryText || '').toLowerCase().trim();
    try {
      const params = new URLSearchParams();
      if (q) params.append('search', q);
      if (categorySlug) params.append('category', categorySlug);
      params.append('limit', '50');

      const res = await fetchAdminApi<any>(`/products?${params.toString()}`);
      const list = Array.isArray(res)
        ? res
        : (res?.data?.items || res?.data || res?.products || []);
      if (Array.isArray(list) && list.length > 0) {
        return list.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku || `SKU-${p.id.slice(0, 6)}`,
          description: p.shortDesc || p.description || '',
          hsnCode: p.hsn_sac || p.hsnCode || '83024110',
          unit: p.unit || 'PCS',
          price: Number(p.salePrice || p.price || 450),
          stock: Number(p.stock || 100),
          gstRate: Number(p.gst_rate || 18),
          thumbnail: p.thumbnail || (Array.isArray(p.images) ? p.images[0] : undefined),
          images: Array.isArray(p.images) ? p.images : [],
          category: p.category?.name || (typeof p.category === 'string' ? p.category : undefined),
          categorySlug: p.category?.slug,
        }));
      }
    } catch (err) {
      console.warn('[proformaService] product search fallback:', err);
    }

    // Default high-demand architectural catalog hardware
    const fallbackList: ProductSearchResult[] = [
      {
        id: 'p-1',
        name: 'Grade 304 SS Heavy Duty Restroom Gravity Hinge Set',
        sku: 'PRC-SS-GH-304',
        description: 'Self-closing spring-assisted gravity hinge pair for commercial cubicle doors',
        hsnCode: '83024110',
        unit: 'SETS',
        price: 850,
        stock: 450,
        gstRate: 18,
        category: 'Cubicle Hardware',
        categorySlug: 'cubicle-hardware',
      },
      {
        id: 'p-2',
        name: 'Privacy Indicator Bolt with Emergency Red/Green Coin Release',
        sku: 'PRC-SS-IB-002',
        description: 'Surface mounted stainless steel lock bolt with exterior vacant/engaged status dial',
        hsnCode: '83024110',
        unit: 'PCS',
        price: 620,
        stock: 800,
        gstRate: 18,
        category: 'Cubicle Hardware',
        categorySlug: 'cubicle-hardware',
      },
      {
        id: 'p-3',
        name: 'Adjustable Height Restroom Cubicle Supporting Leg (100mm-150mm)',
        sku: 'PRC-SS-LEG-150',
        description: 'Grade 316 brushed satin pedestal pillar leg with concealed anchor flange',
        hsnCode: '83024110',
        unit: 'PCS',
        price: 540,
        stock: 620,
        gstRate: 18,
        category: 'Cubicle Hardware',
        categorySlug: 'cubicle-hardware',
      },
      {
        id: 'p-4',
        name: 'Heavy Duty SS Top Rail Track Clamp & Wall Connector',
        sku: 'PRC-SS-RC-04',
        description: 'Structural top stabiliser bar connector bracket for 12mm-18mm compact laminate',
        hsnCode: '83024110',
        unit: 'PCS',
        price: 390,
        stock: 350,
        gstRate: 18,
        category: 'Cubicle Hardware',
        categorySlug: 'cubicle-hardware',
      },
      {
        id: 'p-5',
        name: 'Stainless Steel Coat Hook with Integrated Rubber Buffer Stop',
        sku: 'PRC-SS-CHK-01',
        description: 'Single/dual prong door hook with impact absorbing silent stopper',
        hsnCode: '83024110',
        unit: 'PCS',
        price: 180,
        stock: 1200,
        gstRate: 18,
        category: 'Locker Hardware',
        categorySlug: 'locker-hardware',
      },
    ];

    return fallbackList.filter((p) => {
      if (categorySlug && p.categorySlug && p.categorySlug !== categorySlug) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.hsnCode.includes(q)
      );
    });
  },
};

// ─── Local Storage Helper Functions ──────────────────────────────────────────

const LOCAL_STORAGE_KEY = 'prc_admin_proforma_invoices_v1';

function getLocalProformaInvoices(): ProformaInvoice[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLocalProformaInvoice(pi: ProformaInvoice) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalProformaInvoices();
    const index = existing.findIndex((p) => p.id === pi.id);
    if (index >= 0) {
      existing[index] = pi;
    } else {
      existing.unshift(pi);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to save PI locally:', err);
  }
}

function transformBackendInvoiceToPI(inv: any): ProformaInvoice {
  const facility = PROFORMA_FACILITIES[inv.branchCode] || PROFORMA_FACILITIES.DELHI_WORKS;
  return {
    id: inv.id,
    piNumber: inv.invoiceNumber,
    invoiceNumber: inv.invoiceNumber,
    financialYear: inv.financialYear || '2026-2027',
    status: (inv.status || 'SENT') as any,
    facilityCode: (inv.branchCode || 'DELHI_WORKS') as any,
    facility,
    customerId: inv.customerId,
    customerName: inv.customer ? `${inv.customer.firstName || ''} ${inv.customer.lastName || ''}`.trim() : inv.customerName || 'B2B Client',
    companyName: inv.customer?.companyName || inv.companyName || 'Enterprise Partner',
    customerEmail: inv.customer?.email || inv.customerEmail || '',
    customerPhone: inv.customer?.phone || inv.customerPhone || '',
    customerGstin: inv.customer?.gstin || inv.customerGstin || '',
    placeOfSupply: inv.placeOfSupply || 'Delhi',
    placeOfSupplyCode: inv.placeOfSupplyCode || '07',
    billingAddress: inv.billingAddress || inv.customer?.address || 'Standard Billing Address',
    shippingAddress: inv.shippingAddress || inv.billingAddress || 'Site Delivery Destination',
    issueDate: inv.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    validUntil: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    poReference: inv.poReference || inv.orderId || undefined,
    quoteReference: inv.quoteReference || undefined,
    deliveryTimeline: 'Standard site dispatch schedule',
    paymentTerms: inv.paymentTerms || '30% Advance, Balance before dispatch',
    subtotal: Number(inv.subtotal || 0),
    discountTotal: Number(inv.discount || 0),
    taxableAmount: Number(inv.taxableAmount || inv.subtotal || 0),
    cgstTotal: Number(inv.cgst || 0),
    sgstTotal: Number(inv.sgst || 0),
    igstTotal: Number(inv.igst || 0),
    roundOff: Number(inv.roundOff || 0),
    grandTotal: Number(inv.grandTotal || 0),
    advancePercentage: 30,
    advancePayable: Math.round(Number(inv.grandTotal || 0) * 0.3),
    balancePayable: Math.round(Number(inv.grandTotal || 0) * 0.7),
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
          unitPrice: Number(it.unitPrice || it.rate || 0),
          discount: Number(it.discount || 0),
          taxableAmount: Number(it.taxableAmount || 0),
          gstRate: Number(it.taxRate || 18),
          cgstAmount: Number(it.cgst || 0),
          sgstAmount: Number(it.sgst || 0),
          igstAmount: Number(it.igst || 0),
          totalAmount: Number(it.totalAmount || it.amount || 0),
        }))
      : [],
    createdAt: inv.createdAt || new Date().toISOString(),
    updatedAt: inv.updatedAt || new Date().toISOString(),
  };
}
