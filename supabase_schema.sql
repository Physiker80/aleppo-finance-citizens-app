-- Enable pgcrypto for gen_random_uuid() if needed, though uuid-ossp is also common.
-- in Supabase, pgcrypto is usually available.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. --- User and Auth Models ---

CREATE TABLE "User" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "UserCredential" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "salt" TEXT,
    "algorithm" TEXT NOT NULL DEFAULT 'argon2id',
    "lastChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mfaSecret" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserCredential_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCredential_userId_key" ON "UserCredential"("userId");

CREATE TABLE "RecoveryCode" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "credentialId" TEXT NOT NULL,
    "hashedCode" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RecoveryCode_hashedCode_key" ON "RecoveryCode"("hashedCode");

CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "phoneNumber" TEXT,
    "avatarUrl" TEXT,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

CREATE TABLE "Role" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

CREATE TABLE "AccountActivationToken" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountActivationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountActivationToken_token_key" ON "AccountActivationToken"("token");
CREATE INDEX "AccountActivationToken_userId_idx" ON "AccountActivationToken"("userId");


-- 2. --- Core Application Models ---

CREATE TABLE "Department" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "departmentId" TEXT NOT NULL,
    "citizenName" TEXT,
    "citizenNationalId" TEXT,
    "citizenEmail" TEXT,
    "type" TEXT,
    "status" TEXT NOT NULL,
    "responseText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "answeredAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Ticket_status_createdAt_idx" ON "Ticket"("status", "createdAt");
CREATE INDEX "Ticket_departmentId_createdAt_idx" ON "Ticket"("departmentId", "createdAt");

CREATE TABLE "TicketResponse" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "bodySanitized" TEXT,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, -- @updatedAt in Prisma usually handled by client, but we can set default
    "redactionFlags" TEXT,

    CONSTRAINT "TicketResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TicketResponse_ticketId_createdAt_idx" ON "TicketResponse"("ticketId", "createdAt");
CREATE INDEX "TicketResponse_authorId_idx" ON "TicketResponse"("authorId");

CREATE TABLE "TicketForward" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "ticketId" TEXT NOT NULL,
    "fromDepartmentId" TEXT NOT NULL,
    "toDepartmentId" TEXT NOT NULL,
    "forwardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "TicketForward_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "ticketId" TEXT NOT NULL,
    "ticketResponseId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT,
    "storagePath" TEXT,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "ticketId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketHistory" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "ticketId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "diffSummary" TEXT,
    "actorId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" TEXT,
    "after" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hashChainPrev" TEXT,
    "hashChainCurr" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");


-- Foreign Keys

ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserCredential" ADD CONSTRAINT "UserCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecoveryCode" ADD CONSTRAINT "RecoveryCode_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "UserCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountActivationToken" ADD CONSTRAINT "AccountActivationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TicketResponse" ADD CONSTRAINT "TicketResponse_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketResponse" ADD CONSTRAINT "TicketResponse_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TicketForward" ADD CONSTRAINT "TicketForward_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketForward" ADD CONSTRAINT "TicketForward_fromDepartmentId_fkey" FOREIGN KEY ("fromDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketForward" ADD CONSTRAINT "TicketForward_toDepartmentId_fkey" FOREIGN KEY ("toDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_ticketResponseId_fkey" FOREIGN KEY ("ticketResponseId") REFERENCES "TicketResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TicketHistory" ADD CONSTRAINT "TicketHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketHistory" ADD CONSTRAINT "TicketHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- 3. --- Appointment Booking System ---

-- جدول الخدمات المتاحة للحجز
CREATE TABLE "service_category" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "average_duration_minutes" INTEGER DEFAULT 15,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "service_category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_category_code_key" ON "service_category"("code");

-- إدخال الخدمات الافتراضية
INSERT INTO "service_category" ("code", "name_ar", "average_duration_minutes") VALUES
    ('tax_payment', 'دفع ضريبة', 15),
    ('tax_objection', 'اعتراض على تكليف', 20),
    ('tax_exemption', 'طلب إعفاء ضريبي', 25),
    ('tax_certificate', 'شهادة براءة ذمة', 10),
    ('property_assessment', 'تقييم عقاري', 30),
    ('commercial_license', 'رخصة تجارية', 20),
    ('financial_inquiry', 'استعلام مالي', 15),
    ('document_collection', 'استلام وثائق', 10),
    ('complaint_submission', 'تقديم شكوى', 15),
    ('other', 'أخرى', 15);

-- جدول المواعيد الرئيسي
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    
    -- معلومات المراجع
    "citizen_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "email" TEXT,
    
    -- معلومات الموعد
    "date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "service_category" TEXT NOT NULL,
    "service_description" TEXT,
    
    -- الحالة والأولوية
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    
    -- التوزيع
    "assigned_counter" INTEGER,
    "assigned_employee" TEXT,
    
    -- التحقق
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_code" TEXT,
    "qr_code" TEXT,
    
    -- التوقيتات
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "checked_in_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    
    -- ملاحظات
    "notes" TEXT,
    "cancellation_reason" TEXT,
    
    -- المزامنة
    "sync_status" TEXT NOT NULL DEFAULT 'synced',
    "last_synced_at" TIMESTAMP(3),
    
    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- الفهارس للبحث السريع
CREATE INDEX "appointments_date_idx" ON "appointments"("date");
CREATE INDEX "appointments_citizen_id_idx" ON "appointments"("citizen_id");
CREATE INDEX "appointments_status_idx" ON "appointments"("status");
CREATE INDEX "appointments_date_status_idx" ON "appointments"("date", "status");

-- جدول النوافذ/الكاونترات
CREATE TABLE "counters" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "assigned_employee" TEXT,
    "current_appointment_id" TEXT,
    "service_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "queue_length" INTEGER NOT NULL DEFAULT 0,
    "average_service_time" INTEGER NOT NULL DEFAULT 15,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول إعدادات نظام المواعيد
CREATE TABLE "appointment_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "work_start_time" TIME NOT NULL DEFAULT '08:00',
    "work_end_time" TIME NOT NULL DEFAULT '14:00',
    "slot_duration_minutes" INTEGER NOT NULL DEFAULT 15,
    "max_appointments_per_slot" INTEGER NOT NULL DEFAULT 5,
    "max_appointments_per_day" INTEGER NOT NULL DEFAULT 100,
    "max_advance_booking_days" INTEGER NOT NULL DEFAULT 14,
    "total_counters" INTEGER NOT NULL DEFAULT 5,
    "require_phone_verification" BOOLEAN NOT NULL DEFAULT true,
    "require_national_id" BOOLEAN NOT NULL DEFAULT true,
    "send_sms_confirmation" BOOLEAN NOT NULL DEFAULT true,
    "send_sms_reminder" BOOLEAN NOT NULL DEFAULT true,
    "reminder_hours_before" INTEGER NOT NULL DEFAULT 24,
    "allow_emergency_appointments" BOOLEAN NOT NULL DEFAULT true,
    "priority_queue_enabled" BOOLEAN NOT NULL DEFAULT true,
    "holidays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weekend_days" INTEGER[] DEFAULT ARRAY[5, 6]::INTEGER[],
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "appointment_settings_pkey" PRIMARY KEY ("id")
);

-- إدخال الإعدادات الافتراضية
INSERT INTO "appointment_settings" ("id") VALUES ('default');

-- جدول الفترات المحظورة
CREATE TABLE "blocked_slots" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "department_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "blocked_slots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "blocked_slots_date_idx" ON "blocked_slots"("date");

-- جدول سجل نشاطات المواعيد
CREATE TABLE "appointment_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performed_by" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,
    
    CONSTRAINT "appointment_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "appointment_logs_appointment_id_idx" ON "appointment_logs"("appointment_id");

-- جدول تقييد الحجوزات (منع الاحتكار)
CREATE TABLE "booking_throttle" (
    "national_id" TEXT NOT NULL,
    "last_booking_date" DATE NOT NULL,
    "bookings_this_week" INTEGER NOT NULL DEFAULT 1,
    "bookings_this_month" INTEGER NOT NULL DEFAULT 1,
    "total_bookings" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "booking_throttle_pkey" PRIMARY KEY ("national_id")
);

-- جدول الطابور
CREATE TABLE "appointment_queue" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "appointment_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "estimated_wait_minutes" INTEGER NOT NULL DEFAULT 0,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "service_category" TEXT NOT NULL,
    "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "appointment_queue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "appointment_queue_appointment_id_idx" ON "appointment_queue"("appointment_id");
CREATE INDEX "appointment_queue_position_idx" ON "appointment_queue"("position");

-- الروابط الخارجية (Foreign Keys)
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_category_fkey" 
    FOREIGN KEY ("service_category") REFERENCES "service_category"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "counters" ADD CONSTRAINT "counters_current_appointment_fkey" 
    FOREIGN KEY ("current_appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "appointment_logs" ADD CONSTRAINT "appointment_logs_appointment_id_fkey" 
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "appointment_queue" ADD CONSTRAINT "appointment_queue_appointment_id_fkey" 
    FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (Row Level Security) للمواعيد
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: يمكن للجميع قراءة المواعيد
CREATE POLICY "appointments_select_policy" ON "appointments" FOR SELECT USING (true);

-- سياسة الإدراج: يمكن للجميع إنشاء مواعيد
CREATE POLICY "appointments_insert_policy" ON "appointments" FOR INSERT WITH CHECK (true);

-- سياسة التحديث: يمكن للجميع التحديث
CREATE POLICY "appointments_update_policy" ON "appointments" FOR UPDATE USING (true);
