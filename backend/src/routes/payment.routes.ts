import { Router } from 'express';
import { createPaymentCheckout, handlePaymentWebhook } from '../controllers/payment.controller.js';

const router = Router();

// Route to initiate checkout (Frontend -> Backend)
router.post('/checkout', createPaymentCheckout);

// Route to receive webhook from Payment Gateway (Midtrans/Xendit -> Backend)
router.post('/webhook', handlePaymentWebhook);

export default router;
