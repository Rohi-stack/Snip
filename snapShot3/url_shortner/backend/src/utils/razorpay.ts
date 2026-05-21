import Razorpay from 'razorpay';
import crypto from 'crypto';

const key_id = process.env.RAZORPAY_KEY_ID || 'mock_key_id';
const key_secret = process.env.RAZORPAY_KEY_SECRET || 'mock_key_secret';

export const razorpay = new Razorpay({
  key_id,
  key_secret,
});

export function verifyWebhookSignature(body: string, signature: string, secret: string = key_secret): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  return expectedSignature === signature;
}
