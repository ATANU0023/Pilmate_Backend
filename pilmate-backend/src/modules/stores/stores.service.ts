import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto/invite-member.dto';

@Injectable()
export class StoresService {
  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Create a new store. The creator automatically becomes the Owner.
   */
  async create(userId: string, dto: CreateStoreDto) {
    // Find the "Owner" role
    const ownerRole = await this.prisma.role.findUnique({
      where: { roleName: 'Owner' },
    });

    if (!ownerRole) {
      throw new BadRequestException('System roles not initialized. Please run database seed.');
    }

    // Create store + owner membership in a transaction
    const store = await this.prisma.$transaction(async (tx) => {
      const newStore = await tx.store.create({
        data: {
          storeName: dto.storeName,
          storeAddress: dto.storeAddress,
          licenseNumber: dto.licenseNumber,
          storeOwnerUserId: userId,
        },
      });

      // Auto-create StoreMember entry with Owner role
      await tx.storeMember.create({
        data: {
          storeId: newStore.id,
          userId: userId,
          roleId: ownerRole.id,
          invitationStatus: 'accepted',
        },
      });

      // Log the activity
      await tx.activityLog.create({
        data: {
          storeId: newStore.id,
          userId: userId,
          action: 'STORE_CREATED',
          details: { storeName: newStore.storeName },
        },
      });

      return newStore;
    });

    return {
      message: 'Store created successfully',
      store: {
        id: store.id,
        storeName: store.storeName,
        storeAddress: store.storeAddress,
        licenseNumber: store.licenseNumber,
        createdAt: store.createdAt,
      },
    };
  }

  /**
   * List all stores the current user belongs to.
   */
  async findAllByUser(userId: string) {
    const memberships = await this.prisma.storeMember.findMany({
      where: {
        userId,
        invitationStatus: 'accepted',
      },
      include: {
        store: true,
        role: true,
      },
      orderBy: { invitedAt: 'desc' },
    });

    return memberships.map((m) => ({
      id: m.store.id,
      storeName: m.store.storeName,
      storeAddress: m.store.storeAddress,
      licenseNumber: m.store.licenseNumber,
      role: m.role?.roleName || null,
      joinedAt: m.invitedAt,
    }));
  }

  /**
   * Get store details by ID (must be a member).
   */
  async findOne(storeId: string, userId: string) {
    await this.verifyMembership(storeId, userId);

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: {
        members: {
          where: { invitationStatus: { in: ['accepted', 'pending'] } },
          include: {
            user: {
              select: { id: true, fullName: true, email: true, mobileNumber: true },
            },
            role: true,
          },
        },
        _count: {
          select: {
            medicines: true,
            suppliers: true,
            invoices: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return {
      id: store.id,
      storeName: store.storeName,
      storeAddress: store.storeAddress,
      licenseNumber: store.licenseNumber,
      createdAt: store.createdAt,
      members: store.members.map((m) => ({
        memberId: m.id,
        userId: m.user.id,
        fullName: m.user.fullName,
        email: m.user.email,
        mobileNumber: m.user.mobileNumber,
        role: m.role?.roleName || null,
        status: m.invitationStatus,
      })),
      stats: {
        totalMedicines: store._count.medicines,
        totalSuppliers: store._count.suppliers,
        totalInvoices: store._count.invoices,
      },
    };
  }

  /**
   * Update store details (Owner/Manager only).
   */
  async update(storeId: string, userId: string, dto: UpdateStoreDto) {
    await this.verifyRole(storeId, userId, ['Owner', 'Manager']);

    const store = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        storeName: dto.storeName,
        storeAddress: dto.storeAddress,
        licenseNumber: dto.licenseNumber,
      },
    });

    return {
      message: 'Store updated successfully',
      store: {
        id: store.id,
        storeName: store.storeName,
        storeAddress: store.storeAddress,
        licenseNumber: store.licenseNumber,
      },
    };
  }

  /**
   * Delete a store (Owner only).
   */
  async delete(storeId: string, userId: string) {
    await this.verifyRole(storeId, userId, ['Owner']);

    await this.prisma.store.delete({
      where: { id: storeId },
    });

    return { message: 'Store deleted successfully' };
  }

  /**
   * Invite a user to the store with a specific role.
   * If the user doesn't exist yet, creates a pending invitation.
   */
  async inviteMember(storeId: string, inviterId: string, dto: InviteMemberDto) {
    await this.verifyRole(storeId, inviterId, ['Owner', 'Manager']);
    await this.subscriptionsService.canAddUser(storeId);

    // Validate role name (Owner can't be assigned via invite)
    if (dto.roleName === 'Owner') {
      throw new BadRequestException('Cannot invite someone as Owner. Transfer ownership instead.');
    }

    const role = await this.prisma.role.findUnique({
      where: { roleName: dto.roleName },
    });

    if (!role) {
      throw new BadRequestException(`Invalid role: ${dto.roleName}. Valid roles: Manager, Pharmacist, Staff`);
    }

    // Find the user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException(
        `No user found with email ${dto.email}. They need to register first.`,
      );
    }

    // Check if already a member
    const existing = await this.prisma.storeMember.findUnique({
      where: {
        storeId_userId: { storeId, userId: user.id },
      },
    });

    if (existing) {
      if (existing.invitationStatus === 'accepted') {
        throw new BadRequestException('This user is already a member of this store');
      }
      // Re-invite if previously revoked
      const updated = await this.prisma.storeMember.update({
        where: { id: existing.id },
        data: {
          roleId: role.id,
          invitationStatus: 'pending',
          invitedAt: new Date(),
        },
        include: { user: { select: { fullName: true, email: true } }, role: true },
      });

      return {
        message: `Re-invited ${updated.user.fullName} as ${updated.role?.roleName}`,
        member: {
          memberId: updated.id,
          email: updated.user.email,
          role: updated.role?.roleName,
          status: updated.invitationStatus,
        },
      };
    }

    // Create new membership
    const member = await this.prisma.$transaction(async (tx) => {
      const newMember = await tx.storeMember.create({
        data: {
          storeId,
          userId: user.id,
          roleId: role.id,
          invitationStatus: 'pending',
        },
        include: {
          user: { select: { fullName: true, email: true } },
          role: true,
        },
      });

      await tx.activityLog.create({
        data: {
          storeId,
          userId: inviterId,
          action: 'MEMBER_INVITED',
          details: {
            invitedEmail: dto.email,
            invitedName: user.fullName,
            role: dto.roleName,
          },
        },
      });

      return newMember;
    });

    return {
      message: `Invited ${member.user.fullName} as ${member.role?.roleName}`,
      member: {
        memberId: member.id,
        email: member.user.email,
        fullName: member.user.fullName,
        role: member.role?.roleName,
        status: member.invitationStatus,
      },
    };
  }

  /**
   * Accept an invitation to a store.
   */
  async acceptInvitation(storeId: string, userId: string) {
    const membership = await this.prisma.storeMember.findUnique({
      where: {
        storeId_userId: { storeId, userId },
      },
    });

    if (!membership) {
      throw new NotFoundException('No invitation found for this store');
    }

    if (membership.invitationStatus === 'accepted') {
      throw new BadRequestException('Invitation already accepted');
    }

    if (membership.invitationStatus === 'revoked') {
      throw new BadRequestException('This invitation has been revoked');
    }

    await this.prisma.storeMember.update({
      where: { id: membership.id },
      data: { invitationStatus: 'accepted' },
    });

    return { message: 'Invitation accepted successfully' };
  }

  /**
   * Update a member's role (Owner only).
   */
  async updateMemberRole(
    storeId: string,
    memberId: string,
    requesterId: string,
    dto: UpdateMemberRoleDto,
  ) {
    await this.verifyRole(storeId, requesterId, ['Owner']);

    if (dto.roleName === 'Owner') {
      throw new BadRequestException('Cannot assign Owner role. Use transfer ownership instead.');
    }

    const role = await this.prisma.role.findUnique({
      where: { roleName: dto.roleName },
    });

    if (!role) {
      throw new BadRequestException(`Invalid role: ${dto.roleName}`);
    }

    const member = await this.prisma.storeMember.findFirst({
      where: { id: memberId, storeId },
      include: { role: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this store');
    }

    if (member.role?.roleName === 'Owner') {
      throw new BadRequestException('Cannot change the Owner\'s role');
    }

    const updated = await this.prisma.storeMember.update({
      where: { id: memberId },
      data: { roleId: role.id },
      include: {
        user: { select: { fullName: true, email: true } },
        role: true,
      },
    });

    return {
      message: `Updated ${updated.user.fullName}'s role to ${updated.role?.roleName}`,
      member: {
        memberId: updated.id,
        fullName: updated.user.fullName,
        email: updated.user.email,
        role: updated.role?.roleName,
      },
    };
  }

  /**
   * Remove a member from the store (Owner/Manager only).
   */
  async removeMember(storeId: string, memberId: string, requesterId: string) {
    await this.verifyRole(storeId, requesterId, ['Owner', 'Manager']);

    const member = await this.prisma.storeMember.findFirst({
      where: { id: memberId, storeId },
      include: { role: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this store');
    }

    if (member.role?.roleName === 'Owner') {
      throw new BadRequestException('Cannot remove the store owner');
    }

    // Don't allow managers to remove other managers
    if (member.role?.roleName === 'Manager') {
      await this.verifyRole(storeId, requesterId, ['Owner']);
    }

    await this.prisma.storeMember.update({
      where: { id: memberId },
      data: { invitationStatus: 'revoked' },
    });

    return { message: 'Member removed successfully' };
  }

  /**
   * Get pending invitations for the current user.
   */
  async getPendingInvitations(userId: string) {
    const invitations = await this.prisma.storeMember.findMany({
      where: {
        userId,
        invitationStatus: 'pending',
      },
      include: {
        store: true,
        role: true,
      },
    });

    return invitations.map((inv) => ({
      memberId: inv.id,
      storeId: inv.storeId,
      storeName: inv.store.storeName,
      role: inv.role?.roleName,
      invitedAt: inv.invitedAt,
    }));
  }

  // ============================================
  // Helper methods
  // ============================================

  /**
   * Verify that a user is a member of a store.
   */
  async verifyMembership(storeId: string, userId: string) {
    const membership = await this.prisma.storeMember.findUnique({
      where: {
        storeId_userId: { storeId, userId },
      },
    });

    if (!membership || membership.invitationStatus !== 'accepted') {
      throw new ForbiddenException('You are not a member of this store');
    }

    return membership;
  }

  /**
   * Verify that a user has one of the required roles in a store.
   */
  async verifyRole(storeId: string, userId: string, allowedRoles: string[]) {
    const membership = await this.prisma.storeMember.findUnique({
      where: {
        storeId_userId: { storeId, userId },
      },
      include: { role: true },
    });

    if (!membership || membership.invitationStatus !== 'accepted') {
      throw new ForbiddenException('You are not a member of this store');
    }

    if (!membership.role || !allowedRoles.includes(membership.role.roleName)) {
      throw new ForbiddenException(
        `This action requires one of these roles: ${allowedRoles.join(', ')}`,
      );
    }

    return membership;
  }
}
