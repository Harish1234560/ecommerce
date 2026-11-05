import { z } from 'zod';
import { MAX_QTY_PER_ITEM } from '../constants/index.js';
import { idSchema, zPincode } from './common.js';

const quantity = z.coerce.number().int().min(1).max(MAX_QTY_PER_ITEM);

export const cartLineSchema = z.object({
  productId: idSchema,
  variantId: idSchema.nullable().optional(),
  quantity,
});
export type CartLineInput = z.infer<typeof cartLineSchema>;

export const updateCartItemSchema = z.object({
  quantity: quantity.optional(),
  savedForLater: z.boolean().optional(),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const couponCodeSchema = z.object({ code: z.string().trim().min(1, 'Enter a coupon code').max(40) });

export const mergeCartSchema = z.object({ items: z.array(cartLineSchema).max(50) });

// Guests keep their cart in the browser; the server prices it on request.
export const quoteSchema = z.object({
  items: z.array(cartLineSchema).max(50),
  couponCode: z.string().trim().max(40).nullable().optional(),
  pincode: zPincode.nullable().optional(),
});
export type QuoteInput = z.infer<typeof quoteSchema>;

// Optional ?pincode=… on cart reads lets checkout price delivery for the chosen address.
export const pincodeQuerySchema = z.object({ pincode: zPincode.optional().catch(undefined) });
