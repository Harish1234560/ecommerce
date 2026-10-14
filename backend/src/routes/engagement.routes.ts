import { Router } from 'express';
import * as engagement from '../controllers/engagement.controller.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { uploadImages } from '../middleware/upload.js';

export const reviewRouter = Router();
reviewRouter.use(requireAuth);
reviewRouter.get('/mine', engagement.myReviews);
reviewRouter.post('/', engagement.createReview);
reviewRouter.put('/:id', engagement.updateReview);
reviewRouter.delete('/:id', engagement.deleteReview);

export const supportRouter = Router();
supportRouter.post('/tickets', optionalAuth, engagement.createTicket);
supportRouter.get('/tickets', requireAuth, engagement.myTickets);
supportRouter.get('/tickets/:id', requireAuth, engagement.getTicket);
supportRouter.post('/tickets/:id/messages', requireAuth, engagement.addTicketMessage);

export const uploadRouter = Router();
uploadRouter.post('/', requireAuth, uploadImages, engagement.uploadImages);
