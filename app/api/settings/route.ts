import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { SystemLogger } from "@/lib/system-logger"

export const runtime = "nodejs"

export async function GET() {
  try {
    console.log("[v0] GET /api/settings - Loading settings...")
    await SystemLogger.logAPI("Loading system settings", "info", "GET /api/settings")

    const result = await query("SELECT key, value FROM system_settings")
    const dbSettings = result.rows as Array<{ key: string; value: string }>

    const settings: Record<string, any> = {}

    for (const { key, value } of dbSettings) {
      // Skip volume factor settings - they're per-connection only
      if (key.includes("volume_factor")) {
        continue
      }

      // Try to parse JSON arrays/objects
      if (value && (value.startsWith("[") || value.startsWith("{"))) {
        try {
          settings[key] = JSON.parse(value)
          continue
        } catch (e) {
          console.warn("[v0] Failed to parse JSON for key:", key, "- treating as string")
        }
      }

      // Parse booleans
      if (value === "true" || value === "false") {
        settings[key] = value === "true"
        continue
      }

      // Parse numbers
      if (value && !isNaN(Number(value)) && value !== "") {
        settings[key] = Number(value)
        continue
      }

      // Keep as string
      settings[key] = value || ""
    }

    console.log("[v0] Settings loaded successfully:", Object.keys(settings).length, "keys")
    await SystemLogger.logAPI(`Settings loaded: ${Object.keys(settings).length} keys`, "info", "GET /api/settings")

    return NextResponse.json(settings)
  } catch (error) {
    console.error("[v0] Failed to get settings:", error)
    await SystemLogger.logError(error, "api", "GET /api/settings")

    return NextResponse.json(
      { error: "Failed to get settings", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    console.log("[v0] Saving settings to database:", Object.keys(body).length, "keys")
    await SystemLogger.logAPI(`Saving ${Object.keys(body).length} settings`, "info", "POST /api/settings")

    for (const [key, value] of Object.entries(body)) {
      // Skip volume factor settings - they're per-connection only
      if (key.includes("volume_factor")) {
        continue
      }

      let stringValue: string

      if (value === null || value === undefined) {
        stringValue = ""
      } else if (Array.isArray(value) || typeof value === "object") {
        stringValue = JSON.stringify(value)
      } else if (typeof value === "boolean") {
        stringValue = value.toString()
      } else if (typeof value === "number") {
        stringValue = value.toString()
      } else {
        stringValue = String(value)
      }

      await query(
        `INSERT INTO system_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT(key) DO UPDATE SET
           value = EXCLUDED.value,
           updated_at = NOW()`,
        [key, stringValue],
      )
    }

    console.log("[v0] Settings saved successfully")
    await SystemLogger.logAPI("Settings saved successfully", "info", "POST /api/settings")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to update settings:", error)
    await SystemLogger.logError(error, "api", "POST /api/settings")

    return NextResponse.json(
      { error: "Failed to update settings", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
