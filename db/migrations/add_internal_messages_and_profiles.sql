-- =====================================================
-- Migration: Add Internal Messages and Employee Profiles
-- الرسائل الداخلية والمعلومات الشخصية للموظفين
-- =====================================================

-- 1. جدول الرسائل الداخلية
CREATE TABLE IF NOT EXISTS "internal_messages" (
    "id" TEXT NOT NULL,
    "kind" TEXT,              -- نوع الرسالة (bulk-doc-panel, etc)
    "doc_ids" TEXT[],         -- معرفات الوثائق المرتبطة
    "subject" TEXT NOT NULL,  -- موضوع الرسالة
    "title" TEXT,             -- العنوان
    "body" TEXT NOT NULL,     -- محتوى الرسالة
    "priority" TEXT DEFAULT 'عادي',  -- الأولوية
    "source" TEXT DEFAULT 'نظام داخلي',  -- المصدر
    "from_employee" TEXT,     -- اسم المرسل
    "from_department" TEXT,   -- قسم المرسل
    "to_employee" TEXT,       -- اسم المستقبل (للرسائل الفردية)
    "to_department" TEXT,     -- القسم المستهدف (للرسائل الفردية)
    "to_departments" TEXT[],  -- الأقسام المستهدفة (للرسائل الجماعية)
    "template_name" TEXT,     -- اسم القالب المستخدم
    "attachments" JSONB,      -- المرفقات
    "read" BOOLEAN NOT NULL DEFAULT false,  -- هل تم القراءة
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "internal_messages_pkey" PRIMARY KEY ("id")
);

-- فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS "internal_messages_from_employee_idx" ON "internal_messages"("from_employee");
CREATE INDEX IF NOT EXISTS "internal_messages_to_department_idx" ON "internal_messages"("to_department");
CREATE INDEX IF NOT EXISTS "internal_messages_created_at_idx" ON "internal_messages"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "internal_messages_kind_idx" ON "internal_messages"("kind");
CREATE INDEX IF NOT EXISTS "internal_messages_read_idx" ON "internal_messages"("read");

-- 2. جدول ردود الرسائل الداخلية
CREATE TABLE IF NOT EXISTS "internal_message_replies" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,  -- الرسالة الأصلية
    "reply_by" TEXT NOT NULL,    -- اسم المُرسِل
    "department" TEXT,           -- قسم المُرسِل
    "content" TEXT NOT NULL,     -- محتوى الرد
    "attachments" JSONB,         -- المرفقات
    "type" TEXT NOT NULL DEFAULT 'reply',  -- نوع: reply, comment, opinion
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "internal_message_replies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "internal_message_replies_message_fkey" FOREIGN KEY ("message_id") 
        REFERENCES "internal_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "message_replies_message_id_idx" ON "internal_message_replies"("message_id");

-- 3. جدول المعلومات الشخصية للموظفين (ملف الموظف الممتد)
CREATE TABLE IF NOT EXISTS "employee_profiles" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL UNIQUE,  -- اسم المستخدم
    "employee_number" TEXT,           -- الرقم الوظيفي
    "national_id" TEXT,               -- الرقم الوطني
    "full_name" TEXT,                 -- الاسم الكامل
    "email" TEXT,                     -- البريد الإلكتروني
    "phone" TEXT,                     -- رقم الهاتف
    "birth_date" DATE,                -- تاريخ الميلاد
    "hire_date" DATE,                 -- تاريخ التعيين
    "department" TEXT,                -- القسم
    "role" TEXT DEFAULT 'موظف',       -- الدور
    "job_title" TEXT,                 -- المسمى الوظيفي
    "address" TEXT,                   -- العنوان
    "avatar_url" TEXT,                -- صورة الملف الشخصي
    "bio" TEXT,                       -- نبذة شخصية
    "skills" TEXT[],                  -- المهارات
    "emergency_contact_name" TEXT,    -- اسم جهة الاتصال للطوارئ
    "emergency_contact_phone" TEXT,   -- رقم هاتف الطوارئ
    "preferences" JSONB,              -- إعدادات المستخدم
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),        -- آخر تسجيل دخول
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "employee_profiles_username_idx" ON "employee_profiles"("username");
CREATE INDEX IF NOT EXISTS "employee_profiles_department_idx" ON "employee_profiles"("department");
CREATE INDEX IF NOT EXISTS "employee_profiles_employee_number_idx" ON "employee_profiles"("employee_number");

-- 4. تفعيل RLS (Row Level Security)
ALTER TABLE "internal_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "internal_message_replies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employee_profiles" ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول للرسائل الداخلية
CREATE POLICY "internal_messages_select_policy" ON "internal_messages" FOR SELECT USING (true);
CREATE POLICY "internal_messages_insert_policy" ON "internal_messages" FOR INSERT WITH CHECK (true);
CREATE POLICY "internal_messages_update_policy" ON "internal_messages" FOR UPDATE USING (true);
CREATE POLICY "internal_messages_delete_policy" ON "internal_messages" FOR DELETE USING (true);

-- سياسات الوصول للردود
CREATE POLICY "message_replies_select_policy" ON "internal_message_replies" FOR SELECT USING (true);
CREATE POLICY "message_replies_insert_policy" ON "internal_message_replies" FOR INSERT WITH CHECK (true);
CREATE POLICY "message_replies_update_policy" ON "internal_message_replies" FOR UPDATE USING (true);
CREATE POLICY "message_replies_delete_policy" ON "internal_message_replies" FOR DELETE USING (true);

-- سياسات الوصول للملفات الشخصية
CREATE POLICY "employee_profiles_select_policy" ON "employee_profiles" FOR SELECT USING (true);
CREATE POLICY "employee_profiles_insert_policy" ON "employee_profiles" FOR INSERT WITH CHECK (true);
CREATE POLICY "employee_profiles_update_policy" ON "employee_profiles" FOR UPDATE USING (true);

-- 5. دالة تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers للتحديث التلقائي
DROP TRIGGER IF EXISTS update_internal_messages_updated_at ON internal_messages;
CREATE TRIGGER update_internal_messages_updated_at
    BEFORE UPDATE ON internal_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_profiles_updated_at ON employee_profiles;
CREATE TRIGGER update_employee_profiles_updated_at
    BEFORE UPDATE ON employee_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- تعليمات التنفيذ:
-- قم بتنفيذ هذا السكربت في Supabase SQL Editor
-- https://app.supabase.com → المشروع → SQL Editor
-- =====================================================
