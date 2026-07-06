import { ApiProperty } from '@nestjs/swagger';
import { CourseAssignmentStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateAssignmentDto {
  @ApiProperty({ enum: CourseAssignmentStatus, required: false })
  @IsOptional()
  @IsEnum(CourseAssignmentStatus)
  status?: CourseAssignmentStatus;

  @ApiProperty({ required: false, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;
}
