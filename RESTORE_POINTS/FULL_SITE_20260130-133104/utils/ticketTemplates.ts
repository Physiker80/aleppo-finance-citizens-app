// =====================================================
// 📝 Ticket Templates System
// نظام قوالب الشكاوى
// =====================================================

export interface TicketTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    department: string;
    fields: TemplateField[];
    defaultValues: Record<string, unknown>;
    isActive: boolean;
    usageCount: number;
    createdAt: number;
    updatedAt: number;
    createdBy?: string;
}

export interface TemplateField {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'file' | 'phone' | 'email';
    placeholder?: string;
    required: boolean;
    options?: string[]; // للـ select
    validation?: {
        pattern?: string;
        minLength?: number;
        maxLength?: number;
        min?: number;
        max?: number;
    };
    helpText?: string;
}

const TEMPLATES_KEY = 'ticket-templates';

// القوالب الافتراضية
const DEFAULT_TEMPLATES: TicketTemplate[] = [
    {
        id: 'tax-inquiry',
        name: 'استفسار ضريبي',
        description: 'استفسار عن الضرائب والرسوم المستحقة',
        category: 'ضرائب',
        department: 'الإيرادات',
        fields: [
            { name: 'taxType', label: 'نوع الضريبة', type: 'select', required: true, options: ['ضريبة دخل', 'ضريبة عقارية', 'رسوم مركبات', 'أخرى'] },
            { name: 'taxYear', label: 'السنة الضريبية', type: 'number', required: true, validation: { min: 2000, max: 2030 } },
            { name: 'nationalId', label: 'الرقم الوطني', type: 'text', required: true, validation: { pattern: '^\\d{11}$' } },
            { name: 'details', label: 'تفاصيل الاستفسار', type: 'textarea', required: true }
        ],
        defaultValues: { taxYear: new Date().getFullYear() },
        isActive: true,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'clearance-request',
        name: 'طلب براءة ذمة',
        description: 'طلب الحصول على براءة ذمة مالية',
        category: 'خدمات',
        department: 'خدمة المواطنين',
        fields: [
            { name: 'clearanceType', label: 'نوع البراءة', type: 'select', required: true, options: ['براءة ذمة عقارية', 'براءة ذمة مهنية', 'براءة ذمة شاملة'] },
            { name: 'nationalId', label: 'الرقم الوطني', type: 'text', required: true },
            { name: 'purpose', label: 'الغرض من البراءة', type: 'text', required: true },
            { name: 'urgency', label: 'درجة الاستعجال', type: 'select', required: false, options: ['عادي', 'مستعجل'] }
        ],
        defaultValues: { urgency: 'عادي' },
        isActive: true,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'objection',
        name: 'اعتراض على قرار',
        description: 'تقديم اعتراض على قرار إداري أو ضريبي',
        category: 'قانونية',
        department: 'الشؤون القانونية',
        fields: [
            { name: 'decisionNumber', label: 'رقم القرار', type: 'text', required: true },
            { name: 'decisionDate', label: 'تاريخ القرار', type: 'date', required: true },
            { name: 'objectionReason', label: 'سبب الاعتراض', type: 'textarea', required: true },
            { name: 'supportingDocs', label: 'المستندات الداعمة', type: 'file', required: false }
        ],
        defaultValues: {},
        isActive: true,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'complaint-delay',
        name: 'شكوى تأخير معاملة',
        description: 'شكوى بخصوص تأخير في إنجاز معاملة',
        category: 'شكاوى',
        department: 'الديوان',
        fields: [
            { name: 'transactionNumber', label: 'رقم المعاملة', type: 'text', required: true },
            { name: 'submissionDate', label: 'تاريخ تقديم المعاملة', type: 'date', required: true },
            { name: 'department', label: 'القسم المعني', type: 'select', required: true, options: ['الإيرادات', 'الحسابات', 'خدمة المواطنين', 'أخرى'] },
            { name: 'details', label: 'تفاصيل الشكوى', type: 'textarea', required: true }
        ],
        defaultValues: {},
        isActive: true,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'payment-issue',
        name: 'مشكلة في الدفع',
        description: 'الإبلاغ عن مشكلة في عملية الدفع',
        category: 'مالية',
        department: 'الصناديق',
        fields: [
            { name: 'receiptNumber', label: 'رقم الإيصال', type: 'text', required: false },
            { name: 'paymentDate', label: 'تاريخ الدفع', type: 'date', required: true },
            { name: 'amount', label: 'المبلغ', type: 'number', required: true },
            { name: 'issueType', label: 'نوع المشكلة', type: 'select', required: true, options: ['دفع مكرر', 'مبلغ خاطئ', 'لم يُسجل', 'أخرى'] },
            { name: 'details', label: 'تفاصيل المشكلة', type: 'textarea', required: true }
        ],
        defaultValues: {},
        isActive: true,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
    }
];

/**
 * تحميل القوالب
 */
export function loadTemplates(): TicketTemplate[] {
    try {
        const saved = localStorage.getItem(TEMPLATES_KEY);
        const templates = saved ? JSON.parse(saved) : [];

        // دمج مع القوالب الافتراضية
        const savedIds = templates.map((t: TicketTemplate) => t.id);
        const missingDefaults = DEFAULT_TEMPLATES.filter(t => !savedIds.includes(t.id));

        return [...templates, ...missingDefaults];
    } catch {
        return [...DEFAULT_TEMPLATES];
    }
}

/**
 * حفظ القوالب
 */
function saveTemplates(templates: TicketTemplate[]): void {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

/**
 * الحصول على قالب بالمعرف
 */
export function getTemplate(id: string): TicketTemplate | null {
    const templates = loadTemplates();
    return templates.find(t => t.id === id) || null;
}

/**
 * إنشاء قالب جديد
 */
export function createTemplate(
    template: Omit<TicketTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>
): TicketTemplate {
    const templates = loadTemplates();

    const newTemplate: TicketTemplate = {
        ...template,
        id: `tpl-${Date.now()}`,
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    templates.push(newTemplate);
    saveTemplates(templates);

    return newTemplate;
}

/**
 * تحديث قالب
 */
export function updateTemplate(
    id: string,
    updates: Partial<TicketTemplate>
): TicketTemplate | null {
    const templates = loadTemplates();
    const index = templates.findIndex(t => t.id === id);

    if (index === -1) return null;

    templates[index] = {
        ...templates[index],
        ...updates,
        updatedAt: Date.now()
    };

    saveTemplates(templates);
    return templates[index];
}

/**
 * حذف قالب
 */
export function deleteTemplate(id: string): boolean {
    const templates = loadTemplates();
    const filtered = templates.filter(t => t.id !== id);

    if (filtered.length === templates.length) return false;

    saveTemplates(filtered);
    return true;
}

/**
 * الحصول على القوالب حسب القسم
 */
export function getTemplatesByDepartment(department: string): TicketTemplate[] {
    return loadTemplates().filter(
        t => t.department === department && t.isActive
    );
}

/**
 * الحصول على القوالب حسب الفئة
 */
export function getTemplatesByCategory(category: string): TicketTemplate[] {
    return loadTemplates().filter(
        t => t.category === category && t.isActive
    );
}

/**
 * البحث في القوالب
 */
export function searchTemplates(query: string): TicketTemplate[] {
    const lowerQuery = query.toLowerCase();
    return loadTemplates().filter(t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.category.toLowerCase().includes(lowerQuery)
    );
}

/**
 * زيادة عداد الاستخدام
 */
export function incrementUsage(id: string): void {
    const templates = loadTemplates();
    const template = templates.find(t => t.id === id);

    if (template) {
        template.usageCount++;
        saveTemplates(templates);
    }
}

/**
 * الحصول على القوالب الأكثر استخداماً
 */
export function getMostUsedTemplates(limit: number = 5): TicketTemplate[] {
    return loadTemplates()
        .filter(t => t.isActive)
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, limit);
}

/**
 * تطبيق القالب على بيانات الشكوى
 */
export function applyTemplate(
    templateId: string,
    formData: Record<string, unknown>
): Record<string, unknown> {
    const template = getTemplate(templateId);
    if (!template) return formData;

    incrementUsage(templateId);

    return {
        ...template.defaultValues,
        ...formData,
        _templateId: templateId,
        _templateName: template.name,
        department: template.department
    };
}

/**
 * التحقق من صحة بيانات القالب
 */
export function validateTemplateData(
    templateId: string,
    data: Record<string, unknown>
): { valid: boolean; errors: Record<string, string> } {
    const template = getTemplate(templateId);
    const errors: Record<string, string> = {};

    if (!template) {
        return { valid: false, errors: { _template: 'القالب غير موجود' } };
    }

    template.fields.forEach(field => {
        const value = data[field.name];

        // فحص الحقول المطلوبة
        if (field.required && !value) {
            errors[field.name] = `${field.label} مطلوب`;
            return;
        }

        if (!value) return;

        // فحص التحقق
        if (field.validation) {
            const v = field.validation;
            const strValue = String(value);

            if (v.pattern && !new RegExp(v.pattern).test(strValue)) {
                errors[field.name] = `${field.label} غير صالح`;
            }

            if (v.minLength && strValue.length < v.minLength) {
                errors[field.name] = `${field.label} قصير جداً (الحد الأدنى ${v.minLength})`;
            }

            if (v.maxLength && strValue.length > v.maxLength) {
                errors[field.name] = `${field.label} طويل جداً (الحد الأقصى ${v.maxLength})`;
            }

            if (typeof v.min === 'number' && Number(value) < v.min) {
                errors[field.name] = `${field.label} يجب أن يكون أكبر من ${v.min}`;
            }

            if (typeof v.max === 'number' && Number(value) > v.max) {
                errors[field.name] = `${field.label} يجب أن يكون أصغر من ${v.max}`;
            }
        }
    });

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * تصدير القوالب
 */
export function exportTemplates(): string {
    const templates = loadTemplates();
    return JSON.stringify(templates, null, 2);
}

/**
 * استيراد القوالب
 */
export function importTemplates(jsonData: string): {
    success: boolean;
    imported: number;
    errors: string[];
} {
    try {
        const imported = JSON.parse(jsonData);

        if (!Array.isArray(imported)) {
            return { success: false, imported: 0, errors: ['البيانات غير صالحة'] };
        }

        const existing = loadTemplates();
        const errors: string[] = [];
        let count = 0;

        imported.forEach((template, index) => {
            if (!template.name || !template.fields) {
                errors.push(`قالب ${index + 1}: بيانات ناقصة`);
                return;
            }

            // تجنب التكرار
            if (!existing.some(e => e.id === template.id)) {
                existing.push({
                    ...template,
                    id: template.id || `imported-${Date.now()}-${index}`,
                    usageCount: 0,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
                count++;
            }
        });

        saveTemplates(existing);

        return { success: count > 0, imported: count, errors };
    } catch (e) {
        return { success: false, imported: 0, errors: ['فشل في قراءة البيانات'] };
    }
}

export default {
    loadTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    getTemplatesByDepartment,
    getTemplatesByCategory,
    searchTemplates,
    getMostUsedTemplates,
    applyTemplate,
    validateTemplateData,
    exportTemplates,
    importTemplates
};
