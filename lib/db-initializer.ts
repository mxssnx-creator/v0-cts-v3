import { query, execute } from "@/lib/db"

export class DatabaseInitializer {
  private static isInitializing = false
  private static isInitialized = false
  private static initPromise: Promise<boolean> | null = null

  static async initialize(retries = 3, timeout = 30000): Promise<boolean> {
    if (this.isInitialized) {
      console.log("[v0] Database already initialized, skipping...")
      return true
    }

    if (this.isInitializing && this.initPromise) {
      console.log("[v0] Database initialization in progress, waiting...")
      return this.initPromise
    }

    this.isInitializing = true
    this.initPromise = this.performInitialization(retries, timeout)

    try {
      const result = await this.initPromise
      this.isInitialized = result
      return result
    } finally {
      this.isInitializing = false
    }
  }

  private static async performInitialization(retries: number, timeout: number): Promise<boolean> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[v0] Database initialization attempt ${attempt}/${retries}`)

        if (attempt > 1) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
          console.log(`[v0] Waiting ${waitTime}ms before retry...`)
          await new Promise((resolve) => setTimeout(resolve, waitTime))
        }

        try {
          console.log("[v0] Testing database connection...")
          await query("SELECT 1 as test")
          console.log("[v0] Database connection established")
        } catch (error) {
          throw new Error("Database connection failed: " + (error instanceof Error ? error.message : String(error)))
        }

        await this.runMigrations(timeout)

        console.log("[v0] Database initialized successfully")
        return true
      } catch (error) {
        console.error(`[v0] Initialization attempt ${attempt} failed:`, error)

        if (attempt === retries) {
          console.error("[v0] All initialization attempts exhausted")
          return false
        }
      }
    }

    return false
  }

  private static async runMigrations(timeout: number): Promise<void> {
    console.log("[v0] Running database migrations...")
    await this.createEssentialTables()
    console.log("[v0] Migrations completed successfully")
  }

  private static async createEssentialTables(): Promise<void> {
    console.log("[v0] Creating essential tables...")

    const essentialTables = [
      {
        name: "site_logs",
        sql: `CREATE TABLE IF NOT EXISTS site_logs (
          id SERIAL PRIMARY KEY,
          timestamp TIMESTAMP DEFAULT NOW(),
          level TEXT NOT NULL,
          category TEXT NOT NULL,
          message TEXT NOT NULL,
          context TEXT,
          user_id TEXT,
          connection_id TEXT,
          error_message TEXT,
          error_stack TEXT,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP DEFAULT NOW()
        )`,
      },
      { name: "site_logs_level_idx", sql: `CREATE INDEX IF NOT EXISTS idx_site_logs_level ON site_logs(level)` },
      {
        name: "site_logs_category_idx",
        sql: `CREATE INDEX IF NOT EXISTS idx_site_logs_category ON site_logs(category)`,
      },
      {
        name: "site_logs_timestamp_idx",
        sql: `CREATE INDEX IF NOT EXISTS idx_site_logs_timestamp ON site_logs(timestamp)`,
      },
    ]

    let successCount = 0
    let skipCount = 0

    for (const { name, sql } of essentialTables) {
      try {
        await execute(sql, [])
        console.log(`[v0]   Created: ${name}`)
        successCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (errorMessage.includes("already exists")) {
          console.log(`[v0]   Skipped: ${name} (already exists)`)
          skipCount++
        } else {
          console.error(`[v0]   Failed: ${name}:`, errorMessage)
          throw error
        }
      }
    }

    console.log(`[v0] Tables Summary: ${successCount} created, ${skipCount} skipped`)
  }

  static async ensureInitialized(): Promise<boolean> {
    if (this.isInitialized) {
      return true
    }
    return this.initialize()
  }
}
