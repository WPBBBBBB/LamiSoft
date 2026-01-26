import { NextRequest, NextResponse } from "next/server"

// System features and knowledge base
const SYSTEM_FEATURES = [
  "نظام نقطة بيع سريع وسهل الاستخدام",
  "دعم أنواع الأسعار (جملة ومفرد)",
  "إمكانية البيع النقدي والآجل",
  "دعم البيع بالدينار العراقي والدولار الأمريكي",
  "نظام خصومات مرن على الفواتير",
  "طباعة فواتير البيع بتصميم احترافي",
  "إمكانية إلغاء وتعديل المبيعات",
  "ربط المبيعات بحسابات العملاء تلقائياً",
  "توليد باركود تلقائي لكل فاتورة بيع",
  "تسجيل المشتريات من الموردين",
  "تصنيف المشتريات (محلي، استيراد، إعادة)",
  "دعم الدفع النقدي والآجل للمشتريات",
  "ربط المشتريات بحسابات الموردين",
  "إضافة المنتجات للمخزون تلقائياً عند الشراء",
  "إدارة مخازن متعددة بتفاصيل كاملة",
  "نظام جرد دوري شامل للمخازن",
  "نقل البضائع بين المخازن",
  "تنبيهات نقص المخزون التلقائية",
  "متابعة الكميات والأسعار لكل منتج",
  "دعم وحدات قياس متعددة (كارتون، قطعة، لتر، كغم)",
  "نظام قبض وصرف للعملاء والموردين",
  "إدارة الحسابات الآجلة (الديون)",
  "دعم العمليات بالدينار العراقي والدولار",
  "تحديث سعر الصرف ديناميكياً",
  "تسجيل جميع الحركات المالية",
  "تقارير شاملة للمبيعات والمشتريات",
  "تقارير الأرباح والخسائر",
  "تقارير حسابات العملاء والموردين",
  "تقارير حركة المخزون والنقل بين المخازن",
  "إحصائيات مرئية على الشاشة الرئيسية",
  "نظام صلاحيات مرن (مدير، محاسب، موظف)",
  "تحكم دقيق في صلاحيات كل مستخدم",
  "سجل كامل لنشاطات المستخدمين (System Log)",
  "تسجيل الدخول بأمان مع تشفير كلمات المرور",
  "دعم تسجيل الدخول بـ Google, Microsoft, GitHub",
  "إرسال تنبيهات للعملاء عبر واتساب تلقائياً",
  "إدارة رسائل التذكير للديون المستحقة",
  "مراقبة حالة الرسائل المرسلة",
  "أكثر من 15 ثيم (سمة) مختلفة",
  "دعم الوضع الليلي والنهاري",
  "تخصيص الخطوط (10+ خطوط عربية)",
  "إعدادات طباعة قابلة للتخصيص",
  "حفظ الإعدادات للمستخدم",
  "إشعارات فورية لنقص المخزون",
  "تنبيهات الديون المستحقة",
  "إشعارات الأنشطة المهمة",
  "لوحة إشعارات قابلة للتخصيص",
  "تشفير كلمات المرور بخوارزميات آمنة",
  "سجل كامل لجميع العمليات",
  "حماية من محاولات الاختراق",
  "نظام أمان متعدد الطبقات",
  "واجهة عربية كاملة سهلة الاستخدام",
  "تصميم عصري ومتجاوب مع جميع الأجهزة",
  "اختصارات لوحة المفاتيح للعمليات السريعة",
  "بحث ذكي وسريع في البيانات",
  "تنقل سلس بين الصفحات",
  "طباعة فواتير احترافية",
  "طباعة تقارير المخزون",
  "تصدير البيانات بصيغ متعددة",
  "باركود و QR Code للمنتجات والفواتير",
  "نسخ احتياطي للبيانات",
  "استيراد وتصدير البيانات",
  "تصفير النظام مع حفظ الإعدادات",
  "مزامنة تلقائية مع قاعدة البيانات",
  "دعم العمل بدون إنترنت (Offline-first)",
  "واجهة PWA قابلة للتثبيت كتطبيق",
  "دعم ثلاث لغات (عربي، كردي، إنجليزي)",
]

function buildSystemPrompt(language: string): string {
  const featuresText = SYSTEM_FEATURES.join("\n- ")

  if (language === "ar") {
    return `أنت مساعد ذكي لنظام "اللامي سوفت" (AL-LamiSoft)، وهو نظام إدارة متكامل للمبيعات والمشتريات والمخزون.

**دورك:**
- الإجابة على أسئلة المستخدمين حول مميزات وإمكانيات النظام فقط.
- تقديم معلومات دقيقة وواضحة بناءً على المميزات المتوفرة في النظام.
- عدم الإجابة عن أي شيء خارج نطاق النظام.

**قواعد مهمة:**
1. أجب فقط عن الأسئلة المتعلقة بنظام "اللامي سوفت" ومميزاته.
2. إذا سُئلت عن ميزة غير موجودة في النظام، اعتذر بوضوح وأخبر المستخدم أن هذه الميزة غير متوفرة حالياً.
3. لا تختلق معلومات أو مميزات غير موجودة.
4. كن دقيقاً ومختصراً في إجاباتك.
5. استخدم اللغة العربية الفصحى البسيطة.

**مميزات النظام المتوفرة (70+ ميزة):**
- ${featuresText}

**معلومات إضافية:**
- النظام مبني على Next.js و React و TypeScript
- قاعدة البيانات: Supabase (PostgreSQL)
- واجهة المستخدم: Tailwind CSS + shadcn/ui + Radix UI
- يدعم الطباعة (jsPDF) والتصدير (ExcelJS)
- باركود/QR: jsbarcode, qrcode, html5-qrcode
- الرسوم البيانية: Recharts
- التخزين المحلي: Dexie (IndexedDB)
- PWA للعمل بدون إنترنت
- Capacitor لتطبيق Android

أجب بناءً على هذه المعلومات فقط.`
  }

  if (language === "ku") {
    return `تۆ یارمەتیدەرێکی زیرەکی بۆ سیستەمی "لامی سۆفت" (AL-LamiSoft)ی، کە سیستەمێکی تەواوی بەڕێوەبردنی فرۆشتن و کڕین و کۆگایە.

**ڕۆڵی تۆ:**
- وەڵامدانەوەی پرسیارەکانی بەکارهێنەران دەربارەی تایبەتمەندی و توانای سیستەمەکە تەنها.
- پێشکەشکردنی زانیاری وورد و ڕوون بەپێی تایبەتمەندییە بەردەستەکانی سیستەمەکە.
- وەڵام نەدانەوە بۆ هیچ شتێک لە دەرەوەی سیستەمەکە.

**یاساکانی گرنگ:**
1. تەنها وەڵامی پرسیارە پەیوەستەکان بە سیستەمی "لامی سۆفت" و تایبەتمەندییەکانی بدەرەوە.
2. ئەگەر پرسیارێکت لێکرا دەربارەی تایبەتمەندییەک کە لە سیستەمەکەدا نییە، بە ڕوونی لێبووردنی بخوازە و پێی بڵێ کە ئەم تایبەتمەندییە ئێستا بەردەست نییە.
3. زانیاری یان تایبەتمەندی هەڵبەست مەکە.
4. وورد و کورت بە لە وەڵامەکانتدا.
5. زمانی کوردی بەکاربهێنە.

**تایبەتمەندییە بەردەستەکانی سیستەمەکە (70+ تایبەتمەندی):**
- ${featuresText}

وەڵام بدەرەوە بەپێی ئەم زانیارییانە تەنها.`
  }

  // English
  return `You are an intelligent assistant for the "AL-LamiSoft" system, a comprehensive management system for sales, purchases, and inventory.

**Your role:**
- Answer user questions about the system's features and capabilities only.
- Provide accurate and clear information based on the available system features.
- Do not answer anything outside the scope of the system.

**Important rules:**
1. Only answer questions related to the "AL-LamiSoft" system and its features.
2. If asked about a feature not available in the system, clearly apologize and inform the user that this feature is not currently available.
3. Do not fabricate information or features that don't exist.
4. Be precise and concise in your answers.
5. Use simple, clear English.

**Available System Features (70+ features):**
- ${featuresText}

**Additional Information:**
- Built with Next.js, React, TypeScript
- Database: Supabase (PostgreSQL)
- UI: Tailwind CSS + shadcn/ui + Radix UI
- Printing support (jsPDF) and export (ExcelJS)
- Barcode/QR: jsbarcode, qrcode, html5-qrcode
- Charts: Recharts
- Local storage: Dexie (IndexedDB)
- PWA for offline work
- Capacitor for Android app

Answer based on this information only.`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages, language = "ar" } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request: messages array required" },
        { status: 400 }
      )
    }

    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          reply:
            language === "ar"
              ? "عذراً، الشات بوت غير مُهيأ حالياً. يرجى إضافة OPENAI_API_KEY في متغيرات البيئة."
              : language === "ku"
                ? "ببورە، چات بۆت ئێستا ڕێکخراو نییە. تکایە OPENAI_API_KEY لە گۆڕاوەکانی ژینگە زیاد بکە."
                : "Sorry, the chatbot is not configured. Please add OPENAI_API_KEY to environment variables.",
        },
        { status: 200 }
      )
    }

    // Build conversation history with system prompt
    const systemPrompt = buildSystemPrompt(language)
    const conversationMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
    ]

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o", // Use gpt-4o or gpt-5 when available
        messages: conversationMessages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("OpenAI API Error:", errorData)
      return NextResponse.json(
        {
          reply:
            language === "ar"
              ? "عذراً، حدث خطأ في الاتصال بخدمة الذكاء الاصطناعي. يرجى المحاولة لاحقاً."
              : language === "ku"
                ? "ببورە، هەڵەیەک ڕوویدا لە پەیوەندی بە خزمەتگوزاریی زیرەکی دەستکرد. تکایە دواتر هەوڵ بدەرەوە."
                : "Sorry, an error occurred while connecting to the AI service. Please try again later.",
        },
        { status: 200 }
      )
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || ""

    return NextResponse.json({ reply })
  } catch (error) {
    console.error("Chatbot API Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
