import { neon } from "@neondatabase/serverless"

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.REMOTE_POSTGRES_URL

if (!DATABASE_URL) {
  throw new Error("[v0] DATABASE_URL environment variable is required for PostgreSQL database")
}

const dbType = process.env.DATABASE_TYPE || "neon"
console.log(`[v0] Initializing ${dbType} PostgreSQL database client...`)

// Initialize Neon client (works for both Neon and standard PostgreSQL)
const sqlClient = neon(DATABASE_URL, {
  fetchOptions: {
    cache: "no-store",
  },
})

console.log(`[v0] ${dbType} PostgreSQL database client initialized successfully`)

export async function query<T = any>(queryText: string, params: any[] = []): Promise<T[]> {
  try {
    console.log("[v0] Executing query:", { query: queryText.substring(0, 100), paramCount: params.length })

    const result = await sqlClient(queryText, params)
    return (result as any[]) || []
  } catch (error) {
    console.error("[v0] Database query error:", error)
    console.error("[v0] Query:", queryText)
    console.error("[v0] Params:", params)
    throw error
  }
}

export async function queryOne<T = any>(queryText: string, params: any[] = []): Promise<T | null> {
  try {
    const result = await sqlClient(queryText, params)
    const rows = result as any[]
    return (rows[0] as T) || null
  } catch (error) {
    console.error("[v0] Database queryOne error:", error)
    throw error
  }
}

export async function execute(queryText: string, params: any[] = []): Promise<{ rowCount: number }> {
  try {
    console.log("[v0] Executing command:", { query: queryText.substring(0, 100), paramCount: params.length })

    const result = await sqlClient(queryText, params)
    const rows = result as any[]

    return { rowCount: rows.length || 0 }
  } catch (error) {
    console.error("[v0] Database execute error:", error)
    console.error("[v0] Query:", queryText)
    console.error("[v0] Params:", params)
    throw error
  }
}

export async function insertReturning<T = any>(queryText: string, params: any[] = []): Promise<T | null> {
  try {
    const result = await sqlClient(queryText, params)
    const rows = result as any[]
    return (rows[0] as T) || null
  } catch (error) {
    console.error("[v0] Database insertReturning error:", error)
    throw error
  }
}

export const sql = async (strings: TemplateStringsArray, ...values: any[]) => {
  let queryText = strings[0]
  const params: any[] = []

  for (let i = 0; i < values.length; i++) {
    queryText += `$${i + 1}` + strings[i + 1]
    params.push(values[i])
  }

  const result = await sqlClient(queryText, params)
  return result as any[]
}

// Export the client for direct access if needed
export default sqlClient
export const db = sqlClient
