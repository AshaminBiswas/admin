import { fetchAdminApi } from "./adminApi";

export interface AllocationItem {
  id: string;
  warehouse: string;
  sku: string;
  allocatedQty: number;
  reservedQty: number;
  availableQty: number;
  status: "ALLOCATED" | "PENDING" | "SHIPPED";
  updatedAt: string;
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl: string;
  position: number;
  status: "ACTIVE" | "INACTIVE";
}

export interface CartItemData {
  id: string;
  userId: string;
  userEmail: string;
  itemsCount: number;
  totalValue: number;
  updatedAt: string;
  status: "ACTIVE" | "ABANDONED" | "CONVERTED";
}

export interface CheckoutSession {
  id: string;
  sessionId: string;
  customerName: string;
  step: "CART" | "ADDRESS" | "PAYMENT" | "COMPLETED";
  amount: number;
  createdAt: string;
}

export interface HomepageSection {
  id: string;
  sectionName: string;
  type: "HERO_BANNER" | "FEATURED_PRODUCTS" | "CATEGORIES_GRID" | "PROMO_STRIP";
  order: number;
  status: "ACTIVE" | "DRAFT";
}

export interface InvoiceItemData {
  id: string;
  invoiceNumber: string;
  orderId: string;
  customerName: string;
  amount: number;
  taxAmount: number;
  status: "PAID" | "PENDING" | "OVERDUE";
  issuedDate: string;
  dueDate: string;
}

export interface LogisticsPartner {
  id: string;
  carrierName: string;
  trackingPrefix: string;
  activeShipments: number;
  status: "OPERATIONAL" | "DELAYED" | "MAINTENANCE";
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "CRITICAL" | "SUCCESS";
  recipient: string;
  read: boolean;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  transactionId: string;
  gateway: "RAZORPAY" | "STRIPE" | "PAYTM" | "COD";
  amount: number;
  currency: string;
  status: "SUCCESS" | "PENDING" | "FAILED" | "REFUNDED";
  createdAt: string;
}

export interface SearchIndexItem {
  id: string;
  queryTerm: string;
  searchCount: number;
  resultsCount: number;
  conversionRate: string;
}

export interface MediaUploadItem {
  id: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface VariantItem {
  id: string;
  parentProductName: string;
  variantName: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
}

export interface WishlistItem {
  id: string;
  userEmail: string;
  productName: string;
  addedAt: string;
}

export const modelServices = {
  async getAllocations() {
    return await fetchAdminApi<AllocationItem[]>("/allocations");
  },
  async getBanners() {
    return await fetchAdminApi<BannerItem[]>("/banners");
  },
  async getCarts() {
    return await fetchAdminApi<CartItemData[]>("/carts");
  },
  async getCheckouts() {
    return await fetchAdminApi<CheckoutSession[]>("/checkouts");
  },
  async getHomepageSections() {
    return await fetchAdminApi<HomepageSection[]>("/homepage");
  },
  async getInvoices() {
    return await fetchAdminApi<InvoiceItemData[]>("/invoices");
  },
  async getLogistics() {
    return await fetchAdminApi<LogisticsPartner[]>("/logistics");
  },
  async getNotifications() {
    return await fetchAdminApi<NotificationItem[]>("/notifications");
  },
  async getPayments() {
    return await fetchAdminApi<PaymentTransaction[]>("/payments");
  },
  async getSearchMetrics() {
    return await fetchAdminApi<SearchIndexItem[]>("/search");
  },
  async getUploads() {
    return await fetchAdminApi<MediaUploadItem[]>("/uploads");
  },
  async getVariants() {
    return await fetchAdminApi<VariantItem[]>("/variants");
  },
  async getWishlists() {
    return await fetchAdminApi<WishlistItem[]>("/wishlists");
  },
};
