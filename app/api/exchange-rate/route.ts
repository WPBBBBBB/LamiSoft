import { NextResponse } from "next/server"

export async function GET() {
  try {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      )
    }

    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`,
      { cache: "no-store" }
    )

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rate")
    }

    const data = await response.json()
    
    if (data.result !== "success") {
      throw new Error(data["error-type"] || "Unknown error")
    }

    const iqd_rate = data.conversion_rates.IQD

    return NextResponse.json({
      rate: iqd_rate,
      timestamp: data.time_last_update_unix,
      date: data.time_last_update_utc
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch exchange rate" },
      { status: 500 }
    )
  }
}
