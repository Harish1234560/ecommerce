import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { credentialLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/register', credentialLimiter, auth.register);
router.post('/login', credentialLimiter, auth.login);
router.get('/session', auth.session);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.post('/forgot-password', credentialLimiter, auth.forgotPassword);
router.post('/reset-password', credentialLimiter, auth.resetPassword);

router.get('/me', requireAuth, auth.me);
router.patch('/profile', requireAuth, auth.updateProfile);
router.post('/change-password', requireAuth, credentialLimiter, auth.changePassword);

export default router;
