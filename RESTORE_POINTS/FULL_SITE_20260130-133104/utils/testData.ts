// إضافة بيانات تجريبية للاختبار
const testMessages = [
  {
    id: 'test1',
    name: 'أحمد محمد',
    email: 'ahmed@test.com',
    phone: '0987654321',
    subject: 'استعلام عاجل عن الراتب',
    message: 'أرجو التكرم بإفادتي عن موعد صرف راتب شهر سبتمبر بشكل عاجل لأن لدي التزامات مالية',
    department: 'الشؤون المالية',
    priority: 'عاجل',
    status: 'جديد',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    type: 'inquiry'
  },
  {
    id: 'test2',
    name: 'فاطمة علي',
    email: 'fatima@test.com',
    phone: '0987654322',
    subject: 'شكوى هامة حول الخدمة',
    message: 'أعاني من مشكلة في الحصول على الوثائق المطلوبة وأحتاج حل سريع',
    department: 'الوثائق',
    priority: 'هام',
    status: 'قيد المراجعة',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    type: 'complaint'
  },
  {
    id: 'test3',
    name: 'محمد حسن',
    email: 'mohammed@test.com',
    phone: '0987654323',
    subject: 'شكراً على الخدمة الممتازة',
    message: 'أشكركم على التعامل الراقي والخدمة الممتازة التي تقدمونها للمواطنين',
    department: 'عام',
    priority: 'عادي',
    status: 'مجاب',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    type: 'inquiry'
  },
  {
    id: 'test4',
    name: 'سارة أحمد',
    email: 'sara@test.com',
    phone: '0987654324',
    subject: 'طلب عاجل للحصول على شهادة',
    message: 'أحتاج بشكل عاجل للحصول على شهادة إثبات راتب للسفر غداً',
    department: 'الوثائق',
    priority: 'عاجل',
    status: 'جديد',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    type: 'inquiry'
  }
];

// إضافة البيانات التجريبية إلى localStorage (يتم استدعاؤها يدوياً فقط)
function addTestData(options: { reload?: boolean } = {}) {
  try {
    const existing = JSON.parse(localStorage.getItem('contactMessages') || '[]');
    const existingIds = existing.map((msg: any) => msg.id);
    const newMessages = testMessages.filter(msg => !existingIds.includes(msg.id));
    if (newMessages.length > 0) {
      const updated = [...existing, ...newMessages];
      localStorage.setItem('contactMessages', JSON.stringify(updated));
      console.log(`تم إضافة ${newMessages.length} رسالة تجريبية`);
      if (options.reload) {
        // توفير خيار إعادة التحميل (افتراضي معطل لتفادي الوميض المستمر)
        window.location.reload();
      }
    } else {
      console.log('البيانات التجريبية موجودة بالفعل');
    }
  } catch (e) {
    console.warn('تعذر إضافة البيانات التجريبية:', e);
  }
}

// ملاحظة: تم إلغاء التشغيل التلقائي للبيانات التجريبية لتجنب إعادة تحميل التطبيق المتكرر.
// للاستعمال اليدوي في أي مكان: import { addTestData } from '../utils/testData'; ثم addTestData();

export { addTestData, testMessages };