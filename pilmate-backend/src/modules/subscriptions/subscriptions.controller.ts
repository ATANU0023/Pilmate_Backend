import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  RawBodyRequest,
  Request,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { RazorpayService } from '../payments/razorpay.service';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubscribeDto } from './dto/subscription.dto';
import { Public } from '../../common/decorators/public.decorator';

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly razorpayService: RazorpayService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get('plans')
  async getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Get('my-plan/:storeId')
  async getMyPlan(@Param('storeId') storeId: string) {
    return this.subscriptionsService.getStoreSubscription(storeId);
  }

  @Post('subscribe/:storeId')
  async subscribe(
    @Param('storeId') storeId: string,
    @Body() dto: SubscribeDto,
  ) {
    return this.subscriptionsService.subscribe(storeId, dto);
  }

  @Public()
  @Post('webhooks/razorpay')
  async handleRazorpayWebhook(
    @Request() req: any,
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: any,
  ) {
    const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET') || '';

    // In a real production environment, you should use the raw request body (Buffer)
    // for signature verification. For this implementation, we use JSON.stringify as a fallback.
    const payload = JSON.stringify(body);

    const isValid = this.razorpayService.verifyWebhookSignature(
      payload,
      signature || '',
      webhookSecret,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid Razorpay signature');
    }

    return this.subscriptionsService.handleRazorpayWebhook(body);
  }
}
