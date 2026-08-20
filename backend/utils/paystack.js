const axios = require("axios");

const paystackApi = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

// ─── Initialize a transaction — returns authorization_url to redirect to ──
const initializeTransaction = async ({ email, amount, reference, callback_url, metadata }) => {
  const response = await paystackApi.post("/transaction/initialize", {
    email,
    amount: Math.round(amount * 100), // naira → kobo
    reference,
    callback_url,
    metadata,
  });
  return response.data.data; // { authorization_url, access_code, reference }
};

// ─── Verify a transaction directly against Paystack's servers ─────────────
const verifyTransaction = async (reference) => {
  const response = await paystackApi.get(`/transaction/verify/${reference}`);
  return response.data.data; // { status, amount, reference, ... }
};

module.exports = { initializeTransaction, verifyTransaction };