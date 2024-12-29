const Razorpay = require('razorpay');

// Validate key format
const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
  throw new Error('Razorpay keys are not configured in environment variables');
}

const razorpay = new Razorpay({
  key_id: key_id,
  key_secret: key_secret
});

const createOrder = async (amount) => {
  try {
    const order = await razorpay.orders.create({
      amount: amount * 100, // amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1
    });
    return order;
  } catch (error) {
    throw new Error('Failed to create payment order');
  }
};

const verifyPayment = (orderId, paymentId, signature) => {
  const text = `${orderId}|${paymentId}`;
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest('hex');
  return generated_signature === signature;
};

module.exports = {
  razorpay,
  createOrder,
  verifyPayment
};
