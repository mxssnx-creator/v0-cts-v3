import { execute } from "@/lib/db"

export type MonitoringCategory = "system" | "web" | "trading" | "database" | "connection" | "strategy" | "api"
export type MonitoringLevel = "info" | "warn" | "error" | "debug"

interface MonitoringLogOptions {
  category: MonitoringCategory
  level: MonitoringLevel
  message: string
  details?: string
  stack?: string
  metadata?: Record<string, any>
}

export class MonitoringLogger {
  /**
   * Log to the monitoring system (site_logs table)
   */
  static async log(options: MonitoringLogOptions): Promise<void> {
    const { category, level, message, details, stack, metadata } = options

    console.log(`[v0] [${category.toUpperCase()}] [${level.toUpperCase()}] ${message}`, {
      details,
      metadata,
    })

    try {
      await execute(
        `INSERT INTO site_logs (timestamp, level, category, message, details, stack)
         VALUES (NOW(), $1, $2, $3, $4, $5)`,
        [level, category, message, details || null, stack || null],
      )
    } catch (error) {
      console.error("[v0] Failed to write to monitoring log:", error)
    }
  }

  // Convenience methods
  static async logSystem(level: MonitoringLevel, message: string, details?: string, metadata?: Record<string, any>) {
    await this.log({ category: "system", level, message, details, metadata })
  }

  static async logWeb(level: MonitoringLevel, message: string, details?: string, metadata?: Record<string, any>) {
    await this.log({ category: "web", level, message, details, metadata })
  }

  static async logTrading(level: MonitoringLevel, message: string, details?: string, metadata?: Record<string, any>) {
    await this.log({ category: "trading", level, message, details, metadata })
  }

  static async logDatabase(level: MonitoringLevel, message: string, details?: string, metadata?: Record<string, any>) {
    await this.log({ category: "database", level, message, details, metadata })
  }

  static async logConnection(
    level: MonitoringLevel,
    message: string,
    details?: string,
    metadata?: Record<string, any>,
  ) {
    await this.log({ category: "connection", level, message, details, metadata })
  }

  static async logStrategy(level: MonitoringLevel, message: string, details?: string, metadata?: Record<string, any>) {
    await this.log({ category: "strategy", level, message, details, metadata })
  }

  static async logApi(level: MonitoringLevel, message: string, details?: string, metadata?: Record<string, any>) {
    await this.log({ category: "api", level, message, details, metadata })
  }

  // Error logging with automatic stack trace
  static async logError(
    category: MonitoringCategory,
    error: Error | unknown,
    context: string,
    metadata?: Record<string, any>,
  ) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    await this.log({
      category,
      level: "error",
      message: `${context}: ${errorMessage}`,
      details: context,
      stack: errorStack,
      metadata,
    })
  }
}
