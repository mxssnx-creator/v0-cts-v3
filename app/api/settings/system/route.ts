import { type NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { successResponse, errorResponse } from "@/lib/api-toast"

export async function GET(request: NextRequest) {
  try {
    const settings = await query(`
      SELECT category, subcategory, key, value, value_type
      FROM system_settings
      ORDER BY category, subcategory, key
    `)

    const settingsObject: Record<string, any> = {}
    for (const setting of settings) {
      const key = setting.key
      let value = setting.value

      if (setting.value_type === "number") {
        value = Number.parseFloat(value)
      } else if (setting.value_type === "boolean") {
        value = value === "true"
      } else if (setting.value_type === "json") {
        try {
          value = JSON.parse(value)
        } catch {
          value = setting.value
        }
      }

      settingsObject[key] = value
    }

    console.log("[v0] Loaded settings:", Object.keys(settingsObject).length, "keys")
    return NextResponse.json(settingsObject)
  } catch (error) {
    console.error("[v0] Failed to fetch system settings:", error)
    return NextResponse.json({})
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] Updating settings:", Object.keys(body))

    let updatedCount = 0

    for (const [key, value] of Object.entries(body)) {
      let valueStr = String(value)
      let valueType = "string"

      if (typeof value === "number") {
        valueType = "number"
      } else if (typeof value === "boolean") {
        valueType = "boolean"
      } else if (typeof value === "object") {
        valueType = "json"
        valueStr = JSON.stringify(value)
      }

      await execute(
        `
        INSERT INTO system_settings (category, subcategory, key, value, value_type)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (category, subcategory, key) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          value_type = EXCLUDED.value_type,
          updated_at = CURRENT_TIMESTAMP
      `,
        ["overall", "main", key, valueStr, valueType],
      )

      updatedCount++
      console.log("[v0] Updated setting:", key, "=", value)
    }

    return successResponse({ success: true, updated: updatedCount }, `Successfully updated ${updatedCount} setting(s)`)
  } catch (error) {
    console.error("[v0] Failed to update system settings:", error)
    return errorResponse(
      "Failed to update settings",
      "Settings Save Failed",
      "Could not save settings to database",
      500,
    )
  }
}
