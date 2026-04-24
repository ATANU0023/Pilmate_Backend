import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private supabase: SupabaseClient;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const projectId = configService.get<string>('SUPABASE_PROJECT_ID');
    const supabaseUrl = configService.get<string>('SUPABASE_URL');

    // Extract project ref from SUPABASE_URL if SUPABASE_PROJECT_ID is not set
    const projectRef =
      projectId ||
      supabaseUrl?.split('//')[1]?.split('.')[0] ||
      'isfdnamzxopajbnzovag';

    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${projectRef}.supabase.co/auth/v1/.well-known/jwks.json`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: 'authenticated',
      issuer: `https://${projectRef}.supabase.co/auth/v1`,
      algorithms: ['ES256'],
      passReqToCallback: true,
    });

    this.supabase = createClient(
      supabaseUrl || `https://${projectRef}.supabase.co`,
      configService.get<string>('SUPABASE_ANON_KEY') || '',
    );
  }

  async validate(req: any, payload: any) {
    // 1. Extract raw token from header
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // 2. Verify session with Supabase (prevents stale tokens after logout)
    const {
      data: { user: authUser },
      error,
    } = await this.supabase.auth.getUser(token);

    if (error || !authUser) {
      throw new UnauthorizedException('Session expired or logged out');
    }

    const supabaseId = payload.sub;

    if (!supabaseId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // 3. Look up the user by their Supabase ID
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
