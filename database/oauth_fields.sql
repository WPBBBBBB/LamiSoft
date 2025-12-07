-- إضافة أعمدة ربط الحسابات الخارجية لجدول users
-- نفذ هذا الكود في SQL Editor في Supabase

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS google_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS microsoft_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS microsoft_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS github_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS github_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS oauth_linked_at TIMESTAMP;

-- إنشاء فهارس لتحسين البحث
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_microsoft_id ON users(microsoft_id);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);

-- تعليقات على الأعمدة
COMMENT ON COLUMN users.google_id IS 'معرف حساب Google المرتبط';
COMMENT ON COLUMN users.google_email IS 'البريد الإلكتروني لحساب Google';
COMMENT ON COLUMN users.microsoft_id IS 'معرف حساب Microsoft المرتبط';
COMMENT ON COLUMN users.microsoft_email IS 'البريد الإلكتروني لحساب Microsoft';
COMMENT ON COLUMN users.github_id IS 'معرف حساب GitHub المرتبط';
COMMENT ON COLUMN users.github_username IS 'اسم المستخدم في GitHub';
COMMENT ON COLUMN users.avatar_url IS 'رابط صورة المستخدم من الحساب المرتبط';
COMMENT ON COLUMN users.oauth_linked_at IS 'تاريخ آخر ربط لحساب خارجي';

-- جدول لتسجيل محاولات الربط (اختياري - للتتبع)
CREATE TABLE IF NOT EXISTS oauth_link_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'link' أو 'unlink'
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oauth_logs_user_id ON oauth_link_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_logs_provider ON oauth_link_logs(provider);

COMMENT ON TABLE oauth_link_logs IS 'سجل محاولات ربط الحسابات الخارجية';
