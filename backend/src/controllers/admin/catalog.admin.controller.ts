// Admin: products, categories and inventory.
import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/auth.js';
import * as categoryService from '../../services/admin/category.admin.service.js';
import * as inventoryService from '../../services/admin/inventory.admin.service.js';
import * as productService from '../../services/admin/product.admin.service.js';
import { audit } from '../../services/audit.service.js';
import { created, ok, pageMeta } from '../../utils/response.js';
import {
  adminProductsQuerySchema, bulkProductsSchema, categorySchema, inventoryQuerySchema, productPatchSchema, productSchema, stockAdjustSchema, subcategorySchema, thresholdSchema,
} from '../../validators/adminCatalog.validators.js';
import { validate } from '../../validators/common.js';

type IdParams = { id: string };
type SubParams = { subId: string };
const adminId = (req: Request) => currentUser(req).id;

// ───────────────────────── Products ─────────────────────────

export async function listProducts(req: Request, res: Response) {
  const q = validate(adminProductsQuerySchema, req.query);
  const { items, total } = await productService.listProducts(q);
  ok(res, items, { meta: pageMeta(total, q.page, q.limit) });
}

export async function getProduct(req: Request<IdParams>, res: Response) {
  ok(res, await productService.getProduct(req.params.id));
}

export async function createProduct(req: Request, res: Response) {
  const product = await productService.createProduct(validate(productSchema, req.body), adminId(req));
  await audit(adminId(req), 'product.create', 'Product', product.id, { name: product.name });
  created(res, { id: product.id, slug: product.slug }, 'Product created');
}

export async function updateProduct(req: Request<IdParams>, res: Response) {
  const input = validate(productSchema, req.body);
  const result = await productService.updateProduct(req.params.id, input, adminId(req));
  await audit(adminId(req), 'product.update', 'Product', result.id, { name: input.name, changes: result.changes });
  ok(res, { id: result.id, slug: result.slug }, { message: 'Product updated' });
}

export async function deleteProduct(req: Request<IdParams>, res: Response) {
  await productService.deleteProduct(req.params.id);
  await audit(adminId(req), 'product.delete', 'Product', req.params.id);
  ok(res, { deleted: true }, { message: 'Product deleted' });
}

export async function patchProduct(req: Request<IdParams>, res: Response) {
  const patch = validate(productPatchSchema, req.body);
  const { name, ...product } = await productService.patchProduct(req.params.id, patch);
  await audit(adminId(req), 'product.update', 'Product', product.id, { name, changes: patch });
  ok(res, product, { message: 'Product updated' });
}

export async function bulkProducts(req: Request, res: Response) {
  const { ids, action } = validate(bulkProductsSchema, req.body);
  const affected = await productService.bulkUpdateProducts(ids, action);
  await audit(adminId(req), `product.bulk.${action}`, 'Product', null, { ids, affected });
  ok(res, { affected }, { message: `${affected} product(s) updated` });
}

// ───────────────────────── Categories ─────────────────────────

export async function listCategories(_req: Request, res: Response) {
  ok(res, await categoryService.listCategories());
}

export async function createCategory(req: Request, res: Response) {
  const category = await categoryService.createCategory(validate(categorySchema, req.body));
  await audit(adminId(req), 'category.create', 'Category', category.id, { name: category.name });
  created(res, category, 'Category created');
}

export async function updateCategory(req: Request<IdParams>, res: Response) {
  const category = await categoryService.updateCategory(req.params.id, validate(categorySchema, req.body));
  await audit(adminId(req), 'category.update', 'Category', category.id, { name: category.name });
  ok(res, category, { message: 'Category updated' });
}

export async function deleteCategory(req: Request<IdParams>, res: Response) {
  const category = await categoryService.deleteCategory(req.params.id);
  await audit(adminId(req), 'category.delete', 'Category', category.id, { name: category.name });
  ok(res, { deleted: true }, { message: 'Category deleted' });
}

export async function createSubcategory(req: Request<IdParams>, res: Response) {
  const sub = await categoryService.createSubcategory(req.params.id, validate(subcategorySchema, req.body));
  await audit(adminId(req), 'subcategory.create', 'Subcategory', sub.id, { name: sub.name });
  created(res, sub, 'Subcategory created');
}

export async function updateSubcategory(req: Request<SubParams>, res: Response) {
  const sub = await categoryService.updateSubcategory(req.params.subId, validate(subcategorySchema, req.body));
  await audit(adminId(req), 'subcategory.update', 'Subcategory', sub.id, { name: sub.name });
  ok(res, sub, { message: 'Subcategory updated' });
}

export async function deleteSubcategory(req: Request<SubParams>, res: Response) {
  const sub = await categoryService.deleteSubcategory(req.params.subId);
  await audit(adminId(req), 'subcategory.delete', 'Subcategory', sub.id, { name: sub.name });
  ok(res, { deleted: true }, { message: 'Subcategory deleted' });
}

// ───────────────────────── Inventory ─────────────────────────

export async function listInventory(req: Request, res: Response) {
  const q = validate(inventoryQuerySchema, req.query);
  const { items, total } = await inventoryService.listInventory(q);
  ok(res, items, { meta: pageMeta(total, q.page, q.limit) });
}

export async function adjustStock(req: Request<IdParams>, res: Response) {
  const input = validate(stockAdjustSchema, req.body);
  const { productName, delta, ...result } = await inventoryService.adjustInventory(req.params.id, input, adminId(req));
  await audit(adminId(req), 'inventory.adjust', 'Inventory', result.id, { product: productName, delta, note: input.note });
  ok(res, result, { message: 'Stock updated' });
}

export async function setThreshold(req: Request<IdParams>, res: Response) {
  const { lowStockThreshold } = validate(thresholdSchema, req.body);
  await inventoryService.setLowStockThreshold(req.params.id, lowStockThreshold);
  await audit(adminId(req), 'inventory.threshold', 'Inventory', req.params.id, { lowStockThreshold });
  ok(res, { id: req.params.id, lowStockThreshold }, { message: 'Threshold saved' });
}

export async function stockHistory(req: Request<IdParams>, res: Response) {
  ok(res, await inventoryService.getStockHistory(req.params.id));
}
