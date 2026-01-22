-- ======================================
-- جداول نظام التذكير التلقائي
-- AL-LamiSoft Reminder System Tables
-- ======================================

-- حذف الجداول الموجودة مسبقاً (Drop existing tables)
DROP TABLE IF EXISTS reminder_sessions CASCADE;
DROP TABLE IF EXISTS reminder_users CASCADE;
DROP TABLE IF EXISTS reminder_whatsapp_settings CASCADE;
DROP TABLE IF EXISTS reminder_message_template CASCADE;

-- حذف الدالة إذا كانت موجودة
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS delete_expired_reminder_sessions() CASCADE;

-- ======================================

-- 1. جدول هيكلة الرسالة (Message Template)
CREATE TABLE reminder_message_template (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_title TEXT NOT NULL,
    message_body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إضافة تعليق على الجدول
COMMENT ON TABLE reminder_message_template IS 'جدول يحفظ هيكلة رسالة الواتساب (العنوان والنص)';
COMMENT ON COLUMN reminder_message_template.message_title IS 'عنوان الرسالة';
COMMENT ON COLUMN reminder_message_template.message_body IS 'نص الرسالة (يحتوي على {CODE} للإشارة لموقع الرمز)';

-- إضافة row واحد افتراضي
INSERT INTO reminder_message_template (message_title, message_body)
VALUES (
    'رمز التحقق من AL-LamiSoft',
    'رمز التحقق الخاص بك هو: {CODE}'
);

-- ======================================

-- 2. جدول إعدادات الواتساب (WhatsApp Settings)
CREATE TABLE reminder_whatsapp_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key TEXT NOT NULL,
    delay_between_messages INTEGER NOT NULL DEFAULT 5002,
    jitter_factor INTEGER NOT NULL DEFAULT 100,
    messages_before_break INTEGER NOT NULL DEFAULT 5,
    break_duration INTEGER NOT NULL DEFAULT 6000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- قيود للتحقق من القيم
    CONSTRAINT check_delay_range CHECK (delay_between_messages BETWEEN 3000 AND 15000),
    CONSTRAINT check_jitter_range CHECK (jitter_factor BETWEEN 100 AND 2000),
    CONSTRAINT check_messages_range CHECK (messages_before_break BETWEEN 5 AND 50),
    CONSTRAINT check_break_range CHECK (break_duration BETWEEN 6000 AND 2000000)
);

-- إضافة تعليقات
COMMENT ON TABLE reminder_whatsapp_settings IS 'إعدادات الواتساب الفنية للإرسال';
COMMENT ON COLUMN reminder_whatsapp_settings.api_key IS 'مفتاح API الخاص بالخدمة';
COMMENT ON COLUMN reminder_whatsapp_settings.delay_between_messages IS 'مدة التأخير بين الرسائل بالميلي ثانية (3000-15000)';
COMMENT ON COLUMN reminder_whatsapp_settings.jitter_factor IS 'عامل Jitter للتأخير العشوائي (100-2000)';
COMMENT ON COLUMN reminder_whatsapp_settings.messages_before_break IS 'عدد الرسائل قبل الاستراحة (5-50)';
COMMENT ON COLUMN reminder_whatsapp_settings.break_duration IS 'مدة الاستراحة المطولة بالميلي ثانية (6000-2000000)';

-- إضافة row واحد افتراضي
INSERT INTO reminder_whatsapp_settings (
    api_key,
    delay_between_messages,
    jitter_factor,
    messages_before_break,
    break_duration
)
VALUES (
    '',  -- سيتم ملؤه من قبل المستخدم
    5002,
    100,
    5,
    6000
);

-- ======================================

-- 3. جدول المستخدمين (Reminder Users)
CREATE TABLE reminder_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إضافة تعليقات
COMMENT ON TABLE reminder_users IS 'جدول مستخدمي نظام التذكير التلقائي';
COMMENT ON COLUMN reminder_users.full_name IS 'الاسم الكامل للمستخدم';
COMMENT ON COLUMN reminder_users.username IS 'اسم المستخدم (فريد)';
COMMENT ON COLUMN reminder_users.password_hash IS 'كلمة المرور المشفرة';
COMMENT ON COLUMN reminder_users.is_active IS 'حالة تفعيل المستخدم';

-- إنشاء index على username للبحث السريع
CREATE INDEX idx_reminder_users_username ON reminder_users(username);

-- إضافة مستخدم افتراضي (admin)
-- اسم المستخدم: admin
-- كلمة المرور: admin
INSERT INTO reminder_users (full_name, username, password_hash)
VALUES (
    'مهدي رشيد',
    'admin',
    '$2b$10$HzZo75biqsjB.JBni4FYm.1M1kPximk17oWe6sTt8RJjAbaRIefla'
);

-- ======================================

-- 4. جدول جلسات تسجيل الدخول (Reminder Sessions)
CREATE TABLE reminder_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES reminder_users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إضافة تعليقات
COMMENT ON TABLE reminder_sessions IS 'جدول جلسات تسجيل الدخول لنظام التذكير';
COMMENT ON COLUMN reminder_sessions.user_id IS 'معرف المستخدم';
COMMENT ON COLUMN reminder_sessions.session_token IS 'رمز الجلسة الفريد';
COMMENT ON COLUMN reminder_sessions.expires_at IS 'تاريخ انتهاء صلاحية الجلسة';
COMMENT ON COLUMN reminder_sessions.ip_address IS 'عنوان IP للمستخدم';
COMMENT ON COLUMN reminder_sessions.user_agent IS 'معلومات المتصفح';

-- إنشاء indexes
CREATE INDEX idx_reminder_sessions_token ON reminder_sessions(session_token);
CREATE INDEX idx_reminder_sessions_user_id ON reminder_sessions(user_id);
CREATE INDEX idx_reminder_sessions_expires_at ON reminder_sessions(expires_at);

-- Function لحذف الجلسات المنتهية تلقائياً
CREATE OR REPLACE FUNCTION delete_expired_reminder_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM reminder_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ======================================

-- Functions لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إضافة Triggers للجداول
CREATE TRIGGER update_reminder_message_template_updated_at
    BEFORE UPDATE ON reminder_message_template
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_whatsapp_settings_updated_at
    BEFORE UPDATE ON reminder_whatsapp_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminder_users_updated_at
    BEFORE UPDATE ON reminder_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ======================================

-- Row Level Security (RLS) - اختياري للأمان
-- يمكنك تفعيله إذا كنت تستخدم Supabase Auth

ALTER TABLE reminder_message_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_sessions ENABLE ROW LEVEL SECURITY;

-- مثال على policy (يمكن تعديله حسب احتياجاتك)
CREATE POLICY "Allow all operations for authenticated users" ON reminder_message_template
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON reminder_whatsapp_settings
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON reminder_users
    FOR ALL USING (true);

CREATE POLICY "Allow all operations for authenticated users" ON reminder_sessions
    FOR ALL USING (true);

-- ======================================
-- ملاحظات مهمة:
-- 1. استبدل password_hash بـ hash حقيقي باستخدام bcrypt
-- 2. قم بتعديل RLS policies حسب احتياجات الأمان
-- 3. يمكن إضافة جدول logs للتتبع إذا لزم الأمر
-- ======================================
