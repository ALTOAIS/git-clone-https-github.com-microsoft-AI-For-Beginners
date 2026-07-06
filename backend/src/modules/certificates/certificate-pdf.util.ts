import * as path from 'path';
import PDFDocument from 'pdfkit';

// PDFKit's built-in standard fonts (Helvetica etc.) only cover WinAnsi/Latin
// glyphs, so Cyrillic certificate text needs an embedded Unicode-capable font.
const FONTS_DIR = path.resolve(process.cwd(), 'assets', 'fonts');
const REGULAR_FONT = path.join(FONTS_DIR, 'DejaVuSans.ttf');
const BOLD_FONT = path.join(FONTS_DIR, 'DejaVuSans-Bold.ttf');

export interface CertificatePdfData {
  certificateNumber: string;
  courseTitle: string;
  recipientName: string;
  scorePercent?: number | null;
  issuedAt: Date;
}

export function buildCertificatePdf(data: CertificatePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      layout: 'landscape',
      size: 'A4',
      margin: 50,
    });
    doc.registerFont('Body', REGULAR_FONT);
    doc.registerFont('Body-Bold', BOLD_FONT);

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { width, height } = doc.page;
    doc
      .lineWidth(3)
      .strokeColor('#1d4ed8')
      .rect(20, 20, width - 40, height - 40)
      .stroke();
    doc
      .lineWidth(1)
      .strokeColor('#93c5fd')
      .rect(30, 30, width - 60, height - 60)
      .stroke();

    doc.moveDown(3);
    doc
      .font('Body-Bold')
      .fontSize(12)
      .fillColor('#1d4ed8')
      .text('COMPLIANCE RISK HUB', { align: 'center' });
    doc.moveDown(0.5);
    doc
      .font('Body-Bold')
      .fontSize(32)
      .fillColor('#111827')
      .text('СЕРТИФИКАТ', { align: 'center' });
    doc.moveDown(0.3);
    doc
      .font('Body')
      .fontSize(13)
      .fillColor('#4b5563')
      .text('о прохождении курса Академии комплаенса', { align: 'center' });

    doc.moveDown(2);
    doc
      .font('Body')
      .fontSize(12)
      .fillColor('#6b7280')
      .text('Настоящим подтверждается, что', { align: 'center' });
    doc.moveDown(0.3);
    doc
      .font('Body-Bold')
      .fontSize(22)
      .fillColor('#111827')
      .text(data.recipientName, { align: 'center' });
    doc.moveDown(0.5);
    doc
      .font('Body')
      .fontSize(12)
      .fillColor('#6b7280')
      .text('успешно прошёл(а) курс', { align: 'center' });
    doc.moveDown(0.3);
    doc
      .font('Body-Bold')
      .fontSize(18)
      .fillColor('#111827')
      .text(data.courseTitle, { align: 'center' });

    if (data.scorePercent != null) {
      doc.moveDown(0.8);
      doc
        .font('Body')
        .fontSize(12)
        .fillColor('#4b5563')
        .text(`Результат итогового теста: ${data.scorePercent}%`, {
          align: 'center',
        });
    }

    const dateStr = data.issuedAt.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.fontSize(11).fillColor('#6b7280');
    doc.text(`Дата выдачи: ${dateStr}`, 50, height - 80);
    doc.text(`Номер сертификата: ${data.certificateNumber}`, 50, height - 80, {
      align: 'right',
    });

    doc.end();
  });
}
