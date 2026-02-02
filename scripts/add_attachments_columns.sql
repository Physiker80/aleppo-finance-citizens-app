-- إضافة أعمدة المرفقات والرد في جدول tickets
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/whutmrbjvvplqugobwbq/sql

-- إضافة عمود مصدر الطلب (موظف/مواطن) إن لم يكن موجوداً
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS source TEXT;

-- إضافة عمود لتخزين روابط/بيانات المرفقات كـ JSON
-- attachments_data: [{name, size, type, url, base64?}]
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS attachments_data JSONB DEFAULT '[]'::jsonb;

-- إضافة عمود لتخزين روابط/بيانات مرفقات الرد كـ JSON
-- response_attachments_data: [{name, size, type, url, base64?}]
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS response_attachments_data JSONB DEFAULT '[]'::jsonb;

-- التأكد من وجود عمود الرد
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS response TEXT;

-- إنشاء bucket للمرفقات في Supabase Storage (يُنفذ من Dashboard)
-- Storage > Create new bucket > Name: ticket-attachments > Public: false

-- منح صلاحيات القراءة والكتابة للـ bucket
-- يُنفذ من Dashboard: Storage > ticket-attachments > Policies

COMMENT ON COLUMN tickets.source IS 'مصدر الطلب: employee أو citizen';
COMMENT ON COLUMN tickets.attachments_data IS 'بيانات المرفقات: [{name, size, type, url}]';
COMMENT ON COLUMN tickets.response_attachments_data IS 'بيانات مرفقات الرد: [{name, size, type, url}]';
