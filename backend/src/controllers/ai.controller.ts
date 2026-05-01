import { Request, Response } from 'express';
import { prisma } from '../db.js';
import { ProductEligibility } from '@prisma/client';

/**
 * Controller to handle Webhook callbacks from the external AI Microservice (Python).
 * The Python service will call this endpoint after processing an uploaded product image.
 */
export const handleAIClassificationCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, imageId, aiScore, aiGenderClassification, isBlurry, isAppropriate } = req.body;

    if (!productId || !imageId || aiScore === undefined) {
      res.status(400).json({ error: 'Missing required AI callback fields' });
      return;
    }

    // Determine eligibility based on business rules
    let status: ProductEligibility = ProductEligibility.PENDING;
    const SCORE_THRESHOLD = 70; // minimum score to be approved

    if (isAppropriate === false || isBlurry === true || aiScore < SCORE_THRESHOLD) {
      status = ProductEligibility.REJECTED;
    } else {
      status = ProductEligibility.APPROVED;
    }

    // 1. Update the Product Image with the score
    await prisma.productImage.update({
      where: { id: imageId },
      data: { ai_score: aiScore },
    });

    // 2. Update the Product status and classification
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        ai_eligibility_status: status,
        ai_gender_classification: aiGenderClassification || null,
      },
    });

    // 3. (Optional) Trigger notification to the Seller here
    // e.g. websocketService.notifyUser(updatedProduct.store_id, { type: 'PRODUCT_STATUS_UPDATE', status });

    res.status(200).json({
      message: 'AI classification processed successfully',
      productId,
      newStatus: status,
    });
  } catch (error: any) {
    console.error('Error handling AI callback:', error);
    res.status(500).json({ error: 'Internal Server Error processing AI callback' });
  }
};
