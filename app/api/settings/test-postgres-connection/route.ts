import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { host, port, database, user, password } = await request.json()

    if (!host || !port || !database || !user || !password) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`

    console.log("[v0] Testing PostgreSQL connection to:", `${host}:${port}/${database}`)

    const sql = neon(connectionString)
    const result = await sql`SELECT version()`

    console.log("[v0] PostgreSQL connection successful:", result[0])

    return NextResponse.json({
      success: true,
      version: result[0].version,
      message: "Connection successful",
    })
  } catch (error) {
    console.error("[v0] PostgreSQL connection test failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
      },
      { status: 500 },
    )
  }
}
