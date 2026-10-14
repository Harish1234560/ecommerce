import { z } from 'zod';
import { ApiError } from '../utils/errors.js';

// Validates input against a schema. On failure throws a 400 carrying one message per field.
export function validate<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  const [firstKey, firstMessage] = Object.entries(fields)[0] ?? ['_', 'Invalid input'];
  throw new ApiError(400, firstKey === '_' ? firstMessage : `${firstKey}: ${firstMessage}`, fields, 'VALIDATION_ERROR');
}

export const pageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const idSchema = z.string().min(1).max(40);

export const zEmail = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

export const zPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Password must contain a letter and a number');

// Indian mobile number; accepts +91 / 91 / 0 prefixes and stores the bare 10 digits.
export const zPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, ''))
  .refine((v) => /^[6-9]\d{9}$/.test(v), 'Enter a valid 10-digit Indian mobile number');

export const zOptionalPhone = zPhone.optional().or(z.literal('').transform(() => undefined));

export const zPincode = z
  .string()
  .trim()
  .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit PIN code');

// Optional free text: trims, and stores empty input as null.
export const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => v || null);

export const nullableInt = (max: number) => z.coerce.number().int().min(0).max(max).nullable().optional();
export const nullableDate = z.coerce.date().nullable().optional();

// Uploaded images are either served by this API (/uploads/…) or by an https CDN.
export const zImageUrl = z
  .string()
  .max(500)
  .refine((v) => v.startsWith('/uploads/') || v.startsWith('https://'), 'Invalid image URL');

export const zDateRange = { from: z.coerce.date().optional(), to: z.coerce.date().optional() };
