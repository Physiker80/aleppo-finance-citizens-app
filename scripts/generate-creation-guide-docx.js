// Generate a .docx file from SITE_CREATION_GUIDE_AR.md
// Based on the existing script logic

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType, TextRun, LevelFormat } from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');
const mdPath = path.join(root, 'SITE_CREATION_GUIDE_AR.md');
const outPath = path.join(root, 'دليل_إنشاء_الموقع_خطوة_بخطوة.docx');

if (!fs.existsSync(mdPath)) {
  console.error('لم يتم العثور على ملف الدليل:', mdPath);
  process.exit(1);
}

const md = fs.readFileSync(mdPath, 'utf8');

const lines = md.split(/\r?\n/);

let inCodeBlock = false;
let bulletsBuffer = [];

const numberingConfig = {
  config: [
    {
      reference: 'arabic-numbered',
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: '%1.',
          alignment: AlignmentType.RIGHT,
        },
      ],
    },
  ],
};

const children = [];

function flushBullets() {
  if (bulletsBuffer.length === 0) return;
  bulletsBuffer.forEach((text) => {
    children.push(
      new Paragraph({
        bidirectional: true,
        text,
        numbering: {
          reference: 'arabic-numbered',
          level: 0,
        },
        alignment: AlignmentType.RIGHT, 
      })
    );
  });
  bulletsBuffer = [];
}

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  if (line.trim().startsWith('```')) {
    inCodeBlock = !inCodeBlock;
    continue;
  }

  if (inCodeBlock) {
    // Code blocks styling
    children.push(
      new Paragraph({ 
        bidirectional: false, // Code is LTR
        alignment: AlignmentType.LEFT,
        children: [
            new TextRun({ 
                text: line, 
                font: 'Consolas',
                size: 20, // 10pt
                color: '333333'
            })
        ],
        shading: {
            fill: "F5F5F5",
        }
      })
    );
    continue;
  }

  // Headings
  const h1 = /^#\s+(.*)/.exec(line);
  const h2 = /^##\s+(.*)/.exec(line);
  const h3 = /^###\s+(.*)/.exec(line);

  if (h1) {
    flushBullets();
    children.push(
      new Paragraph({
        bidirectional: true,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER, // Main title center
        children: [new TextRun({ text: h1[1].trim(), bold: true, size: 32 })], // 16pt
        spacing: { before: 240, after: 120 }
      })
    );
    continue;
  }
  if (h2) {
    flushBullets();
    children.push(
      new Paragraph({
        bidirectional: true,
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: h2[1].trim(), bold: true, size: 28, color: '0F3C35' })], // 14pt + Primary Color
        spacing: { before: 240, after: 120 }
      })
    );
    continue;
  }
  if (h3) {
    flushBullets();
    children.push(
      new Paragraph({
        bidirectional: true,
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: h3[1].trim(), bold: true, size: 24 })], // 12pt
        spacing: { before: 120, after: 60 }
      })
    );
    continue;
  }

  // Lists
  const bullet = /^[-*]\s+(.*)/.exec(line);
  if (bullet) {
    bulletsBuffer.push(bullet[1]);
    continue;
  }

  // Horizontal Rule
  if (/^[-*_]{3,}$/.test(line.trim())) {
    flushBullets();
    children.push(new Paragraph({ text: '________________________________', alignment: AlignmentType.CENTER }));
    continue;
  }

  // Empty lines
  if (line.trim() === '') {
    flushBullets();
    children.push(new Paragraph({ text: '' }));
    continue;
  }

  // Regular text
  flushBullets();
  children.push(
    new Paragraph({ 
        bidirectional: true, 
        alignment: AlignmentType.RIGHT, 
        children: [new TextRun({ text: line, size: 24 })] // 12pt
    })
  );
}

flushBullets();

const doc = new Document({
  numbering: numberingConfig,
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch margins
        },
      },
      children,
    },
  ],
});

Packer.toBuffer(doc)
  .then((buffer) => {
    fs.writeFileSync(outPath, buffer);
    console.log('✅ تم إنشاء ملف وورد بنجاح:', outPath);
  })
  .catch((err) => {
    console.error('فشل إنشاء ملف وورد:', err);
    process.exit(1);
  });
