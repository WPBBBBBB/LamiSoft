import { NextRequest, NextResponse } from "next/server"
import { getWhatsAppSettings, updateWhatsAppSettings } from "@/lib/whatsapp-settings-operations"

export async function GET() {
  try {
    const settings = await getWhatsAppSettings()
    const apiKey = process.env.WASENDER_API_KEY || ""
    
    return NextResponse.json({
      ...settings,
      apiKey: apiKey,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { settings, updatedBy, fullName } = body
    
    if (!settings) {
      return NextResponse.json(
        { error: "Settings data is required" },
        { status: 400 }
      )
    }
    
    const updatedSettings = await updateWhatsAppSettings(
      settings,
      updatedBy,
      fullName
    )
    
    return NextResponse.json(updatedSettings)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to update settings: ${errorMessage}` },
      { status: 500 }
    )
  }
}
