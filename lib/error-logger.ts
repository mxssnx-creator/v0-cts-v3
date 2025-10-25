import { execute } from "@/lib/db"

interface ErrorLogOptions {
  category?: string
  userId?: string
  connectionId?: string
  metadata?: Record<string, any>
  severity?: "low" | "medium" | "high" | "critical"
}

export class ErrorLogger {
  /**
   * Log an error to both console and database for tracking
   */
  static async logError(error: Error | unknown, context: string, options: ErrorLogOptions = {}): Promise<void> {
    const { category = "API", userId, connectionId, metadata = {}, severity = "medium" } = options

    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error(`[v0] Error in ${context}:`, {
      message: errorMessage,
      category,
      severity,
      stack: errorStack,
      metadata,
    })

    try {
      await execute(
        `INSERT INTO site_logs (
          timestamp, level, category, message, context,
          user_id, connection_id, error_message, error_stack, metadata
        ) VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          "error",
          category,
          `${context}: ${errorMessage}`,
          context,
          userId || null,
          connectionId || null,
          errorMessage,
          errorStack || null,
          JSON.stringify({
            ...metadata,
            severity,
            timestamp: new Date().toISOString(),
          }),
        ],
      )
    } catch (logError) {
      console.error("[v0] Failed to log error to database:", logError)
    }
  }

  /**
   * Log an info message for tracking important events
   */
  static async logInfo(message: string, context: string, metadata: Record<string, any> = {}): Promise<void> {
    console.log(`[v0] Info in ${context}:`, message, metadata)

    try {
      await execute(
        `INSERT INTO site_logs (
          timestamp, level, category, message, context, metadata
        ) VALUES (NOW(), $1, $2, $3, $4, $5)`,
        [
          "info",
          "system",
          `${context}: ${message}`,
          context,
          JSON.stringify({
            ...metadata,
            timestamp: new Date().toISOString(),
          }),
        ],
      )
    } catch (logError) {
      console.error("[v0] Failed to log info to database:", logError)
    }
  }

  /**
   * Log a warning for potential issues
   */
  static async logWarning(message: string, context: string, metadata: Record<string, any> = {}): Promise<void> {
    console.warn(`[v0] Warning in ${context}:`, message, metadata)

    try {
      await execute(
        `INSERT INTO site_logs (
          timestamp, level, category, message, context, metadata
        ) VALUES (NOW(), $1, $2, $3, $4, $5)`,
        [
          "warn",
          "system",
          `${context}: ${message}`,
          context,
          JSON.stringify({
            ...metadata,
            timestamp: new Date().toISOString(),
          }),
        ],
      )
    } catch (logError) {
      console.error("[v0] Failed to log warning to database:", logError)
    }
  }
}
