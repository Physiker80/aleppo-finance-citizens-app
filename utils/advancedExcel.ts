// =====================================================
// 📊 Advanced Excel Export System
// نظام تصدير Excel متقدم مع Pivot Tables وتنسيق احترافي
// =====================================================

export interface ExcelColumn {
    key: string;
    header: string;
    width?: number;
    type?: 'string' | 'number' | 'date' | 'currency' | 'percent';
    format?: string;
    style?: CellStyle;
}

export interface CellStyle {
    bold?: boolean;
    italic?: boolean;
    fontSize?: number;
    fontColor?: string;
    bgColor?: string;
    align?: 'left' | 'center' | 'right';
    border?: boolean;
    wrap?: boolean;
}

export interface ExcelSheet {
    name: string;
    columns: ExcelColumn[];
    data: Record<string, unknown>[];
    title?: string;
    subtitle?: string;
    showFilters?: boolean;
    freezeHeader?: boolean;
    includeTotal?: boolean;
    pivotConfig?: PivotConfig;
}

export interface PivotConfig {
    rows: string[];
    columns: string[];
    values: { field: string; aggregate: 'sum' | 'count' | 'avg' | 'min' | 'max' }[];
}

export interface ExcelExportOptions {
    filename: string;
    sheets: ExcelSheet[];
    author?: string;
    company?: string;
    dateFormat?: string;
    rtl?: boolean;
}

/**
 * إنشاء XML للخلية
 */
function createCell(value: unknown, type: string, styleId: number): string {
    if (value === null || value === undefined) {
        return `<c s="${styleId}"><v></v></c>`;
    }

    if (type === 'number' || type === 'currency' || type === 'percent') {
        return `<c s="${styleId}" t="n"><v>${value}</v></c>`;
    }

    if (type === 'date' && value instanceof Date) {
        const excelDate = (value.getTime() - new Date(1899, 11, 30).getTime()) / (24 * 60 * 60 * 1000);
        return `<c s="${styleId}" t="n"><v>${excelDate}</v></c>`;
    }

    // String - needs to be in shared strings
    const escaped = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<c s="${styleId}" t="inlineStr"><is><t>${escaped}</t></is></c>`;
}

/**
 * تحويل رقم العمود إلى حرف
 */
function columnToLetter(col: number): string {
    let letter = '';
    while (col >= 0) {
        letter = String.fromCharCode((col % 26) + 65) + letter;
        col = Math.floor(col / 26) - 1;
    }
    return letter;
}

/**
 * إنشاء ورقة Excel
 */
function createSheetXml(sheet: ExcelSheet, options: ExcelExportOptions): string {
    const rows: string[] = [];
    let rowIndex = 1;

    // Title row
    if (sheet.title) {
        rows.push(`<row r="${rowIndex}"><c r="A${rowIndex}" s="1" t="inlineStr"><is><t>${sheet.title}</t></is></c></row>`);
        rowIndex++;
    }

    // Subtitle row
    if (sheet.subtitle) {
        rows.push(`<row r="${rowIndex}"><c r="A${rowIndex}" s="2" t="inlineStr"><is><t>${sheet.subtitle}</t></is></c></row>`);
        rowIndex++;
    }

    // Empty row after titles
    if (sheet.title || sheet.subtitle) {
        rowIndex++;
    }

    // Header row
    const headerCells = sheet.columns.map((col, i) => {
        const letter = columnToLetter(i);
        return `<c r="${letter}${rowIndex}" s="3" t="inlineStr"><is><t>${col.header}</t></is></c>`;
    }).join('');
    rows.push(`<row r="${rowIndex}">${headerCells}</row>`);
    const headerRow = rowIndex;
    rowIndex++;

    // Data rows
    sheet.data.forEach((record) => {
        const cells = sheet.columns.map((col, i) => {
            const letter = columnToLetter(i);
            const value = record[col.key];
            return createCell(value, col.type || 'string', 4).replace('<c ', `<c r="${letter}${rowIndex}" `);
        }).join('');
        rows.push(`<row r="${rowIndex}">${cells}</row>`);
        rowIndex++;
    });

    // Total row
    if (sheet.includeTotal) {
        const totalCells = sheet.columns.map((col, i) => {
            const letter = columnToLetter(i);
            if (col.type === 'number' || col.type === 'currency') {
                const startRow = headerRow + 1;
                const endRow = rowIndex - 1;
                return `<c r="${letter}${rowIndex}" s="5"><f>SUM(${letter}${startRow}:${letter}${endRow})</f></c>`;
            }
            if (i === 0) {
                return `<c r="${letter}${rowIndex}" s="5" t="inlineStr"><is><t>المجموع</t></is></c>`;
            }
            return `<c r="${letter}${rowIndex}" s="5"/>`;
        }).join('');
        rows.push(`<row r="${rowIndex}">${totalCells}</row>`);
    }

    // Column widths
    const colsXml = sheet.columns.map((col, i) => {
        const width = col.width || 15;
        return `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`;
    }).join('');

    // Direction
    const direction = options.rtl ? 'rightToLeft="1"' : '';

    // Freeze panes
    let freezePane = '';
    if (sheet.freezeHeader) {
        freezePane = `<sheetViews><sheetView ${direction} workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${headerRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
    } else {
        freezePane = `<sheetViews><sheetView ${direction} workbookViewId="0"/></sheetViews>`;
    }

    // AutoFilter
    let autoFilter = '';
    if (sheet.showFilters) {
        const lastCol = columnToLetter(sheet.columns.length - 1);
        autoFilter = `<autoFilter ref="A${headerRow}:${lastCol}${rowIndex - 1}"/>`;
    }

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${freezePane}
  <cols>${colsXml}</cols>
  <sheetData>${rows.join('')}</sheetData>
  ${autoFilter}
</worksheet>`;
}

/**
 * إنشاء ملف الأنماط
 */
function createStylesXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="11"/><name val="Arial"/></font>
    <font><sz val="16"/><b/><name val="Arial"/></font>
    <font><sz val="12"/><i/><name val="Arial"/></font>
    <font><sz val="11"/><b/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F3C35"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border/>
    <border>
      <left style="thin"><color rgb="FF000000"/></left>
      <right style="thin"><color rgb="FF000000"/></right>
      <top style="thin"><color rgb="FF000000"/></top>
      <bottom style="thin"><color rgb="FF000000"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0"/>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1"/>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" applyAlignment="1"><alignment horizontal="center"/></xf>
  </cellXfs>
</styleSheet>`;
}

/**
 * إنشاء ملف العلاقات
 */
function createRelsXml(sheetCount: number): string {
    const rels = [];
    for (let i = 0; i < sheetCount; i++) {
        rels.push(`<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`);
    }
    rels.push(`<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`);

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/relationships/2006">
  ${rels.join('')}
</Relationships>`;
}

/**
 * إنشاء ملف المصنف
 */
function createWorkbookXml(sheets: ExcelSheet[]): string {
    const sheetRefs = sheets.map((sheet, i) =>
        `<sheet name="${sheet.name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
    ).join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetRefs}</sheets>
</workbook>`;
}

/**
 * إنشاء ملف [Content_Types].xml
 */
function createContentTypesXml(sheetCount: number): string {
    const sheetTypes = [];
    for (let i = 0; i < sheetCount; i++) {
        sheetTypes.push(`<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
    }

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  ${sheetTypes.join('')}
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
}

/**
 * إنشاء ملف العلاقات الرئيسية
 */
function createMainRelsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/relationships/2006">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

/**
 * إنشاء ملف ZIP
 * بسيط بدون مكتبة خارجية - يستخدم مكتبة JSZip أو fflate إذا متوفرة
 */
async function createZipFile(files: Record<string, string>): Promise<Blob> {
    // Try to use JSZip if available
    if (typeof window !== 'undefined' && (window as unknown as { JSZip?: unknown }).JSZip) {
        const JSZip = (window as unknown as { JSZip: new () => { file: (name: string, content: string) => void; generateAsync: (options: { type: string; mimeType: string }) => Promise<Blob> } }).JSZip;
        const zip = new JSZip();

        for (const [path, content] of Object.entries(files)) {
            zip.file(path, content);
        }

        return await zip.generateAsync({
            type: 'blob',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
    }

    // Fallback: Create a simple uncompressed ZIP
    // This is a simplified implementation - in production, use a proper library
    console.warn('JSZip not available. Using simplified ZIP creation.');

    const encoder = new TextEncoder();
    const parts: Uint8Array[] = [];
    const centralDirectory: Uint8Array[] = [];
    let offset = 0;

    for (const [path, content] of Object.entries(files)) {
        const pathBytes = encoder.encode(path);
        const contentBytes = encoder.encode(content);

        // Local file header
        const localHeader = new Uint8Array(30 + pathBytes.length);
        const view = new DataView(localHeader.buffer);
        view.setUint32(0, 0x04034b50, true); // signature
        view.setUint16(4, 20, true); // version
        view.setUint16(6, 0, true); // flags
        view.setUint16(8, 0, true); // compression (none)
        view.setUint32(18, contentBytes.length, true); // compressed size
        view.setUint32(22, contentBytes.length, true); // uncompressed size
        view.setUint16(26, pathBytes.length, true); // filename length
        localHeader.set(pathBytes, 30);

        parts.push(localHeader, contentBytes);

        // Central directory entry
        const centralEntry = new Uint8Array(46 + pathBytes.length);
        const centralView = new DataView(centralEntry.buffer);
        centralView.setUint32(0, 0x02014b50, true); // signature
        centralView.setUint16(4, 20, true); // version made by
        centralView.setUint16(6, 20, true); // version needed
        centralView.setUint16(8, 0, true); // flags
        centralView.setUint16(10, 0, true); // compression
        centralView.setUint32(20, contentBytes.length, true); // compressed size
        centralView.setUint32(24, contentBytes.length, true); // uncompressed size
        centralView.setUint16(28, pathBytes.length, true); // filename length
        centralView.setUint32(42, offset, true); // relative offset
        centralEntry.set(pathBytes, 46);

        centralDirectory.push(centralEntry);
        offset += localHeader.length + contentBytes.length;
    }

    // End of central directory
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    eocdView.setUint32(0, 0x06054b50, true); // signature
    eocdView.setUint16(8, centralDirectory.length, true); // entries on disk
    eocdView.setUint16(10, centralDirectory.length, true); // total entries

    const centralDirSize = centralDirectory.reduce((sum, arr) => sum + arr.length, 0);
    eocdView.setUint32(12, centralDirSize, true); // central directory size
    eocdView.setUint32(16, offset, true); // central directory offset

    return new Blob([...parts, ...centralDirectory, eocd], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
}

/**
 * تصدير إلى Excel
 */
export async function exportToExcel(options: ExcelExportOptions): Promise<void> {
    const files: Record<string, string> = {
        '[Content_Types].xml': createContentTypesXml(options.sheets.length),
        '_rels/.rels': createMainRelsXml(),
        'xl/workbook.xml': createWorkbookXml(options.sheets),
        'xl/_rels/workbook.xml.rels': createRelsXml(options.sheets.length),
        'xl/styles.xml': createStylesXml()
    };

    // Add worksheets
    options.sheets.forEach((sheet, i) => {
        files[`xl/worksheets/sheet${i + 1}.xml`] = createSheetXml(sheet, options);
    });

    const blob = await createZipFile(files);

    // Download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${options.filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * إنشاء تقرير Pivot بسيط
 */
export function createPivotData<T extends Record<string, unknown>>(
    data: T[],
    config: PivotConfig
): Record<string, unknown>[] {
    const groups = new Map<string, T[]>();

    // Group data
    data.forEach(record => {
        const key = config.rows.map(r => String(record[r])).join('|');
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(record);
    });

    // Aggregate
    const result: Record<string, unknown>[] = [];
    groups.forEach((items, key) => {
        const row: Record<string, unknown> = {};
        const keyParts = key.split('|');
        config.rows.forEach((r, i) => {
            row[r] = keyParts[i];
        });

        config.values.forEach(({ field, aggregate }) => {
            const values = items.map(item => Number(item[field]) || 0);
            switch (aggregate) {
                case 'sum':
                    row[`${field}_sum`] = values.reduce((a, b) => a + b, 0);
                    break;
                case 'count':
                    row[`${field}_count`] = values.length;
                    break;
                case 'avg':
                    row[`${field}_avg`] = values.reduce((a, b) => a + b, 0) / values.length;
                    break;
                case 'min':
                    row[`${field}_min`] = Math.min(...values);
                    break;
                case 'max':
                    row[`${field}_max`] = Math.max(...values);
                    break;
            }
        });

        result.push(row);
    });

    return result;
}

/**
 * تصدير سريع لبيانات بسيطة
 */
export async function quickExport<T extends Record<string, unknown>>(
    data: T[],
    filename: string,
    columns?: Partial<ExcelColumn>[]
): Promise<void> {
    if (data.length === 0) {
        console.warn('No data to export');
        return;
    }

    const keys = Object.keys(data[0]);
    const cols: ExcelColumn[] = keys.map((key, i) => ({
        key,
        header: columns?.[i]?.header || key,
        width: columns?.[i]?.width || 15,
        type: columns?.[i]?.type || 'string'
    }));

    await exportToExcel({
        filename,
        sheets: [{
            name: 'البيانات',
            columns: cols,
            data: data as Record<string, unknown>[],
            showFilters: true,
            freezeHeader: true
        }],
        rtl: true
    });
}

export default {
    exportToExcel,
    quickExport,
    createPivotData
};
