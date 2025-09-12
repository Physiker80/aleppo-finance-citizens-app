// دالة مساعدة لاختبار نظام الرسائل المخصصة للأقسام

// إضافة رسائل تجريبية لأقسام مختلفة
const addTestMessagesForDepartments = () => {
  const departments = [
    'قسم الواردات',
    'قسم الضرائب',
    'قسم الرسوم',
    'قسم المراقبة والتدقيق',
    'قسم الخزينة',
    'قسم الإدارة والتطوير',
    'قسم المعلوماتية'
  ];

  const sampleMessages = [
    {
      name: 'محمد أحمد الخطيب',
      email: 'mohammed.alkhateeb@example.com',
      subject: 'استعلام عن إجراءات الاستيراد',
      message: 'أرجو التكرم بإفادتي عن الإجراءات المطلوبة لاستيراد البضائع وأنواع الرسوم المترتبة.',
      type: 'طلب',
      department: 'قسم الواردات'
    },
    {
      name: 'سارة علي محمود',
      email: 'sara.ali@example.com',
      subject: 'شكوى حول تأخير المعاملة',
      message: 'لدي شكوى بخصوص التأخير الكبير في معالجة معاملة الضرائب رقم 12345.',
      type: 'شكوى',
      department: 'قسم الضرائب'
    },
    {
      name: 'خالد محمد السيد',
      email: 'khalid.alsayed@example.com',
      subject: 'استفسار عن رسوم الطوابع',
      message: 'ما هي أنواع رسوم الطوابع المطلوبة للمعاملات الحكومية؟',
      type: 'طلب',
      department: 'قسم الرسوم'
    }
  ];

  // إضافة الرسائل إلى localStorage
  const existingMessages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
  const newMessages = sampleMessages.map(msg => ({
    id: `MSG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    ...msg,
    status: 'جديدة',
    submissionDate: new Date().toISOString()
  }));

  const updatedMessages = [...newMessages, ...existingMessages];
  localStorage.setItem('contactMessages', JSON.stringify(updatedMessages));
  
  console.log('تم إضافة', newMessages.length, 'رسائل تجريبية للأقسام المختلفة');
  return newMessages;
};

// استدعي هذه الدالة في وحدة التحكم لاختبار النظام
// addTestMessagesForDepartments();

export { addTestMessagesForDepartments };
