const Razorpay = require('razorpay');
const crypto = require('crypto');

class RazorpayService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }

  async createOrder(bookingId, amount) {
    try {
      const order = await this.razorpay.orders.create({
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR',
        receipt: bookingId,
        payment_capture: 1, // Auto capture payment
        notes: {
          bookingId: bookingId
        }
      });

      return {
        success: true,
        data: {
          orderId: order.id,
          amount: order.amount / 100, // Convert back to rupees
          currency: order.currency,
          receipt: order.receipt
        }
      };
    } catch (error) {
      console.error('Razorpay order creation failed:', error);
      return {
        success: false,
        error: {
          code: 'RAZORPAY_ORDER_FAILED',
          message: 'Failed to create payment order',
          details: error.message
        }
      };
    }
  }

  async verifyPayment(orderId, paymentId, signature) {
    try {
      // Verify payment signature
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (generatedSignature !== signature) {
        return {
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Payment verification failed. Invalid signature.'
          }
        };
      }

      // Fetch payment details from Razorpay
      const payment = await this.razorpay.payments.fetch(paymentId);

      // Verify payment status
      if (payment.status !== 'captured') {
        return {
          success: false,
          error: {
            code: 'PAYMENT_NOT_CAPTURED',
            message: 'Payment was not captured successfully.'
          }
        };
      }

      return {
        success: true,
        data: {
          paymentId: payment.id,
          orderId: payment.order_id,
          amount: payment.amount / 100,
          status: payment.status,
          method: payment.method,
          email: payment.email,
          contact: payment.contact,
          createdAt: payment.created_at
        }
      };
    } catch (error) {
      console.error('Payment verification failed:', error);
      return {
        success: false,
        error: {
          code: 'VERIFICATION_FAILED',
          message: 'Payment verification failed',
          details: error.message
        }
      };
    }
  }

  async initiateRefund(paymentId, amount) {
    try {
      const refund = await this.razorpay.payments.refund(paymentId, {
        amount: Math.round(amount * 100), // Convert to paise
        speed: 'normal',
        notes: {
          reason: 'Booking cancellation'
        }
      });

      return {
        success: true,
        data: {
          refundId: refund.id,
          amount: refund.amount / 100,
          status: refund.status,
          speedProcessed: refund.speed_processed
        }
      };
    } catch (error) {
      console.error('Refund initiation failed:', error);
      return {
        success: false,
        error: {
          code: 'REFUND_FAILED',
          message: 'Failed to initiate refund',
          details: error.message
        }
      };
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return {
        success: true,
        data: {
          status: payment.status,
          amount: payment.amount / 100,
          method: payment.method,
          email: payment.email,
          contact: payment.contact
        }
      };
    } catch (error) {
      console.error('Payment status check failed:', error);
      return {
        success: false,
        error: {
          code: 'STATUS_CHECK_FAILED',
          message: 'Failed to check payment status',
          details: error.message
        }
      };
    }
  }
}

module.exports = new RazorpayService(); 