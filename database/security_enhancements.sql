-- إضافة حقول أمان إضافية لجدول users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- تحديث جدول login_logs لإضافة IP address
ALTER TABLE login_logs 
ALTER COLUMN ip_address TYPE VARCHAR(100);

-- إنشاء جدول لتخزين رموز OTP
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- 'password_reset', 'verify_phone', etc.
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء فهارس
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_account_locked ON users(account_locked_until);

-- دالة لإعادة تعيين محاولات تسجيل الدخول الفاشلة
CREATE OR REPLACE FUNCTION reset_failed_login_attempts(p_user_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE users 
    SET 
        failed_login_attempts = 0,
        account_locked_until = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- دالة لزيادة محاولات تسجيل الدخول الفاشلة
CREATE OR REPLACE FUNCTION increment_failed_login_attempts(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    new_attempts INTEGER;
BEGIN
    UPDATE users 
    SET 
        failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
        -- قفل الحساب لمدة 15 دقيقة بعد 5 محاولات فاشلة
        account_locked_until = CASE 
            WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 
            THEN NOW() + INTERVAL '15 minutes'
            ELSE account_locked_until
        END,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING failed_login_attempts INTO new_attempts;
    
    RETURN new_attempts;
END;
$$ LANGUAGE plpgsql;

-- دالة للتحقق من أن الحساب غير مقفل
CREATE OR REPLACE FUNCTION is_account_locked(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT account_locked_until INTO locked_until
    FROM users 
    WHERE id = p_user_id;
    
    IF locked_until IS NULL THEN
        RETURN false;
    END IF;
    
    IF locked_until > NOW() THEN
        RETURN true;
    ELSE
        -- إذا انتهت فترة القفل، نقوم بإعادة تعيين المحاولات
        PERFORM reset_failed_login_attempts(p_user_id);
        RETURN false;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN users.failed_login_attempts IS 'عدد محاولات تسجيل الدخول الفاشلة';
COMMENT ON COLUMN users.account_locked_until IS 'وقت قفل الحساب حتى';
COMMENT ON COLUMN users.password_changed_at IS 'آخر مرة تم فيها تغيير كلمة المرور';
COMMENT ON COLUMN users.must_change_password IS 'يجب تغيير كلمة المرور عند الدخول القادم';
COMMENT ON TABLE otp_codes IS 'جدول رموز التحقق OTP';
