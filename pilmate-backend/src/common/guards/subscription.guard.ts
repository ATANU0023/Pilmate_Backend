import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { SubscriptionsService } from '../../modules/subscriptions/subscriptions.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private subscriptionsService: SubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { params, user } = request;
    const storeId = params.storeId;

    if (!storeId) {
      // If no storeId in params, we might be in a route that doesn't need it or handled differently
      return true;
    }

    const sub = await this.subscriptionsService.getStoreSubscription(storeId);

    if (!sub || !sub.isActive) {
      throw new ForbiddenException(
        'This action requires an active subscription. Please subscribe to a plan to continue.',
      );
    }

    return true;
  }
}
