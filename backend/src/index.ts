import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiRoutes from './routes/ai.routes.js';
import paymentRoutes from './routes/payment.routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
// Note: Some webhooks require raw body (like Stripe), but for Midtrans/Xendit standard JSON is usually fine.
app.use(express.json()); 

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to Salin Gaya API' });
});

// Routes
app.use('/api/ai', aiRoutes);
app.use('/api/payments', paymentRoutes);

// Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
