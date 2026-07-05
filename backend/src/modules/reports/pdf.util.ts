import * as path from 'path';
import PDFDocument from 'pdfkit';

export interface PdfSection {
  heading: string;
  lines?: string[];
  table?: { headers: string[]; rows: (string | number)[][] };
}

// PDFKit's built-in standard fonts (Helvetica etc.) only cover WinAnsi/Latin
// glyphs, so Cyrillic report text needs an embedded Unicode-capable font.
const FONTS_DIR = path.resolve(process.cwd(), 'assets', 'fonts');
const REGULAR_FONT = path.join(FONTS_DIR, 'DejaVuSans.ttf');
const BOLD_FONT = path.join(FONTS_DIR, 'DejaVuSans-Bold.ttf');

export function buildPdfReport(
  title: string,
  subtitle: string,
  sections: PdfSection[],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    doc.registerFont('Body', REGULAR_FONT);
    doc.registerFont('Body-Bold', BOLD_FONT);
    doc.font('Body');

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#666').text(subtitle, { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown(1.5);

    for (const section of sections) {
      doc.fontSize(14).text(section.heading, { underline: true });
      doc.moveDown(0.5);

      if (section.lines) {
        doc.fontSize(11);
        for (const line of section.lines) {
          doc.text(`•  ${line}`);
        }
        doc.moveDown(0.5);
      }

      if (section.table) {
        const { headers, rows } = section.table;
        const colWidth = (doc.page.width - 100) / headers.length;
        doc.fontSize(10).font('Body-Bold');
        headers.forEach((h, i) =>
          doc.text(h, 50 + i * colWidth, doc.y, {
            width: colWidth,
            continued: i < headers.length - 1,
          }),
        );
        doc.moveDown(0.5);
        doc.font('Body');
        rows.forEach((row) => {
          const y = doc.y;
          row.forEach((cell, i) =>
            doc.text(String(cell), 50 + i * colWidth, y, {
              width: colWidth,
              continued: i < row.length - 1,
            }),
          );
          doc.moveDown(0.3);
        });
      }

      doc.moveDown(1);
    }

    doc.end();
  });
}
