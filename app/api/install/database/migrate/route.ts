import { type NextRequest, NextResponse } from "next/server"
import { db, execute } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting database migrations...")

    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT UNIQUE NOT NULL,
        applied_at TEXT DEFAULT (datetime('now'))
      )
    `)

    // Get list of applied migrations
    const appliedMigrations = db
      .prepare(`
      SELECT version FROM schema_migrations ORDER BY version
    `)
      .all()
    const appliedVersions = new Set(appliedMigrations.map((m: any) => m.version))

    console.log(`[v0] Found ${appliedVersions.size} previously applied migrations`)

    const migrations = [
      {
        version: "001_create_users_table",
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
          )
        `,
      },
      {
        version: "016_create_exchange_connections_table",
        sql: `
          CREATE TABLE IF NOT EXISTS exchange_connections (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            name TEXT NOT NULL,
            exchange TEXT NOT NULL,
            api_type TEXT DEFAULT 'spot',
            api_key TEXT,
            api_secret TEXT,
            testnet INTEGER DEFAULT 0,
            is_enabled INTEGER DEFAULT 1,
            margin_type TEXT DEFAULT 'cross',
            position_mode TEXT DEFAULT 'hedge',
            volume_factor REAL DEFAULT 1.0,
            connection_library TEXT DEFAULT 'ccxt',
            is_predefined INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            api_capabilities TEXT DEFAULT '{"spot": true, "futures": false, "margin": false}',
            rate_limits TEXT DEFAULT '{"requests_per_second": 10, "requests_per_minute": 600}',
            connection_priority INTEGER DEFAULT 0,
            last_test_at TEXT,
            last_test_status TEXT,
            last_test_log TEXT,
            connection_settings TEXT DEFAULT '{}',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
          );
          
          CREATE INDEX IF NOT EXISTS idx_exchange_connections_exchange ON exchange_connections(exchange);
          CREATE INDEX IF NOT EXISTS idx_exchange_connections_is_predefined ON exchange_connections(is_predefined);
          CREATE INDEX IF NOT EXISTS idx_exchange_connections_is_active ON exchange_connections(is_active);
          CREATE INDEX IF NOT EXISTS idx_exchange_connections_priority ON exchange_connections(connection_priority);
        `,
      },
      {
        version: "017_create_system_settings_table",
        sql: `
          CREATE TABLE IF NOT EXISTS system_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
          )
        `,
      },
      {
        version: "019_create_volume_management_tables",
        sql: `
          CREATE TABLE IF NOT EXISTS volume_configuration (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            connection_id TEXT REFERENCES exchange_connections(id) ON DELETE CASCADE,
            base_volume_factor REAL DEFAULT 1.0,
            risk_percentage REAL DEFAULT 20.0,
            target_average_positions INTEGER DEFAULT 50,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(connection_id)
          )
        `,
      },
      {
        version: "020_create_presets_tables",
        sql: `
          CREATE TABLE IF NOT EXISTS presets (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            name TEXT NOT NULL,
            description TEXT,
            is_active INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
          );

          CREATE TABLE IF NOT EXISTS preset_configurations (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            preset_id TEXT REFERENCES presets(id) ON DELETE CASCADE,
            symbol TEXT NOT NULL,
            take_profit REAL NOT NULL,
            stop_loss REAL NOT NULL,
            profit_factor REAL DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
          );

          CREATE INDEX IF NOT EXISTS idx_preset_configurations_preset_id ON preset_configurations(preset_id);
          CREATE INDEX IF NOT EXISTS idx_preset_configurations_symbol ON preset_configurations(symbol);
        `,
      },
      {
        version: "027_create_preset_performance_tables",
        sql: `
          CREATE TABLE IF NOT EXISTS preset_symbol_performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            preset_id TEXT REFERENCES presets(id) ON DELETE CASCADE,
            symbol TEXT NOT NULL,
            profit_factor REAL DEFAULT 0,
            total_trades INTEGER DEFAULT 0,
            winning_trades INTEGER DEFAULT 0,
            losing_trades INTEGER DEFAULT 0,
            total_profit REAL DEFAULT 0,
            total_loss REAL DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(preset_id, symbol)
          );

          CREATE TABLE IF NOT EXISTS preset_balance_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            preset_id TEXT REFERENCES presets(id) ON DELETE CASCADE,
            balance REAL NOT NULL,
            equity REAL NOT NULL,
            timestamp TEXT DEFAULT (datetime('now'))
          );

          CREATE INDEX IF NOT EXISTS idx_preset_balance_history_preset_id ON preset_balance_history(preset_id);
          CREATE INDEX IF NOT EXISTS idx_preset_balance_history_timestamp ON preset_balance_history(timestamp);
        `,
      },
      {
        version: "029_create_site_logs_table",
        sql: `
          CREATE TABLE IF NOT EXISTS site_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            context TEXT DEFAULT '{}',
            user_agent TEXT,
            url TEXT,
            timestamp TEXT DEFAULT (datetime('now'))
          );

          CREATE INDEX IF NOT EXISTS idx_site_logs_level ON site_logs(level);
          CREATE INDEX IF NOT EXISTS idx_site_logs_timestamp ON site_logs(timestamp);
        `,
      },
      {
        version: "048_create_trade_engine_state_table",
        sql: `
          CREATE TABLE IF NOT EXISTS trade_engine_state (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            connection_id TEXT REFERENCES exchange_connections(id) ON DELETE CASCADE,
            is_running INTEGER DEFAULT 0,
            last_started_at TEXT,
            last_stopped_at TEXT,
            error_count INTEGER DEFAULT 0,
            last_error TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(connection_id)
          )
        `,
      },
      {
        name: "Add user_id to site_logs",
        sql: `ALTER TABLE site_logs ADD COLUMN IF NOT EXISTS user_id TEXT`,
      },
      {
        name: "Add connection_id to site_logs",
        sql: `ALTER TABLE site_logs ADD COLUMN IF NOT EXISTS connection_id TEXT`,
      },
      {
        name: "Add error_message to site_logs",
        sql: `ALTER TABLE site_logs ADD COLUMN IF NOT EXISTS error_message TEXT`,
      },
      {
        name: "Add error_stack to site_logs",
        sql: `ALTER TABLE site_logs ADD COLUMN IF NOT EXISTS error_stack TEXT`,
      },
      {
        name: "Add metadata to site_logs",
        sql: `ALTER TABLE site_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`,
      },
      {
        name: "Add category to site_logs",
        sql: `ALTER TABLE site_logs ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general'`,
      },
    ]

    let appliedCount = 0
    const errors: string[] = []

    for (const migration of migrations) {
      if (migration.hasOwnProperty("version") && appliedVersions.has(migration.version)) {
        console.log(`[v0] Skipping already applied migration: ${migration.version}`)
        continue
      }

      try {
        console.log(`[v0] Applying migration: ${migration.name || migration.version}`)

        if (migration.hasOwnProperty("version")) {
          db.exec(migration.sql)
        } else {
          await execute(migration.sql, [])
        }

        if (migration.hasOwnProperty("version")) {
          db.prepare(`
            INSERT OR IGNORE INTO schema_migrations (version)
            VALUES (?)
          `).run(migration.version)
        }

        appliedCount++
        console.log(`[v0] Successfully applied migration: ${migration.name || migration.version}`)
      } catch (error) {
        const errorMsg = `Failed to apply ${migration.name || migration.version}: ${error instanceof Error ? error.message : "Unknown error"}`
        console.error(`[v0] ${errorMsg}`)
        errors.push(errorMsg)
        // Continue with other migrations instead of stopping
      }
    }

    const tables = db
      .prepare(`
      SELECT COUNT(*) as count FROM sqlite_master 
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `)
      .get() as { count: number }
    const tableCount = tables?.count || 0

    console.log(`[v0] Migration complete. Applied ${appliedCount} new migrations. Total tables: ${tableCount}`)

    return NextResponse.json({
      success: true,
      migrations_applied: appliedCount,
      total_tables: tableCount,
      errors: errors.length > 0 ? errors : undefined,
      message:
        errors.length > 0
          ? `Migrations completed with ${errors.length} errors`
          : "All migrations completed successfully",
    })
  } catch (error) {
    console.error("[v0] Migration system failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Migration system failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
