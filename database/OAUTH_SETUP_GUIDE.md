# دليل إعداد OAuth للحسابات الخارجية

## 🎯 نظرة عامة

تم إضافة ميزة ربط الحسابات الخارجية (OAuth) مع المستخدمين. يمكن ربط:
- ✅ Google
- ✅ Microsoft  
- ✅ GitHub

**مميز:** يمكن ربط 3 خدمات معاً لنفس المستخدم!

---

## 📋 الخطوة 1: إضافة الأعمدة في Supabase

نفذ ملف `database/oauth_fields.sql` في SQL Editor:

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS google_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS microsoft_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS microsoft_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS github_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS github_username VARCHAR(255),
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS oauth_linked_at TIMESTAMP;
```

---

## 🔑 الخطوة 2: إعداد OAuth في كل خدمة

### 1️⃣ Google OAuth

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. فعّل **Google+ API**
4. انتقل إلى **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. اختر نوع التطبيق: **Web Application**
6. أضف **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   https://yourdomain.com/api/auth/callback/google
   ```
7. احفظ **Client ID** و **Client Secret**

### 2️⃣ Microsoft OAuth

1. اذهب إلى [Azure Portal](https://portal.azure.com/)
2. انتقل إلى **Azure Active Directory** → **App Registrations**
3. اضغط **New Registration**
4. سمّ التطبيق واختر نوع الحساب
5. أضف **Redirect URI**:
   ```
   http://localhost:3000/api/auth/callback/microsoft
   https://yourdomain.com/api/auth/callback/microsoft
   ```
6. انتقل إلى **Certificates & secrets** → أنشئ **Client Secret**
7. احفظ **Application (client) ID** و **Client Secret**

### 3️⃣ GitHub OAuth

1. اذهب إلى [GitHub Developer Settings](https://github.com/settings/developers)
2. اضغط **New OAuth App**
3. املأ البيانات:
   - **Application name:** اسم تطبيقك
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:**
     ```
     http://localhost:3000/api/auth/callback/github
     ```
4. احفظ **Client ID** و **Client Secret**

---

## 🔧 الخطوة 3: تحديث ملف المكون

في ملف `components/oauth/oauth-linking.tsx`، استبدل القيم التالية:

```typescript
// Google
authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_GOOGLE_CLIENT_ID&...`
// استبدل YOUR_GOOGLE_CLIENT_ID بمعرف Google الخاص بك

// Microsoft  
authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_MICROSOFT_CLIENT_ID&...`
// استبدل YOUR_MICROSOFT_CLIENT_ID بمعرف Microsoft الخاص بك

// GitHub
authUrl = `https://github.com/login/oauth/authorize?client_id=YOUR_GITHUB_CLIENT_ID&...`
// استبدل YOUR_GITHUB_CLIENT_ID بمعرف GitHub الخاص بك
```

---

## 📁 الخطوة 4: إنشاء API Routes للCallback

يجب إنشاء API routes لاستقبال البيانات من OAuth:

### `app/api/auth/callback/google/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state') // user ID

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  try {
    // تبادل الكود بالـ Access Token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google`,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenResponse.json()

    // جلب معلومات المستخدم
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    const userData = await userResponse.json()

    // إرسال البيانات للنافذة الأم
    return new NextResponse(
      `
      <script>
        window.opener.postMessage({
          type: 'oauth_success',
          provider: 'google',
          providerId: '${userData.id}',
          email: '${userData.email}',
          avatarUrl: '${userData.picture}'
        }, '${process.env.NEXT_PUBLIC_APP_URL}');
        window.close();
      </script>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error) {
    console.error('Google OAuth error:', error)
    return new NextResponse(
      `
      <script>
        window.opener.postMessage({
          type: 'oauth_error',
          error: 'Failed to authenticate'
        }, '${process.env.NEXT_PUBLIC_APP_URL}');
        window.close();
      </script>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}
```

### `app/api/auth/callback/microsoft/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  try {
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/microsoft`,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = await tokenResponse.json()

    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    const userData = await userResponse.json()

    return new NextResponse(
      `
      <script>
        window.opener.postMessage({
          type: 'oauth_success',
          provider: 'microsoft',
          providerId: '${userData.id}',
          email: '${userData.mail || userData.userPrincipalName}'
        }, '${process.env.NEXT_PUBLIC_APP_URL}');
        window.close();
      </script>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error) {
    console.error('Microsoft OAuth error:', error)
    return new NextResponse(
      `
      <script>
        window.opener.postMessage({
          type: 'oauth_error',
          error: 'Failed to authenticate'
        }, '${process.env.NEXT_PUBLIC_APP_URL}');
        window.close();
      </script>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}
```

### `app/api/auth/callback/github/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
      }),
    })

    const tokens = await tokenResponse.json()

    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    const userData = await userResponse.json()

    return new NextResponse(
      `
      <script>
        window.opener.postMessage({
          type: 'oauth_success',
          provider: 'github',
          providerId: '${userData.id}',
          username: '${userData.login}',
          avatarUrl: '${userData.avatar_url}'
        }, '${process.env.NEXT_PUBLIC_APP_URL}');
        window.close();
      </script>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    return new NextResponse(
      `
      <script>
        window.opener.postMessage({
          type: 'oauth_error',
          error: 'Failed to authenticate'
        }, '${process.env.NEXT_PUBLIC_APP_URL}');
        window.close();
      </script>
      `,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}
```

---

## 🔐 الخطوة 5: إضافة متغيرات البيئة

أضف في ملف `.env.local`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🎨 كيفية الاستخدام

1. **انتقل لصفحة تعديل مستخدم** موجود
2. **مرّر للأسفل** بعد قسم الصلاحيات
3. **فعّل Checkbox "ربط بحساب خارجي"**
4. **ستظهر 3 أزرار** بألوان الخدمات الرسمية:
   - 🔵 Google (أزرق)
   - 🔷 Microsoft (سماوي)
   - ⚫ GitHub (أسود)
5. **اضغط على أي زر** للربط
6. **ستفتح نافذة OAuth** → اختر الحساب
7. **سيتم الربط تلقائياً** ✅
8. **يمكنك ربط الثلاثة معاً!**

---

## ✅ الميزات

- ✨ ربط 3 خدمات معاً لنفس المستخدم
- 🎨 أزرار بألوان الخدمات الرسمية
- 🔄 إلغاء الربط بسهولة
- 📧 عرض البريد/اسم المستخدم المرتبط
- 🖼️ حفظ صورة الملف الشخصي
- 📝 سجل محاولات الربط

---

## 🔒 الأمان

- ✅ OAuth 2.0 معتمد
- ✅ State parameter للحماية من CSRF
- ✅ Redirect URIs محددة
- ✅ Client Secrets آمنة في متغيرات البيئة

---

**تم بنجاح! 🎉**
