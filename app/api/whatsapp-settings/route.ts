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
    console.error("Error loading WhatsApp settings:", error)
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
    
    console.log("Received POST request with:", { settings, updatedBy, fullName })
    
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
    
    console.log("Successfully updated settings:", updatedSettings)
    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error("Error updating WhatsApp settings:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    console.error("Error details:", errorMessage)
    return NextResponse.json(
      { error: `Failed to update settings: ${errorMessage}` },
      { status: 500 }
    )
  }
}
