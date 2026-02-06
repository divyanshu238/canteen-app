import { Router } from 'express';
import reviewController from '../controllers/review.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, reviewController.createReview);
router.get('/order/:orderId', authenticate, reviewController.getReviewByOrder);

export default router;
