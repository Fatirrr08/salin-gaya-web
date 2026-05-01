import { Request, Response } from 'express';
import { prisma } from '../db.js';
import { PaymentStatus, OrderStatus } from '@prisma/client';
import crypto from 'crypto';

/**
 * Endpoint to initiate a checkout and generate a payment link.
 * Usually called from the frontend when the user clicks "Pay".
 */
export const createPaymentCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;

    // 1. Validate Order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status !== OrderStatus.PENDING) {
      res.status(400).json({ error: 'Order is not in pending state' });
      return;
    }

    // 2. Call External Payment Gateway API (Mocked Midtrans/Xendit logic)
    // In a real scenario, you would use their SDK or HTTP client.
    const mockGatewayTransactionId = `txn_${Date.now()}`;
    const mockPaymentUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${mockGatewayTransactionId}`;
    
    // 3. Create Payment Record in Database
    const payment = await prisma.payment.create({
      data: {
        order_id: orderId,
        gateway_transaction_id: mockGatewayTransactionId,
        amount: order.grand_total,
        status: PaymentStatus.PENDING,
        payment_url: mockPaymentUrl,
        // Optional: you can store bank_logo_url here if the API provides it upfront
      },
    });

    res.status(200).json({
      message: 'Payment initiated successfully',
      paymentUrl: payment.payment_url,
      paymentId: payment.id,
    });
  } catch (error: any) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Internal Server Error during checkout' });
  }
};

/**
 * Webhook handler to receive server-to-server notifications from the Payment Gateway.
 */
export const handlePaymentWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = req.body;
    
    // 1. Verify Webhook Signature (CRITICAL FOR SECURITY)
    // Example logic for Midtrans signature verification:
    // SHA512(order_id + status_code + gross_amount + server_key)
    const serverKey = process.env.PAYMENT_GATEWAY_SERVER_KEY || 'SECRET';
    const signatureKey = payload.signature_key; // Provided by the gateway
    
    // In this mock, we just skip complex hash checking if it's disabled, 
    // but in production, you MUST verify the hash.
    const isValidSignature = true; // Replace with actual crypto verification

    if (!isValidSignature) {
      res.status(403).json({ error: 'Invalid webhook signature' });
      return;
    }

    const gatewayTxnId = payload.transaction_id;
    const transactionStatus = payload.transaction_status; // e.g. 'capture', 'settlement', 'expire'
    const orderId = payload.order_id; // Your internal order ID mapping

    // Find the payment record
    const payment = await prisma.payment.findFirst({
      where: { gateway_transaction_id: gatewayTxnId },
    });

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    // 2. Determine new status
    let newPaymentStatus: PaymentStatus = PaymentStatus.PENDING;
    let newOrderStatus: OrderStatus = OrderStatus.PENDING;

    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
      newPaymentStatus = PaymentStatus.SUCCESS;
      newOrderStatus = OrderStatus.PAID;
    } else if (transactionStatus === 'expire' || transactionStatus === 'cancel') {
      newPaymentStatus = PaymentStatus.EXPIRED;
      newOrderStatus = OrderStatus.CANCELLED;
    } else if (transactionStatus === 'deny') {
      newPaymentStatus = PaymentStatus.FAILED;
      newOrderStatus = OrderStatus.CANCELLED;
    }

    // 3. Update Database inside a Transaction to ensure ACID properties
    if (newPaymentStatus === PaymentStatus.SUCCESS && payment.status !== PaymentStatus.SUCCESS) {
      await prisma.$transaction(async (tx: any) => {
        // Update payment
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: newPaymentStatus },
        });

        // Update order
        await tx.order.update({
          where: { id: payment.order_id },
          data: { status: newOrderStatus },
        });

        // Reduce stock for order items
        const orderItems = await tx.orderItem.findMany({
          where: { order_id: payment.order_id },
        });

        for (const item of orderItems) {
          if (item.product_id) {
            await tx.product.update({
              where: { id: item.product_id },
              data: {
                stock: { decrement: item.quantity },
              },
            });
          }
        }
      });
      
      // Emit real-time notification to Seller here
    } else {
      // Just update status if it failed/expired
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: newPaymentStatus },
      });
      await prisma.order.update({
        where: { id: payment.order_id },
        data: { status: newOrderStatus },
      });
    }

    // Always respond 200 OK to the payment gateway to acknowledge receipt
    res.status(200).json({ status: 'OK' });
  } catch (error: any) {
    console.error('Error handling payment webhook:', error);
    res.status(500).json({ error: 'Internal Server Error processing webhook' });
  }
};
