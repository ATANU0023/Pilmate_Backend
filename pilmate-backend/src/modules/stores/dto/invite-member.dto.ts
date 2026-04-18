import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  roleName: string; // 'Manager', 'Pharmacist', 'Staff'
}

export class UpdateMemberRoleDto {
  @IsString()
  @IsNotEmpty()
  roleName: string;
}
