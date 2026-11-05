import { prisma } from '../../database/prisma.js';
import { conflict, notFound } from '../../utils/errors.js';
import { slugify, uniqueSlug } from '../../utils/slug.js';
import type { CategoryInput, SubcategoryInput } from '../../validators/adminCatalog.validators.js';

function categorySlug(base: string, excludeId?: string) {
  return uniqueSlug(base, 'category', async (slug) => !!(await prisma.category.findFirst({ where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })));
}

// Every category (including inactive ones) with its subcategories and product count.
export async function listCategories() {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { subcategories: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] } } }),
    prisma.product.groupBy({ by: ['categoryId'], where: { deletedAt: null }, _count: { _all: true } }),
  ]);
  const countBy = new Map(counts.map((c) => [c.categoryId, c._count._all]));
  return categories.map((c) => ({ ...c, productCount: countBy.get(c.id) ?? 0 }));
}

export async function createCategory(input: CategoryInput) {
  return prisma.category.create({ data: { ...input, slug: await categorySlug(input.slug || input.name) } });
}

export async function updateCategory(id: string, input: CategoryInput) {
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw notFound('Category');
  const slug = input.slug && input.slug !== existing.slug ? await categorySlug(input.slug, existing.id) : existing.slug;
  return prisma.category.update({ where: { id: existing.id }, data: { ...input, slug } });
}

export async function deleteCategory(id: string) {
  const existing = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!existing) throw notFound('Category');
  if (existing._count.products > 0) {
    throw conflict('This category still has products (including deleted ones kept for order history). Deactivate it instead, or move its products first.');
  }
  await prisma.category.delete({ where: { id: existing.id } });
  return existing;
}

export async function createSubcategory(categoryId: string, input: SubcategoryInput) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw notFound('Category');
  const slug = slugify(input.name) || 'subcategory';
  if (await prisma.subcategory.findUnique({ where: { categoryId_slug: { categoryId: category.id, slug } } })) {
    throw conflict('A subcategory with this name already exists in this category');
  }
  return prisma.subcategory.create({ data: { ...input, slug, categoryId: category.id } });
}

export async function updateSubcategory(id: string, input: SubcategoryInput) {
  const existing = await prisma.subcategory.findUnique({ where: { id } });
  if (!existing) throw notFound('Subcategory');
  const slug = slugify(input.name) || existing.slug;
  const clash = await prisma.subcategory.findFirst({ where: { categoryId: existing.categoryId, slug, id: { not: existing.id } } });
  if (clash) throw conflict('A subcategory with this name already exists in this category');
  return prisma.subcategory.update({ where: { id: existing.id }, data: { ...input, slug } });
}

// Products keep their category; only their subcategory link is cleared.
export async function deleteSubcategory(id: string) {
  const existing = await prisma.subcategory.findUnique({ where: { id } });
  if (!existing) throw notFound('Subcategory');
  await prisma.subcategory.delete({ where: { id: existing.id } });
  return existing;
}
