import { NextResponse } from "next/server"
import { ConnectionManager } from "@/lib/connection-manager"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const result = await ConnectionManager.testConnection(id)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: "Failed to test connection" }, { status: 500 })
  }
}
