export interface AdminUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'super_admin' | 'admin' | 'manager' | 'inventory_operator';
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

export interface ProductItem {
  id: string | number;
  name: string;
  sku: string;
  category?: string;
  categoryId?: string;
  price: number;
  salesPrice?: number;
  salePrice?: number; // legacy support
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
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
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
  details: string;
  createdAt: string;
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
  | 'inventory'
  | 'invoice'
  | 'logistics'
  | 'notification'
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
  | 'varients'
  | 'wishlist'
  | 'analytics'
  | 'audit'
  | 'admins';
