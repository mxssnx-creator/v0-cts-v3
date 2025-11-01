import { NextResponse } from "next/server"
import { ConnectionManager } from "@/lib/connection-manager"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const connection = ConnectionManager.getConnection(id)

  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 })
  }

  return NextResponse.json({ connection })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const connection = ConnectionManager.updateConnection(id, body)

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    return NextResponse.json({ connection })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update connection" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const success = ConnectionManager.removeConnection(id)

    if (!success) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete connection" }, { status: 500 })
  }
}
