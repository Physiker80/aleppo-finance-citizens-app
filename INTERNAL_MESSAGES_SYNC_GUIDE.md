# مزامنة الرسائل الداخلية والمعلومات الشخصية مع قاعدة البيانات

## ملخص التحديثات

تم تنفيذ مزامنة تلقائية للرسائل الداخلية ومعلومات الموظفين الشخصية مع قاعدة بيانات Supabase.

---

## الملفات المُحدّثة

### 1. قاعدة البيانات - Migration SQL
**الملف:** [db/migrations/add_internal_messages_and_profiles.sql](db/migrations/add_internal_messages_and_profiles.sql)

تم إنشاء جداول جديدة:
- `internal_messages` - جدول الرسائل الداخلية
- `internal_message_replies` - جدول ردود الرسائل
- `employee_profiles` - جدول المعلومات الشخصية للموظفين

**تعليمات التنفيذ:**
```sql
-- قم بنسخ محتوى الملف وتنفيذه في Supabase SQL Editor
-- https://app.supabase.com → المشروع → SQL Editor
```

### 2. خدمات المزامنة
**الملف:** [utils/storageMode.ts](utils/storageMode.ts)

تم إضافة الوظائف التالية:

| الوظيفة | الوصف |
|---------|-------|
| `syncInternalMessagesToCloud()` | رفع الرسائل المحلية إلى السحابة |
| `syncInternalMessagesToLocal()` | تحميل الرسائل من السحابة |
| `syncSingleInternalMessage(msg)` | مزامنة رسالة واحدة فوراً |
| `syncEmployeeProfilesToCloud()` | رفع ملفات الموظفين إلى السحابة |
| `syncEmployeeProfilesToLocal()` | تحميل ملفات الموظفين من السحابة |
| `syncSingleEmployeeProfile(emp)` | مزامنة ملف موظف واحد فوراً |
| `fullSync(direction)` | مزامنة كاملة ثنائية الاتجاه |
| `getAllSyncStatus()` | الحصول على حالة المزامنة |

### 3. التطبيق الرئيسي
**الملف:** [App.tsx](App.tsx)

التحديثات:
- ✅ مزامنة تلقائية عند بدء التطبيق
- ✅ مزامنة الرسائل الداخلية عند الإرسال
- ✅ مزامنة حالة القراءة عند تغييرها
- ✅ مزامنة ملفات الموظفين عند التحديث

### 4. صفحة إدارة الموظفين
**الملف:** [pages/EmployeeManagementPage.tsx](pages/EmployeeManagementPage.tsx)

- ✅ مزامنة تلقائية عند إضافة موظف جديد
- ✅ مزامنة عند تعديل بيانات موظف
- ✅ مزامنة عند استيراد موظفين من Excel

### 5. صفحة تسجيل الدخول
**الملف:** [pages/LoginPage.tsx](pages/LoginPage.tsx)

- ✅ مزامنة عند إنشاء حساب موظف جديد

### 6. صفحة الرسائل الداخلية
**الملف:** [pages/InternalMessagesPage.tsx](pages/InternalMessagesPage.tsx)

- ✅ مزامنة عند تعليم رسالة كمقروءة
- ✅ مزامنة عند إضافة رد على رسالة
- ✅ مزامنة عند تعليم كل الرسائل كمقروءة

### 7. الترويسة (Header)
**الملف:** [components/Header.tsx](components/Header.tsx)

- ✅ مزامنة عند تعليم رسالة كمقروءة من لوحة الإشعارات
- ✅ مزامنة عند تعليم كل الرسائل كمقروءة

---

## كيفية عمل المزامنة

### عند بدء التطبيق:
```
1. رفع البيانات المحلية إلى السحابة (إذا وجدت)
2. تحميل أحدث البيانات من السحابة
3. تحديث الحالة المحلية
```

### عند إنشاء/تعديل بيانات:
```
1. حفظ في localStorage (فوري)
2. مزامنة مع السحابة (في الخلفية)
3. تسجيل النتيجة في Console
```

---

## مراقبة المزامنة

يمكنك مراقبة حالة المزامنة عبر Console في المتصفح:

```javascript
// رسائل النجاح
[InternalMessage] ✅ Synced to cloud: IM-20260202-ABC123
[Employee] ✅ Profile synced to cloud: admin

// رسائل الخطأ
[InternalMessage] ❌ Cloud sync failed: ...
[Employee] ❌ Sync error: ...
```

---

## الحصول على حالة المزامنة برمجياً

```typescript
import { storageModeService } from './utils/storageMode';

// الحصول على حالة جميع البيانات
const status = storageModeService.getAllSyncStatus();
console.log(status);
// {
//   internalMessages: { lastSync: '2026-02-02T10:00:00Z', count: 50 },
//   employeeProfiles: { lastSync: '2026-02-02T10:00:00Z', count: 10 },
//   tickets: { lastSync: '2026-02-02T10:00:00Z', count: 100 },
//   appointments: { lastSync: '2026-02-02T10:00:00Z', count: 25 },
//   isOnline: true
// }
```

---

## المزامنة اليدوية

```typescript
import { storageModeService } from './utils/storageMode';

// مزامنة كاملة
await storageModeService.fullSync('both');

// رفع فقط
await storageModeService.fullSync('toCloud');

// تحميل فقط
await storageModeService.fullSync('toLocal');

// مزامنة نوع محدد
await storageModeService.syncInternalMessagesToCloud();
await storageModeService.syncEmployeeProfilesToLocal();
```

---

## ملاحظات مهمة

1. **كلمات المرور:** لا يتم رفع كلمات المرور إلى جدول `employee_profiles` لأسباب أمنية. يتم الاحتفاظ بها محلياً فقط.

2. **المرفقات:** يتم تحويل المرفقات إلى Base64 للتخزين في قاعدة البيانات (حد أقصى 5 ميجابايت لكل ملف).

3. **Offline Mode:** إذا لم يكن هناك اتصال، يتم حفظ البيانات محلياً فقط وستتم مزامنتها عند عودة الاتصال.

4. **تنفيذ Migration:** يجب تنفيذ ملف SQL في Supabase قبل استخدام ميزات المزامنة الجديدة.

---

## التاريخ
- **تاريخ التنفيذ:** 2 فبراير 2026
- **الإصدار:** 1.0.0
