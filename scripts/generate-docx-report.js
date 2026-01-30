// Generate a .docx file from COMPREHENSIVE_PROS_CONS_REPORT_AR.md
// Simple Markdown-to-DOCX conversion (headings, paragraphs, lists, code fences).
// Note: This is a light converter fit for our report structure; it doesn't aim to be fully general.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType, TextRun, LevelFormat } from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = path.resolve(__dirname, '..');
const mdPath = path.join(root, 'COMPREHENSIVE_PROS_CONS_REPORT_AR.md');
const outPath = path.join(root, 'COMPREHENSIVE_PROS_CONS_REPORT_AR.docx');

if (!fs.existsSync(mdPath)) {
  console.error('لم يتم العثور على ملف التقرير:', mdPath);
  process.exit(1);
}

const md = fs.readFileSync(mdPath, 'utf8');

// Basic parser: split by lines and convert to DOCX elements
const lines = md.split(/\r?\n/);

// State for list handling
let inCodeBlock = false;
let bulletsBuffer = [];
// docx v8 expects numbering config as a plain object on Document options
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

// Helper to flush bullet buffer into paragraphs
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
      })
    );
  });
  bulletsBuffer = [];
}

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  // Handle code fences
  if (line.trim().startsWith('```')) {
    inCodeBlock = !inCodeBlock;
    if (inCodeBlock) {
      // Start code block paragraph marker
      continue;
    } else {
      // End code block
      continue;
    }
  }

  if (inCodeBlock) {
    children.push(
      new Paragraph({ bidirectional: true, children: [new TextRun({ text: line, font: 'Calibri' })] })
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
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: h1[1].trim(), bold: true })],
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
        children: [new TextRun({ text: h2[1].trim(), bold: true })],
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
        children: [new TextRun({ text: h3[1].trim(), bold: true })],
      })
    );
    continue;
  }

  // Lists: lines starting with - or *
  const bullet = /^[-*]\s+(.*)/.exec(line);
  if (bullet) {
    bulletsBuffer.push(bullet[1]);
    continue;
  }

  // Tables (very basic) => keep as plain text line
  if (line.trim().startsWith('|')) {
    flushBullets();
    children.push(
      new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, children: [new TextRun(line)] })
    );
    continue;
  }

  // Horizontal rules or separators
  if (/^[-*_]{3,}$/.test(line.trim())) {
    flushBullets();
    children.push(new Paragraph({ text: '—', alignment: AlignmentType.CENTER }));
    continue;
  }

  // Blank lines
  if (line.trim() === '') {
    flushBullets();
    children.push(new Paragraph({ text: '' }));
    continue;
  }

  // Regular paragraph
  flushBullets();
  children.push(
    new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, children: [new TextRun(line)] })
  );
}

// Final flush
flushBullets();

const doc = new Document({
  numbering: numberingConfig,
  sections: [
    {
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
          size: { width: 12240, height: 15840 }, // A4 portrait
        },
      },
      children,
    },
  ],
});

Packer.toBuffer(doc)
  .then((buffer) => {
    fs.writeFileSync(outPath, buffer);
    console.log('✅ تم إنشاء ملف وورد:', outPath);
  })
  .catch((err) => {
    console.error('فشل إنشاء ملف وورد:', err);
    process.exit(1);
  });
