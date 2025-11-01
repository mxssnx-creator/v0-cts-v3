// Connection Manager - Core logic for managing connections

export type ConnectionStatus = "connected" | "disconnected" | "testing" | "error"

export interface Connection {
  id: string
  name: string
  type: string
  url: string
  status: ConnectionStatus
  isDefault: boolean
  lastTested?: Date
  error?: string
  metadata?: Record<string, any>
}

export interface ConnectionLog {
  id: string
  connectionId: string
  timestamp: Date
  level: "info" | "warning" | "error" | "success"
  message: string
  details?: any
}

// Preset connections that should be available by default
export const PRESET_CONNECTIONS: Omit<Connection, "id" | "status" | "lastTested">[] = [
  {
    name: "Primary Database",
    type: "database",
    url: "postgresql://localhost:5432/main",
    isDefault: true,
    metadata: { poolSize: 10, timeout: 30000 },
  },
  {
    name: "Redis Cache",
    type: "cache",
    url: "redis://localhost:6379",
    isDefault: true,
    metadata: { maxRetries: 3 },
  },
  {
    name: "API Gateway",
    type: "api",
    url: "https://api.example.com",
    isDefault: true,
    metadata: { version: "v1", timeout: 10000 },
  },
  {
    name: "Message Queue",
    type: "queue",
    url: "amqp://localhost:5672",
    isDefault: false,
    metadata: { prefetch: 10 },
  },
  {
    name: "Object Storage",
    type: "storage",
    url: "s3://bucket-name",
    isDefault: false,
    metadata: { region: "us-east-1" },
  },
]

// In-memory storage (in production, use a database)
let connections: Connection[] = []
let logs: ConnectionLog[] = []

export class ConnectionManager {
  // Initialize with preset connections
  static initialize() {
    if (connections.length === 0) {
      connections = PRESET_CONNECTIONS.map((preset, index) => ({
        ...preset,
        id: `conn-${index + 1}`,
        status: "disconnected" as ConnectionStatus,
      }))
      this.log("system", "info", "Connection manager initialized with preset connections")
    }
  }

  // Get all connections
  static getConnections(): Connection[] {
    this.initialize()
    return connections
  }

  // Get a specific connection
  static getConnection(id: string): Connection | undefined {
    return connections.find((conn) => conn.id === id)
  }

  // Add a new connection
  static addConnection(connection: Omit<Connection, "id" | "status">): Connection {
    const newConnection: Connection = {
      ...connection,
      id: `conn-${Date.now()}`,
      status: "disconnected",
    }
    connections.push(newConnection)
    this.log(newConnection.id, "info", `Connection "${newConnection.name}" added`)
    return newConnection
  }

  // Update a connection
  static updateConnection(id: string, updates: Partial<Connection>): Connection | null {
    const index = connections.findIndex((conn) => conn.id === id)
    if (index === -1) {
      this.log(id, "error", `Connection not found: ${id}`)
      return null
    }
    connections[index] = { ...connections[index], ...updates }
    this.log(id, "info", `Connection "${connections[index].name}" updated`)
    return connections[index]
  }

  // Remove a connection
  static removeConnection(id: string): boolean {
    const index = connections.findIndex((conn) => conn.id === id)
    if (index === -1) {
      this.log(id, "error", `Cannot remove: Connection not found: ${id}`)
      return false
    }
    const name = connections[index].name
    connections.splice(index, 1)
    this.log(id, "warning", `Connection "${name}" removed`)
    return true
  }

  // Test a connection
  static async testConnection(id: string): Promise<{ success: boolean; message: string; latency?: number }> {
    const connection = this.getConnection(id)
    if (!connection) {
      return { success: false, message: "Connection not found" }
    }

    this.updateConnection(id, { status: "testing" })
    this.log(id, "info", `Testing connection "${connection.name}"...`)

    const startTime = Date.now()

    try {
      // Simulate connection test (in production, implement actual connection logic)
      await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))

      // Simulate random success/failure for demo
      const success = Math.random() > 0.2
      const latency = Date.now() - startTime

      if (success) {
        this.updateConnection(id, {
          status: "connected",
          lastTested: new Date(),
          error: undefined,
        })
        this.log(id, "success", `Connection "${connection.name}" test successful (${latency}ms)`, { latency })
        return { success: true, message: "Connection successful", latency }
      } else {
        const errorMsg = "Connection timeout or refused"
        this.updateConnection(id, {
          status: "error",
          lastTested: new Date(),
          error: errorMsg,
        })
        this.log(id, "error", `Connection "${connection.name}" test failed: ${errorMsg}`)
        return { success: false, message: errorMsg }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      this.updateConnection(id, {
        status: "error",
        lastTested: new Date(),
        error: errorMsg,
      })
      this.log(id, "error", `Connection "${connection.name}" test error: ${errorMsg}`, { error })
      return { success: false, message: errorMsg }
    }
  }

  // Test all connections
  static async testAllConnections(): Promise<void> {
    this.log("system", "info", "Testing all connections...")
    const promises = connections.map((conn) => this.testConnection(conn.id))
    await Promise.all(promises)
    this.log("system", "info", "All connection tests completed")
  }

  // Reset to preset connections
  static resetToPresets(): void {
    connections = PRESET_CONNECTIONS.map((preset, index) => ({
      ...preset,
      id: `conn-${index + 1}`,
      status: "disconnected" as ConnectionStatus,
    }))
    this.log("system", "warning", "Connections reset to presets")
  }

  // Logging
  static log(connectionId: string, level: ConnectionLog["level"], message: string, details?: any): void {
    const log: ConnectionLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      connectionId,
      timestamp: new Date(),
      level,
      message,
      details,
    }
    logs.push(log)

    // Keep only last 1000 logs
    if (logs.length > 1000) {
      logs = logs.slice(-1000)
    }

    // Console logging for debugging
    console.log(`[v0] [${level.toUpperCase()}] [${connectionId}] ${message}`, details || "")
  }

  // Get logs
  static getLogs(connectionId?: string): ConnectionLog[] {
    if (connectionId) {
      return logs.filter((log) => log.connectionId === connectionId)
    }
    return logs
  }

  // Clear logs
  static clearLogs(connectionId?: string): void {
    if (connectionId) {
      logs = logs.filter((log) => log.connectionId !== connectionId)
      this.log(connectionId, "info", "Logs cleared for this connection")
    } else {
      logs = []
      this.log("system", "info", "All logs cleared")
    }
  }

  // Get connection statistics
  static getStatistics() {
    const total = connections.length
    const connected = connections.filter((c) => c.status === "connected").length
    const disconnected = connections.filter((c) => c.status === "disconnected").length
    const errors = connections.filter((c) => c.status === "error").length
    const defaults = connections.filter((c) => c.isDefault).length

    return {
      total,
      connected,
      disconnected,
      errors,
      defaults,
      connectionRate: total > 0 ? (connected / total) * 100 : 0,
    }
  }
}
