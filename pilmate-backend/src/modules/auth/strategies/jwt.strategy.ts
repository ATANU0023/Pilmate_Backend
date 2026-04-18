import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SUPABASE_JWT_SECRET') ||
                   configService.get<string>('JWT_SECRET') || 'fallback-secret',
    });
  }

  async validate(payload: any) {
    // Supabase JWT payload contains 'sub' as the user ID
    const supabaseId = payload.sub;

    if (!supabaseId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Look up the user by their Supabase ID
    const user = await this.prisma.user.findUnique({
      where: { supabaseId },
      include: {
        storeMemberships: {
          where: { invitationStatus: 'accepted' },
          include: {
            role: true,
            store: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return user payload that will be attached to request.user
    return {
      userId: user.id,
      supabaseId: user.supabaseId,
      email: user.email,
      fullName: user.fullName,
      memberships: user.storeMemberships.map((m) => ({
        storeId: m.storeId,
        storeName: m.store.storeName,
        role: m.role?.roleName || null,
        memberId: m.id,
      })),
    };
  }
}
