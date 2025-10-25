import Database from "better-sqlite3"
import path from "path"
const { neon } = require("@neondatabase/serverless")
const fs = require("fs")

const isNeon = !!process.env.DATABASE_URL

const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000 // 1 second
const MAX_RETRY_DELAY = 8000 // 8 seconds

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY,
  attempt = 1,
): Promise<T> {
  try {
    console.log(`[v0] Database initialization attempt ${attempt}/${MAX_RETRIES}`)
    return await fn()
  } catch (error) {
    if (attempt >= retries) {
      console.error(`[v0] Database initialization failed after ${retries} attempts:`, error)
      throw error
    }

    const nextDelay = Math.min(delay * 2, MAX_RETRY_DELAY)
    console.log(`[v0] Retrying in ${nextDelay}ms...`)
    await new Promise((resolve) => setTimeout(resolve, nextDelay))
    return retryWithBackoff(fn, retries, nextDelay, attempt + 1)
  }
}

class DatabaseManager {
  private db: any
  private static instance: DatabaseManager
  private sqlClient: any
  private initialized = false

  private constructor() {
    // Don't initialize database during build time
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return
    }

    if (isNeon) {
      // Note: Ensure DATABASE_URL includes "-pooler" for connection pooling
      this.sqlClient = neon(process.env.DATABASE_URL!, {
        fetchOptions: {
          cache: "no-store",
        },
      })
    } else {
      // Use SQLite for local development
      try {
        const dbPath = process.env.SQLITE_DB_PATH || path.join(process.cwd(), "data", "cts.db")
        const dbDir = path.dirname(dbPath)

        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true })
        }

        this.db = new Database(dbPath)
        this.initializeTables()
      } catch (error) {
        console.error("[v0] SQLite initialization failed:", error)
        // Fallback to Neon if SQLite fails
        if (process.env.DATABASE_URL) {
          this.sqlClient = neon(process.env.DATABASE_URL!, {
            fetchOptions: {
              cache: "no-store",
            },
          })
        }
      }
    }
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  private async initializeTables() {
    if (this.initialized) return

    try {
      await retryWithBackoff(async () => {
        if (!this.db && !this.sqlClient) return

        // Exchange connections table
        if (isNeon) {
          await this.sqlClient.query(`
            CREATE TABLE IF NOT EXISTS exchange_connections (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              exchange TEXT NOT NULL,
              api_type TEXT NOT NULL,
              connection_method TEXT NOT NULL,
              api_key TEXT NOT NULL,
              api_secret TEXT NOT NULL,
              is_enabled BOOLEAN DEFAULT false,
              is_live_trade BOOLEAN DEFAULT false,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `)
        } else {
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS exchange_connections (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              exchange TEXT NOT NULL,
              api_type TEXT NOT NULL,
              connection_method TEXT NOT NULL,
              api_key TEXT NOT NULL,
              api_secret TEXT NOT NULL,
              is_enabled BOOLEAN DEFAULT 0,
              is_live_trade BOOLEAN DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `)
        }

        // Pseudo positions table
        if (isNeon) {
          await this.sqlClient.query(`
            CREATE TABLE IF NOT EXISTS pseudo_positions (
              id TEXT PRIMARY KEY,
              connection_id TEXT NOT NULL,
              symbol TEXT NOT NULL,
              indication_type TEXT NOT NULL,
              takeprofit_factor REAL NOT NULL,
              stoploss_ratio REAL NOT NULL,
              trailing_enabled BOOLEAN DEFAULT false,
              trail_start REAL,
              trail_stop REAL,
              entry_price REAL NOT NULL,
              current_price REAL NOT NULL,
              profit_factor REAL NOT NULL,
              position_cost REAL NOT NULL,
              status TEXT DEFAULT 'active',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (connection_id) REFERENCES exchange_connections (id)
            )
          `)
        } else {
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS pseudo_positions (
              id TEXT PRIMARY KEY,
              connection_id TEXT NOT NULL,
              symbol TEXT NOT NULL,
              indication_type TEXT NOT NULL,
              takeprofit_factor REAL NOT NULL,
              stoploss_ratio REAL NOT NULL,
              trailing_enabled BOOLEAN DEFAULT 0,
              trail_start REAL,
              trail_stop REAL,
              entry_price REAL NOT NULL,
              current_price REAL NOT NULL,
              profit_factor REAL NOT NULL,
              position_cost REAL NOT NULL,
              status TEXT DEFAULT 'active',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (connection_id) REFERENCES exchange_connections (id)
            )
          `)
        }

        // Real positions table
        if (isNeon) {
          await this.sqlClient.query(`
            CREATE TABLE IF NOT EXISTS real_positions (
              id TEXT PRIMARY KEY,
              connection_id TEXT NOT NULL,
              exchange_position_id TEXT,
              symbol TEXT NOT NULL,
              strategy_type TEXT NOT NULL,
              volume REAL NOT NULL,
              entry_price REAL NOT NULL,
              current_price REAL NOT NULL,
              takeprofit REAL,
              stoploss REAL,
              profit_loss REAL NOT NULL,
              status TEXT DEFAULT 'open',
              opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              closed_at TIMESTAMP,
              FOREIGN KEY (connection_id) REFERENCES exchange_connections (id)
            )
          `)
        } else {
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS real_positions (
              id TEXT PRIMARY KEY,
              connection_id TEXT NOT NULL,
              exchange_position_id TEXT,
              symbol TEXT NOT NULL,
              strategy_type TEXT NOT NULL,
              volume REAL NOT NULL,
              entry_price REAL NOT NULL,
              current_price REAL NOT NULL,
              takeprofit REAL,
              stoploss REAL,
              profit_loss REAL NOT NULL,
              status TEXT DEFAULT 'open',
              opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              closed_at DATETIME,
              FOREIGN KEY (connection_id) REFERENCES exchange_connections (id)
            )
          `)
        }

        // Market data table
        if (isNeon) {
          await this.sqlClient.query(`
            CREATE TABLE IF NOT EXISTS market_data (
              id SERIAL PRIMARY KEY,
              connection_id TEXT NOT NULL,
              symbol TEXT NOT NULL,
              price REAL NOT NULL,
              timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (connection_id) REFERENCES exchange_connections (id)
            )
          `)
        } else {
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS market_data (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              connection_id TEXT NOT NULL,
              symbol TEXT NOT NULL,
              price REAL NOT NULL,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (connection_id) REFERENCES exchange_connections (id)
            )
          `)
        }

        // System settings table
        if (isNeon) {
          await this.sqlClient.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `)
        } else {
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS system_settings (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `)
        }

        // Logs table
        if (isNeon) {
          await this.sqlClient.query(`
            CREATE TABLE IF NOT EXISTS logs (
              id SERIAL PRIMARY KEY,
              level TEXT NOT NULL,
              category TEXT NOT NULL,
              message TEXT NOT NULL,
              details TEXT,
              timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `)
        } else {
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS logs (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              level TEXT NOT NULL,
              category TEXT NOT NULL,
              message TEXT NOT NULL,
              details TEXT,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `)
        }

        // Errors table
        if (isNeon) {
          await this.sqlClient.query(`
            CREATE TABLE IF NOT EXISTS errors (
              id SERIAL PRIMARY KEY,
              type TEXT NOT NULL,
              message TEXT NOT NULL,
              stack TEXT,
              context TEXT,
              resolved BOOLEAN DEFAULT false,
              timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `)
        } else {
          this.db.exec(`
            CREATE TABLE IF NOT EXISTS errors (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              type TEXT NOT NULL,
              message TEXT NOT NULL,
              stack TEXT,
              context TEXT,
              resolved BOOLEAN DEFAULT 0,
              timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `)
        }

        await this.insertDefaultSettings()

        this.initialized = true
        console.log("[v0] Database initialization completed successfully")
      })
    } catch (error) {
      console.error("[v0] Failed to initialize database tables:", error)
      throw error
    }
  }

  private async insertDefaultSettings() {
    if (!this.db && !this.sqlClient) return

    const defaultSettings = [
      { key: "baseVolumeFactor", value: "1.0" },
      { key: "minimalProfitFactor", value: "0.5" },
      { key: "positionCost", value: "0.1" }, // Original database value: 0.1 USD
      { key: "symbolsExchangeCount", value: "30" },
      { key: "positionsAverage", value: "50" }, // Original database value: 50
      { key: "tradeEngineInterval", value: "1.0" }, // Trade Interval: Indications + Strategies + Pseudo + Logging
      { key: "realPositionsInterval", value: "0.3" }, // Real Positions Interval: Exchange position updates
      { key: "timeRangeHistoryDays", value: "5" }, // Historical data range for prehistoric loading
      { key: "databaseSizePseudo", value: "250" }, // Original database value: 250
      { key: "percentRearrange", value: "20" },

      {
        key: "mainSymbols",
        value: JSON.stringify(["bch", "xrp", "eth", "link", "doge", "h"]),
      },
      { key: "forcedSymbols", value: JSON.stringify(["xrp", "bch"]) },

      { key: "validationCooldown", value: "10000" }, // 10 seconds in milliseconds
      { key: "positionTimeout", value: "15000" }, // 15 seconds in milliseconds
      { key: "maxActivePerConfig", value: "1" },

      { key: "autoRestart", value: "true" },
      { key: "maxPositions", value: "250" },
      { key: "rearrangeThreshold", value: "20" },
      { key: "logLevel", value: "info" },

      { key: "enableNotifications", value: "true" },
      { key: "enableTelegram", value: "false" },
      { key: "telegramToken", value: "" },
      { key: "telegramChatId", value: "" },

      { key: "databaseBackup", value: "true" },
      { key: "backupInterval", value: "24h" },
      { key: "minActiveStateDuration", value: "20" },

      { key: "indicationRangeMin", value: "3" },
      { key: "indicationRangeMax", value: "30" },
      { key: "indicationRangeStep", value: "1" },
      { key: "takeProfitRangeDivisor", value: "3" },
      { key: "indicationMinProfitFactor", value: "0.7" },
      { key: "strategyMinProfitFactor", value: "0.5" },

      { key: "marginMode", value: "cross" },
      { key: "hedgingMode", value: "single" },
      { key: "leverageDefault", value: "10" },

      { key: "adjustStrategyTimeIntervals", value: JSON.stringify([4, 12, 24, 48]) },
      { key: "adjustStrategyDrawdownPositions", value: "80" },

      // Block strategy settings
      { key: "blockAdjustmentRatio", value: "1" },
      { key: "blockAutoDisableEnabled", value: "true" },
      { key: "blockAutoDisableMinBlocks", value: "2" },
      { key: "blockAutoDisableComparisonWindow", value: "50" },

      // Exchange settings
      { key: "useMainSymbols", value: "true" },
      { key: "exchangeSymbolCount", value: "30" },
      { key: "exchangeSymbolOrder", value: "marketcap" },

      // Strategy toggles
      { key: "strategyTrailingEnabled", value: "true" },
      { key: "strategyBlockEnabled", value: "true" },
      { key: "strategyDcaEnabled", value: "true" },
      { key: "profitFactorMultiplier", value: "1.0" },

      { key: "apiMarketType", value: "unified" },
      { key: "apiSource", value: "exchange" },
      { key: "connectionMethod", value: "rest" },
      { key: "libraryPackage", value: "" },
      { key: "documentationLink", value: "" },
      { key: "testnet", value: "false" },
    ]

    if (isNeon) {
      await Promise.all(
        defaultSettings.map(async (setting) => {
          await this.sqlClient.query(
            `
            INSERT INTO system_settings (key, value) VALUES ($1, $2)
            ON CONFLICT (key) DO NOTHING
          `,
            [setting.key, setting.value],
          )
        }),
      )
    } else {
      const insertSetting = this.db.prepare(`
        INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)
      `)

      defaultSettings.forEach((setting) => {
        insertSetting.run(setting.key, setting.value)
      })
    }
  }

  // Connection methods
  public async insertConnection(connection: any) {
    if (isNeon) {
      return await this.sqlClient.query(
        `INSERT INTO exchange_connections (id, name, exchange, api_type, connection_method, api_key, api_secret)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          connection.id,
          connection.name,
          connection.exchange,
          connection.api_type,
          connection.connection_method,
          connection.api_key,
          connection.api_secret,
        ],
      )
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO exchange_connections (id, name, exchange, api_type, connection_method, api_key, api_secret)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      return stmt.run(
        connection.id,
        connection.name,
        connection.exchange,
        connection.api_type,
        connection.connection_method,
        connection.api_key,
        connection.api_secret,
      )
    }
  }

  public async getConnections() {
    if (isNeon) {
      const result = await this.sqlClient.query("SELECT * FROM exchange_connections ORDER BY created_at DESC")
      return result.rows
    } else {
      const stmt = this.db.prepare("SELECT * FROM exchange_connections ORDER BY created_at DESC")
      return stmt.all()
    }
  }

  public async updateConnectionStatus(id: string, is_enabled: boolean, is_live_trade: boolean) {
    if (isNeon) {
      return await this.sqlClient.query(
        `UPDATE exchange_connections 
        SET is_enabled = $1, is_live_trade = $2, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $3`,
        [is_enabled, is_live_trade, id],
      )
    } else {
      const stmt = this.db.prepare(`
        UPDATE exchange_connections 
        SET is_enabled = ?, is_live_trade = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `)
      return stmt.run(is_enabled ? 1 : 0, is_live_trade ? 1 : 0, id)
    }
  }

  // Pseudo position methods
  public async insertPseudoPosition(position: any) {
    if (isNeon) {
      return await this.sqlClient.query(
        `INSERT INTO pseudo_positions 
        (id, connection_id, symbol, indication_type, takeprofit_factor, stoploss_ratio, 
         trailing_enabled, trail_start, trail_stop, entry_price, current_price, profit_factor, position_cost)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          position.id,
          position.connection_id,
          position.symbol,
          position.indication_type,
          position.takeprofit_factor,
          position.stoploss_ratio,
          position.trailing_enabled,
          position.trail_start,
          position.trail_stop,
          position.entry_price,
          position.current_price,
          position.profit_factor,
          position.position_cost,
        ],
      )
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO pseudo_positions 
        (id, connection_id, symbol, indication_type, takeprofit_factor, stoploss_ratio, 
         trailing_enabled, trail_start, trail_stop, entry_price, current_price, profit_factor, position_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      return stmt.run(
        position.id,
        position.connection_id,
        position.symbol,
        position.indication_type,
        position.takeprofit_factor,
        position.stoploss_ratio,
        position.trailing_enabled ? 1 : 0,
        position.trail_start,
        position.trail_stop,
        position.entry_price,
        position.current_price,
        position.profit_factor,
        position.position_cost,
      )
    }
  }

  public async getPseudoPositions(connection_id?: string, limit = 250) {
    if (isNeon) {
      let query = "SELECT * FROM pseudo_positions WHERE status = $1"
      const params: any[] = ["active"]

      if (connection_id) {
        query += " AND connection_id = $2"
        params.push(connection_id)
        query += " ORDER BY created_at DESC LIMIT $3"
        params.push(limit)
      } else {
        query += " ORDER BY created_at DESC LIMIT $2"
        params.push(limit)
      }

      const result = await this.sqlClient.query(query, params)
      return result.rows
    } else {
      let query = 'SELECT * FROM pseudo_positions WHERE status = "active"'
      const params: any[] = []

      if (connection_id) {
        query += " AND connection_id = ?"
        params.push(connection_id)
      }

      query += " ORDER BY created_at DESC LIMIT ?"
      params.push(limit)

      const stmt = this.db.prepare(query)
      return stmt.all(...params)
    }
  }

  // Real position methods
  public async insertRealPosition(position: any) {
    if (isNeon) {
      return await this.sqlClient.query(
        `INSERT INTO real_positions 
        (id, connection_id, exchange_position_id, symbol, strategy_type, volume, 
         entry_price, current_price, takeprofit, stoploss, profit_loss)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          position.id,
          position.connection_id,
          position.exchange_position_id,
          position.symbol,
          position.strategy_type,
          position.volume,
          position.entry_price,
          position.current_price,
          position.takeprofit,
          position.stoploss,
          position.profit_loss,
        ],
      )
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO real_positions 
        (id, connection_id, exchange_position_id, symbol, strategy_type, volume, 
         entry_price, current_price, takeprofit, stoploss, profit_loss)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      return stmt.run(
        position.id,
        position.connection_id,
        position.exchange_position_id,
        position.symbol,
        position.strategy_type,
        position.volume,
        position.entry_price,
        position.current_price,
        position.takeprofit,
        position.stoploss,
        position.profit_loss,
      )
    }
  }

  public async getRealPositions(connection_id?: string) {
    if (isNeon) {
      let query = "SELECT * FROM real_positions WHERE status = $1"
      const params: any[] = ["open"]

      if (connection_id) {
        query += " AND connection_id = $2"
        params.push(connection_id)
      }

      query += " ORDER BY opened_at DESC"

      const result = await this.sqlClient.query(query, params)
      return result.rows
    } else {
      let query = 'SELECT * FROM real_positions WHERE status = "open"'
      const params: any[] = []

      if (connection_id) {
        query += " AND connection_id = ?"
        params.push(connection_id)
      }

      query += " ORDER BY opened_at DESC"

      const stmt = this.db.prepare(query)
      return stmt.all(...params)
    }
  }

  // Settings methods
  public async getSetting(key: string): Promise<string | null> {
    if (isNeon) {
      const result = await this.sqlClient.query("SELECT value FROM system_settings WHERE key = $1", [key])
      return result.rows[0]?.value || null
    } else {
      const stmt = this.db.prepare("SELECT value FROM system_settings WHERE key = ?")
      const result = stmt.get(key) as { value: string } | undefined
      return result?.value || null
    }
  }

  public async setSetting(key: string, value: string) {
    if (isNeon) {
      return await this.sqlClient.query(
        `INSERT INTO system_settings (key, value, updated_at) 
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, value],
      )
    } else {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO system_settings (key, value, updated_at) 
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `)
      return stmt.run(key, value)
    }
  }

  public async getAllSettings(): Promise<Record<string, string>> {
    if (isNeon) {
      const result = await this.sqlClient.query("SELECT key, value FROM system_settings")
      const settings: Record<string, string> = {}
      result.rows.forEach((row: any) => {
        settings[row.key] = row.value
      })
      return settings
    } else {
      const stmt = this.db.prepare("SELECT key, value FROM system_settings")
      const rows = stmt.all() as Array<{ key: string; value: string }>
      const settings: Record<string, string> = {}
      rows.forEach((row) => {
        settings[row.key] = row.value
      })
      return settings
    }
  }

  // Market data methods
  public async insertMarketData(connection_id: string, symbol: string, price: number) {
    if (isNeon) {
      return await this.sqlClient.query(`INSERT INTO market_data (connection_id, symbol, price) VALUES ($1, $2, $3)`, [
        connection_id,
        symbol,
        price,
      ])
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO market_data (connection_id, symbol, price) VALUES (?, ?, ?)
      `)
      return stmt.run(connection_id, symbol, price)
    }
  }

  public async getMarketData(connection_id: string, symbol: string, hours = 24) {
    if (isNeon) {
      const result = await this.sqlClient.query(
        `SELECT * FROM market_data 
        WHERE connection_id = $1 AND symbol = $2 
        AND timestamp > NOW() - INTERVAL '${hours} hours'
        ORDER BY timestamp DESC`,
        [connection_id, symbol],
      )
      return result.rows
    } else {
      const stmt = this.db.prepare(`
        SELECT * FROM market_data 
        WHERE connection_id = ? AND symbol = ? 
        AND timestamp > datetime('now', '-${hours} hours')
        ORDER BY timestamp DESC
      `)
      return stmt.all(connection_id, symbol)
    }
  }

  // Logging methods for monitoring
  public async insertLog(level: string, category: string, message: string, details?: string) {
    if (isNeon) {
      return await this.sqlClient.query(
        `INSERT INTO logs (level, category, message, details) VALUES ($1, $2, $3, $4)`,
        [level, category, message, details || null],
      )
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO logs (level, category, message, details) VALUES (?, ?, ?, ?)
      `)
      return stmt.run(level, category, message, details || null)
    }
  }

  public async getLogs(limit = 100, level?: string, category?: string) {
    if (isNeon) {
      let query = "SELECT * FROM logs WHERE 1=1"
      const params: any[] = []

      if (level) {
        query += " AND level = $" + (params.length + 1)
        params.push(level)
      }

      if (category) {
        query += " AND category = $" + (params.length + 1)
        params.push(category)
      }

      query += " ORDER BY timestamp DESC LIMIT $" + (params.length + 1)
      params.push(limit)

      const result = await this.sqlClient.query(query, params)
      return result.rows
    } else {
      let query = "SELECT * FROM logs WHERE 1=1"
      const params: any[] = []

      if (level) {
        query += " AND level = ?"
        params.push(level)
      }

      if (category) {
        query += " AND category = ?"
        params.push(category)
      }

      query += " ORDER BY timestamp DESC LIMIT ?"
      params.push(limit)

      const stmt = this.db.prepare(query)
      return stmt.all(...params)
    }
  }

  public async clearOldLogs(days = 7) {
    if (isNeon) {
      return await this.sqlClient.query(`
        DELETE FROM logs WHERE timestamp < NOW() - INTERVAL '${days} days'
      `)
    } else {
      const stmt = this.db.prepare(`
        DELETE FROM logs WHERE timestamp < datetime('now', '-${days} days')
      `)
      return stmt.run()
    }
  }

  public async insertError(type: string, message: string, stack?: string, context?: string) {
    if (isNeon) {
      return await this.sqlClient.query(`INSERT INTO errors (type, message, stack, context) VALUES ($1, $2, $3, $4)`, [
        type,
        message,
        stack || null,
        context || null,
      ])
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO errors (type, message, stack, context) VALUES (?, ?, ?, ?)
      `)
      return stmt.run(type, message, stack || null, context || null)
    }
  }

  public async getErrors(limit = 50, resolved = false) {
    if (isNeon) {
      const result = await this.sqlClient.query(
        `SELECT * FROM errors WHERE resolved = $1 ORDER BY timestamp DESC LIMIT $2`,
        [resolved, limit],
      )
      return result.rows
    } else {
      const stmt = this.db.prepare(`
        SELECT * FROM errors WHERE resolved = ? ORDER BY timestamp DESC LIMIT ?
      `)
      return stmt.all(resolved ? 1 : 0, limit)
    }
  }

  public async resolveError(id: number) {
    if (isNeon) {
      return await this.sqlClient.query(`UPDATE errors SET resolved = true WHERE id = $1`, [id])
    } else {
      const stmt = this.db.prepare(`
        UPDATE errors SET resolved = 1 WHERE id = ?
      `)
      return stmt.run(id)
    }
  }

  public async clearOldErrors(days = 30) {
    if (isNeon) {
      return await this.sqlClient.query(`
        DELETE FROM errors WHERE resolved = true AND timestamp < NOW() - INTERVAL '${days} days'
      `)
    } else {
      const stmt = this.db.prepare(`
        DELETE FROM errors WHERE resolved = 1 AND timestamp < datetime('now', '-${days} days')
      `)
      return stmt.run()
    }
  }

  public close() {
    if (this.db) {
      this.db.close()
    }
  }
}

export default DatabaseManager

export const db = isNeon ? null : (DatabaseManager.getInstance()["db"] as any)
