import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CurrentUser, JwtUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MaterialsService } from './materials.service';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 МБ

class UploadTextDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  filename?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60_000)
  text: string;
}

class ExtractPhrasesDto {
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(20)
  count?: number;
}

@Controller('materials')
@UseGuards(JwtAuthGuard)
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  list(@CurrentUser() user: JwtUser) {
    return this.materialsService.list(user.userId);
  }

  @Post('upload')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }),
  )
  upload(
    @CurrentUser() user: JwtUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Файл не передан');
    return this.materialsService.uploadFile(user.userId, file);
  }

  @Post('text')
  uploadText(@CurrentUser() user: JwtUser, @Body() dto: UploadTextDto) {
    return this.materialsService.uploadText(
      user.userId,
      dto.filename ?? '',
      dto.text,
    );
  }

  @Post(':id/extract-phrases')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  extractPhrases(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: ExtractPhrasesDto,
  ) {
    return this.materialsService.extractPhrases(
      user.userId,
      id,
      dto.count ?? 10,
    );
  }

  @Post(':id/simplify')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  simplify(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.materialsService.simplify(user.userId, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.materialsService.remove(user.userId, id);
  }
}
