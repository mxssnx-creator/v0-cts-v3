import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

// POST - Toggle dashboard active status
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { is_dashboard_active } = body

    console.log("[v0] Toggling dashboard active for connection:", id, "to:", is_dashboard_active)

    await sql`
      UPDATE exchange_connections
      SET is_dashboard_active = ${is_dashboard_active}
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to toggle dashboard active:", error)
    return NextResponse.json({ error: "Failed to toggle dashboard active" }, { status: 500 })
  }
}
