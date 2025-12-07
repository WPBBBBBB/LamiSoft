-- إضافة أعمدة تتبع تسجيل الدخول لجدول users
-- نفذ هذا الكود في SQL Editor في Supabase

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_login_method VARCHAR(50), -- 'password' أو 'google' أو 'microsoft' أو 'github'
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- إنشاء جدول لتسجيل محاولات تسجيل الدخول
CREATE TABLE IF NOT EXISTS login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(100),
    login_method VARCHAR(50) NOT NULL, -- 'password', 'google', 'microsoft', 'github'
    success BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON login_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_login_logs_success ON login_logs(success);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);

-- تعليقات
COMMENT ON COLUMN users.last_login_at IS 'وقت آخر تسجيل دخول';
COMMENT ON COLUMN users.last_login_method IS 'طريقة آخر تسجيل دخول';
COMMENT ON COLUMN users.login_count IS 'عدد مرات تسجيل الدخول';
COMMENT ON COLUMN users.is_active IS 'هل الحساب نشط';
COMMENT ON TABLE login_logs IS 'سجل محاولات تسجيل الدخول';

-- دالة لتحديث معلومات تسجيل الدخول
CREATE OR REPLACE FUNCTION update_user_login_info(
    p_user_id UUID,
    p_login_method VARCHAR(50)
)
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET 
        last_login_at = NOW(),
        last_login_method = p_login_method,
        login_count = COALESCE(login_count, 0) + 1,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_user_login_info IS 'تحديث معلومات تسجيل الدخول للمستخدم';
