import { z } from 'zod';
import { idSchema, nullableText, pageSchema, zPhone, zPincode } from './common.js';

export const wishlistAddSchema = z.object({ productId: idSchema });

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the full name').max(80),
  phone: zPhone,
  address: z.string().trim().min(5, 'Enter the address').max(200),
  apartment: nullableText(100),
  street: nullableText(120),
  city: z.string().trim().min(2, 'Enter the city').max(60),
  state: z.string().trim().min(2, 'Select the state').max(60),
  pincode: zPincode,
  landmark: nullableText(120),
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const notificationsQuerySchema = pageSchema.extend({ unread: z.enum(['true', 'false']).optional() });
