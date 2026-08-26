export interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'super_admin' | 'admin' | 'manager';
  roleId?: string;
  phone?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  avatar?: string;
  isTwoFactorEnabled?: boolean;
  twoFactorMethod?: 'totp' | 'email';
}

export interface TwoFactorLoginResult {
  success: boolean;
  requires2FA?: boolean;
  mfaToken?: string;
  user?: AdminUser;
  message?: string;
}

export interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  position?: number;
  status: "ACTIVE" | "INACTIVE" | "DRAFT" | string;
  isVisible?: boolean;
  isBestseller?: boolean;
  isBestsaller?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  badgeText?: string;
  desktopImage: string;
  tabletImage?: string;
  mobileImage?: string;
  linkUrl?: string;
  ctaText?: string;
  position: string;
  order: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TwoFactorSetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface CreateAdminPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface CreatedAdminResult {
  success: boolean;
  message?: string;
  user?: AdminUser;
  twoFactorSetup?: TwoFactorSetupData;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  activeQuotes: number;
  lowStockCount: number;
  revenueGrowth: number;
  ordersGrowth: number;
}

export interface MaterialItem {
  id: string;
  name: string;
  slug: string;
  shortName?: string | null;
  gradeBadge?: string | null;
  description?: string | null;
  tagline?: string | null;
  specs?: string[];
  isActive: boolean;
  position: number;
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductItem {
  id: string | number;
  name: string;
  slug?: string;
  sku: string;
  category?: string;
  categoryId?: string;
  materialId?: string | null;
  materialObj?: { id: string; name: string; slug: string; shortName?: string; gradeBadge?: string };
  frequentlyPairedIds?: string[];
  pairedProductIds?: string[];
  frequentlyPairedProducts?: ProductItem[];
  price: number;
  salesPrice?: number;
  salePrice?: number;
  offerPrice?: number;
  originalPrice?: number;
  discount?: number;
  stock: number;
  minStockAlert?: number;
  reorderLevel?: number;
  status: 'ACTIVE' | 'OUT_OF_STOCK' | 'INACTIVE' | 'DRAFT' | string;
  image?: string;
  thumbnail?: string;
  images?: string[];
  material?: string;
  description?: string;
  shortDesc?: string;
  isVisible?: boolean;
  isFeatured?: boolean;
  isInOffer?: boolean;
  isBestsaller?: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  manufacturerInfo?: {
    "Generic Name"?: string;
    "Country of Origin"?: string;
    manufacturerName?: string;
    manufacturerAddress?: string;
  };
  compatibleFor?: string[];
  warranty?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
  attributes?: Record<string, string>;
  colours?: string[];
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: string;
  orderNumber: string;
  customerName: string;
  email: string;
  phone: string;
  isB2B: boolean;
  companyName?: string;
  gstin?: string;
  totalAmount: number;
  paymentStatus: 'PAID' | 'PENDING' | 'REFUNDED';
  orderStatus: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
  itemsCount: number;
}

export interface QuoteItem {
  id: string;
  quoteNumber: string;
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  requestedProducts: string;
  estimatedValue: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  notes?: string;
}

export interface AppointmentItem {
  id: string;
  bookingNumber: string;
  clientName: string;
  phone: string;
  serviceType: string;
  address: string;
  date: string;
  timeSlot: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface AuditLogItem {
  id: string;
  adminEmail: string;
  action: string;
  entity: string;
  category?: 'AUTH' | 'CATALOG' | 'SALES' | 'SYSTEM' | string;
  severity?: 'INFO' | 'SECURITY' | 'CRITICAL' | 'SUCCESS';
  details: string;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
  payload?: Record<string, any>;
}

/* ─── Roles & Permissions ──────────────────────────────────────────────────── */

export interface Permission {
  id: string;
  name: string;
  slug: string;
  module?: string;
  description?: string;
  createdAt?: string;
}

export interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isSystem: boolean;
  userCount: number;
  permissions?: Permission[];
  createdAt?: string;
  updatedAt?: string;
}

export type AdminView =
  | 'allocation'
  | 'appointments'
  | 'auth'
  | 'banner'
  | 'cart'
  | 'categories'
  | 'categories-create'
  | 'categories-edit'
  | 'checkouts'
  | 'cms'
  | 'coupons'
  | 'dashboard'
  | 'enquiries'
  | 'homepage'
  | 'invoice'
  | 'inventory'
  | 'logistics'
  | 'materials'
  | 'notification'
  | 'notifications'
  | 'orders'
  | 'payment'
  | 'products'
  | 'products-create'
  | 'products-edit'
  | 'quotes'
  | 'reports'
  | 'reviews'
  | 'roles'
  | 'search'
  | 'settings'
  | 'shippings'
  | 'upload'
  | 'users'
  | 'user-detail'
  | 'customer-detail'
  | 'variants'
  | 'varients'
  | 'wishlist'
  | 'analytics'
  | 'audit'
  | 'admins'
  | 'admin-detail'
  | 'b2b-pricing'
  | 'product-dossier'
  | 'product-audit'
  | 'inventory-dossier'
  | 'audit-hub'
  | 'invoice-create'
  | 'invoice-detail';

/* ─── Admin 360° Profile & Audit Dossier Types ────────────────────────────── */

export interface AdminAuditLogEntry {
  id: string;
  userId: string;
  adminEmail: string;
  adminName?: string;
  adminRole?: string;
  action: string;
  entity: string;
  entityId?: string;
  entityName?: string;
  details: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL' | 'SECURITY';
  metadata?: Record<string, any> | null;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AdminActionSummary {
  totalOperations: number;
  quotesApproved: number;
  invoicesGenerated: number;
  productsManaged: number;
  customersManaged: number;
  securityActionsCount: number;
}

export interface AdminDossierData {
  admin: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    avatar?: string | null;
    status: string;
    isVerified: boolean;
    twoFactorEnabled: boolean;
    mustChangePassword?: boolean;
    lastLoginAt?: string | null;
    createdAt: string;
    updatedAt: string;
    isSuperAdmin: boolean;
    role?: Role | null;
    roles?: Role[];
    permissions?: { id: string; name: string; slug: string; module: string; description?: string }[];
    seniority: {
      totalDays: number;
      years: number;
      months: number;
      days: number;
      label: string;
    };
  };
  summary: AdminActionSummary;
  sections: {
    quoteActions: AdminAuditLogEntry[];
    invoiceActions: AdminAuditLogEntry[];
    catalogActions: AdminAuditLogEntry[];
    customerActions: AdminAuditLogEntry[];
    securityActions: AdminAuditLogEntry[];
    allLogs: AdminAuditLogEntry[];
  };
}

/* ─── B2B Customer Custom Pricing ─────────────────────────────────────────── */

export interface B2BCustomerPricingItem {
  productId: string;
  name: string;
  slug: string;
  sku: string;
  thumbnail: string | null;
  categoryName: string;
  categoryId: string | null;
  standardPrice: number;
  hasCustomPrice: boolean;
  customPrice: number | null;
  minQuantity: number;
  notes: string | null;
  discountPercent: number;
  customPriceId: string | null;
  updatedAt: string | null;
}

export interface B2BCustomerPricingMatrix {
  customer: {
    id: string;
    email: string;
    name: string;
    companyName?: string | null;
    gstin?: string | null;
    phone?: string | null;
    role: string;
  };
  totalProducts: number;
  customPricesCount: number;
  items: B2BCustomerPricingItem[];
}

/* ─── GST Tax Invoice & E-Invoice / IRN ─────────────────────────────────── */

export type GSTInvoiceStatus =
  | 'DRAFT'
  | 'VALIDATED'
  | 'IRN_PENDING'
  | 'IRN_GENERATED'
  | 'ISSUED'
  | 'CANCELLED';

export type GSTTransactionType = 'INTRASTATE' | 'INTERSTATE';
export type GSTSupplyType = 'B2B' | 'B2C';

export interface GSTAddress {
  addr1: string;
  addr2?: string;
  city: string;
  state: string;
  state_code: string;
  pincode: string;
}

export interface CompanySettings {
  id: number;
  legal_name: string;
  trade_name?: string;
  gstin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  state_code: string;
  pincode: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  irn_cancellation_window_hours: number;
  irp_configured: boolean;
  updated_at: string;
}

export interface GSTCustomer {
  id: string;
  legal_name: string;
  trade_name?: string;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  billing_address: GSTAddress;
  shipping_address?: GSTAddress;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GSTInvoiceItem {
  id?: string;
  sl_no: number;
  product_id?: string;
  description: string;
  hsn_sac: string;
  is_service: boolean;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  discount: number;
  taxable_value: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_rate: number;
  cess_amount: number;
  total_item_value: number;
}

export interface EInvoiceRecord {
  id: string;
  invoice_id: string;
  irn?: string;
  ack_number?: string;
  ack_date?: string;
  signed_invoice?: string;
  signed_qr_code?: string;
  irp_status?: string;
  generated_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  cancellation_reason_code?: string;
  created_at: string;
  updated_at: string;
}

export interface GSTInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  financial_year: string;
  sequence_no: number;
  customer_id: string;
  customer_legal_name: string;
  customer_gstin?: string;
  customer_pan?: string;
  billing_address: GSTAddress;
  shipping_address?: GSTAddress;
  place_of_supply: string;
  place_of_supply_state_code: string;
  supply_type: GSTSupplyType;
  transaction_type: GSTTransactionType;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  discount_amount: number;
  round_off: number;
  grand_total: number;
  status: GSTInvoiceStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  items?: GSTInvoiceItem[];
  einvoice?: EInvoiceRecord;
}

export interface GSTValidationResult {
  field: string;
  label: string;
  passed: boolean;
  message?: string;
}

export interface GSTReportFilter {
  date_from?: string;
  date_to?: string;
  customer_id?: string;
  status?: string;
  gstin?: string;
  page?: number;
  limit?: number;
}

export interface GSTAuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  ip_address?: string;
  error_detail?: string;
  created_at: string;
}

export interface GSTDashboardStats {
  total_invoices: number;
  this_month_invoices: number;
  irn_generated: number;
  irn_pending: number;
  irn_cancelled: number;
  total_taxable_sales: number;
  total_gst_collected: number;
}

export const INDIA_STATE_CODES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' },
];

export const GST_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28];

export const UNIT_OPTIONS = [
  'NOS', 'BOX', 'KGS', 'MTR', 'LTR', 'SQF', 'SQM', 'CMS',
  'SET', 'PCS', 'PAC', 'BAG', 'BTL', 'CAN', 'CTN', 'DOZ',
  'GMS', 'GRS', 'MLT', 'OTH',
];

export const CANCEL_REASON_CODES: { code: string; label: string }[] = [
  { code: '1', label: 'Duplicate' },
  { code: '2', label: 'Data Entry Mistake' },
  { code: '3', label: 'Order Cancelled' },
  { code: '4', label: 'Others' },
];

/* ─── Multi-Branch Inventory Management Types ────────────────────────────────── */

export type StockMovementType =
  | 'PURCHASE_IN'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'SALE_OUT'
  | 'DAMAGE'
  | 'RETURN_IN';

export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { inventories?: number; purchases?: number };
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gstNumber?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { purchases?: number };
  purchases?: Purchase[];
}

export interface InventoryItem {
  id: string;
  productId: string;
  branchId: string;
  quantity: number;
  reservedQuantity: number;
  reorderLevel: number;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    salePrice?: number | null;
    thumbnail?: string | null;
    reorderLevel?: number | null;
    status: string;
    category?: { id: string; name: string } | null;
  };
  branch: {
    id: string;
    name: string;
    code: string;
    city?: string | null;
  };
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  quantity: number;
  unitPurchasePrice: number | string;
  totalPrice: number | string;
  product?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    thumbnail?: string | null;
  };
}

export interface Purchase {
  id: string;
  branchId: string;
  supplierId: string;
  invoiceNumber?: string | null;
  purchaseDate: string;
  totalAmount: number | string;
  notes?: string | null;
  createdById: string;
  createdAt: string;
  branch?: { id: string; name: string; code: string };
  supplier?: { id: string; name: string; contactPerson?: string | null; phone?: string | null };
  items?: PurchaseItem[];
}

export interface StockTransferItem {
  id: string;
  transferId: string;
  productId: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    sku: string;
    price: number;
    thumbnail?: string | null;
  };
}

export interface StockTransfer {
  id: string;
  fromBranchId: string;
  toBranchId: string;
  status: TransferStatus;
  requestedById: string;
  approvedById?: string | null;
  receivedById?: string | null;
  notes?: string | null;
  createdAt: string;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  fromBranch: { id: string; name: string; code: string; city?: string | null };
  toBranch: { id: string; name: string; code: string; city?: string | null };
  items: StockTransferItem[];
}

export interface StockMovement {
  id: string;
  productId: string;
  branchId: string;
  type: StockMovementType;
  quantity: number;
  previousQty: number;
  newQty: number;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  performedById: string;
  createdAt: string;
  product?: { id: string; name: string; sku: string; thumbnail?: string | null };
  branch?: { id: string; name: string; code: string; city?: string | null };
}

/* ─── Product Traceability Dossier Types ─────────────────────────────────── */

export interface ProductDossierPurchase {
  id: string;
  purchaseId?: string;
  invoiceNumber: string;
  purchaseDate: string;
  vendorId?: string;
  vendorName: string;
  vendorPhone: string;
  vendorEmail: string;
  vendorGst: string;
  branchId?: string;
  branchName: string;
  branchCode: string;
  quantity: number;
  receivedQuantity: number;
  pendingQuantity: number;
  unitPurchasePrice: number;
  totalPurchaseValue: number;
  status: string;
  createdByName: string;
  receivedByName: string;
  notes: string;
}

export interface ProductDossierSale {
  id: string;
  orderId?: string;
  orderNumber: string;
  orderDate: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName: string;
  customerGstin: string;
  city: string;
  state: string;
  quantity: number;
  salePricePerUnit: number;
  totalSaleValue: number;
  discountAmount: number;
  taxAmount: number;
  finalOrderValue: number;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  processedByName: string;
  acceptedAt?: string;
  fulfillmentStatus: string;
  trackingNumber?: string;
  carrier?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface ProductDossierMovement {
  id: string;
  type: StockMovementType;
  quantity: number;
  previousQty: number;
  newQty: number;
  referenceType: string;
  referenceId: string;
  notes: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  performedByName: string;
  createdAt: string;
}

export interface ProductDossierTimelineEvent {
  id: string;
  timestamp: string;
  stage: 'PRODUCT_LISTED' | 'PURCHASE_RECEIVED' | 'STOCK_MOVEMENT' | 'CUSTOMER_ORDER' | 'ORDER_FULFILLED' | 'STOCK_TRANSFER';
  title: string;
  description: string;
  actor: string;
  reference: string;
  quantityChange?: string;
  priceValue?: number;
  badgeColor: string;
  metadata?: any;
}

export interface ProductDossierCustomer {
  customerId?: string;
  customerName: string;
  email: string;
  phone: string;
  companyName: string;
  gstin: string;
  city: string;
  state: string;
  totalUnitsPurchased: number;
  totalSpendOnSku: number;
  ordersCount: number;
  lastOrderDate: string;
}

export interface ProductDossierBranchInventory {
  id: string;
  branchId: string;
  branchName: string;
  branchCode: string;
  city: string;
  state: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
}

export interface ProductDossierSummaryMetrics {
  totalPurchasedQty: number;
  totalPurchaseExpenditure: number;
  avgPurchaseCost: number;
  totalSoldQty: number;
  totalSalesRevenue: number;
  avgSellingPrice: number;
  estimatedProfitMarginPercent: number;
  currentStockTotal: number;
  inventoryValueAtCost: number;
  inventoryValueAtRetail: number;
}

export interface ProductDossier {
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    categoryName: string;
    categorySlug?: string;
    brand: string;
    price: number;
    salePrice?: number | null;
    offerPrice?: number | null;
    stock: number;
    reorderLevel: number;
    status: string;
    isVisible: boolean;
    warranty: string;
    weight?: number | null;
    dimensions?: any;
    attributes?: any;
    specification?: any;
    thumbnail?: string | null;
    images?: string[];
    colours?: string[];
    createdAt: string;
    updatedAt: string;
    listedByName: string;
  };
  branchInventories: ProductDossierBranchInventory[];
  purchases: ProductDossierPurchase[];
  sales: ProductDossierSale[];
  stockMovements: ProductDossierMovement[];
  timeline: ProductDossierTimelineEvent[];
  customerDirectory: ProductDossierCustomer[];
  summaryMetrics: ProductDossierSummaryMetrics;
}


