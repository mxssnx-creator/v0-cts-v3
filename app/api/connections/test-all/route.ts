import { NextResponse } from "next/server"
import { ConnectionManager } from "@/lib/connection-manager"

export async function POST() {
  try {
    await ConnectionManager.testAllConnections()
    const connections = ConnectionManager.getConnections()
    return NextResponse.json({ connections })
  } catch (error) {
    return NextResponse.json({ error: "Failed to test connections" }, { status: 500 })
  }
}
