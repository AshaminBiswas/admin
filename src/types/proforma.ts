export interface ProformaFacility {
  id: string;
  code: 'DELHI_WORKS' | 'MUMBAI_DEPOT' | string;
  name: string;
  tagline: string;
  address: string;
  addressLine1?: string;
  addressLine2?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  postalCode?: string;
  gstin: string;
  pan?: string;
  email: string;
  phone: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  upiId?: string;
  bankDetails?: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    ifsc: string;
    branch: string;
    accountType?: string;
    upiId?: string;
  };
}

export const PROFORMA_FACILITIES: Record<string, ProformaFacility> = {
  DELHI_WORKS: {
    id: 'fac-delhi-01',
    code: 'DELHI_WORKS',
    name: 'PRC Hardware (Pacific Products & Solutions)',
    tagline: 'Main Corporate Works & Central Logistics Hub',
    address: 'H-3, J.R. Complex, Gate No 4, Mela Ram Farm, Mandoli',
    city: 'Delhi',
    state: 'Delhi',
    stateCode: '07',
    pincode: '110093',
    gstin: '07AABCP1234F1Z9',
    email: 'billing@pacifichardware.com',
    phone: '+91 11 2233 4455',
    bankName: 'HDFC Bank Ltd',
    accountName: 'Pacific Products and Solutions',
    accountNumber: '50200088991122',
    ifscCode: 'HDFC0001234',
    branch: 'Mandoli, Delhi - 110093',
    upiId: 'prchardware@hdfcbank',
  },
  MUMBAI_DEPOT: {
    id: 'fac-mumbai-02',
    code: 'MUMBAI_DEPOT',
    name: 'PRC Hardware - Western Regional Logistics Depot',
    tagline: 'Western Regional Warehouse & Dispatch Depot',
    address: 'Unit 14-16, Logistics Park, Phase II, Bhiwandi',
    city: 'Thane',
    state: 'Maharashtra',
    stateCode: '27',
    pincode: '421302',
    gstin: '27AABCP1234F1Z9',
    email: 'depot@pacifichardware.com',
    phone: '+91 98123 45678',
    bankName: 'ICICI Bank Ltd',
    accountName: 'Pacific Products and Solutions',
    accountNumber: '001105023456',
    ifscCode: 'ICIC0000011',
    branch: 'Bhiwandi, Thane - 421302',
    upiId: 'prchardware@icici',
  },
};

export interface ProformaLineItem {
  id?: string;
  productId?: string;
  sku: string;
  productName: string;
  description?: string;
  hsnCode: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number; // in ₹ or percentage
  taxableAmount: number;
  gstRate: number; // 0, 5, 12, 18, 28
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  total?: number;
}

export type ProformaStatus = 'DRAFT' | 'SENT' | 'CONVERTED' | 'EXPIRED' | 'CANCELLED';

export interface ProformaInvoice {
  id: string;
  piNumber: string;
  invoiceNumber?: string;
  financialYear: string;
  status: ProformaStatus;
  facilityCode: 'DELHI_WORKS' | 'MUMBAI_DEPOT' | string;
  facility: ProformaFacility;

  // Customer / Buyer Details
  customerId?: string;
  customerName: string;
  companyName: string;
  customerEmail: string;
  customerPhone: string;
  customerGstin?: string;
  placeOfSupply: string;
  placeOfSupplyCode: string;
  billingAddress: string;
  shippingAddress: string;

  // Dates & References
  issueDate: string;
  validUntil: string;
  poReference?: string;
  quoteReference?: string;
  deliveryTimeline: string;
  paymentTerms: string;

  // Commercial / Financials
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  roundOff: number;
  grandTotal: number;
  amountInWords?: string;

  advancePercentage: number;
  advancePayable: number;
  balancePayable: number;

  notes?: string;
  termsConditions?: string[];
  items: ProformaLineItem[];

  createdAt: string;
  updatedAt: string;
  emailedAt?: string;
}

export interface CreateProformaInvoicePayload {
  facilityCode: 'DELHI_WORKS' | 'MUMBAI_DEPOT' | string;
  facility?: ProformaFacility;
  customerId?: string;
  customerName: string;
  companyName: string;
  customerEmail: string;
  customerPhone: string;
  customerGstin?: string;
  placeOfSupply: string;
  placeOfSupplyCode: string;
  billingAddress: string;
  shippingAddress: string;
  issueDate: string;
  validUntil: string;
  poReference?: string;
  quoteReference?: string;
  deliveryTimeline?: string;
  paymentTerms?: string;
  advancePercentage: number;
  notes?: string;
  items: Array<{
    productId?: string;
    sku: string;
    productName: string;
    description?: string;
    hsnCode: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    gstRate: number;
  }>;
}

export const GST_STATE_MAPPING: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
};

export function getStateFromGstin(gstin?: string): { state: string; stateCode: string } {
  if (!gstin || gstin.trim().length < 2) return { state: 'Delhi', stateCode: '07' };
  const clean = gstin.trim().toUpperCase();
  const code = clean.substring(0, 2);
  const state = GST_STATE_MAPPING[code] || 'Delhi';
  return { state, stateCode: code };
}
