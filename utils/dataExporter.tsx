/**
 * نظام تصدير البيانات بصيغ متعددة
 * Excel, CSV, JSON
 */

import { Ticket, ContactMessage, Employee } from '../types';

// تحويل التاريخ للصيغة العربية
const formatDate = (date: Date | string | undefined): string => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('ar-SY', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// ==================== تصدير CSV ====================
export const exportToCSV = <T extends Record<string, any>>(
    data: T[],
    filename: string,
    columns: { key: keyof T; label: string }[]
): void => {
    if (data.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
    }

    // إنشاء الـ BOM للدعم العربي
    const BOM = '\uFEFF';

    // إنشاء صف العناوين
    const headers = columns.map(col => `"${col.label}"`).join(',');

    // إنشاء صفوف البيانات
    const rows = data.map(item =>
        columns.map(col => {
            let value = item[col.key];
            if (value === null || value === undefined) value = '';
            if (value instanceof Date) value = formatDate(value);
            if (typeof value === 'object') value = JSON.stringify(value);
            // تنظيف القيمة وإضافة علامات التنصيص
            return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
    ).join('\n');

    const csvContent = BOM + headers + '\n' + rows;
    downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8');
};

// ==================== تصدير JSON ====================
export const exportToJSON = <T,>(data: T[], filename: string): void => {
    if (data.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
    }

    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, `${filename}.json`, 'application/json');
};

// ==================== تصدير Excel (XLSX) ====================
export const exportToExcel = <T extends Record<string, any>>(
    data: T[],
    filename: string,
    columns: { key: keyof T; label: string }[],
    sheetName: string = 'البيانات'
): void => {
    if (data.length === 0) {
        alert('لا توجد بيانات للتصدير');
        return;
    }

    // إنشاء محتوى XML للـ Excel
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>';
    const workbookStart = '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
    const workbookEnd = '</Workbook>';

    // أنماط للتنسيق
    const styles = `
    <Styles>
      <Style ss:ID="header">
        <Font ss:Bold="1" ss:Size="12"/>
        <Interior ss:Color="#4472C4" ss:Pattern="Solid"/>
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      </Style>
      <Style ss:ID="data">
        <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      </Style>
    </Styles>
  `;

    // إنشاء ورقة العمل
    let sheetContent = `<Worksheet ss:Name="${sheetName}"><Table>`;

    // صف العناوين
    sheetContent += '<Row ss:StyleID="header">';
    columns.forEach(col => {
        sheetContent += `<Cell><Data ss:Type="String">${col.label}</Data></Cell>`;
    });
    sheetContent += '</Row>';

    // صفوف البيانات
    data.forEach(item => {
        sheetContent += '<Row ss:StyleID="data">';
        columns.forEach(col => {
            let value = item[col.key];
            if (value === null || value === undefined) value = '';
            if (value instanceof Date) value = formatDate(value);
            if (typeof value === 'object') value = JSON.stringify(value);
            const type = typeof value === 'number' ? 'Number' : 'String';
            sheetContent += `<Cell><Data ss:Type="${type}">${String(value)}</Data></Cell>`;
        });
        sheetContent += '</Row>';
    });

    sheetContent += '</Table></Worksheet>';

    const xmlContent = xmlHeader + workbookStart + styles + sheetContent + workbookEnd;
    downloadFile(xmlContent, `${filename}.xls`, 'application/vnd.ms-excel');
};

// ==================== دالة التحميل المشتركة ====================
const downloadFile = (content: string, filename: string, mimeType: string): void => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// ==================== تصدير الطلبات ====================
export const exportTickets = (
    tickets: Ticket[],
    format: 'csv' | 'json' | 'excel',
    filename: string = 'tickets'
): void => {
    const columns: { key: keyof Ticket; label: string }[] = [
        { key: 'id', label: 'رقم الطلب' },
        { key: 'fullName', label: 'الاسم الكامل' },
        { key: 'phone', label: 'رقم الهاتف' },
        { key: 'email', label: 'البريد الإلكتروني' },
        { key: 'nationalId', label: 'الرقم الوطني' },
        { key: 'requestType', label: 'نوع الطلب' },
        { key: 'department', label: 'القسم' },
        { key: 'status', label: 'الحالة' },
        { key: 'source', label: 'المصدر' },
        { key: 'submissionDate', label: 'تاريخ التقديم' },
        { key: 'response', label: 'الرد' },
    ];

    const processedTickets = tickets.map(t => ({
        ...t,
        submissionDate: formatDate(t.submissionDate),
        answeredAt: formatDate(t.answeredAt),
        startedAt: formatDate(t.startedAt),
        closedAt: formatDate(t.closedAt),
    }));

    switch (format) {
        case 'csv':
            exportToCSV(processedTickets, filename, columns);
            break;
        case 'json':
            exportToJSON(processedTickets, filename);
            break;
        case 'excel':
            exportToExcel(processedTickets, filename, columns, 'الطلبات');
            break;
    }
};

// ==================== تصدير رسائل التواصل ====================
export const exportContactMessages = (
    messages: ContactMessage[],
    format: 'csv' | 'json' | 'excel',
    filename: string = 'contact-messages'
): void => {
    const columns: { key: keyof ContactMessage; label: string }[] = [
        { key: 'id', label: 'رقم الرسالة' },
        { key: 'name', label: 'الاسم' },
        { key: 'email', label: 'البريد الإلكتروني' },
        { key: 'phone', label: 'رقم الهاتف' },
        { key: 'type', label: 'النوع' },
        { key: 'department', label: 'القسم' },
        { key: 'status', label: 'الحالة' },
        { key: 'message', label: 'الرسالة' },
        { key: 'submissionDate', label: 'تاريخ الإرسال' },
    ];

    const processedMessages = messages.map(m => ({
        ...m,
        submissionDate: formatDate(m.submissionDate),
    }));

    switch (format) {
        case 'csv':
            exportToCSV(processedMessages, filename, columns);
            break;
        case 'json':
            exportToJSON(processedMessages, filename);
            break;
        case 'excel':
            exportToExcel(processedMessages, filename, columns, 'رسائل التواصل');
            break;
    }
};

// ==================== تصدير الموظفين ====================
export const exportEmployees = (
    employees: Employee[],
    format: 'csv' | 'json' | 'excel',
    filename: string = 'employees'
): void => {
    const columns: { key: keyof Employee; label: string }[] = [
        { key: 'username', label: 'اسم المستخدم' },
        { key: 'name', label: 'الاسم' },
        { key: 'email', label: 'البريد الإلكتروني' },
        { key: 'department', label: 'القسم' },
        { key: 'role', label: 'الدور' },
        { key: 'nationalId', label: 'الرقم الوطني' },
    ];

    // إزالة كلمات المرور من التصدير
    const safeEmployees = employees.map(({ password, ...rest }) => rest);

    switch (format) {
        case 'csv':
            exportToCSV(safeEmployees as any, filename, columns as any);
            break;
        case 'json':
            exportToJSON(safeEmployees, filename);
            break;
        case 'excel':
            exportToExcel(safeEmployees as any, filename, columns as any, 'الموظفين');
            break;
    }
};

// ==================== مكون زر التصدير ====================
import React, { useState } from 'react';

interface ExportButtonProps {
    onExport: (format: 'csv' | 'json' | 'excel') => void;
    disabled?: boolean;
    className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ onExport, disabled, className }) => {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className= {`relative ${className || ''}`
}>
    <button
        onClick={ () => setShowMenu(!showMenu) }
disabled = { disabled }
className = "flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
    <svg className="w-5 h-5" fill = "none" stroke = "currentColor" viewBox = "0 0 24 24" >
        <path strokeLinecap="round" strokeLinejoin = "round" strokeWidth = { 2} d = "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
تصدير
    < svg className = {`w-4 h-4 transition-transform ${showMenu ? 'rotate-180' : ''}`} fill = "none" stroke = "currentColor" viewBox = "0 0 24 24" >
        <path strokeLinecap="round" strokeLinejoin = "round" strokeWidth = { 2} d = "M19 9l-7 7-7-7" />
            </svg>
            </button>

{
    showMenu && (
        <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50" >
            <button
            onClick={ () => { onExport('excel'); setShowMenu(false); } }
    className = "w-full px-4 py-3 text-right hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 rounded-t-lg"
        >
        <span className="text-green-600" >📊</span>
    Excel(.xls)
        </button>
        < button
    onClick = {() => { onExport('csv'); setShowMenu(false); }
}
className = "w-full px-4 py-3 text-right hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
    >
    <span className="text-blue-600" >📄</span>
CSV
    </button>
    < button
onClick = {() => { onExport('json'); setShowMenu(false); }}
className = "w-full px-4 py-3 text-right hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 rounded-b-lg"
    >
    <span className="text-orange-600" >📋</span>
JSON
    </button>
    </div>
      )}
</div>
  );
};
