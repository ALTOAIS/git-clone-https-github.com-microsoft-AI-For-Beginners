import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

export interface DocxSection {
  heading: string;
  lines: string[];
}

export function buildDocxReport(
  title: string,
  subtitle: string,
  sections: DocxSection[],
): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: subtitle, color: '666666', size: 20 }),
            ],
          }),
          ...sections.flatMap((section) => [
            new Paragraph({
              text: section.heading,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 150 },
            }),
            ...section.lines.map(
              (line) =>
                new Paragraph({
                  text: line,
                  bullet: { level: 0 },
                }),
            ),
          ]),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
