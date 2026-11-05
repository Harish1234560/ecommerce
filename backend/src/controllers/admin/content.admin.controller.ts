// Admin: coupons, review moderation, support, storefront content and settings.
import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/auth.js';
import * as contentService from '../../services/admin/content.admin.service.js';
import * as couponService from '../../services/admin/coupon.admin.service.js';
import * as settingsAdminService from '../../services/admin/settings.admin.service.js';
import { audit } from '../../services/audit.service.js';
import { notifyAllCustomers } from '../../services/notification.service.js';
import * as reviewService from '../../services/review.service.js';
import { updateSettings, type Settings } from '../../services/settings.service.js';
import * as supportService from '../../services/support.service.js';
import { notFound } from '../../utils/errors.js';
import { created, ok, pageMeta } from '../../utils/response.js';
import {
  activeToggleSchema, announcementSchema, bannerSchema, couponSchema, pageSchemaInput, sectionSchema, settingsSchemas, shippingZoneSchema, taxRuleSchema, testimonialSchema,
} from '../../validators/adminContent.validators.js';
import { pageSchema, validate } from '../../validators/common.js';
import { adminReviewsQuerySchema, adminTicketsQuerySchema, reviewStatusSchema, ticketMessageSchema, ticketStatusSchema } from '../../validators/engagement.validators.js';

type IdParams = { id: string };
const adminId = (req: Request) => currentUser(req).id;

// ───────────────────────── Announcements ─────────────────────────

export async function sendAnnouncement(req: Request, res: Response) {
  const input = validate(announcementSchema, req.body);
  const recipients = await notifyAllCustomers(input.type, input.title, input.message, input.link);
  await audit(adminId(req), 'notification.broadcast', 'Notification', undefined, { title: input.title, recipients });
  created(res, { recipients }, `Sent to ${recipients} customer${recipients === 1 ? '' : 's'}`);
}

// ───────────────────────── Coupons ─────────────────────────

export async function listCoupons(_req: Request, res: Response) {
  ok(res, await couponService.listCoupons());
}

export async function createCoupon(req: Request, res: Response) {
  const coupon = await couponService.createCoupon(validate(couponSchema, req.body));
  await audit(adminId(req), 'coupon.create', 'Coupon', coupon.id, { code: coupon.code });
  created(res, coupon, 'Coupon created');
}

export async function updateCoupon(req: Request<IdParams>, res: Response) {
  const coupon = await couponService.updateCoupon(req.params.id, validate(couponSchema, req.body));
  await audit(adminId(req), 'coupon.update', 'Coupon', coupon.id, { code: coupon.code });
  ok(res, coupon, { message: 'Coupon updated' });
}

export async function setCouponActive(req: Request<IdParams>, res: Response) {
  const { isActive } = validate(activeToggleSchema, req.body);
  const coupon = await couponService.setCouponActive(req.params.id, isActive);
  await audit(adminId(req), isActive ? 'coupon.activate' : 'coupon.deactivate', 'Coupon', coupon.id, { code: coupon.code });
  ok(res, { id: coupon.id, isActive: coupon.isActive }, { message: isActive ? 'Coupon activated' : 'Coupon deactivated' });
}

export async function deleteCoupon(req: Request<IdParams>, res: Response) {
  const coupon = await couponService.deleteCoupon(req.params.id);
  await audit(adminId(req), 'coupon.delete', 'Coupon', coupon.id, { code: coupon.code });
  ok(res, { deleted: true }, { message: 'Coupon deleted' });
}

// ───────────────────────── Reviews ─────────────────────────

export async function listReviews(req: Request, res: Response) {
  const q = validate(adminReviewsQuerySchema, req.query);
  const { items, total, statusCounts } = await reviewService.listReviewsForModeration(q);
  ok(res, items, { meta: { ...pageMeta(total, q.page, q.limit), statusCounts } });
}

export async function setReviewStatus(req: Request<IdParams>, res: Response) {
  const { status } = validate(reviewStatusSchema, req.body);
  await reviewService.setReviewStatus(req.params.id, status);
  await audit(adminId(req), `review.${status.toLowerCase()}`, 'Review', req.params.id);
  ok(res, { id: req.params.id, status }, { message: 'Review updated' });
}

export async function deleteReview(req: Request<IdParams>, res: Response) {
  await reviewService.deleteReview(req.params.id);
  await audit(adminId(req), 'review.delete', 'Review', req.params.id);
  ok(res, { deleted: true }, { message: 'Review deleted' });
}

// ───────────────────────── Support ─────────────────────────

export async function listTickets(req: Request, res: Response) {
  const q = validate(adminTicketsQuerySchema, req.query);
  const { items, total, statusCounts } = await supportService.listTickets(q);
  ok(res, items, { meta: { ...pageMeta(total, q.page, q.limit), statusCounts } });
}

export async function getTicket(req: Request<IdParams>, res: Response) {
  ok(res, await supportService.getTicket(req.params.id));
}

export async function replyToTicket(req: Request<IdParams>, res: Response) {
  const { message } = validate(ticketMessageSchema, req.body);
  const reply = await supportService.addAdminReply(currentUser(req), req.params.id, message);
  await audit(adminId(req), 'support.reply', 'SupportTicket', req.params.id);
  created(res, reply, 'Reply sent');
}

export async function setTicketStatus(req: Request<IdParams>, res: Response) {
  const { status } = validate(ticketStatusSchema, req.body);
  const ticket = await supportService.setTicketStatus(req.params.id, status);
  await audit(adminId(req), 'support.status', 'SupportTicket', ticket.id, { status });
  ok(res, ticket, { message: 'Ticket updated' });
}

// ───────────────────────── Storefront content ─────────────────────────

export async function getContent(_req: Request, res: Response) {
  ok(res, await contentService.getContent());
}

export async function createBanner(req: Request, res: Response) {
  const banner = await contentService.createBanner(validate(bannerSchema, req.body));
  await audit(adminId(req), 'banner.create', 'Banner', banner.id, { title: banner.title });
  created(res, banner, 'Banner created');
}

export async function updateBanner(req: Request<IdParams>, res: Response) {
  const banner = await contentService.updateBanner(req.params.id, validate(bannerSchema, req.body));
  await audit(adminId(req), 'banner.update', 'Banner', banner.id, { title: banner.title });
  ok(res, banner, { message: 'Banner updated' });
}

export async function deleteBanner(req: Request<IdParams>, res: Response) {
  await contentService.deleteBanner(req.params.id);
  await audit(adminId(req), 'banner.delete', 'Banner', req.params.id);
  ok(res, { deleted: true }, { message: 'Banner deleted' });
}

export async function updateSection(req: Request<IdParams>, res: Response) {
  const section = await contentService.updateSection(req.params.id, validate(sectionSchema, req.body));
  await audit(adminId(req), 'homepage.section', 'HomepageSection', section.id, { key: section.key, isActive: section.isActive });
  ok(res, section, { message: 'Section updated' });
}

export async function createTestimonial(req: Request, res: Response) {
  const row = await contentService.createTestimonial(validate(testimonialSchema, req.body));
  await audit(adminId(req), 'testimonial.create', 'Testimonial', row.id);
  created(res, row, 'Testimonial created');
}

export async function updateTestimonial(req: Request<IdParams>, res: Response) {
  const row = await contentService.updateTestimonial(req.params.id, validate(testimonialSchema, req.body));
  await audit(adminId(req), 'testimonial.update', 'Testimonial', row.id);
  ok(res, row, { message: 'Testimonial updated' });
}

export async function deleteTestimonial(req: Request<IdParams>, res: Response) {
  await contentService.deleteTestimonial(req.params.id);
  await audit(adminId(req), 'testimonial.delete', 'Testimonial', req.params.id);
  ok(res, { deleted: true }, { message: 'Testimonial deleted' });
}

export async function updatePage(req: Request<{ slug: string }>, res: Response) {
  const page = await contentService.updatePage(req.params.slug, validate(pageSchemaInput, req.body));
  await audit(adminId(req), 'page.update', 'ContentPage', page.id, { slug: page.slug });
  ok(res, page, { message: 'Page saved' });
}

// ───────────────────────── Settings ─────────────────────────

export async function getSettings(_req: Request, res: Response) {
  ok(res, await settingsAdminService.getAllSettings());
}

export async function updateSettingsGroup(req: Request<{ key: string }>, res: Response) {
  const key = req.params.key as keyof Settings;
  const schema = settingsSchemas[key];
  if (!schema) throw notFound('Settings group');
  const updated = await updateSettings(key, validate(schema, req.body) as never);
  await audit(adminId(req), 'settings.update', 'StoreSetting', key);
  ok(res, updated, { message: 'Settings saved' });
}

export async function createShippingZone(req: Request, res: Response) {
  const zone = await settingsAdminService.createShippingZone(validate(shippingZoneSchema, req.body));
  await audit(adminId(req), 'shipping_zone.create', 'ShippingZone', zone.id, { name: zone.name });
  created(res, zone, 'Delivery zone created');
}

export async function updateShippingZone(req: Request<IdParams>, res: Response) {
  const zone = await settingsAdminService.updateShippingZone(req.params.id, validate(shippingZoneSchema, req.body));
  await audit(adminId(req), 'shipping_zone.update', 'ShippingZone', zone.id, { name: zone.name });
  ok(res, zone, { message: 'Delivery zone updated' });
}

export async function deleteShippingZone(req: Request<IdParams>, res: Response) {
  await settingsAdminService.deleteShippingZone(req.params.id);
  await audit(adminId(req), 'shipping_zone.delete', 'ShippingZone', req.params.id);
  ok(res, { deleted: true }, { message: 'Delivery zone deleted' });
}

export async function createTaxRule(req: Request, res: Response) {
  const rule = await settingsAdminService.saveTaxRule(null, validate(taxRuleSchema, req.body));
  await audit(adminId(req), 'tax_rule.create', 'TaxRule', rule.id, { name: rule.name, rate: rule.rate });
  created(res, rule, 'Tax rule created');
}

export async function updateTaxRule(req: Request<IdParams>, res: Response) {
  const rule = await settingsAdminService.saveTaxRule(req.params.id, validate(taxRuleSchema, req.body));
  await audit(adminId(req), 'tax_rule.update', 'TaxRule', rule.id, { name: rule.name, rate: rule.rate });
  ok(res, rule, { message: 'Tax rule updated' });
}

export async function deleteTaxRule(req: Request<IdParams>, res: Response) {
  await settingsAdminService.deleteTaxRule(req.params.id);
  await audit(adminId(req), 'tax_rule.delete', 'TaxRule', req.params.id);
  ok(res, { deleted: true }, { message: 'Tax rule deleted' });
}

export async function listAuditLogs(req: Request, res: Response) {
  const q = validate(pageSchema, req.query);
  const { items, total } = await settingsAdminService.listAuditLogs(q.page, q.limit);
  ok(res, items, { meta: pageMeta(total, q.page, q.limit) });
}
