import type { Prisma, ReviewStatus } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { conflict, forbidden, notFound } from '../utils/errors.js';
import type { ReviewInput } from '../validators/engagement.validators.js';
import { recalcRating } from './catalog.service.js';
import { getSettings } from './settings.service.js';

// Reviews can only be written by customers who received the product, so every review is a verified purchase.

// The delivered order (if any) in which this user bought the product.
async function deliveredPurchase(userId: string, productId: string) {
  return prisma.order.findFirst({
    where: { userId, deliveredAt: { not: null }, items: { some: { productId } } },
    orderBy: { deliveredAt: 'desc' },
    select: { id: true },
  });
}

// The customer's reviews plus the delivered products they have not reviewed yet.
export async function getMyReviews(userId: string) {
  const [mine, delivered] = await Promise.all([
    prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        images: { select: { id: true, url: true } },
        product: { select: { id: true, name: true, slug: true, images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } } } },
      },
    }),
    prisma.orderItem.findMany({
      where: { order: { userId, deliveredAt: { not: null } } },
      orderBy: { createdAt: 'desc' },
      select: { productId: true, name: true, image: true, orderId: true, order: { select: { deliveredAt: true, orderNumber: true } }, product: { select: { slug: true, deletedAt: true } } },
    }),
  ]);
  const reviewed = new Set(mine.map((r) => r.productId));
  const seen = new Set<string>();
  const pending = delivered
    .filter((i) => !reviewed.has(i.productId) && !i.product.deletedAt && !seen.has(i.productId) && seen.add(i.productId))
    .map((i) => ({ productId: i.productId, name: i.name, image: i.image, slug: i.product.slug, orderId: i.orderId, orderNumber: i.order.orderNumber, deliveredAt: i.order.deliveredAt }));
  return {
    reviews: mine.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      status: r.status,
      isVerified: r.isVerified,
      createdAt: r.createdAt,
      images: r.images,
      product: { id: r.product.id, name: r.product.name, slug: r.product.slug, image: r.product.images[0]?.url ?? null },
    })),
    pending,
  };
}

export async function createReview(userId: string, productId: string, input: ReviewInput) {
  const purchase = await deliveredPurchase(userId, productId);
  if (!purchase) throw forbidden('You can review a product only after it has been delivered to you');
  if (await prisma.review.findUnique({ where: { productId_userId: { productId, userId } } })) {
    throw conflict('You have already reviewed this product');
  }
  const { policies } = await getSettings();
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        productId,
        userId,
        orderId: purchase.id,
        rating: input.rating,
        title: input.title || null,
        comment: input.comment,
        isVerified: true,
        status: policies.reviewRequiresApproval ? 'PENDING' : 'APPROVED',
        images: { create: input.images.map((url) => ({ url })) },
      },
    });
    await recalcRating(tx, productId);
    return review;
  });
}

export async function updateReview(userId: string, reviewId: string, input: ReviewInput): Promise<void> {
  const existing = await prisma.review.findFirst({ where: { id: reviewId, userId } });
  if (!existing) throw notFound('Review');
  const { policies } = await getSettings();
  await prisma.$transaction(async (tx) => {
    await tx.reviewImage.deleteMany({ where: { reviewId: existing.id } });
    await tx.review.update({
      where: { id: existing.id },
      data: {
        rating: input.rating,
        title: input.title || null,
        comment: input.comment,
        // An edited review goes back through moderation when approval is required.
        status: policies.reviewRequiresApproval ? 'PENDING' : existing.status === 'HIDDEN' ? 'HIDDEN' : 'APPROVED',
        images: { create: input.images.map((url) => ({ url })) },
      },
    });
    await recalcRating(tx, existing.productId);
  });
}

// Removes a review and refreshes the product's rating. Pass a userId to restrict it to the author.
export async function deleteReview(reviewId: string, userId?: string): Promise<void> {
  const existing = await prisma.review.findFirst({ where: { id: reviewId, ...(userId ? { userId } : {}) } });
  if (!existing) throw notFound('Review');
  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: existing.id } });
    await recalcRating(tx, existing.productId);
  });
}

// ───────────────────────── Moderation (admin) ─────────────────────────

export async function listReviewsForModeration(q: { page: number; limit: number; status?: ReviewStatus; rating?: number; q?: string }) {
  const where: Prisma.ReviewWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.rating ? { rating: q.rating } : {}),
    ...(q.q
      ? { OR: [{ comment: { contains: q.q, mode: 'insensitive' } }, { product: { name: { contains: q.q, mode: 'insensitive' } } }, { user: { name: { contains: q.q, mode: 'insensitive' } } }] }
      : {}),
  };
  const [items, total, counts] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, slug: true } },
        images: { select: { id: true, url: true } },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  return { items, total, statusCounts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) };
}

export async function setReviewStatus(reviewId: string, status: ReviewStatus): Promise<void> {
  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) throw notFound('Review');
  await prisma.$transaction(async (tx) => {
    await tx.review.update({ where: { id: existing.id }, data: { status } });
    await recalcRating(tx, existing.productId);
  });
}
