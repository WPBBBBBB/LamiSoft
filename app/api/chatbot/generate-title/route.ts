import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationText, language = "ar" } = body

    if (!conversationText) {
      return NextResponse.json(
        { error: "Conversation text is required" },
        { status: 400 }
      )
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      // Fallback: extract first question
      const lines = conversationText.split("\n")
      const firstUserLine = lines.find((line: string) => line.startsWith("User:"))
      if (firstUserLine) {
        const content = firstUserLine.replace("User:", "").trim()
        return NextResponse.json({
          title: content.length > 30 ? content.slice(0, 30) + "..." : content
        })
      }
      return NextResponse.json({ title: "محادثة جديدة" })
    }

    // Build prompt for title generation
    const prompt = language === "ar" 
      ? `بناءً على المحادثة التالية، أعطني عنواناً قصيراً ومختصراً (لا يزيد عن 4-5 كلمات) يلخص موضوع المحادثة. لا تضع علامات ترقيم أو أقواس، فقط العنوان المباشر.

المحادثة:
${conversationText}

العنوان المقترح:`
      : language === "ku"
      ? `بەپێی ئەم گفتوگۆیەی خوارەوە، سەردێڕێکی کورت و پوختم پێ بدە (زیاتر لە 4-5 وشە نەبێت) کە بابەتی گفتوگۆکە پوخت بکاتەوە. هیچ نیشانەیەکی خاڵبەندی یان کەوانە دانەنێ، تەنها سەردێڕی ڕاستەوخۆ.

گفتوگۆکە:
${conversationText}

سەردێڕی پێشنیارکراو:`
      : `Based on the following conversation, give me a short and concise title (no more than 4-5 words) that summarizes the topic. Don't include punctuation or quotes, just the direct title.

Conversation:
${conversationText}

Suggested title:`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 50,
      }),
    })

    if (!response.ok) {
      throw new Error("OpenAI API error")
    }

    const data = await response.json()
    const title = data.choices?.[0]?.message?.content?.trim() || "محادثة جديدة"

    return NextResponse.json({ title })
  } catch (error) {
    console.error("Error generating title:", error)
    
    // Fallback: return default title
    return NextResponse.json({ 
      title: "محادثة جديدة"
    })
  }
}
