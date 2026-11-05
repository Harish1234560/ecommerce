import { api, type PageMeta } from '@/api/client';
import type { Address, MyReviews, Notification, ReviewInput, SupportTicket, TicketInput } from '@/types';

type AddressInput = Omit<Address, 'id'>;

export const addressService = {
  list: () => api.get<Address[]>('/addresses'),
  create: (input: AddressInput) => api.post<Address>('/addresses', input),
  update: (id: string, input: AddressInput) => api.put<Address>(`/addresses/${id}`, input),
  setDefault: (id: string) => api.patch<void>(`/addresses/${id}/default`),
  remove: (id: string) => api.delete<void>(`/addresses/${id}`),
};

export const notificationService = {
  list: (query: { page: number; limit: number; unread?: 'true' }) => api.getPaged<Notification[], PageMeta & { unreadCount: number }>('/notifications', query),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: string) => api.patch<void>(`/notifications/${id}/read`),
  markAllRead: () => api.post<void>('/notifications/read-all'),
  remove: (id: string) => api.delete<void>(`/notifications/${id}`),
};

export const reviewService = {
  mine: () => api.get<MyReviews>('/reviews/mine'),
  create: (productId: string, input: ReviewInput) => api.post<{ id: string; status: string }>('/reviews', { ...input, productId }),
  update: (id: string, input: ReviewInput) => api.put<{ id: string }>(`/reviews/${id}`, input),
  remove: (id: string) => api.delete<void>(`/reviews/${id}`),
};

export const supportService = {
  myTickets: () => api.get<SupportTicket[]>('/support/tickets'),
  ticket: (id: string) => api.get<SupportTicket>(`/support/tickets/${id}`),
  create: (input: TicketInput) => api.post<{ id: string; ticketNumber: string }>('/support/tickets', input),
  reply: (id: string, message: string) => api.post<void>(`/support/tickets/${id}/messages`, { message }),
};

export const uploadService = {
  // Uploads images and returns their URLs.
  images: async (files: File[]) => {
    const form = new FormData();
    for (const file of files) form.append('files', file);
    return (await api.upload<{ urls: string[] }>('/uploads', form)).urls;
  },
};
