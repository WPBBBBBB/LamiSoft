import { NextResponse } from "next/server"
import { getCustomersWithPayments } from "@/lib/whatsapp-customers-operations"

export async function GET() {
  console.log('========== WhatsApp Customers API Called ==========')
  try {
    console.log('Starting to fetch customers...')
    const customers = await getCustomersWithPayments()
    console.log('Fetched customers:', customers.length)
    return NextResponse.json(customers)
  } catch (error) {
    console.error("Error loading WhatsApp customers:", error)
    return NextResponse.json(
      { error: "Failed to load customers" },
      { status: 500 }
    )
  }
}
