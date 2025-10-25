import { type NextRequest, NextResponse } from "next/server"
import DatabaseManager from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const resolved = searchParams.get("resolved") === "true"

    const db = DatabaseManager.getInstance()
    const errors = await db.getErrors(limit, resolved)

    return NextResponse.json({ errors })
  } catch (error) {
    console.error("Error fetching errors:", error)
    return NextResponse.json({ error: "Failed to fetch errors" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Error ID is required" }, { status: 400 })
    }

    const db = DatabaseManager.getInstance()
    await db.resolveError(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error resolving error:", error)
    return NextResponse.json({ error: "Failed to resolve error" }, { status: 500 })
  }
}
