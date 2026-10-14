import { Router } from 'express';
import * as cart from '../controllers/cart.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/quote', cart.quote); // guests

router.use(requireAuth);
router.get('/', cart.getCart);
router.delete('/', cart.clearCart);
router.post('/items', cart.addItem);
router.patch('/items/:id', cart.updateItem);
router.delete('/items/:id', cart.removeItem);
router.post('/coupon', cart.applyCoupon);
router.delete('/coupon', cart.removeCoupon);
router.post('/merge', cart.merge);

export default router;
