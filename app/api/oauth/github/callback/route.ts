import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { recordFailedOAuthAttempt, resetOAuthBlock } from "@/lib/oauth-security"
import { AUTH_SESSION_COOKIE, createSessionToken } from "@/lib/auth-session"

const OAUTH_LOGIN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

function isSecureRequest(request: NextRequest): boolean {
  const proto = request.headers.get("x-forwarded-proto")
  if (proto) return proto === "https"
  return new URL(request.url).protocol === "https:"
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const stateParam = searchParams.get("state")
    const error = searchParams.get("error")

    // Parse state parameter
    let userId = null
    let fingerprint = null
    if (stateParam) {
      try {
        const stateData = JSON.parse(stateParam)
        userId = stateData.userId
        fingerprint = stateData.fingerprint
      } catch {
        // If not JSON, treat as userId (backward compatibility)
        userId = stateParam
      }
    }

    if (error || !code) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
        <head><title>OAuth Error</title></head>
        <body>
          <script>
            window.opener?.postMessage({
              type: 'oauth-error',
              provider: 'github',
              error: '${error || "فشل المصادقة"}'
            }, '*');
            window.close();
          </script>
        </body>
        </html>
        `,
        { headers: { "Content-Type": "text/html" } }
      )
    }

    // Exchange code for tokens
    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/oauth/github/callback`

    if (!clientId || !clientSecret) {
      throw new Error("GitHub OAuth credentials not configured")
    }

    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
      }
    )

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for tokens")
    }

    const tokens = await tokenResponse.json()

    // Get user info from GitHub
    const userInfoResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!userInfoResponse.ok) {
      throw new Error("Failed to get user info")
    }

    const userInfo = await userInfoResponse.json()

    // Get user email if not public
    let email = userInfo.email
    if (!email) {
      const emailResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: "application/vnd.github.v3+json",
        },
      })
      if (emailResponse.ok) {
        const emails = await emailResponse.json()
        const primaryEmail = emails.find((e: { primary: boolean; email: string }) => e.primary)
        email = primaryEmail?.email || emails[0]?.email
      }
    }

    let user

    // If userId provided (account linking)
    if (userId) {
      // Link OAuth account to existing user
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          github_id: String(userInfo.id),
          github_email: email,
          avatar_url: userInfo.avatar_url || null,
          oauth_linked_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select()
        .single()

      if (updateError) throw updateError
      user = updatedUser
    } else {
      // Login/Signup flow
      // Check if user exists with this github_id
      const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("github_id", String(userInfo.id))
        .single()

      if (existingUser) {
        // User exists - login
        user = existingUser
        
        // Reset block on successful login
        if (fingerprint) {
          await resetOAuthBlock(fingerprint)
        }
      } else {
        // User not found - record failed attempt
        if (fingerprint) {
          const blockInfo = await recordFailedOAuthAttempt(
            {
              fingerprint,
              ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown'
            },
            'github',
            email || 'unknown',
            String(userInfo.id)
          )
          
          // Return error with block info
          return new NextResponse(
            `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
              <meta charset="UTF-8">
              <title>خطأ في تسجيل الدخول</title>
              <style>
                body {
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  background: linear-gradient(135deg, #434343 0%, #000000 100%);
                  margin: 0;
                  padding: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                }
                .container {
                  background: white;
                  padding: 60px 40px;
                  border-radius: 20px;
                  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                  text-align: center;
                  max-width: 500px;
                }
                .error-icon {
                  width: 80px;
                  height: 80px;
                  background: linear-gradient(135deg, #434343 0%, #000000 100%);
                  border-radius: 50%;
                  margin: 0 auto 30px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 48px;
                  color: white;
                }
                h1 {
                  color: #333;
                  margin-bottom: 20px;
                  font-size: 28px;
                }
                p {
                  color: #666;
                  font-size: 16px;
                  line-height: 1.6;
                  margin-bottom: 15px;
                }
                .block-info {
                  background: #fff3cd;
                  border: 2px solid #ffc107;
                  border-radius: 10px;
                  padding: 15px;
                  margin: 20px 0;
                  text-align: right;
                }
                .block-info strong {
                  color: #856404;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="error-icon">⚠️</div>
                <h1>حساب غير مسجل</h1>
                <p>لا يرتبط حسابك في GitHub بأي من الحسابات الموجودة في النظام</p>
                <p>يرجى التواصل مع المسؤول لإنشاء حساب لك</p>
                ${blockInfo.isBlocked ? `
                  <div class="block-info">
                    <p><strong>تنبيه:</strong> تم حظر محاولات تسجيل الدخول مؤقتاً</p>
                    <p>المستوى: ${blockInfo.blockLevel}</p>
                    <p>المحاولات الفاشلة: ${blockInfo.totalAttempts}</p>
                  </div>
                ` : ''}
                <p style="margin-top: 30px; font-size: 14px; color: #999;">سيتم إغلاق هذه النافذة تلقائياً...</p>
              </div>
              <script>
                window.opener?.postMessage({
                  type: 'oauth-error',
                  provider: 'github',
                  error: 'لا يرتبط حسابك في GitHub بأي من الحسابات الموجودة في النظام',
                  blockInfo: ${JSON.stringify(blockInfo)}
                }, '*');
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
            </html>
            `,
            { headers: { "Content-Type": "text/html" } }
          )
        }
        
        // If no fingerprint provided, just show error
        return new NextResponse(
          `
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head><meta charset="UTF-8"><title>خطأ</title></head>
          <body>
            <script>
              window.opener?.postMessage({
                type: 'oauth-error',
                provider: 'github',
                error: 'لا يرتبط حسابك في GitHub بأي من الحسابات الموجودة في النظام'
              }, '*');
              window.close();
            </script>
          </body>
          </html>
          `,
          { headers: { "Content-Type": "text/html" } }
        )
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user as Record<string, unknown> & { password?: string }

    // Success - close popup and notify parent
    const response = new NextResponse(
      `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تم تسجيل الدخول بنجاح</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #24292e 0%, #000000 100%);
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .container {
            background: white;
            padding: 60px 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 400px;
          }
          .checkmark {
            font-size: 80px;
            color: #24292e;
            animation: scaleIn 0.5s ease-out;
          }
          @keyframes scaleIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          h1 {
            color: #333;
            margin: 20px 0 10px;
            font-size: 28px;
          }
          p {
            color: #666;
            font-size: 16px;
            margin: 10px 0;
          }
          .user-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
          }
          .user-info img {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            margin-bottom: 10px;
            border: 3px solid #24292e;
          }
          .user-info .avatar-placeholder {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            margin: 0 auto 10px;
            background: linear-gradient(135deg, #24292e 0%, #000000 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 32px;
            font-weight: bold;
          }
          .user-info strong {
            display: block;
            color: #333;
            font-size: 18px;
            margin: 10px 0 5px;
          }
          .user-info span {
            color: #666;
            font-size: 14px;
          }
          .loading {
            margin-top: 20px;
            color: #24292e;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="checkmark">✓</div>
          <h1>${userId ? 'تم ربط الحساب بنجاح!' : 'تم تسجيل الدخول بنجاح!'}</h1>
          <p>مرحباً بك في التطبيق</p>
          
          <div class="user-info">
            ${userInfo.avatar_url 
              ? `<img src="${userInfo.avatar_url}" alt="Profile">` 
              : `<div class="avatar-placeholder">${user.full_name?.charAt(0)?.toUpperCase() || 'G'}</div>`
            }
            <strong>${user.full_name}</strong>
            <span>${email || userInfo.login || ''}</span>
          </div>

          <div class="loading">جاري تحويلك...</div>
        </div>

        <script>
          window.opener?.postMessage({
            type: 'oauth-success',
            provider: 'github',
            user: ${JSON.stringify(safeUser)}
          }, '*');

          setTimeout(() => {
            window.close();
          }, 1500);
        </script>
      </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    )

    // Only set login session cookie for actual login flow (not account linking)
    if (!userId) {
      const token = await createSessionToken(String(safeUser.id), OAUTH_LOGIN_MAX_AGE_SECONDS)
      response.cookies.set({
        name: AUTH_SESSION_COOKIE,
        value: token,
        httpOnly: true,
        sameSite: "lax",
        secure: isSecureRequest(request),
        path: "/",
        maxAge: OAUTH_LOGIN_MAX_AGE_SECONDS,
      })
    }

    return response
  } catch {
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head><title>OAuth Error</title></head>
      <body>
        <script>
          window.opener?.postMessage({
            type: 'oauth-error',
            provider: 'github',
            error: 'حدث خطأ أثناء الربط'
          }, '*');
          window.close();
        </script>
      </body>
      </html>
      `,
      { headers: { "Content-Type": "text/html" } }
    )
  }
}
