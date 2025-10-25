import { NextResponse } from "next/server"
import { Pool } from "pg"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { host, port, database, user, password } = await request.json()

    if (!host || !port || !database || !user || !password) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    const connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}`

    console.log("[v0] Testing PostgreSQL connection to:", `${host}:${port}/${database}`)

    const pool = new Pool({
      connectionString,
      max: 1,
      connectionTimeoutMillis: 5000,
    })

    const result = await pool.query("SELECT version()")
    await pool.end()

    console.log("[v0] PostgreSQL connection successful:", result.rows[0])

    return NextResponse.json({
      success: true,
      version: result.rows[0].version,
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
