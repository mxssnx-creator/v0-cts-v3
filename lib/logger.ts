import DatabaseManager from "./database"

export type LogLevel = "info" | "warn" | "error" | "debug"
export type LogCategory = "system" | "trading" | "strategy" | "connection" | "indication" | "database" | "api"

class Logger {
  private static instance: Logger
  private db: DatabaseManager

  private constructor() {
    this.db = DatabaseManager.getInstance()
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  public async log(level: LogLevel, category: LogCategory, message: string, details?: any) {
    // Console output
    const timestamp = new Date().toISOString()
    const detailsStr = details ? JSON.stringify(details) : ""
    console.log(`[${timestamp}] [${level.toUpperCase()}] [${category}] ${message}`, detailsStr)

    // Database storage
    try {
      await this.db.insertLog(level, category, message, detailsStr)
    } catch (error) {
      console.error("Failed to write log to database:", error)
    }
  }

  public async info(category: LogCategory, message: string, details?: any) {
    await this.log("info", category, message, details)
  }

  public async warn(category: LogCategory, message: string, details?: any) {
    await this.log("warn", category, message, details)
  }

  public async error(category: LogCategory, message: string, error?: Error, context?: any) {
    await this.log("error", category, message, { error: error?.message, context })

    // Also store in errors table
    try {
      await this.db.insertError(
        error?.name || "Error",
        message,
        error?.stack,
        context ? JSON.stringify(context) : undefined,
      )
    } catch (err) {
      console.error("Failed to write error to database:", err)
    }
  }

  public async debug(category: LogCategory, message: string, details?: any) {
    await this.log("debug", category, message, details)
  }
}

export default Logger
