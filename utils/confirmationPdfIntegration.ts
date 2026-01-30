// تكامل قوالب PDF مع صفحة التأكيد
import { Ticket } from '../types';
import { generateTicketPdf, getSavedTemplates, getTemplateByType } from './pdfTemplateGenerator';

// إضافة دالة لإنتاج PDF من صفحة التأكيد
export async function generateConfirmationPdf(ticket: Ticket, templateName?: string): Promise<void> {
  try {
    // البحث عن القالب المحدد أو استخدام الافتراضي
    let template;
    const savedTemplates = getSavedTemplates();
    
    // فلترة القوالب لإظهار المعتمدة فقط
    const approvedTemplates = savedTemplates.filter(t => 
      t.type === 'ticket_confirmation' && t.approved === true
    );
    
    if (templateName) {
      template = approvedTemplates.find(t => t.name === templateName);
    }
    
    // إذا لم يتم العثور على القالب المحدد، استخدم أول قالب معتمد
    if (!template && approvedTemplates.length > 0) {
      template = approvedTemplates[0];
    }
    
    // إذا لم يوجد أي قالب معتمد، استخدم أي قالب متاح
    if (!template) {
      template = getTemplateByType('ticket_confirmation');
    }
    
    // إنتاج PDF
    if (template) {
      await generateTicketPdf(ticket, template.id);
    } else {
      // في حالة عدم وجود أي قالب، استخدم الافتراضي
      await generateTicketPdf(ticket);
    }
  } catch (error) {
    console.error('Error generating confirmation PDF:', error);
    throw new Error('فشل في إنتاج إيصال PDF');
  }
}

// الحصول على قائمة القوالب المتاحة للاختيار (المعتمدة فقط)
export function getAvailableTemplates() {
  return getSavedTemplates().filter(template => 
    template.type === 'ticket_confirmation' && template.approved === true
  );
}

// دالة للتحقق من وجود قوالب مخصصة معتمدة
export function hasCustomTemplates(): boolean {
  const approvedTemplates = getSavedTemplates().filter(t => t.approved === true);
  return approvedTemplates.length > 0;
}

// الحصول على القالب المعتمد الافتراضي
export function getDefaultApprovedTemplate() {
  const approvedTemplates = getAvailableTemplates();
  return approvedTemplates.length > 0 ? approvedTemplates[0] : null;
}