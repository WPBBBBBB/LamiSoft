-- حل سريع لمشكلة RLS
-- نفذ هذا الكود في SQL Editor في Supabase

-- تعطيل RLS للجداول
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions DISABLE ROW LEVEL SECURITY;

-- حذف جميع السياسات القديمة
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON users;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON user_permissions;
DROP POLICY IF EXISTS "Allow select for service role" ON users;

-- الآن يمكنك إضافة المستخدمين بدون مشاكل!

-- ملاحظة: في بيئة الإنتاج، يجب عليك:
-- 1. تفعيل RLS مرة أخرى
-- 2. إنشاء سياسات محكمة حسب نظام المصادقة الخاص بك
-- 3. استخدام JWT tokens للتحقق من الصلاحيات
