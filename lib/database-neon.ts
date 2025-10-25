import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

class DatabaseManager {
  private static instance: DatabaseManager

  private constructor() {
    // Neon doesn't need initialization - it's serverless
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  // Connection methods
  public async insertConnection(connection: any) {
    const result = await sql`
      INSERT INTO exchange_connections (id, name, exchange, api_type, connection_method, api_key, api_secret)
      VALUES (${connection.id}, ${connection.name}, ${connection.exchange}, ${connection.api_type}, 
              ${connection.connection_method}, ${connection.api_key}, ${connection.api_secret})
      RETURNING *
    `
    return result[0]
  }

  public async getConnections() {
    return await sql`SELECT * FROM exchange_connections ORDER BY created_at DESC`
  }

  public async updateConnectionStatus(id: string, is_enabled: boolean, is_live_trade: boolean) {
    return await sql`
      UPDATE exchange_connections 
      SET is_enabled = ${is_enabled}, is_live_trade = ${is_live_trade}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${id}
      RETURNING *
    `
  }

  // Settings methods
  public async getSetting(key: string): Promise<string | null> {
    const result = await sql`SELECT value FROM system_settings WHERE key = ${key}`
    return result[0]?.value || null
  }

  public async setSetting(key: string, value: string) {
    return await sql`
      INSERT INTO system_settings (key, value, updated_at) 
      VALUES (${key}, ${value}, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `
  }

  public async getAllSettings(): Promise<Record<string, string>> {
    const rows = await sql`SELECT key, value FROM system_settings`
    const settings: Record<string, string> = {}
    rows.forEach((row: any) => {
      settings[row.key] = row.value
    })
    return settings
  }

  // Logging methods
  public async insertLog(level: string, category: string, message: string, details?: string) {
    return await sql`
      INSERT INTO logs (level, category, message, details) 
      VALUES (${level}, ${category}, ${message}, ${details || null})
      RETURNING *
    `
  }

  public async getLogs(limit = 100, level?: string, category?: string) {
    if (level && category) {
      return await sql`
        SELECT * FROM logs 
        WHERE level = ${level} AND category = ${category}
        ORDER BY timestamp DESC LIMIT ${limit}
      `
    } else if (level) {
      return await sql`
        SELECT * FROM logs 
        WHERE level = ${level}
        ORDER BY timestamp DESC LIMIT ${limit}
      `
    } else if (category) {
      return await sql`
        SELECT * FROM logs 
        WHERE category = ${category}
        ORDER BY timestamp DESC LIMIT ${limit}
      `
    }
    return await sql`SELECT * FROM logs ORDER BY timestamp DESC LIMIT ${limit}`
  }
}

export default DatabaseManager

// Export singleton instance
export const db = DatabaseManager.getInstance()
