-- جدول المستخدمين
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    address TEXT,
    age INTEGER,
    permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN ('مدير', 'محاسب', 'موظف')),
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول صلاحيات المستخدمين
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    view_statistics BOOLEAN DEFAULT FALSE,
    view_reports BOOLEAN DEFAULT FALSE,
    view_services BOOLEAN DEFAULT FALSE,
    view_people BOOLEAN DEFAULT FALSE,
    view_notifications BOOLEAN DEFAULT FALSE,
    add_purchase BOOLEAN DEFAULT FALSE,
    view_stores BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_permission_type ON users(permission_type);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

-- تعطيل RLS مؤقتاً للسماح بجميع العمليات
-- يمكنك تفعيله لاحقاً عند إضافة نظام المصادقة
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions DISABLE ROW LEVEL SECURITY;

-- إذا أردت تفعيل RLS، استخدم السياسات التالية:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- سياسات RLS (معطلة حالياً - قم بإزالة التعليق عند الحاجة)
-- CREATE POLICY "Allow all operations" ON users FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all operations" ON user_permissions FOR ALL USING (true) WITH CHECK (true);

-- إضافة مستخدم مدير افتراضي (اختياري)
INSERT INTO users (full_name, username, password, permission_type, age)
VALUES ('مدير النظام', 'admin', 'admin123', 'مدير', 30)
ON CONFLICT (username) DO NOTHING;

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- إضافة المحفز لجدول المستخدمين
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- إضافة المحفز لجدول الصلاحيات
DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON user_permissions;
CREATE TRIGGER update_user_permissions_updated_at
    BEFORE UPDATE ON user_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- عرض (View) للحصول على المستخدمين مع صلاحياتهم
CREATE OR REPLACE VIEW users_with_permissions AS
SELECT 
    u.*,
    up.view_statistics,
    up.view_reports,
    up.view_services,
    up.view_people,
    up.view_notifications,
    up.add_purchase,
    up.view_stores
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id;

-- تعليقات على الجداول والأعمدة
COMMENT ON TABLE users IS 'جدول المستخدمين في النظام';
COMMENT ON TABLE user_permissions IS 'جدول صلاحيات المستخدمين التفصيلية';

COMMENT ON COLUMN users.permission_type IS 'نوع الصلاحية: مدير، محاسب، موظف';
COMMENT ON COLUMN user_permissions.view_statistics IS 'صلاحية عرض الإحصائيات';
COMMENT ON COLUMN user_permissions.view_reports IS 'صلاحية عرض التقارير';
COMMENT ON COLUMN user_permissions.view_services IS 'صلاحية عرض الخدمات';
COMMENT ON COLUMN user_permissions.view_people IS 'صلاحية عرض قائمة الأشخاص';
COMMENT ON COLUMN user_permissions.view_notifications IS 'صلاحية عرض الإشعارات في الصفحة الرئيسية';
COMMENT ON COLUMN user_permissions.add_purchase IS 'صلاحية عرض زر إضافة شراء';
COMMENT ON COLUMN user_permissions.view_stores IS 'صلاحية عرض المخازن';
