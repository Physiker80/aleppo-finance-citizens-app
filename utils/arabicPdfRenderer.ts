// حل بديل لعرض النصوص العربية في PDF
export class ArabicPdfRenderer {
  
  /**
   * إنشاء Canvas مؤقت لعرض النص العربي وتحويله لصورة
   */
  static async renderArabicTextAsImage(
    text: string, 
    options: {
      fontSize?: number;
      fontWeight?: string;
      color?: string;
      maxWidth?: number;
      textAlign?: 'right' | 'center' | 'left';
      backgroundColor?: string;
    } = {}
  ): Promise<string | null> {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const fontSize = options.fontSize || 12;
      const fontWeight = options.fontWeight || 'normal';
      const color = options.color || '#000000';
      const backgroundColor = options.backgroundColor || 'transparent';
      const textAlign = options.textAlign || 'right';
      const maxWidth = options.maxWidth || 400;

      // إعداد الخط
      ctx.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
      ctx.textAlign = textAlign;
      ctx.textBaseline = 'top';
      ctx.fillStyle = color;
      ctx.direction = 'rtl';

      // قياس النص
      const metrics = ctx.measureText(text);
      const textWidth = Math.min(metrics.width, maxWidth);
      const textHeight = fontSize * 1.4; // ارتفاع تقريبي مع مساحة إضافية

      // تحديد حجم Canvas
      canvas.width = Math.max(textWidth + 20, 100);
      canvas.height = textHeight + 10;

      // إعادة تطبيق الإعدادات بعد تغيير حجم Canvas
      ctx.font = `${fontWeight} ${fontSize}px Arial, sans-serif`;
      ctx.textAlign = textAlign;
      ctx.textBaseline = 'top';
      ctx.direction = 'rtl';

      // رسم الخلفية إذا كانت مطلوبة
      if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // رسم النص
      ctx.fillStyle = color;
      const x = textAlign === 'right' ? canvas.width - 10 : 
                textAlign === 'center' ? canvas.width / 2 : 10;
      ctx.fillText(text, x, 5);

      // تحويل لـ base64
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error rendering Arabic text as image:', error);
      return null;
    }
  }

  /**
   * رسم نص عربي في PDF باستخدام الصور عند الحاجة
   */
  static async addArabicTextToPdf(
    pdf: any,
    text: string,
    x: number,
    y: number,
    options: {
      fontSize?: number;
      fontWeight?: string;
      color?: string;
      maxWidth?: number;
      align?: 'right' | 'center' | 'left';
      fallbackToRegularText?: boolean;
    } = {}
  ): Promise<number> {
    const fallbackToRegularText = options.fallbackToRegularText !== false;

    try {
      // محاولة عرض النص كصورة أولاً
      const imageData = await this.renderArabicTextAsImage(text, {
        fontSize: options.fontSize || 12,
        fontWeight: options.fontWeight || 'normal',
        color: options.color || '#000000',
        maxWidth: options.maxWidth || 400,
        textAlign: options.align || 'right'
      });

      if (imageData) {
        // إضافة الصورة للـ PDF
        const imgHeight = (options.fontSize || 12) * 1.2;
        const imgWidth = Math.min(options.maxWidth || 400, pdf.internal.pageSize.getWidth() - 2 * x);
        
        pdf.addImage(imageData, 'PNG', x - imgWidth, y, imgWidth, imgHeight);
        return y + imgHeight + 5; // إرجاع الموضع الجديد
      }
    } catch (error) {
      console.error('Error adding Arabic text as image:', error);
    }

    // في حالة فشل الصورة، استخدم النص العادي كبديل
    if (fallbackToRegularText) {
      pdf.setFontSize(options.fontSize || 12);
      pdf.setFont('helvetica', options.fontWeight || 'normal');
      if (options.color) pdf.setTextColor(options.color);
      
      pdf.text(text, x, y, {
        align: options.align || 'right',
        maxWidth: options.maxWidth
      });
      
      return y + (options.fontSize || 12) * 1.2 + 5;
    }

    return y;
  }

  /**
   * فحص ما إذا كان النص يحتوي على أحرف عربية
   */
  static containsArabic(text: string): boolean {
    return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
  }

  /**
   * اختيار الطريقة الأنسب لعرض النص
   */
  static async addSmartText(
    pdf: any,
    text: string,
    x: number,
    y: number,
    options: {
      fontSize?: number;
      fontWeight?: string;
      color?: string;
      maxWidth?: number;
      align?: 'right' | 'center' | 'left';
    } = {}
  ): Promise<number> {
    // إذا كان النص يحتوي على العربية وكان مهماً، استخدم الصورة
    if (this.containsArabic(text) && (options.fontSize || 12) >= 14) {
      return await this.addArabicTextToPdf(pdf, text, x, y, options);
    } else {
      // خلاف ذلك استخدم النص العادي
      pdf.setFontSize(options.fontSize || 12);
      pdf.setFont('helvetica', options.fontWeight || 'normal');
      if (options.color) pdf.setTextColor(options.color);
      
      pdf.text(text, x, y, {
        align: options.align || 'right',
        maxWidth: options.maxWidth
      });
      
      return y + (options.fontSize || 12) * 1.2 + 5;
    }
  }
}

export default ArabicPdfRenderer;