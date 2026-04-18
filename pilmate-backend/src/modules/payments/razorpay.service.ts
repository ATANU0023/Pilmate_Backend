import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
const Razorpay = require('razorpay');

@Injectable()
export class RazorpayService {
  private razorpay: any;

  constructor(private configService: ConfigService) {
    this.razorpay = new Razorpay({
      key_id: this.configService.get<string>('RAZORPAY_KEY_ID'),
      key_secret: this.configService.get<string>('RAZORPAY_KEY_SECRET'),
    });
  }

  /**
   * Create a Subscription Plan on Razorpay
   */
  async createPlan(name: string, price: number, intervalMonths: number) {
    try {
      // Razorpay expects amount in paise (1 INR = 100 paise)
      const amount = Math.round(price * 100);

      const plan = await this.razorpay.plans.create({
        period: 'monthly',
        interval: intervalMonths,
        item: {
          name: name,
          amount: amount,
          currency: 'INR',
          description: `Subscription plan for ${name}`,
        },
      });

      return plan;
    } catch (error) {
      console.error('Razorpay Create Plan Error:', error);
      throw new InternalServerErrorException('Failed to create Razorpay plan');
    }
  }

  /**
   * Create a Subscription on Razorpay for a store
   */
  async createSubscription(planId: string, totalCount: number = 1) {
    try {
      const subscription = await this.razorpay.subscriptions.create({
        plan_id: planId,
        total_count: totalCount || 12, // Default to 12 cycles (1 year) if monthly
        quantity: 1,
        customer_notify: 1,
      });

      return subscription;
    } catch (error) {
      console.error('Razorpay Create Subscription Error:', error);
      throw new InternalServerErrorException('Failed to create Razorpay subscription');
    }
  }

  /**
   * Verify Razorpay Webhook Signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  }
}
