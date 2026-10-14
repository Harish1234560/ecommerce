import { type PageMeta } from '@/api/client';



// Shapes returned by the API. All money values are integers in paise.

export type Role = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
  createdAt: string;
}

export interface ProductCard {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  price: number;
  sellingPrice: number;
  discountPercent: number;
  ratingAvg: number;
  ratingCount: number;
  stock: number;
  hasVariants: boolean;
  featured: boolean;
  isTrending: boolean;
  isBestSeller: boolean;
  category: { name: string; slug: string };
  image: string | null;
  hoverImage: string | null;
}

export interface Variant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  price: number;
  sellingPrice: number;
  available: number;
}

export interface ProductDetail extends Omit<ProductCard, 'image' | 'hoverImage' | 'category'> {
  sku: string;
  description: string;
  specifications: { label: string; value: string }[];
  tags: string[];
  category: { id: string; name: string; slug: string };
  subcategory: { id: string; name: string; slug: string } | null;
  images: { id: string; url: string; alt: string | null }[];
  variants: Variant[];
  available: number;
  ratingBreakdown: Record<string, number>;
  related: ProductCard[];
  frequentlyBought: ProductCard[];
  returnWindowDays: number;
}

export interface Facets {
  brands: { name: string; count: number }[];
  priceRange: { min: number; max: number };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  productCount: number;
  subcategories: { id: string; name: string; slug: string }[];
}

export interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  isVerified: boolean;
  createdAt: string;
  user: { name: string; avatarUrl: string | null };
  images: { id: string; url: string }[];
}

export interface Banner {
  id: string;
  type: 'HERO' | 'PROMO';
  title: string;
  subtitle: string | null;
  imageUrl: string;
  ctaText: string | null;
  linkUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Offer {
  id: string;
  code: string;
  description: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  expiresAt: string | null;
  products: { name: string; slug: string }[];
  categories: { name: string; slug: string }[];
}

export interface Testimonial {
  id: string;
  name: string;
  location: string | null;
  text: string;
  rating: number;
  isActive: boolean;
  sortOrder: number;
}

export interface HomeData {
  banners: { hero: Banner[]; promo: Banner[] };
  sections: { key: string; title: string; subtitle: string | null }[];
  categories: Category[];
  featured: ProductCard[];
  trending: ProductCard[];
  bestSellers: ProductCard[];
  offers: Offer[];
  testimonials: Testimonial[];
}

export interface PublicSettings {
  store: { name: string; tagline: string; logoUrl: string; email: string; phone: string; address: string; businessHours: string; mapEmbedUrl: string; gstin: string };
  social: { instagram: string; youtube: string; facebook: string; twitter: string; whatsapp: string };
  shipping: { defaultFee: number; freeShippingThreshold: number };
  payment: { codEnabled: boolean; onlineEnabled: boolean; codMaxAmount: number };
  tax: { pricesIncludeTax: boolean };
  policies: { returnWindowDays: number };
}

export type LineIssue = 'UNAVAILABLE' | 'OUT_OF_STOCK' | 'INSUFFICIENT_STOCK';

export interface CartLine {
  id: string;
  productId: string;
  variantId: string | null;
  name: string;
  slug: string;
  image: string | null;
  brand: string | null;
  sku: string;
  variantLabel: string | null;
  mrp: number;
  unitPrice: number;
  quantity: number;
  lineMrp: number;
  lineTotal: number;
  availableStock: number;
  savedForLater: boolean;
  issue: LineIssue | null;
  issueMessage: string | null;
}

export interface CartSummary {
  itemCount: number;
  mrpTotal: number;
  discount: number;
  subtotal: number;
  couponCode: string | null;
  couponDiscount: number;
  shippingFee: number;
  freeShippingAbove: number | null;
  tax: number;
  taxInclusive: boolean;
  total: number;
}

export interface Cart {
  items: CartLine[];
  saved: CartLine[];
  summary: CartSummary;
  coupon: { code: string; description: string | null } | null;
  couponError: string | null;
  hasIssues: boolean;
  shipping: { deliverable: boolean; zone: string | null; fee: number; freeAbove: number | null; minDays: number; maxDays: number; codAvailable: boolean };
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  apartment: string | null;
  street: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  isDefault: boolean;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'RETURNED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export type RefundStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface OrderListItem {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'COD' | 'ONLINE';
  total: number;
  expectedDelivery: string | null;
  deliveredAt: string | null;
  items: { id: string; name: string; image: string | null; quantity: number; variantLabel: string | null }[];
  canPay: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  slug: string;
  name: string;
  sku: string;
  image: string | null;
  variantLabel: string | null;
  mrp: number;
  unitPrice: number;
  quantity: number;
  taxRate: number;
  lineTotal: number;
  netAmount: number;
  returnedQty: number;
}

export interface OrderHistoryEntry {
  id: string;
  status: OrderStatus;
  note: string | null;
  actor: string | null;
  createdAt: string;
}

export interface OrderPayment {
  id: string;
  gateway: 'COD' | 'RAZORPAY' | 'MOCK';
  method: string | null;
  amount: number;
  status: PaymentStatus;
  transactionId: string | null;
  reference: string | null;
  refundedAmount: number;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface OrderRefund {
  id: string;
  type: 'CANCELLATION' | 'RETURN';
  status: RefundStatus;
  amount: number;
  reason: string;
  adminNote: string | null;
  items: { orderItemId: string; quantity: number }[];
  createdAt: string;
  completedAt: string | null;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  apartment: string | null;
  street: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
}

export interface OrderDetail {
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
  cancelledAt: string | null;
  deliveredAt: string | null;
  invoiceNumber: string | null;
  items: OrderItem[];
  history: OrderHistoryEntry[];
  payments: OrderPayment[];
  refunds: OrderRefund[];
  reviewedProductIds: string[];
  canCancel: boolean;
  canReturn: boolean;
  canPay: boolean;
  invoiceAvailable: boolean;
}

export interface Notification {
  id: string;
  type: 'ORDER' | 'PAYMENT' | 'REFUND' | 'OFFER' | 'SUPPORT' | 'SYSTEM';
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface WishlistEntry {
  id: string;
  addedAt: string;
  available: boolean;
  product: ProductCard;
}

export interface MyReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  status: 'PENDING' | 'APPROVED' | 'HIDDEN';
  isVerified: boolean;
  createdAt: string;
  images: { id: string; url: string }[];
  product: { id: string; name: string; slug: string; image: string | null };
}

export interface PendingReview {
  productId: string;
  name: string;
  image: string | null;
  slug: string;
  orderId: string;
  orderNumber: string;
  deliveredAt: string;
}

export interface ContentPage<D = Record<string, unknown>> {
  slug: string;
  title: string;
  body: string;
  data: D;
  updatedAt: string;
}

export interface AboutData {
  heroTitle?: string;
  heroSubtitle?: string;
  story?: string;
  mission?: string;
  vision?: string;
  whyChooseUs?: { title: string; text: string }[];
  qualityPromise?: string;
  customerFirst?: string;
  stats?: { label: string; value: string }[];
  team?: { name: string; role: string }[];
  businessInfo?: string;
}

export interface PaymentSession {
  gateway: 'RAZORPAY' | 'MOCK';
  keyId: string;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  orderId: string;
  orderNumber: string;
  method: string | null;
  storeName: string;
  customer: { name: string; email: string; phone: string | null };
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  messages?: { id: string; fromAdmin: boolean; senderName: string; message: string; createdAt: string }[];
}

export type ProductListMeta = PageMeta & { facets: Facets };

export interface OffersData {
  coupons: Offer[];
  deals: ProductCard[];
  categoryOffers: { name: string; slug: string; imageUrl: string | null; maxDiscount: number; productCount: number }[];
}

// ── API results used by the service layer ──

export interface AuthResult {
  user: User;
  accessToken: string;
}

export interface DeliveryEstimate {
  pincode: string;
  deliverable: boolean;
  codAvailable: boolean;
  fee: number;
  freeAbove: number | null;
  estimatedFrom: string;
  estimatedTo: string;
}

export interface PlacedOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: OrderStatus;
  paymentMethod: 'COD' | 'ONLINE';
  requiresPayment: boolean;
}

export type OnlineMethod = 'upi' | 'card' | 'netbanking' | 'wallet';

// The gateway's checkout response (Razorpay field names), sent to the server for verification.
export interface GatewayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface CartLineInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface MyReviews {
  reviews: MyReview[];
  pending: PendingReview[];
}

export interface ReviewInput {
  rating: number;
  title?: string;
  comment: string;
  images: string[];
}

export interface TicketInput {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  orderId?: string;
}
