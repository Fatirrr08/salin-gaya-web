require('dotenv').config();
const express = require('express');
const cors = require('cors');
const midtransClient = require('midtrans-client');

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/get-snap-token', async (req, res) => {
  try {
    const { order_id, gross_amount, customer_details } = req.body;

    if (!order_id || !gross_amount) {
      return res.status(400).json({ error: 'order_id dan gross_amount diperlukan.' });
    }

    const snap = new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY
    });

    const parameter = {
      transaction_details: {
        order_id: order_id,
        gross_amount: gross_amount
      },
      customer_details: customer_details
    };

    const transaction = await snap.createTransaction(parameter);
    res.json({ token: transaction.token });

  } catch (error) {
    console.error('Midtrans Error:', error);
    res.status(500).json({ error: 'Gagal memproses token Midtrans.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Midtrans server running on http://localhost:${PORT}`);
});
