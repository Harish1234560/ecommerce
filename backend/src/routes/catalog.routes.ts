import { Router } from 'express';
import * as catalog from '../controllers/catalog.controller.js';

// Public storefront routes, mounted at the API root.
const router = Router();

router.get('/products', catalog.listProducts);
router.get('/products/suggest', catalog.suggestProducts);
router.get('/products/:slug', catalog.getProduct);
router.get('/products/:slug/reviews', catalog.listProductReviews);

router.get('/categories', catalog.listCategories);
router.get('/categories/:slug', catalog.getCategory);

router.get('/home', catalog.home);
router.get('/offers', catalog.offers);
router.get('/content/:slug', catalog.contentPage);
router.get('/settings/public', catalog.publicSettings);
router.get('/delivery/check', catalog.checkDelivery);
router.post('/newsletter', catalog.subscribeNewsletter);

export default router;
