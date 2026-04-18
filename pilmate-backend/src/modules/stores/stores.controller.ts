import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  async create(@Request() req, @Body() dto: CreateStoreDto) {
    return this.storesService.create(req.user.userId, dto);
  }

  @Get()
  async findAll(@Request() req) {
    return this.storesService.findAllByUser(req.user.userId);
  }

  @Get('invitations')
  async getInvitations(@Request() req) {
    return this.storesService.getPendingInvitations(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.storesService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.storesService.delete(id, req.user.userId);
  }

  // ---- Member Management ----

  @Post(':id/members')
  async inviteMember(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: InviteMemberDto,
  ) {
    return this.storesService.inviteMember(id, req.user.userId, dto);
  }

  @Post(':id/members/accept')
  async acceptInvitation(@Param('id') id: string, @Request() req) {
    return this.storesService.acceptInvitation(id, req.user.userId);
  }

  @Patch(':id/members/:memberId')
  async updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.storesService.updateMemberRole(id, memberId, req.user.userId, dto);
  }

  @Delete(':id/members/:memberId')
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
  ) {
    return this.storesService.removeMember(id, memberId, req.user.userId);
  }
}
