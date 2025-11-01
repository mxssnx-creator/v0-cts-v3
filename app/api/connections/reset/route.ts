import { NextResponse } from "next/server"
import { ConnectionManager } from "@/lib/connection-manager"

export async function POST() {
  try {
    ConnectionManager.resetToPresets()
    const connections = ConnectionManager.getConnections()
    return NextResponse.json({ connections })
  } catch (error) {
    return NextResponse.json({ error: "Failed to reset connections" }, { status: 500 })
  }
}
