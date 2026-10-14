import { api, type PageMeta, type Params } from '@/api/client';
import type { Category, ContentPage, DeliveryEstimate, HomeData, OffersData, ProductCard, ProductDetail, ProductListMeta, PublicSettings, ReviewItem } from '@/types';

// Public storefront data: catalogue, homepage, offers, editable pages and store settings.
export const catalogService = {
  home: () => api.get<HomeData>('/home'),
  products: (query: Params, signal?: AbortSignal) => api.getPaged<ProductCard[], ProductListMeta>('/products', query, signal),
  suggest: (q: string, signal?: AbortSignal) => api.get<ProductCard[]>('/products/suggest', { q }, signal),
  product: (slug: string) => api.get<ProductDetail>(`/products/${slug}`),
  productReviews: (slug: string, query: { page: number; limit: number; rating?: number | null }) => api.getPaged<ReviewItem[], PageMeta>(`/products/${slug}/reviews`, query),
  categories: () => api.get<Category[]>('/categories'),
  category: (slug: string) => api.get<Category>(`/categories/${slug}`),
  offers: () => api.get<OffersData>('/offers'),
  contentPage: <D = Record<string, unknown>>(slug: string) => api.get<ContentPage<D>>(`/content/${slug}`),
  publicSettings: () => api.get<PublicSettings>('/settings/public'),
  checkDelivery: (pincode: string) => api.get<DeliveryEstimate>('/delivery/check', { pincode }),
  subscribeNewsletter: (email: string) => api.post<void>('/newsletter', { email }),
};
