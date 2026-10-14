import { Router } from 'express';
import * as catalog from '../controllers/admin/catalog.admin.controller.js';
import * as content from '../controllers/admin/content.admin.controller.js';
import * as sales from '../controllers/admin/sales.admin.controller.js';
import { requireAdmin } from '../middleware/auth.js';

// Everything under /admin requires an authenticated ADMIN.
const router = Router();
router.use(requireAdmin);

// Overview
router.get('/dashboard', sales.dashboard);
router.get('/analytics', sales.analytics);

// Products
router.get('/products', catalog.listProducts);
router.post('/products', catalog.createProduct);
router.post('/products/bulk', catalog.bulkProducts);
router.get('/products/:id', catalog.getProduct);
router.put('/products/:id', catalog.updateProduct);
router.patch('/products/:id', catalog.patchProduct);
router.delete('/products/:id', catalog.deleteProduct);

// Categories & subcategories
router.get('/categories', catalog.listCategories);
router.post('/categories', catalog.createCategory);
router.put('/categories/subcategories/:subId', catalog.updateSubcategory);
router.delete('/categories/subcategories/:subId', catalog.deleteSubcategory);
router.put('/categories/:id', catalog.updateCategory);
router.delete('/categories/:id', catalog.deleteCategory);
router.post('/categories/:id/subcategories', catalog.createSubcategory);

// Inventory
router.get('/inventory', catalog.listInventory);
router.post('/inventory/:id/adjust', catalog.adjustStock);
router.patch('/inventory/:id', catalog.setThreshold);
router.get('/inventory/:id/history', catalog.stockHistory);

// Orders
router.get('/orders', sales.listOrders);
router.get('/orders/:id', sales.getOrder);
router.post('/orders/:id/status', sales.updateOrderStatus);
router.get('/orders/:id/invoice', sales.orderInvoice);

// Customers
router.get('/customers', sales.listCustomers);
router.get('/customers/:id', sales.getCustomer);
router.patch('/customers/:id', sales.setCustomerStatus);

// Payments & refunds
router.get('/payments', sales.listPayments);
router.get('/refunds', sales.listRefunds);
router.post('/refunds/:id/approve', sales.approveRefund);
router.post('/refunds/:id/reject', sales.rejectRefund);
router.post('/refunds/:id/received', sales.markReturnReceived);
router.post('/refunds/:id/process', sales.processRefund);

// Coupons
router.get('/coupons', content.listCoupons);
router.post('/coupons', content.createCoupon);
router.put('/coupons/:id', content.updateCoupon);
router.patch('/coupons/:id', content.setCouponActive);
router.delete('/coupons/:id', content.deleteCoupon);

// Reviews
router.get('/reviews', content.listReviews);
router.patch('/reviews/:id', content.setReviewStatus);
router.delete('/reviews/:id', content.deleteReview);

// Support
router.get('/support', content.listTickets);
router.get('/support/:id', content.getTicket);
router.post('/support/:id/messages', content.replyToTicket);
router.patch('/support/:id', content.setTicketStatus);

// Banners, homepage and pages
router.post('/notifications/broadcast', content.sendAnnouncement);
router.get('/content', content.getContent);
router.post('/content/banners', content.createBanner);
router.put('/content/banners/:id', content.updateBanner);
router.delete('/content/banners/:id', content.deleteBanner);
router.put('/content/sections/:id', content.updateSection);
router.post('/content/testimonials', content.createTestimonial);
router.put('/content/testimonials/:id', content.updateTestimonial);
router.delete('/content/testimonials/:id', content.deleteTestimonial);
router.put('/content/pages/:slug', content.updatePage);

// Settings
router.get('/settings', content.getSettings);
router.get('/settings/audit-logs', content.listAuditLogs);
router.post('/settings/shipping-zones', content.createShippingZone);
router.put('/settings/shipping-zones/:id', content.updateShippingZone);
router.delete('/settings/shipping-zones/:id', content.deleteShippingZone);
router.post('/settings/tax-rules', content.createTaxRule);
router.put('/settings/tax-rules/:id', content.updateTaxRule);
router.delete('/settings/tax-rules/:id', content.deleteTaxRule);
router.put('/settings/:key', content.updateSettingsGroup);

export default router;
