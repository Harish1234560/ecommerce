// Admin API. Every call here requires an ADMIN session; the server enforces it.
import { api, type PageMeta, type Params } from '@/api/client';
import type { OrderStatus, RefundStatus } from '@/types';
import type {
  AdminCategory, AdminContent, AdminCoupon, AdminCustomer, AdminCustomerDetail, AdminOrder, AdminOrderRow, AdminPayment, AdminProductDetail, AdminProductRow, AdminRefundRow,
  AdminReview, AdminSettings, AdminTicket, AdminTicketDetail, AnalyticsData, AuditLogEntry, DashboardData, InventoryRow, ProductStatus, ReviewStatus, StockTransaction, StoreSettings, TicketStatus,
} from '@/types/admin';

type StatusCounts = PageMeta & { statusCounts: Record<string, number> };
type Summary<T> = PageMeta & { summary: Record<string, T> };
/** A form payload assembled by an admin form; the server validates every field. */
type FormBody = object;

export const adminAnalyticsService = {
  dashboard: (range: Params) => api.get<DashboardData>('/admin/dashboard', range),
  analytics: (range: Params) => api.get<AnalyticsData>('/admin/analytics', range),
};

export const adminProductService = {
  list: <T = AdminProductRow>(query: Params) => api.getPaged<T[], PageMeta>('/admin/products', query),
  get: (id: string) => api.get<AdminProductDetail>(`/admin/products/${id}`),
  create: (body: FormBody) => api.post<{ id: string; slug: string }>('/admin/products', body),
  update: (id: string, body: FormBody) => api.put<{ id: string; slug: string }>(`/admin/products/${id}`, body),
  // Quick toggles: status and merchandising flags.
  patch: (id: string, changes: { status?: ProductStatus; featured?: boolean; isTrending?: boolean; isBestSeller?: boolean }) => api.patch<void>(`/admin/products/${id}`, changes),
  remove: (id: string) => api.delete<void>(`/admin/products/${id}`),
  bulk: (ids: string[], action: string) => api.post<{ affected: number }>('/admin/products/bulk', { ids, action }),
};

export const adminCategoryService = {
  list: () => api.get<AdminCategory[]>('/admin/categories'),
  create: (body: FormBody) => api.post<AdminCategory>('/admin/categories', body),
  update: (id: string, body: FormBody) => api.put<AdminCategory>(`/admin/categories/${id}`, body),
  remove: (id: string) => api.delete<void>(`/admin/categories/${id}`),
  addSubcategory: (categoryId: string, name: string) => api.post<void>(`/admin/categories/${categoryId}/subcategories`, { name }),
  updateSubcategory: (id: string, body: { name: string; isActive: boolean; sortOrder: number }) => api.put<void>(`/admin/categories/subcategories/${id}`, body),
  removeSubcategory: (id: string) => api.delete<void>(`/admin/categories/subcategories/${id}`),
};

export const adminInventoryService = {
  list: (query: Params) => api.getPaged<InventoryRow[], PageMeta>('/admin/inventory', query),
  adjust: (id: string, body: { mode: 'increase' | 'decrease' | 'set'; quantity: number; note?: string }) => api.post<void>(`/admin/inventory/${id}/adjust`, body),
  setThreshold: (id: string, lowStockThreshold: number) => api.patch<void>(`/admin/inventory/${id}`, { lowStockThreshold }),
  history: (id: string) => api.get<StockTransaction[]>(`/admin/inventory/${id}/history`),
};

export const adminOrderService = {
  list: (query: Params) => api.getPaged<AdminOrderRow[], StatusCounts>('/admin/orders', query),
  get: (id: string) => api.get<AdminOrder>(`/admin/orders/${id}`),
  updateStatus: (id: string, body: { status: OrderStatus; note?: string; courier?: string; trackingNumber?: string }) => api.post<void>(`/admin/orders/${id}/status`, body),
  downloadInvoice: (id: string, orderNumber: string) => api.download(`/admin/orders/${id}/invoice`, `invoice-${orderNumber}.pdf`),
};

export const adminCustomerService = {
  list: (query: Params) => api.getPaged<AdminCustomer[], PageMeta>('/admin/customers', query),
  get: (id: string) => api.get<AdminCustomerDetail>(`/admin/customers/${id}`),
  setActive: (id: string, isActive: boolean) => api.patch<void>(`/admin/customers/${id}`, { isActive }),
};

export const adminPaymentService = {
  list: (query: Params) => api.getPaged<AdminPayment[], Summary<{ count: number; amount: number; refunded: number }>>('/admin/payments', query),
};

export const adminRefundService = {
  list: (query: Params) => api.getPaged<AdminRefundRow[], Summary<{ count: number; amount: number }>>('/admin/refunds', query),
  approve: (id: string) => api.post<void>(`/admin/refunds/${id}/approve`, {}),
  reject: (id: string, note: string) => api.post<void>(`/admin/refunds/${id}/reject`, { note }),
  markReceived: (id: string) => api.post<void>(`/admin/refunds/${id}/received`),
  // Sends the refund to the gateway, or records a manual refund when a reference is given.
  process: (id: string, reference?: string) => api.post<{ status: RefundStatus }>(`/admin/refunds/${id}/process`, { reference }),
};

export const adminCouponService = {
  list: () => api.get<AdminCoupon[]>('/admin/coupons'),
  create: (body: FormBody) => api.post<AdminCoupon>('/admin/coupons', body),
  update: (id: string, body: FormBody) => api.put<AdminCoupon>(`/admin/coupons/${id}`, body),
  setActive: (id: string, isActive: boolean) => api.patch<void>(`/admin/coupons/${id}`, { isActive }),
  remove: (id: string) => api.delete<void>(`/admin/coupons/${id}`),
};

export const adminReviewService = {
  list: (query: Params) => api.getPaged<AdminReview[], StatusCounts>('/admin/reviews', query),
  setStatus: (id: string, status: ReviewStatus) => api.patch<void>(`/admin/reviews/${id}`, { status }),
  remove: (id: string) => api.delete<void>(`/admin/reviews/${id}`),
};

export const adminSupportService = {
  list: (query: Params) => api.getPaged<AdminTicket[], StatusCounts>('/admin/support', query),
  get: (id: string) => api.get<AdminTicketDetail>(`/admin/support/${id}`),
  reply: (id: string, message: string) => api.post<void>(`/admin/support/${id}/messages`, { message }),
  setStatus: (id: string, status: TicketStatus) => api.patch<void>(`/admin/support/${id}`, { status }),
};

export const adminContentService = {
  get: () => api.get<AdminContent>('/admin/content'),
  createBanner: (body: FormBody) => api.post<void>('/admin/content/banners', body),
  updateBanner: (id: string, body: FormBody) => api.put<void>(`/admin/content/banners/${id}`, body),
  removeBanner: (id: string) => api.delete<void>(`/admin/content/banners/${id}`),
  updateSection: (id: string, body: { title: string; subtitle: string | null; isActive: boolean; sortOrder: number }) => api.put<void>(`/admin/content/sections/${id}`, body),
  createTestimonial: (body: FormBody) => api.post<void>('/admin/content/testimonials', body),
  updateTestimonial: (id: string, body: FormBody) => api.put<void>(`/admin/content/testimonials/${id}`, body),
  removeTestimonial: (id: string) => api.delete<void>(`/admin/content/testimonials/${id}`),
  updatePage: (slug: string, body: { title: string; body: string; data: object }) => api.put<void>(`/admin/content/pages/${slug}`, body),
};

export interface AnnouncementInput {
  type: 'OFFER' | 'SYSTEM';
  title: string;
  message: string;
  link: string;
}

export const adminNotificationService = {
  // In-app notification to every active customer.
  broadcast: (input: AnnouncementInput) => api.post<{ recipients: number }>('/admin/notifications/broadcast', input),
};

export const adminSettingsService = {
  get: () => api.get<AdminSettings>('/admin/settings'),
  updateGroup: <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => api.put<void>(`/admin/settings/${key}`, value),
  createShippingZone: (body: FormBody) => api.post<void>('/admin/settings/shipping-zones', body),
  updateShippingZone: (id: string, body: FormBody) => api.put<void>(`/admin/settings/shipping-zones/${id}`, body),
  removeShippingZone: (id: string) => api.delete<void>(`/admin/settings/shipping-zones/${id}`),
  createTaxRule: (body: FormBody) => api.post<void>('/admin/settings/tax-rules', body),
  updateTaxRule: (id: string, body: FormBody) => api.put<void>(`/admin/settings/tax-rules/${id}`, body),
  removeTaxRule: (id: string) => api.delete<void>(`/admin/settings/tax-rules/${id}`),
  auditLogs: (query: { page: number; limit: number }) => api.getPaged<AuditLogEntry[], PageMeta>('/admin/settings/audit-logs', query),
};
