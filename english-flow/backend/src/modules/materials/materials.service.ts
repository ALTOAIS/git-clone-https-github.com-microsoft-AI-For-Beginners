import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

const MAX_TEXT_CHARS = 40_000;

/**
 * Загрузка учебных материалов: PDF, DOCX, TXT и вставленный текст.
 * Текст извлекается сразу при загрузке и хранится в БД;
 * сам файл не сохраняется на диск.
 */
@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

  async uploadFile(userId: string, file: Express.Multer.File) {
    const fileType = this.detectType(file);
    let text = '';
    try {
      if (fileType === 'pdf') {
        text = await this.extractPdf(file.buffer);
      } else if (fileType === 'docx') {
        text = await this.extractDocx(file.buffer);
      } else {
        text = file.buffer.toString('utf8');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Не удалось извлечь текст: ${message}`);
      return this.prisma.uploadedMaterial.create({
        data: {
          userId,
          filename: file.originalname,
          fileType,
          processingStatus: 'FAILED',
        },
      });
    }
    return this.prisma.uploadedMaterial.create({
      data: {
        userId,
        filename: file.originalname,
        fileType,
        extractedText: this.sanitize(text),
        processingStatus: 'READY',
      },
    });
  }

  async uploadText(userId: string, filename: string, text: string) {
    return this.prisma.uploadedMaterial.create({
      data: {
        userId,
        filename: filename || 'Вставленный текст',
        fileType: 'text',
        extractedText: this.sanitize(text),
        processingStatus: 'READY',
      },
    });
  }

  async list(userId: string) {
    const items = await this.prisma.uploadedMaterial.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return items.map((m) => ({
      ...m,
      extractedText: m.extractedText?.slice(0, 2000),
      textLength: m.extractedText?.length ?? 0,
    }));
  }

  /** Удаление материала вместе с извлечённым текстом. */
  async remove(userId: string, id: string) {
    const material = await this.getOwned(userId, id);
    await this.prisma.uploadedMaterial.update({
      where: { id: material.id },
      data: {
        deletedAt: new Date(),
        extractedText: null,
        processingStatus: 'DELETED',
      },
    });
    return { success: true };
  }

  async extractPhrases(userId: string, id: string, count = 10) {
    const material = await this.requireText(userId, id);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentLevel: true },
    });
    return this.ai.extractPhrases({
      text: material.extractedText!,
      count: Math.min(count, 20),
      level: user?.currentLevel ?? 'A2',
    });
  }

  async simplify(userId: string, id: string) {
    const material = await this.requireText(userId, id);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { currentLevel: true },
    });
    return this.ai.simplifyText({
      text: material.extractedText!,
      level: user?.currentLevel ?? 'A2',
    });
  }

  private async requireText(userId: string, id: string) {
    const material = await this.getOwned(userId, id);
    if (!material.extractedText || material.processingStatus !== 'READY') {
      throw new BadRequestException('Из материала не извлечён текст');
    }
    return material;
  }

  private async getOwned(userId: string, id: string) {
    const material = await this.prisma.uploadedMaterial.findUnique({
      where: { id },
    });
    if (!material || material.deletedAt) {
      throw new NotFoundException('Материал не найден');
    }
    if (material.userId !== userId) throw new ForbiddenException();
    return material;
  }

  private detectType(file: Express.Multer.File): string {
    const name = file.originalname.toLowerCase();
    if (file.mimetype === 'application/pdf' || name.endsWith('.pdf')) {
      return 'pdf';
    }
    if (
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      name.endsWith('.docx')
    ) {
      return 'docx';
    }
    if (file.mimetype.startsWith('text/') || name.endsWith('.txt')) {
      return 'txt';
    }
    throw new BadRequestException(
      'Поддерживаются только PDF, DOCX и TXT файлы',
    );
  }

  private sanitize(text: string): string {
    return text
      .replace(/\0/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .slice(0, MAX_TEXT_CHARS);
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse') as {
      PDFParse: new (options: { data: Uint8Array }) => {
        getText(): Promise<{ text: string }>;
        destroy(): Promise<void>;
      };
    };
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth') as {
      extractRawText(input: { buffer: Buffer }): Promise<{ value: string }>;
    };
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
}
