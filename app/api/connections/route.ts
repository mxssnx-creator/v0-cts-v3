import { NextResponse } from "next/server"
import { ConnectionManager } from "@/lib/connection-manager"

export async function GET() {
  try {
    const connections = ConnectionManager.getConnections()
    return NextResponse.json({ connections })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch connections" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const connection = ConnectionManager.addConnection(body)
    return NextResponse.json({ connection })
  } catch (error) {
    return NextResponse.json({ error: "Failed to add connection" }, { status: 500 })
  }
}
