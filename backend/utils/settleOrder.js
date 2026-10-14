const fulfillOrderByReference = require("./fulfillOrder");

const HANDLED = ["fulfilled", "stock_issue", "already_processed", "amount_mismatch"];

// settled   = a payment exists for this order (it is now paid, or flagged); do NOT cancel it
// uncertain = we couldn't reach Paystack; do NOT cancel, try again later
const settleOrder = async (order) => {
  const refs = (
    order.paystackReferences && order.paystackReferences.length
      ? order.paystackReferences
      : [order.paystackReference]
  ).filter(Boolean);

  let uncertain = false;

  for (const ref of refs) {
    try {
      const { outcome } = await fulfillOrderByReference(ref);
      if (HANDLED.includes(outcome)) return { settled: true, uncertain: false };
    } catch (err) {
      if (err.response && err.response.status === 404) continue; // Paystack never saw this reference
      uncertain = true;
    }
  }

  return { settled: false, uncertain };
};

module.exports = settleOrder;