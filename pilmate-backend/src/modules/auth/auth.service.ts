import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.supabase = createClient(
      this.config.get<string>('SUPABASE_URL') || '',
      this.config.get<string>('SUPABASE_ANON_KEY') || '',
    );
  }

  /**
   * Register a new user via Supabase Auth, then create their profile in our DB.
   * Returns the session token so the user is auto-logged-in after registration.
   */
  async register(dto: RegisterDto) {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await this.supabase.auth.signUp({
      email: dto.email,
      password: dto.password,
    });

    if (authError) {
      throw new BadRequestException(authError.message);
    }

    if (!authData.user) {
      throw new BadRequestException('Registration failed — no user returned from auth provider');
    }

    // 2. Create user profile in our database
    try {
      const user = await this.prisma.user.create({
        data: {
          supabaseId: authData.user.id,
          email: dto.email,
          fullName: dto.fullName,
          address: dto.address,
          mobileNumber: dto.mobileNumber,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        },
      });

      // 3. Return user + session so they're auto-logged-in
      return {
        message: 'Registration successful',
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          address: user.address,
          mobileNumber: user.mobileNumber,
        },
        session: authData.session
          ? {
              accessToken: authData.session.access_token,
              refreshToken: authData.session.refresh_token,
              expiresAt: authData.session.expires_at,
            }
          : null,
      };
    } catch (error) {
      // If DB creation fails, we should ideally clean up the Supabase user
      // but for now, throw the error
      if (error.code === 'P2002') {
        throw new BadRequestException('A user with this email already exists');
      }
      throw new BadRequestException(`Profile creation failed: ${error.message}`);
    }
  }

  /**
   * Login an existing user via Supabase Auth.
   * Returns the session token.
   */
  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    // Fetch user profile from our DB with store memberships
    const user = await this.prisma.user.findUnique({
      where: { supabaseId: data.user.id },
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
      throw new UnauthorizedException('User profile not found. Please register first.');
    }

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        stores: user.storeMemberships.map((m) => ({
          storeId: m.storeId,
          storeName: m.store.storeName,
          role: m.role?.roleName || null,
        })),
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
      },
    };
  }

  /**
   * Get the current user's profile with store memberships.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      address: user.address,
      mobileNumber: user.mobileNumber,
      dateOfBirth: user.dateOfBirth,
      createdAt: user.createdAt,
      stores: user.storeMemberships.map((m) => ({
        storeId: m.storeId,
        storeName: m.store.storeName,
        role: m.role?.roleName || null,
        memberId: m.id,
      })),
    };
  }

  /**
   * Update the current user's profile.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        address: dto.address,
        mobileNumber: dto.mobileNumber,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });

    return {
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        address: user.address,
        mobileNumber: user.mobileNumber,
        dateOfBirth: user.dateOfBirth,
      },
    };
  }

  //logout
  async logout(token: string) {
    const adminClient = createClient(
      this.config.get<string>('SUPABASE_URL') || '',
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '',
    );

    const { error } = await adminClient.auth.admin.signOut(token);
    if (error) {
      throw new BadRequestException(error.message);
    }
    return {
      message: 'Logout successful',
    };
  }
}
