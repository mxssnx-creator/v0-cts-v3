import { execute } from "./db"

export interface LogEntry {
  level: "info" | "warn" | "error" | "debug"
  category: "system" | "trade-engine" | "api" | "database" | "connection" | "toast"
  message: string
  context?: string
  metadata?: Record<string, any>
  error?: Error
  userId?: string
  connectionId?: string
}

export class SystemLogger {
  /**
   * Log to database with proper error handling
   */
  private static async logToDatabase(entry: LogEntry): Promise<void> {
    try {
      const errorMessage = entry.error?.message || null
      const errorStack = entry.error?.stack || null

      console.log("[v0] SystemLogger inserting log:", {
        level: entry.level,
        category: entry.category,
        message: entry.message.substring(0, 50),
      })

      await execute(
        `INSERT INTO site_logs (
          timestamp, level, category, message, context, 
          user_id, connection_id, error_message, error_stack, metadata
        ) VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          entry.level,
          entry.category,
          entry.message,
          entry.context || null,
          entry.userId || null,
          entry.connectionId || null,
          errorMessage,
          errorStack,
          JSON.stringify(entry.metadata || {}),
        ],
      )

      console.log("[v0] SystemLogger log inserted successfully")
    } catch (dbError) {
      // Fallback to console if database logging fails
      console.error("[SystemLogger] Failed to log to database:", dbError)
      console.error("[SystemLogger] Original log entry:", entry)
    }
  }

  /**
   * Log system events
   */
  static async logSystem(
    message: string,
    level: LogEntry["level"] = "info",
    metadata?: Record<string, any>,
  ): Promise<void> {
    const entry: LogEntry = {
      level,
      category: "system",
      message,
      metadata,
    }

    console.log(`[System] [${level.toUpperCase()}] ${message}`, metadata || "")
    await this.logToDatabase(entry)
  }

  /**
   * Log trade engine events
   */
  static async logTradeEngine(
    message: string,
    level: LogEntry["level"] = "info",
    metadata?: Record<string, any>,
  ): Promise<void> {
    const entry: LogEntry = {
      level,
      category: "trade-engine",
      message,
      metadata,
    }

    console.log(`[TradeEngine] [${level.toUpperCase()}] ${message}`, metadata || "")
    await this.logToDatabase(entry)
  }

  /**
   * Log API events
   */
  static async logAPI(
    message: string,
    level: LogEntry["level"] = "info",
    context?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const entry: LogEntry = {
      level,
      category: "api",
      message,
      context,
      metadata,
    }

    console.log(`[API] [${level.toUpperCase()}] ${context || "unknown"}: ${message}`, metadata || "")
    await this.logToDatabase(entry)
  }

  /**
   * Log database events
   */
  static async logDatabase(
    message: string,
    level: LogEntry["level"] = "info",
    metadata?: Record<string, any>,
  ): Promise<void> {
    const entry: LogEntry = {
      level,
      category: "database",
      message,
      metadata,
    }

    console.log(`[Database] [${level.toUpperCase()}] ${message}`, metadata || "")
    await this.logToDatabase(entry)
  }

  /**
   * Log connection events
   */
  static async logConnection(
    message: string,
    connectionId: string,
    level: LogEntry["level"] = "info",
    metadata?: Record<string, any>,
  ): Promise<void> {
    const entry: LogEntry = {
      level,
      category: "connection",
      message,
      connectionId,
      metadata,
    }

    console.log(`[Connection:${connectionId}] [${level.toUpperCase()}] ${message}`, metadata || "")
    await this.logToDatabase(entry)
  }

  /**
   * Log toast messages for tracking user notifications
   */
  static async logToast(
    message: string,
    type: "success" | "error" | "info" | "warning",
    context?: string,
    userId?: string,
  ): Promise<void> {
    const levelMap = {
      success: "info" as const,
      error: "error" as const,
      info: "info" as const,
      warning: "warn" as const,
    }

    const entry: LogEntry = {
      level: levelMap[type],
      category: "toast",
      message,
      context,
      userId,
      metadata: { toastType: type },
    }

    console.log(`[Toast] [${type.toUpperCase()}] ${message}`)
    await this.logToDatabase(entry)
  }

  /**
   * Log errors with full stack trace
   */
  static async logError(
    error: Error | unknown,
    category: LogEntry["category"],
    context?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const errorObj = error instanceof Error ? error : new Error(String(error))

    const entry: LogEntry = {
      level: "error",
      category,
      message: errorObj.message,
      context,
      error: errorObj,
      metadata,
    }

    console.error(`[${category}] [ERROR] ${context || "unknown"}:`, errorObj)
    await this.logToDatabase(entry)
  }
}
