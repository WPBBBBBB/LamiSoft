import { NextResponse } from "next/server"
import { getCustomersWithPayments } from "@/lib/whatsapp-customers-operations"

export async function GET() {
  try {
    const customers = await getCustomersWithPayments()
    return NextResponse.json(customers)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load customers" },
      { status: 500 }
    )
  }
}
