"use server"

import { sql } from "@/lib/db"

let migrationRun = false

export async function runAutoMigrations() {
  // Only run once per server instance
  if (migrationRun) {
    return { success: true, message: "Migrations already applied" }
  }

  try {
    console.log("[v0] Running auto-migrations...")

    // Add missing columns to exchange_connections table
    await sql`
      DO $$ 
      BEGIN
        -- Add exchange column if not exists
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'exchange_connections' AND column_name = 'exchange'
        ) THEN
          ALTER TABLE exchange_connections ADD COLUMN exchange VARCHAR(50);
          UPDATE exchange_connections SET exchange = 'binance' WHERE exchange IS NULL;
        END IF;

        -- Add connection_library column if not exists
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'exchange_connections' AND column_name = 'connection_library'
        ) THEN
          ALTER TABLE exchange_connections ADD COLUMN connection_library VARCHAR(50) DEFAULT 'ccxt';
        END IF;

        -- Add is_predefined column if not exists
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'exchange_connections' AND column_name = 'is_predefined'
        ) THEN
          ALTER TABLE exchange_connections ADD COLUMN is_predefined BOOLEAN DEFAULT false;
        END IF;

        -- Add is_active column if not exists
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'exchange_connections' AND column_name = 'is_active'
        ) THEN
          ALTER TABLE exchange_connections ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;

        -- Add api_capabilities column if not exists
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'exchange_connections' AND column_name = 'api_capabilities'
        ) THEN
          ALTER TABLE exchange_connections ADD COLUMN api_capabilities JSONB DEFAULT '{"spot": true, "futures": false, "margin": false}'::jsonb;
        END IF;

        -- Add rate_limits column if not exists
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'exchange_connections' AND column_name = 'rate_limits'
        ) THEN
          ALTER TABLE exchange_connections ADD COLUMN rate_limits JSONB DEFAULT '{"requests_per_second": 10, "requests_per_minute": 600}'::jsonb;
        END IF;

        -- Add connection_priority column if not exists
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'exchange_connections' AND column_name = 'connection_priority'
        ) THEN
          ALTER TABLE exchange_connections ADD COLUMN connection_priority INTEGER DEFAULT 0;
        END IF;
      END $$;
    `

    // Sync exchange column with exchange_id
    await sql`
      UPDATE exchange_connections 
      SET exchange = COALESCE(exchange, 'binance')
      WHERE exchange IS NULL;
    `

    // Create indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_exchange_connections_exchange ON exchange_connections(exchange);
      CREATE INDEX IF NOT EXISTS idx_exchange_connections_is_predefined ON exchange_connections(is_predefined);
      CREATE INDEX IF NOT EXISTS idx_exchange_connections_is_active ON exchange_connections(is_active);
      CREATE INDEX IF NOT EXISTS idx_exchange_connections_priority ON exchange_connections(connection_priority);
    `

    migrationRun = true
    console.log("[v0] Auto-migrations completed successfully")

    return { success: true, message: "Migrations completed successfully" }
  } catch (error) {
    console.error("[v0] Auto-migration failed:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
