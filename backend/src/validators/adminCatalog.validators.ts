import { z } from 'zod';
import { idSchema, nullableText, pageSchema } from './common.js';

const money = z.coerce.number().int().min(0).max(100_000_000); // paise
const nullableNumber = z.coerce.number().min(0).max(1_000_000).nullable().optional();
const stockLevel = z.coerce.number().int().min(0).max(1_000_000);
const sortOrder = z.coerce.number().int().min(0).max(9999).default(0);
const productStatus = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']);

// ───────────────────────── Products ─────────────────────────

const variantSchema = z.object({
  id: idSchema.optional(),
  sku: z.string().trim().min(1, 'Variant SKU is required').max(60),
  size: nullableText(30),
  color: nullableText(30),
  price: money.nullable().optional(),
  discountPrice: money.nullable().optional(),
  stock: stockLevel.default(0),
  isActive: z.boolean().default(true),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(2, 'Product name is required').max(160),
    slug: z.string().trim().max(100).optional(),
    sku: z.string().trim().min(1, 'SKU is required').max(60),
    categoryId: z.string().min(1, 'Select a category').max(40),
    subcategoryId: idSchema.nullable().optional().transform((v) => v || null),
    description: z.string().trim().min(1, 'Description is required').max(10_000),
    specifications: z.array(z.object({ label: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(300) })).max(40).default([]),
    brand: nullableText(60),
    tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(20).default([]),
    price: money.refine((v) => v > 0, 'Price must be greater than zero'),
    discountPrice: money.nullable().optional(),
    tax: z.coerce.number().min(0).max(100).nullable().optional(),
    stock: stockLevel.default(0),
    lowStockThreshold: z.coerce.number().int().min(0).max(100_000).default(5),
    weight: z.coerce.number().int().min(0).max(1_000_000).nullable().optional(),
    length: nullableNumber,
    width: nullableNumber,
    height: nullableNumber,
    status: productStatus.default('ACTIVE'),
    featured: z.boolean().default(false),
    isTrending: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    images: z.array(z.object({ url: z.string().min(1).max(500), alt: nullableText(160) })).max(12).default([]),
    variants: z.array(variantSchema).max(60).default([]),
  })
  .refine((v) => v.discountPrice == null || v.discountPrice < v.price, { path: ['discountPrice'], message: 'Discount price must be lower than the price' })
  .refine((v) => new Set(v.variants.map((x) => x.sku.toLowerCase())).size === v.variants.length, { path: ['variants'], message: 'Variant SKUs must be unique' })
  .refine((v) => v.variants.every((x) => x.price == null || x.discountPrice == null || x.discountPrice < x.price), {
    path: ['variants'],
    message: 'A variant discount price must be lower than its price',
  });
export type ProductInput = z.infer<typeof productSchema>;

export const adminProductsQuerySchema = pageSchema.extend({
  q: z.string().trim().max(100).optional(),
  category: idSchema.optional(),
  status: productStatus.optional(),
  stock: z.enum(['in', 'low', 'out']).optional(),
  flag: z.enum(['featured', 'trending', 'bestseller']).optional(),
  sort: z.enum(['newest', 'oldest', 'name', 'price_asc', 'price_desc', 'stock_asc', 'stock_desc', 'sales']).default('newest'),
});
export type AdminProductsQuery = z.infer<typeof adminProductsQuerySchema>;

// Quick toggles: status and merchandising flags.
export const productPatchSchema = z.object({
  status: productStatus.optional(),
  featured: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
});
export type ProductPatch = z.infer<typeof productPatchSchema>;

export const bulkProductsSchema = z.object({
  ids: z.array(idSchema).min(1, 'Select at least one product').max(200),
  action: z.enum(['activate', 'deactivate', 'delete', 'feature', 'unfeature']),
});
export type BulkProductAction = z.infer<typeof bulkProductsSchema>['action'];

// ───────────────────────── Categories ─────────────────────────

export const categorySchema = z.object({
  name: z.string().trim().min(2, 'Category name is required').max(60),
  slug: z.string().trim().max(80).optional(),
  description: nullableText(500),
  imageUrl: nullableText(500),
  bannerUrl: nullableText(500),
  isActive: z.boolean().default(true),
  sortOrder,
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const subcategorySchema = z.object({
  name: z.string().trim().min(2, 'Subcategory name is required').max(60),
  isActive: z.boolean().default(true),
  sortOrder,
});
export type SubcategoryInput = z.infer<typeof subcategorySchema>;

// ───────────────────────── Inventory ─────────────────────────

export const inventoryQuerySchema = pageSchema.extend({
  q: z.string().trim().max(100).optional(),
  filter: z.enum(['all', 'low', 'out']).default('all'),
});
export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;

export const stockAdjustSchema = z.object({
  mode: z.enum(['increase', 'decrease', 'set']),
  quantity: stockLevel,
  note: z.string().trim().max(200).optional(),
});
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;

export const thresholdSchema = z.object({ lowStockThreshold: z.coerce.number().int().min(0).max(100_000) });
