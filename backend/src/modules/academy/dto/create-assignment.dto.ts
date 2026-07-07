import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Назначить всем активным работникам этих подразделений',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departmentIds?: string[];

  @ApiProperty({
    enum: Role,
    isArray: true,
    required: false,
    description: 'Назначить всем активным работникам с этими ролями',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Role, { each: true })
  roles?: Role[];

  @ApiProperty({
    type: [String],
    required: false,
    description: 'Назначить всем активным работникам этих компаний',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companyIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
