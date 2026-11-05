import type { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.js';
import { notFound } from '../../utils/errors.js';
import type { BannerInput, PageInput, SectionInput, TestimonialInput } from '../../validators/adminContent.validators.js';

// Everything the admin can edit on the storefront: banners, homepage sections, testimonials and pages.

export async function getContent() {
  const [banners, sections, testimonials, pages] = await Promise.all([
    prisma.banner.findMany({ orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }] }),
    prisma.homepageSection.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.testimonial.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.contentPage.findMany({ orderBy: { slug: 'asc' } }),
  ]);
  return { banners, sections, testimonials, pages };
}

export const createBanner = (input: BannerInput) => prisma.banner.create({ data: input });
export const updateBanner = (id: string, input: BannerInput) => prisma.banner.update({ where: { id }, data: input });
export const deleteBanner = (id: string) => prisma.banner.delete({ where: { id } });

export const updateSection = (id: string, input: SectionInput) => prisma.homepageSection.update({ where: { id }, data: input });

export const createTestimonial = (input: TestimonialInput) => prisma.testimonial.create({ data: input });
export const updateTestimonial = (id: string, input: TestimonialInput) => prisma.testimonial.update({ where: { id }, data: input });
export const deleteTestimonial = (id: string) => prisma.testimonial.delete({ where: { id } });

export async function updatePage(slug: string, input: PageInput) {
  const existing = await prisma.contentPage.findUnique({ where: { slug } });
  if (!existing) throw notFound('Page');
  return prisma.contentPage.update({ where: { id: existing.id }, data: { title: input.title, body: input.body, data: input.data as Prisma.InputJsonValue } });
}
