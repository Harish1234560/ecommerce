import { z } from 'zod';
import { TICKET_STATUSES } from '../constants/index.js';
import { idSchema, pageSchema, zEmail, zImageUrl, zOptionalPhone } from './common.js';

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Select a rating').max(5),
  title: z.string().trim().max(100).optional(),
  comment: z.string().trim().min(10, 'Please write at least 10 characters').max(2000),
  images: z.array(zImageUrl).max(4).default([]),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export const createReviewSchema = reviewSchema.extend({ productId: idSchema });

export const createTicketSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email: zEmail,
  phone: zOptionalPhone,
  subject: z.string().trim().min(3, 'Enter a subject').max(150),
  message: z.string().trim().min(10, 'Please describe your issue (at least 10 characters)').max(3000),
  orderId: z.string().max(40).optional(),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const ticketMessageSchema = z.object({ message: z.string().trim().min(1, 'Type a message').max(3000) });

// Admin
export const adminReviewsQuerySchema = pageSchema.extend({
  status: z.enum(['PENDING', 'APPROVED', 'HIDDEN']).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  q: z.string().trim().max(100).optional(),
});
export const reviewStatusSchema = z.object({ status: z.enum(['PENDING', 'APPROVED', 'HIDDEN']) });

export const adminTicketsQuerySchema = pageSchema.extend({ status: z.enum(TICKET_STATUSES).optional(), q: z.string().trim().max(100).optional() });
export const ticketStatusSchema = z.object({ status: z.enum(TICKET_STATUSES) });
