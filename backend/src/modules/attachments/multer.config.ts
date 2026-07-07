import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'text/csv',
  'text/plain',
]);

export const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export function attachmentsMulterOptions(uploadDir: string) {
  return {
    storage: diskStorage({
      destination: uploadDir,
      filename: (_req, file, callback) => {
        callback(null, `${uuid()}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
    fileFilter: (
      _req: unknown,
      file: Express.Multer.File,
      callback: (error: Error | null, accept: boolean) => void,
    ) => {
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
        callback(
          new BadRequestException(`Недопустимый тип файла: ${file.mimetype}`),
          false,
        );
        return;
      }
      callback(null, true);
    },
  };
}
