/**
 * نظام تحسين الطباعة
 * أنماط طباعة احترافية مع دعم RTL والعربية
 */

// ==================== أنماط الطباعة ====================
export const printStylesheet = `
@media print {
  /* إعدادات الصفحة */
  @page {
    size: A4;
    margin: 2cm;
    direction: rtl;
  }

  /* إخفاء العناصر غير المطلوبة */
  header,
  footer,
  nav,
  aside,
  .no-print,
  .sidebar,
  .navigation,
  .fab,
  .modal-overlay,
  button:not(.print-visible),
  input[type="button"],
  input[type="submit"],
  .scroll-progress,
  .cookie-banner,
  .toast,
  .notification-badge,
  .emoji-rating,
  .gamification-widget {
    display: none !important;
  }

  /* إظهار المحتوى المخفي للطباعة */
  .print-only {
    display: block !important;
  }

  /* إعدادات الخط */
  body {
    font-family: 'Cairo', 'Segoe UI', Arial, sans-serif !important;
    font-size: 12pt !important;
    line-height: 1.6 !important;
    color: #000 !important;
    background: #fff !important;
    direction: rtl !important;
  }

  /* العناوين */
  h1 {
    font-size: 18pt !important;
    font-weight: bold !important;
    margin-bottom: 12pt !important;
    color: #000 !important;
    border-bottom: 2px solid #000 !important;
    padding-bottom: 6pt !important;
  }

  h2 {
    font-size: 16pt !important;
    font-weight: bold !important;
    margin-bottom: 10pt !important;
    margin-top: 14pt !important;
    color: #000 !important;
  }

  h3 {
    font-size: 14pt !important;
    font-weight: bold !important;
    margin-bottom: 8pt !important;
    color: #333 !important;
  }

  /* الروابط */
  a {
    color: #000 !important;
    text-decoration: underline !important;
  }

  a[href]:after {
    content: " (" attr(href) ")";
    font-size: 10pt;
    color: #666;
  }

  a[href^="#"]:after,
  a[href^="javascript"]:after {
    content: "";
  }

  /* الجداول */
  table {
    width: 100% !important;
    border-collapse: collapse !important;
    margin: 12pt 0 !important;
    page-break-inside: avoid !important;
  }

  th, td {
    border: 1px solid #333 !important;
    padding: 8pt !important;
    text-align: right !important;
  }

  th {
    background-color: #f0f0f0 !important;
    font-weight: bold !important;
  }

  tr:nth-child(even) {
    background-color: #f9f9f9 !important;
  }

  /* البطاقات */
  .card,
  .ticket-card {
    border: 1px solid #333 !important;
    padding: 12pt !important;
    margin: 8pt 0 !important;
    page-break-inside: avoid !important;
    background: #fff !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }

  /* الصور */
  img {
    max-width: 100% !important;
    height: auto !important;
    page-break-inside: avoid !important;
  }

  /* منع كسر الصفحة داخل العناصر */
  .page-break-avoid {
    page-break-inside: avoid !important;
  }

  /* إجبار كسر الصفحة */
  .page-break-before {
    page-break-before: always !important;
  }

  .page-break-after {
    page-break-after: always !important;
  }

  /* الترويسة المطبوعة */
  .print-header {
    display: block !important;
    text-align: center !important;
    margin-bottom: 20pt !important;
    border-bottom: 2px solid #000 !important;
    padding-bottom: 10pt !important;
  }

  .print-header img {
    max-height: 60pt !important;
    margin-bottom: 8pt !important;
  }

  .print-header h1 {
    border: none !important;
    margin-bottom: 4pt !important;
  }

  /* التذييل المطبوع */
  .print-footer {
    display: block !important;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 10pt;
    border-top: 1px solid #333;
    padding-top: 8pt;
  }

  /* التوقيعات */
  .signature-area {
    display: flex !important;
    justify-content: space-between !important;
    margin-top: 40pt !important;
    page-break-inside: avoid !important;
  }

  .signature-box {
    width: 200pt !important;
    text-align: center !important;
    border-top: 1px solid #000 !important;
    padding-top: 8pt !important;
  }

  /* الحالات */
  .status-badge {
    padding: 4pt 8pt !important;
    border: 1px solid #000 !important;
    background: transparent !important;
    color: #000 !important;
  }

  /* QR Code */
  .qr-code {
    display: block !important;
    width: 80pt !important;
    height: 80pt !important;
    margin: 8pt auto !important;
  }

  /* أرقام الصفحات */
  .page-number:after {
    content: counter(page) " من " counter(pages);
    counter-increment: page;
  }

  /* محتوى منسق مسبقاً */
  pre, code {
    font-family: monospace !important;
    font-size: 10pt !important;
    background: #f5f5f5 !important;
    border: 1px solid #ddd !important;
    padding: 8pt !important;
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
  }

  /* القوائم */
  ul, ol {
    margin: 8pt 0 !important;
    padding-right: 20pt !important;
  }

  li {
    margin-bottom: 4pt !important;
  }
}
`;

// ==================== وظائف الطباعة ====================

/**
 * طباعة عنصر محدد
 */
export const printElement = (elementId: string, title?: string): void => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with id "${elementId}" not found`);
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
        return;
    }

    printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${title || 'طباعة'}</title>
      <style>${printStylesheet}</style>
      <style>
        body { padding: 20px; direction: rtl; }
      </style>
    </head>
    <body>
      ${element.outerHTML}
    </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
};

/**
 * طباعة تذكرة
 */
export const printTicket = (ticket: {
    id: string;
    fullName: string;
    nationalId: string;
    department: string;
    requestType: string;
    status: string;
    message: string;
    createdAt: Date;
    response?: string;
    directorateName?: string;
}): void => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
        return;
    }

    let directorateName = ticket.directorateName || "المديرية المالية";
    try {
         const saved = localStorage.getItem('site_config');
         if (saved) {
             const config = JSON.parse(saved);
             if (config.directorateName) directorateName = config.directorateName;
         }
    } catch {}

    const statusLabels: Record<string, string> = {
        'New': 'جديد',
        'InProgress': 'قيد المعالجة',
        'Answered': 'تم الرد',
        'Closed': 'مغلق'
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('ar-SY', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>تذكرة رقم ${ticket.id}</title>
      <style>
        ${printStylesheet}
        body {
          font-family: 'Cairo', Arial, sans-serif;
          padding: 40px;
          direction: rtl;
        }
        .print-container {
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          border-bottom: 3px double #000;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .header h2 {
          margin: 10px 0;
          font-size: 18px;
          color: #333;
        }
        .ticket-info {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        .info-item {
          border: 1px solid #ddd;
          padding: 12px;
          border-radius: 4px;
        }
        .info-label {
          font-weight: bold;
          color: #555;
          margin-bottom: 5px;
        }
        .info-value {
          font-size: 16px;
        }
        .message-section {
          margin-bottom: 30px;
        }
        .message-section h3 {
          border-bottom: 1px solid #000;
          padding-bottom: 8px;
          margin-bottom: 15px;
        }
        .message-content {
          background: #f9f9f9;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 4px;
          white-space: pre-wrap;
        }
        .footer {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
        }
        .signature-box {
          text-align: center;
          width: 200px;
        }
        .signature-line {
          border-top: 1px solid #000;
          margin-top: 60px;
          padding-top: 8px;
        }
        .status-badge {
          display: inline-block;
          padding: 5px 15px;
          border: 2px solid #000;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="print-container">
        <div class="header">
          <h1>الجمهورية العربية السورية</h1>
          <h2>${directorateName}</h2>
          <h2>نظام الاستعلامات والشكاوى</h2>
        </div>
        
        <div class="ticket-info">
          <div class="info-item">
            <div class="info-label">رقم التذكرة</div>
            <div class="info-value">${ticket.id}</div>
          </div>
          <div class="info-item">
            <div class="info-label">الحالة</div>
            <div class="info-value">
              <span class="status-badge">${statusLabels[ticket.status] || ticket.status}</span>
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">الاسم الكامل</div>
            <div class="info-value">${ticket.fullName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">الرقم الوطني</div>
            <div class="info-value">${ticket.nationalId}</div>
          </div>
          <div class="info-item">
            <div class="info-label">القسم</div>
            <div class="info-value">${ticket.department}</div>
          </div>
          <div class="info-item">
            <div class="info-label">نوع الطلب</div>
            <div class="info-value">${ticket.requestType}</div>
          </div>
          <div class="info-item" style="grid-column: span 2;">
            <div class="info-label">تاريخ الإنشاء</div>
            <div class="info-value">${formatDate(ticket.createdAt)}</div>
          </div>
        </div>
        
        <div class="message-section">
          <h3>نص الطلب</h3>
          <div class="message-content">${ticket.message}</div>
        </div>
        
        ${ticket.response ? `
        <div class="message-section">
          <h3>الرد</h3>
          <div class="message-content">${ticket.response}</div>
        </div>
        ` : ''}
        
        <div class="footer">
          <div class="signature-box">
            <div class="signature-line">توقيع الموظف المختص</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">ختم المديرية</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
};

/**
 * طباعة تقرير
 */
export const printReport = (content: {
    title: string;
    subtitle?: string;
    data: Array<Record<string, string | number>>;
    columns: Array<{ key: string; label: string }>;
    summary?: string;
}): void => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
        return;
    }

    const tableHeaders = content.columns.map(col => `<th>${col.label}</th>`).join('');
    const tableRows = content.data.map(row =>
        `<tr>${content.columns.map(col => `<td>${row[col.key] ?? ''}</td>`).join('')}</tr>`
    ).join('');

    printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${content.title}</title>
      <style>
        ${printStylesheet}
        body {
          font-family: 'Cairo', Arial, sans-serif;
          padding: 40px;
          direction: rtl;
        }
        .report-header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
        }
        .report-header h1 {
          margin: 0 0 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #333;
          padding: 10px;
          text-align: right;
        }
        th {
          background: #f0f0f0;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background: #f9f9f9;
        }
        .summary {
          margin-top: 30px;
          padding: 15px;
          background: #f5f5f5;
          border: 1px solid #ddd;
        }
        .print-date {
          text-align: left;
          font-size: 12px;
          color: #666;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="report-header">
        <h1>${content.title}</h1>
        ${content.subtitle ? `<h2>${content.subtitle}</h2>` : ''}
      </div>
      
      <table>
        <thead>
          <tr>${tableHeaders}</tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      ${content.summary ? `<div class="summary">${content.summary}</div>` : ''}
      
      <div class="print-date">
        تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SY', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })}
      </div>
    </body>
    </html>
  `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
};

/**
 * إضافة أنماط الطباعة للصفحة
 */
export const injectPrintStyles = (): void => {
    const styleId = 'print-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = printStylesheet;
    document.head.appendChild(style);
};

// حقن الأنماط عند التحميل
if (typeof window !== 'undefined') {
    injectPrintStyles();
}
