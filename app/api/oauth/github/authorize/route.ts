import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") // Optional - for account linking
    const fingerprint = searchParams.get("fingerprint") // Device fingerprint

    const clientId = process.env.GITHUB_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/oauth/github/callback`
    
    if (!clientId) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <title>GitHub OAuth غير مُعد</title>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #24292e 0%, #000000 100%);
              color: white;
            }
            .container {
              background: white;
              color: #333;
              padding: 40px;
              border-radius: 12px;
              max-width: 600px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            }
            h1 {
              color: #24292e;
              margin-top: 0;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .icon { font-size: 32px; }
            ol { text-align: right; padding-right: 20px; }
            li { margin: 10px 0; }
            code {
              background: #f3f4f6;
              padding: 2px 6px;
              border-radius: 4px;
              font-family: monospace;
            }
            .close-btn {
              background: #24292e;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
              margin-top: 20px;
              width: 100%;
            }
            .close-btn:hover { background: #1a1e22; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1><span class="icon">⚠️</span> GitHub OAuth غير مُعد</h1>
            <p>لاستخدام ميزة الربط مع GitHub، يرجى إعداد OAuth أولاً:</p>
            <ol>
              <li>اذهب إلى <a href="https://github.com/settings/developers" target="_blank">GitHub Developer Settings</a></li>
              <li>أنشئ OAuth App جديد</li>
              <li>أضف Callback URL: <code>http://localhost:3000/api/oauth/github/callback</code></li>
              <li>أضف في ملف <code>.env.local</code>:
                <pre style="background:#f3f4f6;padding:12px;border-radius:6px;margin-top:8px;">GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here</pre>
              </li>
              <li>أعد تشغيل السيرفر</li>
            </ol>
            <button class="close-btn" onclick="window.close()">إغلاق</button>
          </div>
        </body>
        </html>
        `,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    }

    const authUrl = new URL("https://github.com/login/oauth/authorize")
    authUrl.searchParams.set("client_id", clientId)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("scope", "read:user user:email")
    
    // Build state parameter with userId and fingerprint
    const stateData = {
      userId: userId || null,
      fingerprint: fingerprint || null
    }
    authUrl.searchParams.set("state", JSON.stringify(stateData))

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to initiate GitHub OAuth" },
      { status: 500 }
    )
  }
}
