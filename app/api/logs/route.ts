import { NextResponse } from "next/server"
import { ConnectionManager } from "@/lib/connection-manager"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get("connectionId")

    const logs = ConnectionManager.getLogs(connectionId || undefined)
    return NextResponse.json({ logs })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const connectionId = searchParams.get("connectionId")

    ConnectionManager.clearLogs(connectionId || undefined)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to clear logs" }, { status: 500 })
  }
}
