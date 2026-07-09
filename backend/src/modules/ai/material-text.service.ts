import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { PrismaService } from '../../prisma/prisma.service';

const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? './uploads');

export interface ExtractedMaterialText {
  fileName: string;
  mimeType: string;
  text: string;
  /** Явное предупреждение об ограничениях извлечения (например, для PPTX) */
  limitation?: string;
}

/**
 * Безопасное извлечение текста из загруженных материалов Академии
 * для передачи в LLM. Поддерживаются PDF, DOCX, PPTX и текстовые файлы.
 * Для устаревших бинарных форматов (DOC/PPT/XLS) извлечение не выполняется —
 * пользователю возвращается явное сообщение об ограничении.
 */
@Injectable()
export class MaterialTextService {
  private readonly logger = new Logger(MaterialTextService.name);

  constructor(private prisma: PrismaService) {}

  async extractFromAttachment(
    attachmentId: string,
    maxChars = 24000,
  ): Promise<ExtractedMaterialText> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment) {
      throw new BadRequestException('Материал не найден');
    }
    const filePath = join(UPLOAD_DIR, attachment.storedName);

    let text = '';
    let limitation: string | undefined;

    try {
      if (attachment.mimeType === 'application/pdf') {
        text = await this.extractPdf(filePath);
      } else if (
        attachment.mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        text = await this.extractDocx(filePath);
      } else if (
        attachment.mimeType ===
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ) {
        const result = await this.extractPptx(filePath);
        text = result.text;
        limitation = result.limitation;
      } else if (
        attachment.mimeType.startsWith('text/') ||
        attachment.mimeType === 'text/csv'
      ) {
        text = await readFile(filePath, 'utf8');
      } else {
        throw new BadRequestException(
          `Извлечение текста из файла типа «${attachment.mimeType}» не поддерживается. ` +
            'Поддерживаются PDF, DOCX, PPTX и текстовые файлы.',
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Не удалось извлечь текст из «${attachment.fileName}»: ${message}`,
      );
      throw new BadRequestException(
        `Не удалось извлечь текст из файла «${attachment.fileName}». Файл может быть повреждён или защищён.`,
      );
    }

    const normalized = text
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (!normalized) {
      throw new BadRequestException(
        `В файле «${attachment.fileName}» не найден текст для анализа (возможно, это скан без текстового слоя).`,
      );
    }

    return {
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      text:
        normalized.length > maxChars
          ? `${normalized.slice(0, maxChars)}\n…[текст усечён]`
          : normalized,
      limitation,
    };
  }

  private async extractPdf(filePath: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse') as {
      PDFParse: new (options: { data: Uint8Array }) => {
        getText(): Promise<{ text: string }>;
        destroy(): Promise<void>;
      };
    };
    const buffer = await readFile(filePath);
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  private async extractDocx(filePath: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth') as {
      extractRawText(input: { path: string }): Promise<{ value: string }>;
    };
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  private async extractPptx(
    filePath: string,
  ): Promise<{ text: string; limitation: string }> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const JSZip = require('jszip') as {
      loadAsync(data: Buffer): Promise<{
        files: Record<string, { async(type: 'string'): Promise<string> }>;
      }>;
    };
    const buffer = await readFile(filePath);
    const zip = await JSZip.loadAsync(buffer);
    const slideNames = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a, b) => {
        const numberOf = (name: string) =>
          Number(name.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
        return numberOf(a) - numberOf(b);
      });
    const slides: string[] = [];
    for (const name of slideNames) {
      const xml = await zip.files[name].async('string');
      const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)]
        .map((m) => m[1])
        .filter(Boolean);
      if (texts.length) {
        slides.push(`Слайд ${slides.length + 1}: ${texts.join(' ')}`);
      }
    }
    return {
      text: slides.join('\n'),
      limitation:
        'Из презентации извлечён только текст со слайдов; изображения, диаграммы и заметки докладчика не анализировались.',
    };
  }
}
