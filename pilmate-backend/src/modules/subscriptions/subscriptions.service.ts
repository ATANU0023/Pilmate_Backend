import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RazorpayService } from '../payments/razorpay.service';
import { CreateSubscriptionPlanDto, SubscribeDto } from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private razorpayService: RazorpayService,
  ) {}

  async createPlan(dto: CreateSubscriptionPlanDto) {
    let razorpayPlanId = null;

    // Create plan on Razorpay if price > 0
    if (dto.price > 0) {
      const rpPlan = await this.razorpayService.createPlan(
        dto.name,
        dto.price,
        dto.durationMonths,
      );
      razorpayPlanId = rpPlan.id;
    }

    return this.prisma.subscriptionPlan.upsert({
      where: { name: dto.name },
      update: {
        price: dto.price,
        durationMonths: dto.durationMonths,
        maxMedicines: dto.maxMedicines,
        maxUsers: dto.maxUsers,
        features: dto.features,
        razorpayPlanId: razorpayPlanId,
      },
      create: {
        name: dto.name,
        price: dto.price,
        durationMonths: dto.durationMonths,
        maxMedicines: dto.maxMedicines,
        maxUsers: dto.maxUsers,
        features: dto.features,
        razorpayPlanId: razorpayPlanId,
      },
    });
  }

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' },
    });
  }

  async getStoreSubscription(storeId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { storeId },
      include: { plan: true },
    });

    if (!sub) {
      return null;
    }

    const isActive = sub.status === 'active' && new Date(sub.endDate) > new Date();

    return {
      ...sub,
      isActive,
    };
  }

  async subscribe(storeId: string, dto: SubscribeDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    let razorpaySubscriptionId = null;

    // If it's a paid plan and no payment reference provided yet, create a Razorpay subscription
    if (Number(plan.price) > 0 && plan.razorpayPlanId && !dto.paymentReference) {
      const sub = await this.razorpayService.createSubscription(plan.razorpayPlanId);
      razorpaySubscriptionId = sub.id;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + plan.durationMonths);

    const subscription = await this.prisma.subscription.upsert({
      where: { storeId },
      update: {
        planId: plan.id,
        startDate,
        endDate,
        status: Number(plan.price) > 0 ? 'pending' : 'active', // Pending until payment if paid
        paymentReference: dto.paymentReference,
        razorpaySubscriptionId,
      },
      create: {
        storeId,
        planId: plan.id,
        startDate,
        endDate,
        status: Number(plan.price) > 0 ? 'pending' : 'active',
        paymentReference: dto.paymentReference,
        razorpaySubscriptionId,
      },
    });

    return {
      ...subscription,
      razorpaySubscriptionId, // Return this for the frontend to open Checkout
    };
  }

  async handleRazorpayWebhook(event: any) {
    const { event: eventType, payload } = event;

    if (eventType === 'subscription.activated' || eventType === 'subscription.charged') {
      const rpSubscription = payload.subscription.entity;
      const subId = rpSubscription.id;

      await this.prisma.subscription.update({
        where: { razorpaySubscriptionId: subId },
        data: {
          status: 'active',
          endDate: new Date(rpSubscription.current_end * 1000), // Razorpay uses seconds
        },
      });
    }

    if (eventType === 'subscription.cancelled' || eventType === 'subscription.halted') {
      const subId = payload.subscription.entity.id;
      await this.prisma.subscription.update({
        where: { razorpaySubscriptionId: subId },
        data: { status: 'expired' },
      });
    }

    return { success: true };
  }

  /**
   * Check if a store has reached its medicine limit based on their plan.
   */
  async canAddMedicine(storeId: string) {
    const sub = await this.getStoreSubscription(storeId);
    if (!sub || !sub.isActive) {
      throw new BadRequestException('Active subscription required to add medicines');
    }

    const count = await this.prisma.medicine.count({
      where: { storeId },
    });

    if (count >= sub.plan.maxMedicines) {
      throw new BadRequestException(
        `Medicine limit reached for your ${sub.plan.name} plan (${sub.plan.maxMedicines}). Please upgrade.`,
      );
    }

    return true;
  }

  /**
   * Check if a store has reached its user limit.
   */
  async canAddUser(storeId: string) {
    const sub = await this.getStoreSubscription(storeId);
    if (!sub || !sub.isActive) {
      throw new BadRequestException('Active subscription required to add staff');
    }

    const count = await this.prisma.storeMember.count({
      where: { storeId, invitationStatus: 'accepted' },
    });

    if (count >= sub.plan.maxUsers) {
      throw new BadRequestException(
        `Staff limit reached for your ${sub.plan.name} plan (${sub.plan.maxUsers}). Please upgrade.`,
      );
    }

    return true;
  }
}
