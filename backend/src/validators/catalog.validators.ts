import { z } from 'zod';
import { zPincode } from './common.js';

const flag = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((v) => v === 'true' || v === '1');

// Filters accepted by the product listing (All Products, Category and Search pages).
export const productQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  subcategory: z.string().trim().max(100).optional(),
  brand: z.string().trim().max(500).optional(), // comma-separated
  minPrice: z.coerce.number().min(0).optional(), // rupees
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  discount: z.coerce.number().min(1).max(99).optional(),
  inStock: flag,
  featured: flag,
  trending: flag,
  bestseller: flag,
  sort: z.enum(['popularity', 'newest', 'price_asc', 'price_desc', 'rating', 'discount']).default('popularity'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});
export type ProductQuery = z.infer<typeof productQuerySchema>;

export const suggestSchema = z.object({ q: z.string().trim().min(2).max(60) });

export const productReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(5),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});
export type ProductReviewsQuery = z.infer<typeof productReviewsQuerySchema>;

export const deliveryCheckSchema = z.object({ pincode: zPincode });

export const newsletterSchema = z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address') });
