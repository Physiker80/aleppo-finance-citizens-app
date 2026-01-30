// مساعد معالجة النصوص العربية في PDF
export class ArabicTextProcessor {
  
  /**
   * معالجة النص العربي لتحسين عرضه في PDF
   */
  static processText(text: string): string {
    if (!text) return '';
    
    return text
      // إزالة أحرف التحكم في الاتجاه
      .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
      // تحويل المسافة غير المنقطعة إلى مسافة عادية
      .replace(/\u00A0/g, ' ')
      // إزالة المسافات الزائدة
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * تحويل النص العربي إلى تمثيل لاتيني للعرض في PDF
   */
  static arabicToLatin(text: string): string {
    if (!text) return '';
    
    // خريطة الحروف العربية إلى مكافئات لاتينية تقريبية
    const arabicToLatinMap: { [key: string]: string } = {
      'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa',
      'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j',
      'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'th',
      'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
      'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z',
      'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
      'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
      'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a',
      'ء': '', 'ة': 'h', 'ئ': 'y', 'ؤ': 'w'
    };
    
    return text.replace(/[\u0600-\u06FF]/g, (char) => {
      return arabicToLatinMap[char] || char;
    });
  }

  /**
   * تقسيم النص الطويل إلى أسطر مع الحفاظ على الكلمات
   */
  static wrapText(text: string, maxWidth: number, pdf: any): string[] {
    const processedText = ArabicTextProcessor.processText(text);
    if (!processedText) return [''];

    // استخدام دالة jsPDF لتقسيم النص
    try {
      const lines = pdf.splitTextToSize(processedText, maxWidth);
      return lines.map((line: string) => ArabicTextProcessor.processText(line));
    } catch (error) {
      // في حالة فشل التقسيم التلقائي، نقوم بالتقسيم اليدوي
      return ArabicTextProcessor.manualWrapText(processedText, maxWidth, pdf);
    }
  }

  /**
   * تقسيم النص يدوياً إذا فشلت الطريقة التلقائية
   */
  private static manualWrapText(text: string, maxWidth: number, pdf: any): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      try {
        const lineWidth = pdf.getTextWidth(testLine);
        if (lineWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            // الكلمة طويلة جداً، نضطر لتقسيمها
            lines.push(word);
          }
        }
      } catch (error) {
        // في حالة فشل قياس العرض، نستخدم تقدير تقريبي
        if (testLine.length * 6 <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [''];
  }

  /**
   * تنسيق الأرقام العربية مع الأرقام اللاتينية
   */
  static formatNumbers(text: string): string {
    return ArabicTextProcessor.processText(text)
      // تحويل الأرقام العربية إلى لاتينية للوضوح في PDF
      .replace(/[٠١٢٣٤٥٦٧٨٩]/g, (match) => {
        const arabicNums = '٠١٢٣٤٥٦٧٨٩';
        const latinNums = '0123456789';
        return latinNums[arabicNums.indexOf(match)];
      });
  }

  /**
   * تنظيف النص من الأحرف الخاصة التي قد تسبب مشاكل
   */
  static sanitizeForPdf(text: string): string {
    return ArabicTextProcessor.processText(text)
      // إزالة الأحرف غير المرئية
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // تطبيع علامات الترقيم
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      // تنظيف الأقواس
      .replace(/[（）]/g, (match) => match === '（' ? '(' : ')')
      .replace(/[［］]/g, (match) => match === '［' ? '[' : ']');
  }

  /**
   * تحسين عرض التواريخ العربية
   */
  static formatArabicDate(date: Date | string): string {
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return ArabicTextProcessor.formatNumbers(
        dateObj.toLocaleString('ar-SY-u-nu-latn', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      );
    } catch (error) {
      return ArabicTextProcessor.processText(String(date));
    }
  }

  /**
   * تحضير النص للعرض النهائي في PDF
   */
  static prepareForPdf(text: string | null | undefined): string {
    if (!text) return '';
    
    let processedText = ArabicTextProcessor.processText(text);
    
    // تطبيق تنسيق الأرقام والتنظيف
    processedText = ArabicTextProcessor.sanitizeForPdf(
      ArabicTextProcessor.formatNumbers(processedText)
    );
    
    // إرجاع النص العربي الأصلي بدون تحويل لاتيني
    // لتحسين جودة العرض في PDF
    return processedText;
  }
}

// تصدير الدوال كوظائف مستقلة أيضاً للسهولة
export const processArabicText = ArabicTextProcessor.processText;
export const wrapArabicText = ArabicTextProcessor.wrapText;
export const formatArabicNumbers = ArabicTextProcessor.formatNumbers;
export const sanitizeArabicText = ArabicTextProcessor.sanitizeForPdf;
export const formatArabicDate = ArabicTextProcessor.formatArabicDate;
export const prepareTextForPdf = ArabicTextProcessor.prepareForPdf;