import type { Prisma, TicketStatus } from '@prisma/client';
import { ticketNumber } from '../constants/index.js';
import { prisma } from '../database/prisma.js';
import type { AuthUser } from '../types/index.js';
import { conflict, notFound } from '../utils/errors.js';
import type { CreateTicketInput } from '../validators/engagement.validators.js';
import { notify } from './notification.service.js';

// Support tickets: opened from the contact form (guests or customers), answered by the admin.

export async function createTicket(input: CreateTicketInput, user?: AuthUser) {
  let orderId: string | null = null;
  if (input.orderId && user) {
    // Only link an order that really belongs to the sender.
    const order = await prisma.order.findFirst({ where: { id: input.orderId, userId: user.id }, select: { id: true } });
    orderId = order?.id ?? null;
  }
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: user?.id ?? null,
      orderId,
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      subject: input.subject,
      messages: { create: { senderName: input.name, message: input.message } },
    },
  });
  return { id: ticket.id, ticketNumber: ticketNumber(ticket.seq) };
}

export async function listMyTickets(userId: string) {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { messages: true } } },
  });
  return tickets.map((t) => ({
    id: t.id,
    ticketNumber: ticketNumber(t.seq),
    subject: t.subject,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    messageCount: t._count.messages,
  }));
}

export async function getMyTicket(userId: string, ticketId: string) {
  const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, userId }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
  if (!ticket) throw notFound('Ticket');
  return { ...ticket, ticketNumber: ticketNumber(ticket.seq) };
}

export async function addCustomerMessage(user: AuthUser, ticketId: string, message: string) {
  const ticket = await prisma.supportTicket.findFirst({ where: { id: ticketId, userId: user.id } });
  if (!ticket) throw notFound('Ticket');
  if (ticket.status === 'CLOSED') throw conflict('This ticket is closed. Please open a new one.');
  const created = await prisma.supportMessage.create({ data: { ticketId: ticket.id, senderName: user.name, message } });
  // A customer reply re-opens a resolved ticket.
  await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: ticket.status === 'RESOLVED' ? 'OPEN' : ticket.status, updatedAt: new Date() } });
  return created;
}

// ───────────────────────── Admin ─────────────────────────

export async function listTickets(q: { page: number; limit: number; status?: TicketStatus; q?: string }) {
  const where: Prisma.SupportTicketWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.q
      ? { OR: [{ subject: { contains: q.q, mode: 'insensitive' } }, { name: { contains: q.q, mode: 'insensitive' } }, { email: { contains: q.q, mode: 'insensitive' } }] }
      : {}),
  };
  const [rows, total, counts] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { _count: { select: { messages: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    }),
    prisma.supportTicket.count({ where }),
    prisma.supportTicket.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const items = rows.map(({ messages, _count, ...t }) => ({
    ...t,
    ticketNumber: ticketNumber(t.seq),
    messageCount: _count.messages,
    lastMessage: messages[0] ? { message: messages[0].message.slice(0, 140), fromAdmin: messages[0].fromAdmin, createdAt: messages[0].createdAt } : null,
  }));
  return { items, total, statusCounts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) };
}

export async function getTicket(ticketId: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: { messages: { orderBy: { createdAt: 'asc' } }, order: { select: { id: true, orderNumber: true } }, user: { select: { id: true, name: true, email: true } } },
  });
  if (!ticket) throw notFound('Ticket');
  return { ...ticket, ticketNumber: ticketNumber(ticket.seq) };
}

export async function addAdminReply(admin: AuthUser, ticketId: string, message: string) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw notFound('Ticket');
  const created = await prisma.supportMessage.create({ data: { ticketId: ticket.id, fromAdmin: true, senderName: admin.name, message } });
  await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status, updatedAt: new Date() } });
  if (ticket.userId) {
    await notify({ userId: ticket.userId, type: 'SUPPORT', title: 'Support replied', message: `New reply on "${ticket.subject}"`, link: `/contact?ticket=${ticket.id}` });
  }
  return created;
}

export async function setTicketStatus(ticketId: string, status: TicketStatus) {
  const ticket = await prisma.supportTicket.update({ where: { id: ticketId }, data: { status } });
  if (ticket.userId && (status === 'RESOLVED' || status === 'CLOSED')) {
    await notify({ userId: ticket.userId, type: 'SUPPORT', title: `Ticket ${status.toLowerCase()}`, message: `Your request "${ticket.subject}" was marked ${status.toLowerCase()}.`, link: `/contact?ticket=${ticket.id}` });
  }
  return { id: ticket.id, status: ticket.status };
}
