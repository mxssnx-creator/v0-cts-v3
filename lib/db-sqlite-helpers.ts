import { query, queryOne, execute } from "./db"

// Convert PostgreSQL RETURNING clause to SQLite equivalent
export async function insertReturning<T = any>(
  table: string,
  columns: string[],
  values: any[],
  returningColumns: string[] = ["*"],
): Promise<T | null> {
  const placeholders = columns.map(() => "?").join(", ")
  const insertQuery = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`

  const result = await execute(insertQuery, values)

  if (result.lastInsertRowid) {
    const selectQuery = `SELECT ${returningColumns.join(", ")} FROM ${table} WHERE rowid = ?`
    return await queryOne<T>(selectQuery, [result.lastInsertRowid])
  }

  return null
}

// Convert PostgreSQL UPDATE ... RETURNING to SQLite equivalent
export async function updateReturning<T = any>(
  table: string,
  updates: Record<string, any>,
  where: string,
  whereParams: any[],
  returningColumns: string[] = ["*"],
): Promise<T[]> {
  const setClause = Object.keys(updates)
    .map((key) => `${key} = ?`)
    .join(", ")
  const updateValues = Object.values(updates)

  const updateQuery = `UPDATE ${table} SET ${setClause} WHERE ${where}`
  await execute(updateQuery, [...updateValues, ...whereParams])

  const selectQuery = `SELECT ${returningColumns.join(", ")} FROM ${table} WHERE ${where}`
  return await query<T>(selectQuery, whereParams)
}

// JSON operations helper (SQLite uses json_extract)
export function jsonExtract(column: string, path: string): string {
  return `json_extract(${column}, '${path}')`
}

// Array contains helper (SQLite doesn't have native array support)
export function jsonArrayContains(column: string, value: any): string {
  return `EXISTS (SELECT 1 FROM json_each(${column}) WHERE value = ${JSON.stringify(value)})`
}

// Date/time helpers
export function now(): string {
  return "datetime('now')"
}

export function dateAdd(column: string, interval: string): string {
  // Convert PostgreSQL interval to SQLite datetime modifier
  // e.g., "1 day" -> "+1 day", "2 hours" -> "+2 hours"
  const match = interval.match(/(\d+)\s+(\w+)/)
  if (match) {
    return `datetime(${column}, '+${match[1]} ${match[2]}')`
  }
  return column
}

export function dateSub(column: string, interval: string): string {
  const match = interval.match(/(\d+)\s+(\w+)/)
  if (match) {
    return `datetime(${column}, '-${match[1]} ${match[2]}')`
  }
  return column
}
