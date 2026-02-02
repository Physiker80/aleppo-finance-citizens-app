// قوالب المستندات الرسمية المحسنة
// Enhanced Official Document Templates

export const OFFICIAL_TEMPLATES = {
  // نموذج الإحالة الداخلية
  INTERNAL_REFERRAL: {
    name: 'نموذج إحالة داخلية',
    nameEn: 'Internal Referral Form',
    docType: 'إحالة داخلية',
    priority: 'عادي',
    structure: {
      header: {
        useOfficialHeader: true,
        includeDate: true,
        includeNumber: true,
        includePriority: true
      },
      sections: [
        {
          type: 'info_table',
          fields: ['docNumber', 'date', 'from', 'to', 'subject', 'priority']
        },
        {
          type: 'content',
          label: 'المحتوى',
          placeholder: 'اكتب محتوى الإحالة هنا...'
        },
        {
          type: 'departments',
          label: 'الأقسام المرسل إليها'
        },
        {
          type: 'signature',
          includeElectronic: true
        }
      ]
    },
    defaultContent: `بناءً على التعليمات الصادرة والأنظمة المعمول بها، يرجى:

١. مراجعة الموضوع المرفق
٢. اتخاذ الإجراءات اللازمة
٣. إعلامنا بالنتيجة خلال المدة المحددة

وتفضلوا بقبول فائق الاحترام.`,
    
    styles: {
      fontFamily: 'Amiri, Traditional Arabic',
      fontSize: '14px',
      lineHeight: '1.8',
      color: '#1f2937',
      headerColor: '#054239'
    }
  },

  // نموذج الكتاب الصادر
  OUTGOING_LETTER: {
    name: 'كتاب صادر',
    nameEn: 'Outgoing Letter',
    docType: 'كتاب صادر',
    priority: 'عادي',
    structure: {
      header: {
        useOfficialHeader: true,
        includeDate: true,
        includeNumber: true,
        includePriority: true,
        includeRecipient: true
      },
      sections: [
        {
          type: 'recipient_info',
          fields: ['to', 'address', 'attention']
        },
        {
          type: 'subject_line',
          label: 'الموضوع'
        },
        {
          type: 'salutation',
          default: 'المحترمون،'
        },
        {
          type: 'content',
          label: 'المحتوى'
        },
        {
          type: 'closing',
          default: 'وتفضلوا بقبول فائق الاحترام والتقدير.'
        },
        {
          type: 'signature',
          includeElectronic: true,
          includeTitle: true
        }
      ]
    },
    defaultContent: `نتشرف بإحاطة سيادتكم علماً بـ...

وفي ضوء ذلك، نرجو منكم التكرم بـ...

مع خالص الشكر والتقدير.`
  },

  // نموذج التقرير
  REPORT: {
    name: 'تقرير',
    nameEn: 'Report',
    docType: 'تقرير',
    priority: 'هام',
    structure: {
      header: {
        useOfficialHeader: true,
        includeDate: true,
        includeNumber: true,
        includePriority: true
      },
      sections: [
        {
          type: 'title_section',
          label: 'عنوان التقرير'
        },
        {
          type: 'executive_summary',
          label: 'الملخص التنفيذي'
        },
        {
          type: 'content',
          label: 'المحتوى الرئيسي',
          subsections: [
            'المقدمة',
            'التحليل',
            'النتائج',
            'التوصيات'
          ]
        },
        {
          type: 'attachments',
          label: 'المرفقات'
        },
        {
          type: 'signature',
          includeElectronic: true,
          includeTitle: true,
          includeReviewers: true
        }
      ]
    }
  },

  // نموذج المذكرة الداخلية
  INTERNAL_MEMO: {
    name: 'مذكرة داخلية',
    nameEn: 'Internal Memo',
    docType: 'مذكرة داخلية',
    priority: 'عادي',
    structure: {
      header: {
        useOfficialHeader: true,
        simplified: true
      },
      sections: [
        {
          type: 'memo_header',
          fields: ['to', 'from', 'date', 'subject']
        },
        {
          type: 'content',
          label: 'المحتوى'
        },
        {
          type: 'action_required',
          label: 'الإجراء المطلوب'
        },
        {
          type: 'signature',
          includeElectronic: true
        }
      ]
    },
    defaultContent: `الموضوع: [اكتب الموضوع]

المحتوى:
...

الإجراء المطلوب:
١. 
٢. 
٣. 

المدة الزمنية: [حدد المدة]`
  }
};

// دالة لتوليد القالب المناسب
export const generateTemplateContent = (templateType, data) => {
  const template = OFFICIAL_TEMPLATES[templateType];
  if (!template) return '';
  
  let content = '';
  
  // إضافة المحتوى الافتراضي إذا لم يكن هناك محتوى
  if (!data.content && template.defaultContent) {
    content = template.defaultContent;
  } else {
    content = data.content || '';
  }
  
  return content;
};

// إعدادات التصدير المحسنة
export const EXPORT_SETTINGS = {
  fonts: {
    primary: 'Amiri',
    secondary: 'Traditional Arabic',
    fallback: 'Traditional Arabic, Arabic Typesetting, Times New Roman'
  },
  colors: {
    primary: '#054239',
    secondary: '#1f2937',
    accent: '#059669',
    background: '#ffffff',
    border: '#e5e7eb',
    muted: '#6b7280'
  },
  layout: {
    pageSize: 'A4',
    margins: {
      top: '2cm',
      right: '1.5cm',
      bottom: '2cm',
      left: '1.5cm'
    },
    lineHeight: 1.8,
    fontSize: {
      body: '14px',
      header: '16px',
      small: '12px'
    }
  }
};
