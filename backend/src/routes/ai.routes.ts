import { Router } from 'express';
import { handleAIClassificationCallback } from '../controllers/ai.controller.js';

const router = Router();

// Route for AI microservice to send back image classification results
router.post('/callback', handleAIClassificationCallback);

export default router;
