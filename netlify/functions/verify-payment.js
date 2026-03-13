const crypto = require("crypto");

exports.handler = async (event) => {
  const {
    razorpay_payment_link_id,
    razorpay_payment_link_reference_id,
    razorpay_payment_link_status,
    razorpay_payment_id,
    razorpay_signature,
  } = JSON.parse(event.body || "{}");

  if (!razorpay_signature || razorpay_payment_link_status !== "paid") {
    return {
      statusCode: 400,
      body: JSON.stringify({ verified: false, error: "Payment not completed" }),
    };
  }

  // Razorpay signature verification
  const payload = `${razorpay_payment_link_id}|${razorpay_payment_link_reference_id}|${razorpay_payment_link_status}|${razorpay_payment_id}`;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest("hex");

  const verified = expectedSignature === razorpay_signature;

  return {
    statusCode: 200,
    body: JSON.stringify({ verified }),
  };
};