import type { AboutData, Banner, OrderHistoryEntry, OrderItem, OrderStatus, PaymentStatus, PublicSettings, RefundStatus, ShippingAddress, Testimonial } from '@/types';

export type RangePreset = 'today' | '7d' | '30d' | 'year' | 'custom';

export interface DateRange {
  range: RangePreset;
  from: string;
  to: string;
}

export interface AnalyticsData {
  range: { from: string; to: string; unit: 'day' | 'month' };
  stats: { revenue: number; orders: number; averageOrderValue: number; newCustomers: number; buyers: number; conversionRate: number; refundAmount: number; refundCount: number };
  series: { date: string; revenue: number; orders: number; customers: number }[];
  topProducts: { productId: string; name: string; image: string | null; quantity: number; revenue: number }[];
  categorySales: { name: string; quantity: number; revenue: number }[];
  couponUsage: { code: string; uses: number; discount: number }[];
  paymentMethods: { method: string; count: number; amount: number }[];
  refunds: { status: RefundStatus; count: number; amount: number }[];
  statusBreakdown: { status: OrderStatus; count: number }[];
}

export interface DashboardData extends AnalyticsData {
  totals: { customers: number; products: number; pendingOrders: number; lowStock: number; openRefunds: number; openTickets: number };
  lowStockItems: { id: string; productId: string; name: string; sku: string; size: string | null; color: string | null; available: number; lowStockThreshold: number }[];
  recentOrders: { id: string; orderNumber: string; createdAt: string; total: number; status: OrderStatus; paymentStatus: PaymentStatus; paymentMethod: string; customer: string }[];
}

export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';

export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string | null;
  price: number;
  sellingPrice: number;
  discountPercent: number;
  stock: number;
  status: ProductStatus;
  featured: boolean;
  hasVariants: boolean;
  salesCount: number;
  category: { id: string; name: string };
  image: string | null;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  subcategories: { id: string; name: string; slug: string; isActive: boolean; sortOrder: number }[];
}

export interface AdminProductDetail {
  id: string; name: string; slug: string; sku: string; categoryId: string; subcategoryId: string | null; description: string; brand: string | null; tags: string[];
  price: number; discountPrice: number | null; tax: number | null; weight: number | null; length: number | null; width: number | null; height: number | null;
  status: ProductStatus; featured: boolean; isTrending: boolean; isBestSeller: boolean; specifications: { label: string; value: string }[];
  images: { url: string }[]; baseStock: number; reserved: number; lowStockThreshold: number;
  variants: { id: string; sku: string; size: string | null; color: string | null; price: number | null; discountPrice: number | null; isActive: boolean; stock: number; reserved: number }[];
}

export type AdminSubcategory = AdminCategory['subcategories'][number];

export interface InventoryRow {
  id: string;
  productId: string;
  name: string;
  image: string | null;
  sku: string;
  variantLabel: string | null;
  stock: number;
  reserved: number;
  available: number;
  lowStockThreshold: number;
  isLow: boolean;
  isOut: boolean;
}

export interface StockTransaction {
  id: string;
  type: string;
  quantity: number;
  reservedDelta: number;
  stockAfter: number;
  note: string | null;
  adminName: string | null;
  createdAt: string;
}

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  createdAt: string;
  customer: { id: string; name: string; email: string };
  itemCount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'COD' | 'ONLINE';
}

export interface AdminRefund {
  id: string;
  type: 'CANCELLATION' | 'RETURN';
  status: RefundStatus;
  amount: number;
  reason: string;
  adminNote: string | null;
  items: { orderItemId: string; quantity: number }[];
  gatewayRefundId: string | null;
  reference: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'COD' | 'ONLINE';
  mrpTotal: number;
  discount: number;
  subtotal: number;
  couponCode: string | null;
  couponDiscount: number;
  shippingFee: number;
  tax: number;
  taxInclusive: boolean;
  total: number;
  shippingAddress: ShippingAddress;
  notes: string | null;
  expectedDelivery: string | null;
  courier: string | null;
  trackingNumber: string | null;
  cancelReason: string | null;
  invoiceNumber: string | null;
  user: { id: string; name: string; email: string; phone: string | null; createdAt: string };
  items: OrderItem[];
  history: OrderHistoryEntry[];
  payments: { id: string; gateway: string; method: string | null; amount: number; status: PaymentStatus; gatewayPaymentId: string | null; gatewayOrderId: string | null; reference: string | null; refundedAmount: number; failureReason: string | null; paidAt: string | null; createdAt: string }[];
  refunds: AdminRefund[];
  awaitingPayment: boolean;
  nextStatuses: OrderStatus[];
}

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  orderCount: number;
  totalSpent: number;
}

export interface AdminCustomerDetail extends AdminCustomer {
  wishlistCount: number;
  addresses: (ShippingAddress & { id: string; isDefault: boolean })[];
  recentOrders: { id: string; orderNumber: string; createdAt: string; total: number; status: OrderStatus }[];
  reviews: { id: string; rating: number; comment: string; createdAt: string; product: { name: string } }[];
  tickets: { id: string; subject: string; status: string; createdAt: string }[];
}

export interface AdminPayment {
  id: string;
  transactionId: string;
  orderId: string;
  orderNumber: string;
  customer: { id: string; name: string; email: string };
  amount: number;
  refundedAmount: number;
  method: string | null;
  gateway: string;
  status: PaymentStatus;
  reference: string | null;
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface AdminRefundRow extends AdminRefund {
  customer: { id: string; name: string; email: string };
  order: { id: string; orderNumber: string; status: OrderStatus; total: number; paymentMethod: string; items: { id: string; name: string; variantLabel: string | null; quantity: number; image: string | null }[] };
  viaGateway: boolean;
  processedAt: string | null;
}

export interface AdminCoupon {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  startsAt: string;
  expiresAt: string | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  isActive: boolean;
  showOnOffers: boolean;
  products: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  _count: { usages: number };
}

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'HIDDEN';

export interface AdminReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  status: ReviewStatus;
  isVerified: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string };
  product: { id: string; name: string; slug: string };
  images: { id: string; url: string }[];
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface AdminTicket {
  id: string;
  ticketNumber: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: { message: string; fromAdmin: boolean; createdAt: string } | null;
}

export interface AdminTicketDetail extends AdminTicket {
  order: { id: string; orderNumber: string } | null;
  user: { id: string; name: string; email: string } | null;
  messages: { id: string; fromAdmin: boolean; senderName: string; message: string; createdAt: string }[];
}

export interface HomepageSection {
  id: string;
  key: string;
  title: string;
  subtitle: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface EditablePage {
  id: string;
  slug: string;
  title: string;
  body: string;
  data: AboutData;
  updatedAt: string;
}

export interface AdminContent {
  banners: Banner[];
  sections: HomepageSection[];
  testimonials: Testimonial[];
  pages: EditablePage[];
}

export interface MerchandisingProduct {
  id: string;
  name: string;
  image: string | null;
  featured: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  status: string;
}

export interface StoreSettings {
  store: PublicSettings['store'];
  shipping: { defaultFee: number; freeShippingThreshold: number; processingDays: number; defaultMinDays: number; defaultMaxDays: number; deliverOutsideZones: boolean };
  tax: { pricesIncludeTax: boolean; defaultRate: number };
  payment: { codEnabled: boolean; onlineEnabled: boolean; codMaxAmount: number; pendingPaymentExpiryMinutes: number };
  notifications: { emailEnabled: boolean; smsEnabled: boolean; pushEnabled: boolean };
  social: PublicSettings['social'];
  policies: { returnWindowDays: number; reviewRequiresApproval: boolean };
}

export interface ShippingZone {
  id: string;
  name: string;
  pincodePrefixes: string[];
  fee: number;
  freeAbove: number | null;
  minDays: number;
  maxDays: number;
  codAvailable: boolean;
  isActive: boolean;
}

export interface TaxRule {
  id: string;
  name: string;
  rate: number;
  categoryId: string | null;
  isDefault: boolean;
  isActive: boolean;
  category: { id: string; name: string } | null;
}

export interface AdminSettings {
  settings: StoreSettings;
  shippingZones: ShippingZone[];
  taxRules: TaxRule[];
  integrations: { paymentGateway: string; paymentTestMode: boolean; emailConfigured: boolean; storageProvider: string };
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  admin: { name: string; email: string };
}
