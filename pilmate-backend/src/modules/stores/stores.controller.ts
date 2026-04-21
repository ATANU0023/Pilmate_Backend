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
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@UseGuards(JwtAuthGuard)
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @ResponseMessage('Store created successfully')
  async create(@Request() req, @Body() dto: CreateStoreDto) {
    return this.storesService.create(req.user.userId, dto);
  }

  @Get()
  @ResponseMessage('Stores fetched successfully')
  async findAll(@Request() req) {
    return this.storesService.findAllByUser(req.user.userId);
  }

  @Get('invitations')
  @ResponseMessage('Pending invitations fetched successfully')
  async getInvitations(@Request() req) {
    return this.storesService.getPendingInvitations(req.user.userId);
  }

  @Get(':id')
  @ResponseMessage('Store details fetched successfully')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.storesService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @ResponseMessage('Store updated successfully')
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateStoreDto,
  ) {
    return this.storesService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @ResponseMessage('Store deleted successfully')
  async delete(@Param('id') id: string, @Request() req) {
    return this.storesService.delete(id, req.user.userId);
  }

  // ---- Member Management ----

  @Post(':id/members')
  @ResponseMessage('Invitation sent successfully')
  async inviteMember(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: InviteMemberDto,
  ) {
    return this.storesService.inviteMember(id, req.user.userId, dto);
  }

  @Post(':id/members/accept')
  @ResponseMessage('Invitation accepted successfully')
  async acceptInvitation(@Param('id') id: string, @Request() req) {
    return this.storesService.acceptInvitation(id, req.user.userId);
  }

  @Patch(':id/members/:memberId')
  @ResponseMessage('Member role updated successfully')
  async updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.storesService.updateMemberRole(id, memberId, req.user.userId, dto);
  }

  @Delete(':id/members/:memberId')
  @ResponseMessage('Member removed successfully')
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
  ) {
    return this.storesService.removeMember(id, memberId, req.user.userId);
  }
}
