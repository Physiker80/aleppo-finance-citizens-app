// مولد PDF باستخدام القوالب المخصصة
import { Ticket } from '../types';
import { ArabicTextProcessor, prepareTextForPdf, formatArabicDate, wrapArabicText } from './arabicTextProcessor';
import { formatDate } from './arabicNumerals';

// دالة مساعدة لتحويل SVG إلى Canvas
async function svgToCanvas(svgDataUrl: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // رسم خلفية شفافة
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // تحويل إلى Data URL
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      } else {
        reject(new Error('فشل في إنشاء سياق Canvas'));
      }
    };
    img.onerror = () => reject(new Error('فشل في تحميل الصورة'));
    img.src = svgDataUrl;
  });
}

// دالة محسنة لتحويل النص العربي إلى صورة عالية الجودة مع معالجة أخطاء
function textToImageSync(text: string, fontSize: number = 16, fontFamily: string = 'Arial', color: string = '#000000'): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.warn('فشل في إنشاء سياق Canvas، استخدام نص بديل');
      throw new Error('فشل في إنشاء سياق Canvas');
    }
    
    // تحسين جودة الرسم
    const devicePixelRatio = window.devicePixelRatio || 1;
    const scaleFactor = Math.min(devicePixelRatio * 2, 4); // تحديد أقصى للدقة
    
    // معالجة النص مسبقاً
    const processedText = prepareTextForPdf(text);
    
    // التحقق من صحة النص
    if (!processedText || processedText.trim().length === 0) {
      console.warn('النص فارغ، إنشاء صورة فارغة');
      canvas.width = 100;
      canvas.height = 30;
      return canvas.toDataURL('image/png');
    }
    
    // إعداد الخط مع خطوط عربية أفضل
    const arabicFonts = `${fontFamily}, "Noto Sans Arabic", "Arabic UI Text", "Geeza Pro", "Baghdad", "Al Bayan", "Segoe UI", "Tahoma", sans-serif`;
    ctx.font = `${fontSize}px ${arabicFonts}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    
    // قياس النص
    const metrics = ctx.measureText(processedText);
    const textWidth = Math.max(metrics.width, 50); // حد أدنى للعرض
    const textHeight = Math.max(fontSize * 1.4, 20); // حد أدنى للارتفاع
  // تعيين حجم Canvas بدقة عالية
  const canvasWidth = Math.max(textWidth + 40, 150);
  const canvasHeight = Math.max(textHeight + 20, 40);
  
  canvas.width = canvasWidth * scaleFactor;
  canvas.height = canvasHeight * scaleFactor;
  canvas.style.width = canvasWidth + 'px';
  canvas.style.height = canvasHeight + 'px';
  
  // تطبيق تحجيم السياق
  ctx.scale(scaleFactor, scaleFactor);
  
  // إعادة تطبيق الإعدادات بعد تغيير حجم Canvas
  ctx.font = `${fontSize}px ${arabicFonts}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'right';
  ctx.direction = 'rtl';
  ctx.textBaseline = 'top';
  
  // تحسين جودة الرسم
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // رسم خلفية شفافة
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  // رسم النص
  ctx.fillText(processedText, canvasWidth - 20, fontSize * 0.2);
  
  return canvas.toDataURL('image/png', 1.0);
  
  } catch (error) {
    console.error('خطأ في textToImageSync:', error);
    // إنشاء صورة بديلة بسيطة
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, 200, 40);
      ctx.fillStyle = color;
      ctx.font = `${fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(text || 'نص', 100, 25);
    }
    return canvas.toDataURL('image/png');
  }
}

export interface PdfTemplate {
  id: string;
  name: string;
  type: 'ticket_confirmation' | 'ticket_report' | 'department_report' | 'monthly_report';
  header: {
    title: string;
    subtitle: string;
    logo: boolean;
    logoFile?: string; // Base64 string للوغو SVG
    logoFileName?: string; // اسم ملف اللوغو
    logoWidth?: number; // عرض اللوغو
    logoHeight?: number; // ارتفاع اللوغو
    logoSpacing?: number; // المسافة بين اللوغو والعنوان (بالبكسل)
    fontFamily?: string; // خط الهيدر
    titleFontSize?: number; // حجم خط العنوان الرئيسي
    subtitleFontSize?: number; // حجم خط العنوان الفرعي
  };
  content: {
    title: string;
    sections: Array<{
      label: string;
      field: string;
      style: {
        fontSize?: number;
        bold?: boolean;
        color?: string;
        multiline?: boolean;
      };
    }>;
  };
  footer: {
    text: string;
    subFooter?: string; // الفوتر الإضافي الفرعي
    separatorColor?: string; // لون الخط الفاصل
    separatorThickness?: string; // سمك الخط الفاصل
    qrCode: boolean;
    timestamp: boolean;
    fontFamily?: string; // خط الفوتر
    fontSize?: number; // حجم خط الفوتر
    subFooterFontSize?: number; // حجم خط الفوتر الفرعي
  };
  styling: {
    pageSize: 'A4' | 'A5' | 'Letter';
    margins: { top: number; right: number; bottom: number; left: number };
    fontFamily: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
  };
  approved?: boolean; // حالة اعتماد القالب
  approvedBy?: string; // من قام بالاعتماد
  approvedAt?: string; // تاريخ الاعتماد
  createdAt?: string;
  updatedAt?: string;
}

// الحصول على القوالب المحفوظة
export function getSavedTemplates(): PdfTemplate[] {
  try {
    const saved = localStorage.getItem('pdfTemplates');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading PDF templates:', error);
  }
  
  // إرجاع القالب الافتراضي في حالة عدم وجود قوالب محفوظة
  return [getDefaultTemplate()];
}

// الحصول على القالب الافتراضي
export function getDefaultTemplate(): PdfTemplate {
  // محاولة الحصول على اسم المديرية من الإعدادات
  let directorateName = 'المديرية المالية';
  try {
    const savedConfig = localStorage.getItem('site_config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      if (config.directorateName) {
        directorateName = config.directorateName;
      }
    }
  } catch (e) {
    console.warn('Failed to load site config from localStorage', e);
  }

  return {
    id: 'default-ticket',
    name: 'قالب إيصال الطلب الافتراضي',
    type: 'ticket_confirmation',
    header: {
      title: `الجمهورية العربية السورية\n${directorateName}`,
      subtitle: 'نظام الاستعلامات والشكاوى',
      logo: true,
      logoWidth: 60,
      logoHeight: 60,
      logoSpacing: 15,
      fontFamily: 'Fustat',
      titleFontSize: 18,
      subtitleFontSize: 14
    },
    content: {
      title: 'إيصال تقديم الطلب',
      sections: [
        { label: 'رقم الطلب:', field: 'id', style: { fontSize: 16, bold: true, color: '#0f3c35' } },
        { label: 'الاسم الكامل:', field: 'fullName', style: { fontSize: 12 } },
        { label: 'رقم الهاتف:', field: 'phone', style: { fontSize: 12 } },
        { label: 'البريد الإلكتروني:', field: 'email', style: { fontSize: 12 } },
        { label: 'الرقم الوطني:', field: 'nationalId', style: { fontSize: 12 } },
        { label: 'نوع الطلب:', field: 'requestType', style: { fontSize: 12, bold: true } },
        { label: 'القسم المختص:', field: 'department', style: { fontSize: 12, bold: true } },
        { label: 'تاريخ التقديم:', field: 'submissionDate', style: { fontSize: 12 } },
        { label: 'حالة الطلب:', field: 'status', style: { fontSize: 12, bold: true, color: '#2563eb' } },
        { label: 'تفاصيل الطلب:', field: 'details', style: { fontSize: 11, multiline: true } }
      ]
    },
    footer: {
      text: 'يرجى الاحتفاظ بهذا الإيصال لمتابعة طلبكم\nيمكنكم متابعة الطلب عبر الموقع الإلكتروني باستخدام رقم الطلب',
      subFooter: `${directorateName} - الجمهورية العربية السورية\nللاستفسارات: 011-1234567 | البريد: info@aleppo-finance.gov.sy`,
      separatorColor: '#10b981',
      separatorThickness: '2',
      qrCode: true,
      timestamp: true,
      fontFamily: 'Noto Naskh Arabic',
      fontSize: 11,
      subFooterFontSize: 9
    },
    styling: {
      pageSize: 'A4',
      margins: { top: 40, right: 40, bottom: 40, left: 40 },
      fontFamily: 'Arial',
      primaryColor: '#0f3c35',
      secondaryColor: '#64748b',
      backgroundColor: '#ffffff'
    }
  };
}

// الحصول على قالب حسب النوع (القوالب المعتمدة فقط)
export function getTemplateByType(type: PdfTemplate['type']): PdfTemplate | null {
  const templates = getSavedTemplates();
  // أولوية للقوالب المعتمدة، ثم غير المعتمدة كخيار احتياطي
  const approvedTemplate = templates.find(t => t.type === type && t.approved === true);
  if (approvedTemplate) return approvedTemplate;
  
  // إذا لم يجد قالب معتمد، يبحث عن أي قالب من نفس النوع
  return templates.find(t => t.type === type) || null;
}

// إنتاج PDF باستخدام القالب
export async function generatePdfFromTemplate(
  template: PdfTemplate, 
  data: Partial<Ticket> & Record<string, any>,
  options: {
    download?: boolean;
    filename?: string;
    returnBlob?: boolean;
  } = {}
): Promise<Blob | void> {
  try {
    // التحقق من صحة المدخلات
    if (!template) {
      throw new Error('لم يتم توفير قالب PDF');
    }
    
    if (!template.styling || !template.header || !template.content || !template.footer) {
      throw new Error('القالب غير مكتمل - يجب أن يحتوي على styling, header, content, و footer');
    }

    console.log('بدء إنتاج PDF باستخدام القالب:', template.name);

    // استيراد jsPDF بشكل ديناميكي
    const { jsPDF } = await import('jspdf');
    
    if (!jsPDF) {
      throw new Error('فشل في تحميل مكتبة jsPDF');
    }

    console.log('تم تحميل مكتبة jsPDF بنجاح');
    
    // إنشاء مستند PDF جديد
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: template.styling.pageSize.toLowerCase() as any
    });

    console.log('تم إنشاء مستند PDF بنجاح');

    // إعداد الخط مع دعم العربية
    try {
      // محاولة استخدام خط عربي إذا كان متوفراً
      pdf.setFont('arial', 'normal');
    } catch (error) {
      console.warn('فشل في تحميل خط عربي، استخدام الخط الافتراضي:', error);
      // استخدام Times كبديل أفضل للعربية من Helvetica
      try {
        pdf.setFont('times', 'normal');
      } catch (timesError) {
        pdf.setFont('helvetica', 'normal');
      }
    }
    
    // تفعيل دعم الـ Unicode 
    pdf.setFontSize(12);
    pdf.setTextColor(40, 40, 40);
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = template.styling.margins.left;
    let yPosition = template.styling.margins.top;

    // رسم الخلفية إذا كانت مطلوبة
    if (template.styling.backgroundColor !== '#ffffff') {
      pdf.setFillColor(template.styling.backgroundColor);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    }

    // رسم الهيدر
    if (template.header.logo && template.header.logoFile) {
      try {
        console.log('إضافة اللوغو إلى PDF...');
        
        const logoWidth = template.header.logoWidth || 60;
        const logoHeight = template.header.logoHeight || 60;
        const logoX = margin;
        const logoY = yPosition;
        
        // تحديد نوع الملف
        const isDataUrl = template.header.logoFile.startsWith('data:');
        
        if (isDataUrl) {
          // إذا كان SVG، نحوله إلى PNG
          if (template.header.logoFile.includes('svg')) {
            try {
              const pngDataUrl = await svgToCanvas(template.header.logoFile, logoWidth, logoHeight);
              pdf.addImage(pngDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
              console.log('تم إضافة اللوغو SVG بنجاح');
            } catch (svgError) {
              console.warn('فشل في تحويل SVG، محاولة إضافة مباشرة:', svgError);
              pdf.addImage(template.header.logoFile, 'PNG', logoX, logoY, logoWidth, logoHeight);
            }
          } else {
            // صورة عادية (PNG/JPG)
            const format = template.header.logoFile.includes('png') ? 'PNG' : 'JPEG';
            pdf.addImage(template.header.logoFile, format, logoX, logoY, logoWidth, logoHeight);
            console.log(`تم إضافة اللوغو ${format} بنجاح`);
          }
        }
        
        // تحديث موضع Y لتجنب تداخل النص
        const logoSpacing = template.header.logoSpacing || 15;
        yPosition += Math.max(logoHeight + logoSpacing, 30);
        
      } catch (error) {
        console.warn('فشل في إضافة اللوغو، استخدام النص البديل:', error);
        // النص البديل في حالة فشل تحميل اللوغو
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(template.styling.primaryColor);
        pdf.text('LOGO', margin, yPosition, { align: 'left' });
        const logoSpacing = template.header.logoSpacing || 15;
        yPosition += 20 + logoSpacing;
      }
    } else if (template.header.logo) {
      // النص البديل عند عدم وجود ملف لوغو
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(template.styling.primaryColor);
      pdf.text('LOGO', margin, yPosition, { align: 'left' });
      const logoSpacing = template.header.logoSpacing || 15;
      yPosition += 20 + logoSpacing;
    }

    // عنوان الهيدر
    pdf.setTextColor(template.styling.primaryColor);
    
    // إعداد خط الهيدر
    if (template.header.fontFamily) {
      pdf.setFont(template.header.fontFamily.split(',')[0].toLowerCase().replace(/\s+/g, ''), 'bold');
    } else {
      pdf.setFont('helvetica', 'bold');
    }
    
    pdf.setFontSize(template.header.titleFontSize || 16);
    const headerLines = prepareTextForPdf(template.header.title).split('\n');
    
    // إضافة النص كصورة إذا كان يحتوي على أحرف عربية
    for (const line of headerLines) {
      const processedLine = prepareTextForPdf(line);
      
      if (/[\u0600-\u06FF]/.test(processedLine)) {
        try {
          // إضافة النص العربي كصورة
          const textImage = textToImageSync(
            template.header.title, 
            template.header.titleFontSize || 16, 
            'Arial',
            template.styling.primaryColor
          );
          
          // إضافة الصورة إلى PDF
          const imageWidth = 300;
          const imageHeight = 30;
          pdf.addImage(textImage, 'PNG', pageWidth - margin - imageWidth, yPosition - 20, imageWidth, imageHeight);
          console.log('تم إضافة النص العربي كصورة');
        } catch (error) {
          console.warn('فشل في تحويل النص لصورة، استخدام النص المباشر:', error);
          pdf.text(processedLine, pageWidth - margin, yPosition, { 
            align: 'right',
            maxWidth: pageWidth - 2 * margin
          });
        }
      } else {
        // نص لاتيني - إضافة مباشرة
        pdf.text(processedLine, pageWidth - margin, yPosition, { 
          align: 'right',
          maxWidth: pageWidth - 2 * margin
        });
      }
      yPosition += 20;
    }

    // العنوان الفرعي
    if (template.header.fontFamily) {
      pdf.setFont(template.header.fontFamily.split(',')[0].toLowerCase().replace(/\s+/g, ''), 'normal');
    } else {
      pdf.setFont('helvetica', 'normal');
    }
    pdf.setFontSize(template.header.subtitleFontSize || 12);
    pdf.setTextColor(template.styling.secondaryColor);
    const subtitle = prepareTextForPdf(template.header.subtitle);
    
    if (/[\u0600-\u06FF]/.test(subtitle)) {
      try {
        const subtitleImage = textToImageSync(
          template.header.subtitle,
          template.header.subtitleFontSize || 12,
          'Arial',
          template.styling.secondaryColor
        );
        
        const imageWidth = 250;
        const imageHeight = 25;
        pdf.addImage(subtitleImage, 'PNG', pageWidth - margin - imageWidth, yPosition - 15, imageWidth, imageHeight);
      } catch (error) {
        console.warn('فشل في تحويل العنوان الفرعي لصورة:', error);
        pdf.text(subtitle, pageWidth - margin, yPosition, { 
          align: 'right',
          maxWidth: pageWidth - 2 * margin
        });
      }
    } else {
      pdf.text(subtitle, pageWidth - margin, yPosition, { 
        align: 'right',
        maxWidth: pageWidth - 2 * margin
      });
    }
    yPosition += 40;

    // خط فاصل
    pdf.setDrawColor(template.styling.primaryColor);
    pdf.setLineWidth(1);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 20;

    // عنوان المحتوى
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(template.styling.primaryColor);
    const contentTitle = prepareTextForPdf(template.content.title);
    
    if (/[\u0600-\u06FF]/.test(contentTitle)) {
      try {
        const titleImage = textToImageSync(
          template.content.title,
          18,
          'Arial',
          template.styling.primaryColor
        );
        
        const imageWidth = 350;
        const imageHeight = 30;
        pdf.addImage(titleImage, 'PNG', (pageWidth - imageWidth) / 2, yPosition - 20, imageWidth, imageHeight);
      } catch (error) {
        console.warn('فشل في تحويل عنوان المحتوى لصورة:', error);
        pdf.text(contentTitle, pageWidth / 2, yPosition, { 
          align: 'center',
          maxWidth: pageWidth - 2 * margin
        });
      }
    } else {
      pdf.text(contentTitle, pageWidth / 2, yPosition, { 
        align: 'center',
        maxWidth: pageWidth - 2 * margin
      });
    }
    yPosition += 40;

    // رسم الأقسام
    pdf.setTextColor('#000000');
    for (const section of template.content.sections) {
      // الحصول على القيمة من البيانات مع معالجة محسنة
      let value: string;
      
      // معالجة البيانات حسب نوع الحقل
      if (section.field === 'submissionDate' && data.submissionDate) {
        // تنسيق التاريخ بالأرقام العربية اللاتينية
        value = formatArabicDate(data.submissionDate);
      } else if (section.field === 'id') {
        // معالجة رقم الطلب
        value = String(data[section.field] || data.id || '—');
      } else if (section.field === 'department') {
        // معالجة اسم القسم
        value = String(data.department || '—');
      } else if (section.field === 'subject') {
        // معالجة موضوع الطلب
        value = String(data.subject || data.title || '—');
      } else if (section.field === 'description') {
        // معالجة وصف الطلب
        value = String(data.description || data.details || '—');
      } else if (section.field === 'status') {
        // معالجة حالة الطلب
        const statusMap: { [key: string]: string } = {
          'New': 'جديد',
          'InProgress': 'قيد المعالجة', 
          'Answered': 'تم الرد',
          'Closed': 'مغلق'
        };
        value = statusMap[String(data.status)] || String(data.status) || '—';
      } else if (section.field === 'priority') {
        // معالجة أولوية الطلب
        const priorityMap: { [key: string]: string } = {
          'low': 'منخفضة',
          'medium': 'متوسطة',
          'high': 'عالية',
          'urgent': 'عاجلة'
        };
        value = priorityMap[String(data.priority)] || String(data.priority) || '—';
      } else {
        // قيم أخرى
        value = String(data[section.field] || '—');
      }

      // معالجة النصوص العربية
      const processedLabel = prepareTextForPdf(section.label);
      const processedValue = prepareTextForPdf(value);

      // تطبيق الأنماط
      pdf.setFontSize(section.style.fontSize || 12);
      pdf.setFont('helvetica', section.style.bold ? 'bold' : 'normal');
      
      if (section.style.color) {
        pdf.setTextColor(section.style.color);
      }

      // رسم النص مع دعم العربية
      if (section.style.multiline && processedValue.length > 50) {
        // نص متعدد الأسطر
        pdf.setFont('helvetica', 'bold');
        
        // إضافة التسمية (Label) كصورة إذا كانت عربية مع تحسين التخطيط
        if (/[\u0600-\u06FF]/.test(processedLabel)) {
          try {
            const labelImage = textToImageSync(
              section.label,
              section.style.fontSize || 12,
              'Arial',
              section.style.color || '#000000'
            );
            
            const imageWidth = Math.min(250, pageWidth - 2 * margin);
            const imageHeight = 22;
            pdf.addImage(labelImage, 'PNG', pageWidth - margin - imageWidth, yPosition - 12, imageWidth, imageHeight);
          } catch (error) {
            pdf.text(processedLabel, pageWidth - margin - 10, yPosition, { 
              align: 'right',
              maxWidth: pageWidth - 2 * margin - 20
            });
          }
        } else {
          pdf.text(processedLabel, pageWidth - margin - 10, yPosition, { 
            align: 'right',
            maxWidth: pageWidth - 2 * margin - 20
          });
        }
        yPosition += 25;
        
        pdf.setFont('helvetica', 'normal');
        const lines = wrapArabicText(processedValue, pageWidth - 2 * margin - 40, pdf);
        
        for (const line of lines) {
          if (/[\u0600-\u06FF]/.test(line)) {
            try {
              const lineImage = textToImageSync(
                line,
                section.style.fontSize || 11,
                'Arial',
                section.style.color || '#333333'
              );
              
              const imageWidth = Math.min(450, pageWidth - 2 * margin - 40);
              const imageHeight = 16;
              pdf.addImage(lineImage, 'PNG', pageWidth - margin - imageWidth - 30, yPosition - 8, imageWidth, imageHeight);
            } catch (error) {
              pdf.text(prepareTextForPdf(line), pageWidth - margin - 30, yPosition, { 
                align: 'right',
                maxWidth: pageWidth - 2 * margin - 60
              });
            }
          } else {
            pdf.text(prepareTextForPdf(line), pageWidth - margin - 30, yPosition, { 
              align: 'right',
              maxWidth: pageWidth - 2 * margin - 40
            });
          }
          yPosition += 15;
        }
        yPosition += 10;
      } else {
        // نص في سطر واحد - عرض محسن مع تنسيق أفضل
        const isLabelArabic = /[\u0600-\u06FF]/.test(processedLabel);
        const isValueArabic = /[\u0600-\u06FF]/.test(processedValue);
        
        // رسم خط فاصل خفيف
        pdf.setDrawColor(230, 230, 230);
        pdf.line(margin, yPosition + 5, pageWidth - margin, yPosition + 5);
        pdf.setDrawColor(0, 0, 0);
        
        yPosition += 15;
        
        pdf.setFont('helvetica', 'bold');
        
        // إضافة التسمية كصورة إذا كانت عربية
        if (isLabelArabic) {
          try {
            const labelImage = textToImageSync(
              section.label,
              section.style.fontSize || 12,
              'Arial',
              section.style.color || '#2c3e50'
            );
            
            const imageWidth = Math.min(220, pageWidth / 2 - margin);
            const imageHeight = 16;
            pdf.addImage(labelImage, 'PNG', pageWidth - margin - imageWidth, yPosition - 8, imageWidth, imageHeight);
          } catch (error) {
            pdf.text(processedLabel, pageWidth - margin - 10, yPosition, { 
              align: 'right',
              maxWidth: pageWidth / 2 - margin - 20
            });
          }
        } else {
          pdf.text(processedLabel, pageWidth - margin - 10, yPosition, { 
            align: 'right',
            maxWidth: pageWidth / 2 - margin - 20
          });
        }
        
        pdf.setFont('helvetica', section.style.bold ? 'bold' : 'normal');
        pdf.setTextColor(section.style.color || '#34495e');
        
        // إضافة القيمة كصورة إذا كانت عربية
        if (isValueArabic) {
          try {
            const valueImage = textToImageSync(
              value,
              section.style.fontSize || 12,
              'Arial',
              section.style.color || '#34495e'
            );
            
            const imageWidth = Math.min(380, pageWidth / 2 - 20);
            const imageHeight = 16;
            pdf.addImage(valueImage, 'PNG', pageWidth / 2 - imageWidth + 20, yPosition - 8, imageWidth, imageHeight);
          } catch (error) {
            pdf.text(processedValue, pageWidth / 2, yPosition, { 
              align: 'left',
              maxWidth: pageWidth / 2 - margin - 20
            });
          }
        } else {
          pdf.text(processedValue, pageWidth / 2, yPosition, { 
            align: 'left',
            maxWidth: pageWidth / 2 - margin - 20
          });
        }
        yPosition += 25;
      }

      // إعادة تعيين اللون للأسود
      pdf.setTextColor('#000000');
    }

    // رسم QR Code محسن إذا كان مطلوباً
    if (template.footer.qrCode && data.id) {
      try {
        // إنشاء QR Code عالي الجودة
        const qrSize = 70;
        const qrX = pageWidth - margin - qrSize - 20;
        const qrY = pageHeight - template.styling.margins.bottom - qrSize - 80;
        
        // محاولة استخدام مكتبة QR Code إذا كانت متوفرة
        if (typeof (window as any).QRCode !== 'undefined') {
          try {
            // إنشاء QR Code باستخدام المكتبة
            const qrCanvas = document.createElement('canvas');
            const qrUrl = `${window.location.origin}/#/track?id=${data.id}`;
            
            // استخدام مكتبة qrcode-js أو مماثلة
            const QRCode = (window as any).QRCode;
            QRCode.toCanvas(qrCanvas, qrUrl, {
              width: qrSize * 2, // دقة مضاعفة
              margin: 1,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            }, (error: any) => {
              if (!error) {
                const qrDataUrl = qrCanvas.toDataURL('image/png');
                pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
                
                // إضافة نص توضيحي تحت QR Code
                pdf.setFontSize(8);
                pdf.setTextColor('#666666');
                pdf.text(`رقم الطلب: ${data.id}`, qrX + qrSize/2, qrY + qrSize + 12, { align: 'center' });
              }
            });
          } catch (qrError) {
            console.warn('فشل في إنشاء QR Code، استخدام البديل:', qrError);
            // رسم مربع بديل
            this.drawFallbackQR(pdf, qrX, qrY, qrSize, data.id);
          }
        } else {
          // رسم مربع بديل إذا لم تكن المكتبة متوفرة
          this.drawFallbackQR(pdf, qrX, qrY, qrSize, data.id);
        }
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    }

    // دالة مساعدة لرسم QR Code بديل
    function drawFallbackQR(pdf: any, x: number, y: number, size: number, id: string) {
      // رسم إطار QR Code
      pdf.setDrawColor('#000000');
      pdf.setLineWidth(2);
      pdf.rect(x, y, size, size);
      
      // رسم نمط QR Code مبسط
      const cellSize = size / 8;
      pdf.setFillColor('#000000');
      
      // نمط مبسط يشبه QR Code
      const pattern = [
        [1,1,1,0,0,1,1,1],
        [1,0,1,0,0,1,0,1],
        [1,0,1,0,0,1,0,1],
        [0,0,0,1,1,0,0,0],
        [0,1,1,0,0,1,1,0],
        [1,0,1,0,0,1,0,1],
        [1,0,1,0,0,1,0,1],
        [1,1,1,0,0,1,1,1]
      ];
      
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          if (pattern[row][col]) {
            pdf.rect(x + col * cellSize, y + row * cellSize, cellSize, cellSize, 'F');
          }
        }
      }
      
      // إضافة نص توضيحي
      pdf.setFontSize(8);
      pdf.setTextColor('#666666');
      pdf.text(`QR: ${id}`, x + size/2, y + size + 12, { align: 'center' });
    }

    // رسم الفوتر
    const footerY = pageHeight - template.styling.margins.bottom - 60;
    
    // إعداد خط الفوتر
    if (template.footer.fontFamily) {
      pdf.setFont(template.footer.fontFamily.split(',')[0].toLowerCase().replace(/\s+/g, ''), 'normal');
    } else {
      pdf.setFont('helvetica', 'normal');
    }
    
    pdf.setFontSize(template.footer.fontSize || 10);
    pdf.setTextColor(template.styling.secondaryColor);
    
    const footerLines = prepareTextForPdf(template.footer.text).split('\n');
    let currentFooterY = footerY;
    
    for (const line of footerLines) {
      const processedLine = prepareTextForPdf(line);
      
      if (/[\u0600-\u06FF]/.test(processedLine)) {
        try {
          const footerImage = textToImageSync(
            line,
            template.footer.fontSize || 10,
            'Arial',
            template.styling.secondaryColor
          );
          
          const imageWidth = 350;
          const imageHeight = 15;
          pdf.addImage(footerImage, 'PNG', (pageWidth - imageWidth) / 2, currentFooterY - 10, imageWidth, imageHeight);
        } catch (error) {
          pdf.text(processedLine, pageWidth / 2, currentFooterY, { 
            align: 'center',
            maxWidth: pageWidth - 2 * margin
          });
        }
      } else {
        pdf.text(processedLine, pageWidth / 2, currentFooterY, { 
          align: 'center',
          maxWidth: pageWidth - 2 * margin
        });
      }
      currentFooterY += 15;
    }

    // الفوتر الإضافي الفرعي مع الخط الأخضر الفاصل
    if (template.footer.subFooter) {
      // رسم الخط الأخضر الفاصل
      const separatorY = currentFooterY + 5;
      const separatorColor = template.footer.separatorColor || '#10b981';
      const separatorThickness = parseFloat(template.footer.separatorThickness || '2');
      
      // تحويل اللون من hex إلى RGB
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 16, g: 185, b: 129 }; // اللون الأخضر الافتراضي
      };
      
      const rgbColor = hexToRgb(separatorColor);
      pdf.setDrawColor(rgbColor.r, rgbColor.g, rgbColor.b);
      pdf.setLineWidth(separatorThickness);
      
      // رسم الخط المركز
      const lineWidth = (pageWidth - 2 * margin) * 0.8; // 80% من العرض
      const lineStartX = pageWidth / 2 - lineWidth / 2;
      const lineEndX = pageWidth / 2 + lineWidth / 2;
      pdf.line(lineStartX, separatorY, lineEndX, separatorY);
      
      // إضافة الفوتر الإضافي
      // إعداد خط الفوتر الإضافي
      if (template.footer.fontFamily) {
        pdf.setFont(template.footer.fontFamily.split(',')[0].toLowerCase().replace(/\s+/g, ''), 'normal');
      } else {
        pdf.setFont('helvetica', 'normal');
      }
      
      pdf.setFontSize(template.footer.subFooterFontSize || 9);
      pdf.setTextColor(template.styling.secondaryColor);
      const subFooterLines = prepareTextForPdf(template.footer.subFooter).split('\n');
      let subFooterY = separatorY + 10;
      
      for (const line of subFooterLines) {
        const processedLine = prepareTextForPdf(line);
        
        if (/[\u0600-\u06FF]/.test(processedLine)) {
          try {
            const subFooterImage = textToImageSync(
              line,
              template.footer.subFooterFontSize || 9,
              'Arial',
              template.styling.secondaryColor
            );
            
            const imageWidth = 300;
            const imageHeight = 12;
            pdf.addImage(subFooterImage, 'PNG', (pageWidth - imageWidth) / 2, subFooterY - 8, imageWidth, imageHeight);
          } catch (error) {
            pdf.text(processedLine, pageWidth / 2, subFooterY, { 
              align: 'center',
              maxWidth: pageWidth - 2 * margin
            });
          }
        } else {
          pdf.text(processedLine, pageWidth / 2, subFooterY, { 
            align: 'center',
            maxWidth: pageWidth - 2 * margin
          });
        }
        subFooterY += 12;
      }
      
      currentFooterY = subFooterY;
    }

    // الطابع الزمني المحسن
    if (template.footer.timestamp) {
      pdf.setFontSize(8);
      pdf.setTextColor('#888888');
      
      // إنشاء طابع زمني مفصل بالعربية مع الأرقام اللاتينية
      const now = new Date();
      const timestamp = `تم الإصدار: ${formatArabicDate(now)}`;
      const processedTimestamp = prepareTextForPdf(timestamp);
      
      if (/[\u0600-\u06FF]/.test(processedTimestamp)) {
        try {
          const timestampImage = textToImageSync(
            timestamp,
            8,
            'Arial',
            '#888888'
          );
          
          const imageWidth = 250;
          const imageHeight = 10;
          pdf.addImage(timestampImage, 'PNG', margin, pageHeight - 15, imageWidth, imageHeight);
        } catch (error) {
          pdf.text(processedTimestamp, margin + 5, pageHeight - 10, { 
            align: 'left',
            maxWidth: pageWidth - 2 * margin
          });
        }
      } else {
        pdf.text(processedTimestamp, margin + 5, pageHeight - 10, { 
          align: 'left',
          maxWidth: pageWidth - 2 * margin
        });
      }
      
      // إضافة رقم الصفحة إذا كان مطلوباً
      const pageNumber = `صفحة ١ من ١`;
      const processedPageNumber = prepareTextForPdf(pageNumber);
      
      if (/[\u0600-\u06FF]/.test(processedPageNumber)) {
        try {
          const pageImage = textToImageSync(
            pageNumber,
            8,
            'Arial',
            '#888888'
          );
          
          const imageWidth = 80;
          const imageHeight = 10;
          pdf.addImage(pageImage, 'PNG', pageWidth - margin - imageWidth, pageHeight - 15, imageWidth, imageHeight);
        } catch (error) {
          pdf.text(processedPageNumber, pageWidth - margin - 5, pageHeight - 10, { 
            align: 'right',
            maxWidth: 100
          });
        }
      } else {
        pdf.text(processedPageNumber, pageWidth - margin - 5, pageHeight - 10, { 
          align: 'right',
          maxWidth: 100
        });
      }
    }

    // خط فاصل في الأسفل
    pdf.setDrawColor(template.styling.primaryColor);
    pdf.setLineWidth(0.5);
    pdf.line(margin, pageHeight - template.styling.margins.bottom, pageWidth - margin, pageHeight - template.styling.margins.bottom);

    // إرجاع النتيجة حسب الخيارات
    console.log('معالجة خيارات الإخراج...');
    
    if (options.returnBlob) {
      console.log('إرجاع PDF كـ blob');
      return pdf.output('blob');
    }

    if (options.download) {
      console.log('تنزيل PDF');
      const filename = options.filename || `${template.name}-${data.id || Date.now()}.pdf`;
      pdf.save(filename);
      return;
    }

    // افتراضياً: عرض في نافذة جديدة مع معالجة أخطاء محسنة
    console.log('عرض PDF في نافذة جديدة');
    
    try {
      const dataUri = pdf.output('datauristring');
      
      // التحقق من صحة dataUri
      if (!dataUri || dataUri.length < 100) {
        throw new Error('dataUri فارغ أو معطوب');
      }
      
      console.log('تم إنشاء dataUri بنجاح، الطول:', dataUri.length);
      
      const newWindow = window.open('', '_blank');
      if (!newWindow) {
        // إذا فشل فتح النافذة، جرب التنزيل المباشر
        console.warn('فشل في فتح نافذة جديدة، التنزيل المباشر...');
        const filename = options.filename || `${template.name}-${data.id || Date.now()}.pdf`;
        pdf.save(filename);
        return;
      }
      
      newWindow.document.write(`
        <html>
          <head>
            <title>${template.name} - ${data.id}</title>
            <meta charset="UTF-8">
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: Arial, sans-serif; 
                background: #f5f5f5;
                direction: rtl;
                text-align: right;
              }
              .header { 
                text-align: center; 
                margin-bottom: 20px; 
                background: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .loading {
                text-align: center;
                padding: 20px;
                color: #666;
              }
              iframe { 
                width: 100%; 
                height: 75vh; 
                border: 1px solid #ccc; 
                border-radius: 8px;
                background: white;
              }
              .error {
                background: #ffe6e6;
                border: 1px solid #ff9999;
                color: #cc0000;
                padding: 15px;
                border-radius: 8px;
                margin: 10px 0;
                text-align: center;
              }
              .buttons {
                text-align: center;
                margin: 10px 0;
              }
              button {
                padding: 8px 16px;
                background: #0f3c35;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                margin: 0 5px;
                font-size: 14px;
              }
              button:hover {
                background: #1a5a4f;
              }
              .download-btn {
                background: #28a745;
              }
              .download-btn:hover {
                background: #218838;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${template.name}</h2>
              <p>رقم الطلب: ${data.id || 'غير محدد'}</p>
              <div class="buttons">
                <button onclick="window.print()">🖨️ طباعة</button>
                <button onclick="downloadPdf()" class="download-btn">⬇️ تحميل</button>
                <button onclick="window.close()">❌ إغلاق</button>
              </div>
            </div>
            
            <div id="loading" class="loading">
              ⏳ جاري تحميل PDF...
            </div>
            
            <div id="error" class="error" style="display: none;">
              ❌ حدث خطأ في تحميل PDF. 
              <button onclick="location.reload()">🔄 إعادة المحاولة</button>
            </div>
            
            <iframe id="pdfFrame" src="${dataUri}" style="display: none;" onload="showPdf()" onerror="showError()"></iframe>
            
            <script>
              function showPdf() {
                console.log('PDF loaded successfully');
                document.getElementById('loading').style.display = 'none';
                document.getElementById('pdfFrame').style.display = 'block';
              }
              
              function showError() {
                console.error('Failed to load PDF');
                document.getElementById('loading').style.display = 'none';
                document.getElementById('error').style.display = 'block';
              }
              
              function downloadPdf() {
                try {
                  const link = document.createElement('a');
                  link.href = '${dataUri}';
                  link.download = '${template.name}-${data.id || Date.now()}.pdf';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } catch (error) {
                  console.error('Download failed:', error);
                  alert('فشل في تحميل الملف');
                }
              }
              
              // تحقق من تحميل PDF بعد 5 ثوانِ
              setTimeout(() => {
                const iframe = document.getElementById('pdfFrame');
                const loading = document.getElementById('loading');
                if (loading.style.display !== 'none') {
                  showError();
                }
              }, 5000);
            </script>
          </body>
        </html>
      `);
      
      console.log('تم عرض PDF بنجاح');
      
    } catch (dataUriError) {
      console.error('خطأ في إنشاء dataUri:', dataUriError);
      
      // حاول التنزيل المباشر كبديل
      console.log('محاولة التنزيل المباشر كبديل...');
      try {
        const filename = options.filename || `${template.name}-${data.id || Date.now()}.pdf`;
        pdf.save(filename);
        console.log('تم التنزيل المباشر بنجاح');
        
        // عرض رسالة للمستخدم
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head><title>تم التنزيل</title></head>
              <body style="padding: 40px; text-align: center; font-family: Arial; direction: rtl;">
                <h2>✅ تم تنزيل الملف بنجاح</h2>
                <p>تحقق من مجلد التحميلات في متصفحك</p>
                <button onclick="window.close()" style="padding: 10px 20px; background: #0f3c35; color: white; border: none; border-radius: 4px;">إغلاق</button>
              </body>
            </html>
          `);
        }
      } catch (downloadError) {
        console.error('فشل في التنزيل المباشر أيضاً:', downloadError);
        throw new Error('فشل في عرض أو تنزيل PDF');
      }
    }

  } catch (error) {
    console.error('خطأ في إنتاج PDF:', error);
    throw error;
  }
}

// دالة مساعدة لرسم QR Code بديل
function drawFallbackQR(pdf: any, x: number, y: number, size: number, id: string) {
  // رسم إطار QR Code
  pdf.setDrawColor('#000000');
  pdf.setLineWidth(2);
  pdf.rect(x, y, size, size);
  
  // رسم نمط QR Code مبسط
  const cellSize = size / 8;
  pdf.setFillColor('#000000');
  
  // نمط مبسط يشبه QR Code
  const pattern = [
    [1,1,1,0,0,1,1,1],
    [1,0,1,0,0,1,0,1],
    [1,0,1,0,0,1,0,1],
    [0,0,0,1,1,0,0,0],
    [0,1,1,0,0,1,1,0],
    [1,0,1,0,0,1,0,1],
    [1,0,1,0,0,1,0,1],
    [1,1,1,0,0,1,1,1]
  ];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (pattern[row][col]) {
        pdf.rect(x + col * cellSize, y + row * cellSize, cellSize, cellSize, 'F');
      }
    }
  }
  
  // إضافة نص توضيحي
  pdf.setFontSize(8);
  pdf.setTextColor('#666666');
  pdf.text(`QR: ${id}`, x + size/2, y + size + 12, { align: 'center' });
}

// دالة مبسطة لإنتاج معاينة PDF
export async function generateSimplePreview(
  template: PdfTemplate, 
  data: Record<string, any>
): Promise<void> {
  try {
    console.log('بدء إنتاج معاينة مبسطة...');
    
    // التحقق من البيانات الأساسية
    if (!template?.name) {
      throw new Error('اسم القالب مطلوب');
    }

    // محاولة استخدام الدالة الرئيسية أولاً
    try {
      await generatePdfFromTemplate(template, data, {
        filename: `preview-${template.name}.pdf`
      });
      return;
    } catch (mainError) {
      console.warn('فشل في الطريقة الرئيسية، جاري المحاولة بطريقة مبسطة:', mainError);
    }

    // طريقة بديلة مبسطة باستخدام alert
    const previewText = `
معاينة القالب: ${template.name}
================

البيانات التجريبية:
- الرقم: ${data.id || 'غير محدد'}
- الاسم: ${data.fullName || 'غير محدد'}
- القسم: ${data.department || 'غير محدد'}
- التاريخ: ${data.submissionDate ? formatDate(new Date(data.submissionDate)) : 'غير محدد'}

إعدادات القالب:
- حجم الصفحة: ${template.styling?.pageSize || 'A4'}
- اللون الرئيسي: ${template.styling?.primaryColor || '#000000'}
- عنوان الهيدر: ${template.header?.title || 'غير محدد'}
- نص الفوتر: ${template.footer?.text ? 'موجود' : 'غير موجود'}

ملاحظة: هذه معاينة نصية مبسطة. لمعاينة PDF كاملة، تأكد من تحميل المتصفح لمكتبات PDF بشكل صحيح.
    `.trim();

    // عرض المعاينة في نافذة منبثقة
    if (confirm(`${previewText}\n\nهل تريد محاولة إنتاج PDF مرة أخرى؟`)) {
      // محاولة أخيرة
      await generatePdfFromTemplate(template, data, {
        filename: `retry-preview-${template.name}.pdf`
      });
    }

  } catch (error) {
    console.error('خطأ في المعاينة المبسطة:', error);
    throw new Error(`فشل في إنتاج المعاينة: ${error instanceof Error ? error.message : 'خطأ غير محدد'}`);
  }
}

// إنتاج PDF للطلب باستخدام القالب الافتراضي (يفضل القوالب المعتمدة)
export async function generateTicketPdf(ticket: Ticket, templateId?: string): Promise<void> {
  const templates = getSavedTemplates();
  let template: PdfTemplate;
  
  if (templateId) {
    template = templates.find(t => t.id === templateId) || getDefaultTemplate();
  } else {
    // البحث عن قالب معتمد أولاً
    const approvedTemplate = templates.find(t => t.type === 'ticket_confirmation' && t.approved === true);
    template = approvedTemplate || getTemplateByType('ticket_confirmation') || getDefaultTemplate();
  }

  const data = {
    ...ticket,
    submissionDate: ticket.submissionDate
  };

  await generatePdfFromTemplate(template, data, {
    filename: `ايصال-الطلب-${ticket.id}.pdf`
  });
}

// حفظ قالب جديد
export function saveTemplate(template: PdfTemplate): void {
  try {
    const templates = getSavedTemplates();
    const existingIndex = templates.findIndex(t => t.id === template.id);
    
    if (existingIndex >= 0) {
      templates[existingIndex] = { ...template, updatedAt: new Date().toISOString() };
    } else {
      templates.push({ ...template, createdAt: new Date().toISOString() });
    }
    
    localStorage.setItem('pdfTemplates', JSON.stringify(templates));
  } catch (error) {
    console.error('Error saving template:', error);
    throw new Error('فشل في حفظ القالب');
  }
}

// اعتماد قالب
export function approveTemplate(templateId: string, approvedBy: string): void {
  try {
    const templates = getSavedTemplates();
    const templateIndex = templates.findIndex(t => t.id === templateId);
    
    if (templateIndex >= 0) {
      templates[templateIndex] = {
        ...templates[templateIndex],
        approved: true,
        approvedBy,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('pdfTemplates', JSON.stringify(templates));
    } else {
      throw new Error('القالب غير موجود');
    }
  } catch (error) {
    console.error('Error approving template:', error);
    throw new Error('فشل في اعتماد القالب');
  }
}

// إلغاء اعتماد قالب
export function unapproveTemplate(templateId: string): void {
  try {
    const templates = getSavedTemplates();
    const templateIndex = templates.findIndex(t => t.id === templateId);
    
    if (templateIndex >= 0) {
      templates[templateIndex] = {
        ...templates[templateIndex],
        approved: false,
        approvedBy: undefined,
        approvedAt: undefined,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('pdfTemplates', JSON.stringify(templates));
    } else {
      throw new Error('القالب غير موجود');
    }
  } catch (error) {
    console.error('Error unapproving template:', error);
    throw new Error('فشل في إلغاء اعتماد القالب');
  }
}

// حذف قالب
export function deleteTemplate(templateId: string): void {
  try {
    const templates = getSavedTemplates();
    const filtered = templates.filter(t => t.id !== templateId);
    localStorage.setItem('pdfTemplates', JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting template:', error);
    throw new Error('فشل في حذف القالب');
  }
}

// تصدير قالب إلى ملف JSON
export function exportTemplate(template: PdfTemplate): void {
  try {
    // محاولة الحصول على اسم المديرية
    let directorateName = 'المديرية المالية';
    try {
      const savedConfig = localStorage.getItem('site_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config.directorateName) {
          directorateName = config.directorateName;
        }
      }
    } catch (e) {
      // تجاهل الخطأ واستخدام الافتراضي
    }

    // إضافة معلومات التصدير
    const exportData = {
      ...template,
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      metadata: {
        exportedBy: `نظام ${directorateName}`,
        isApproved: template.approved || false,
        approvalStatus: template.approved ? 'معتمد' : 'غير معتمد',
        templateVersion: template.updatedAt || template.createdAt || new Date().toISOString()
      }
    };
    
    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const approvalPrefix = template.approved ? 'معتمد' : 'مسودة';
    const timestamp = formatDate(new Date(), { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    link.download = `${approvalPrefix}-قالب-${template.name.replace(/\s+/g, '-')}-${timestamp}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting template:', error);
    throw new Error('فشل في تصدير القالب');
  }
}

// استيراد قالب من ملف JSON
export function importTemplate(file: File): Promise<PdfTemplate> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const template = JSON.parse(content) as PdfTemplate;
        
        // التحقق من صحة القالب
        if (!template.id || !template.name || !template.type) {
          throw new Error('Invalid template format');
        }
        
        // إنشاء ID جديد لتجنب التضارب
        template.id = `imported-${Date.now()}`;
        template.name = `${template.name} (مستورد)`;
        
        resolve(template);
      } catch (error) {
        reject(new Error('فشل في قراءة ملف القالب'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('فشل في قراءة الملف'));
    };
    
    reader.readAsText(file);
  });
}

// دالة تشخيص النظام والتحقق من مشاكل PDF
export async function diagnoseSystem(): Promise<string[]> {
  const diagnostics: string[] = [];
  
  try {
    // فحص jsPDF
    try {
      const { jsPDF } = await import('jspdf');
      diagnostics.push('✅ مكتبة jsPDF: متوفرة');
      
      // اختبار إنشاء PDF بسيط
      const testPdf = new jsPDF();
      testPdf.text('اختبار', 10, 10);
      diagnostics.push('✅ إنشاء PDF تجريبي: نجح');
      
      // اختبار الألوان
      testPdf.setTextColor('#ff0000');
      diagnostics.push('✅ دعم الألوان: متوفر');
      
      // اختبار الخطوط
      testPdf.setFont('helvetica', 'bold');
      diagnostics.push('✅ دعم الخطوط: متوفر');
      
    } catch (error) {
      diagnostics.push(`❌ مكتبة jsPDF: غير متوفرة - ${error}`);
    }
    
    // فحص القوالب المحفوظة
    try {
      const templates = getSavedTemplates();
      diagnostics.push(`✅ القوالب المحفوظة: ${templates.length} قالب`);
      
      templates.forEach((template, index) => {
        if (template.styling && template.header && template.footer) {
          diagnostics.push(`✅ القالب ${index + 1}: ${template.name} - مكتمل`);
          
          // فحص اللوغو
          if (template.header.logo && template.header.logoFile) {
            const logoSize = template.header.logoFile.length;
            const logoType = template.header.logoFile.includes('svg') ? 'SVG' : 
                           template.header.logoFile.includes('png') ? 'PNG' : 'أخرى';
            const logoSpacing = template.header.logoSpacing || 15;
            diagnostics.push(`  └── لوغو: ${logoType} (${Math.round(logoSize/1024)}KB) - مسافة: ${logoSpacing}px`);
          } else if (template.header.logo) {
            const logoSpacing = template.header.logoSpacing || 15;
            diagnostics.push(`  └── لوغو: مفعل (لا يوجد ملف) - مسافة: ${logoSpacing}px`);
          }
        } else {
          diagnostics.push(`❌ القالب ${index + 1}: ${template.name} - غير مكتمل`);
        }
      });
      
    } catch (error) {
      diagnostics.push(`❌ فحص القوالب: فشل - ${error}`);
    }
    
    // فحص المتصفح والبيئة
    diagnostics.push(`✅ المتصفح: ${navigator.userAgent.split(' ')[0]}`);
    diagnostics.push(`✅ JavaScript: مفعل`);
    diagnostics.push(`✅ LocalStorage: ${typeof Storage !== "undefined" ? 'مدعوم' : 'غير مدعوم'}`);
    diagnostics.push(`✅ النوافذ المنبثقة: ${typeof window.open === 'function' ? 'مدعومة' : 'غير مدعومة'}`);
    diagnostics.push(`✅ Canvas: ${typeof HTMLCanvasElement !== 'undefined' ? 'مدعوم' : 'غير مدعوم'}`);
    diagnostics.push(`✅ FileReader: ${typeof FileReader !== 'undefined' ? 'مدعوم' : 'غير مدعوم'}`);
    
    // فحص دعم الصور
    try {
      const testImg = new Image();
      diagnostics.push(`✅ معالجة الصور: مدعوم`);
    } catch {
      diagnostics.push(`❌ معالجة الصور: غير مدعوم`);
    }
    // فحص الخطوط العربية
    const arabicFonts = ['Amiri', 'Scheherazade New', 'Aref Ruqaa', 'Lateef', 'Reem Kufi'];
    let loadedFonts = 0;
    arabicFonts.forEach(font => {
      if (document.fonts && document.fonts.check && document.fonts.check(`12px "${font}"`)) {
        loadedFonts++;
      }
    });
    diagnostics.push(`✅ الخطوط العربية: ${loadedFonts}/${arabicFonts.length} محملة`);
    
    // اختبار معالج النصوص العربية
    try {
      const testText = prepareTextForPdf('اختبار النص العربي');
      if (testText) {
        diagnostics.push('✅ معالج النصوص العربية: يعمل بشكل صحيح');
      } else {
        diagnostics.push('❌ معالج النصوص العربية: لا يعمل');
      }
    } catch (error) {
      diagnostics.push(`❌ معالج النصوص العربية: خطأ - ${error}`);
    }
    
  } catch (error) {
    diagnostics.push(`❌ خطأ عام في التشخيص: ${error}`);
  }
  
  return diagnostics;
}