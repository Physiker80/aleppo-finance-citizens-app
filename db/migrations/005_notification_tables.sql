-- =============================================
-- Notification System Tables for Cross-Platform Sync
-- Created: 2025-02-04
-- Description: Tables for mobile/web notification bridge
-- =============================================

-- جدول تسجيل الأجهزة للإشعارات
CREATE TABLE IF NOT EXISTS device_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
    fcm_token TEXT,
    employee_username TEXT,
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهرس للبحث السريع حسب القسم والموظف
CREATE INDEX IF NOT EXISTS idx_device_registrations_department ON device_registrations(department);
CREATE INDEX IF NOT EXISTS idx_device_registrations_employee ON device_registrations(employee_username);
CREATE INDEX IF NOT EXISTS idx_device_registrations_active ON device_registrations(is_active) WHERE is_active = true;

-- جدول رسائل الإشعارات
CREATE TABLE IF NOT EXISTS notification_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('new_ticket', 'status_update', 'response', 'forward')),
    target_department TEXT,
    title TEXT NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- فهارس للإشعارات
CREATE INDEX IF NOT EXISTS idx_notification_messages_department ON notification_messages(target_department);
CREATE INDEX IF NOT EXISTS idx_notification_messages_ticket ON notification_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_notification_messages_unread ON notification_messages(target_department, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notification_messages_created ON notification_messages(created_at DESC);

-- تفعيل Realtime على جداول الإشعارات
ALTER PUBLICATION supabase_realtime ADD TABLE notification_messages;

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تريجر لتحديث updated_at
DROP TRIGGER IF EXISTS update_device_registrations_updated_at ON device_registrations;
CREATE TRIGGER update_device_registrations_updated_at
    BEFORE UPDATE ON device_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- سياسات الأمان (RLS)
ALTER TABLE device_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_messages ENABLE ROW LEVEL SECURITY;

-- السماح للمستخدمين المصادق عليهم بالقراءة والكتابة
CREATE POLICY "Allow all operations on device_registrations" ON device_registrations
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on notification_messages" ON notification_messages
    FOR ALL USING (true) WITH CHECK (true);

-- تعليقات على الجداول
COMMENT ON TABLE device_registrations IS 'تسجيل الأجهزة لاستقبال الإشعارات الفورية';
COMMENT ON TABLE notification_messages IS 'رسائل الإشعارات المرسلة للأجهزة المسجلة';

COMMENT ON COLUMN device_registrations.device_id IS 'معرف الجهاز الفريد';
COMMENT ON COLUMN device_registrations.platform IS 'نظام التشغيل: android, ios, web';
COMMENT ON COLUMN device_registrations.fcm_token IS 'رمز Firebase Cloud Messaging للإشعارات';
COMMENT ON COLUMN device_registrations.employee_username IS 'اسم المستخدم للموظف المرتبط';
COMMENT ON COLUMN device_registrations.department IS 'القسم المرتبط لتصفية الإشعارات';

COMMENT ON COLUMN notification_messages.notification_type IS 'نوع الإشعار: تذكرة جديدة، تحديث حالة، رد، إحالة';
COMMENT ON COLUMN notification_messages.target_department IS 'القسم المستهدف للإشعار';
COMMENT ON COLUMN notification_messages.data IS 'بيانات إضافية بصيغة JSON';
