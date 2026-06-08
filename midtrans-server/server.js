const express = require("express");
const midtransClient = require("midtrans-client");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. Inisialisasi Snap Client Midtrans
let snap = new midtransClient.Snap({
  isProduction: false, // Set ke true jika sudah siap live production
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// 2. Endpoint untuk membuat Transaksi Pembayaran
app.post("/api/charge", async (req, res) => {
  try {
    const { orderId, grossAmount, customerDetails, itemDetails } = req.body;

    // Parameter yang diwajibkan oleh Midtrans
    let parameter = {
      transaction_details: {
        order_id: orderId, // Harus unik setiap transaksi (bisa pakai ID Order dari Firebase)
        gross_amount: grossAmount, // Total harga (Integer)
      },
      item_details: itemDetails, // Array berisi item pakaian yang dibeli
      customer_details: customerDetails,
    };

    // Minta token pembayaran ke Midtrans
    const transaction = await snap.createTransaction(parameter);

    // Kembalikan token ke Frontend React
    res.status(200).json({
      token: transaction.token,
      redirect_url: transaction.redirect_url,
    });
  } catch (error) {
    console.error("Midtrans Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server Midtrans berjalan di port ${PORT}`));
