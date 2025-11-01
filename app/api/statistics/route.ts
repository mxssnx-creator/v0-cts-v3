import { NextResponse } from "next/server"
import { ConnectionManager } from "@/lib/connection-manager"

export async function GET() {
  try {
    const statistics = ConnectionManager.getStatistics()
    return NextResponse.json({ statistics })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch statistics" }, { status: 500 })
  }
}
