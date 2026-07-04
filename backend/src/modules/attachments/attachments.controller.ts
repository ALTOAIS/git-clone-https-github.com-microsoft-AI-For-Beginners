import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { EntityType } from '@prisma/client';
import { Response } from 'express';
import { join, resolve } from 'path';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AttachmentsService } from './attachments.service';
import { attachmentsMulterOptions } from './multer.config';

const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? './uploads');

@ApiTags('attachments')
@Controller('attachments')
@UseGuards(RolesGuard)
export class AttachmentsController {
  private readonly uploadDir = UPLOAD_DIR;

  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Get()
  findForRisk(@Query('riskId') riskId: string) {
    return this.attachmentsService.findForRisk(riskId);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', attachmentsMulterOptions(UPLOAD_DIR)),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('entityType') entityType: EntityType,
    @Query('entityId') entityId: string,
    @Query('riskId') riskId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.attachmentsService.create({
      file,
      entityType,
      entityId,
      riskId,
      uploadedById: user.id,
    });
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const attachment = await this.attachmentsService.findOne(id);
    return res.download(
      join(this.uploadDir, attachment.storedName),
      attachment.fileName,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attachmentsService.remove(id, this.uploadDir, user.id);
  }
}
