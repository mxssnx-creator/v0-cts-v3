"use client"

import { useState, useEffect } from "react"
import type { ConnectionLog } from "@/lib/connection-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Info, AlertTriangle, XCircle, CheckCircle, Trash2, RefreshCw, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface LogViewerProps {
  connectionId?: string
}

export function LogViewer({ connectionId }: LogViewerProps) {
  const [logs, setLogs] = useState<ConnectionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "info" | "warning" | "error" | "success">("all")

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const url = connectionId ? `/api/logs?connectionId=${connectionId}` : "/api/logs"
      const response = await fetch(url)
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error("[v0] Failed to fetch logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = async () => {
    try {
      const url = connectionId ? `/api/logs?connectionId=${connectionId}` : "/api/logs"
      await fetch(url, { method: "DELETE" })
      await fetchLogs()
    } catch (error) {
      console.error("[v0] Failed to clear logs:", error)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 5000) // Auto-refresh every 5 seconds
    return () => clearInterval(interval)
  }, [connectionId])

  const getLogIcon = (level: ConnectionLog["level"]) => {
    switch (level) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const getLogBadgeVariant = (level: ConnectionLog["level"]) => {
    switch (level) {
      case "info":
        return "default"
      case "warning":
        return "secondary"
      case "error":
        return "destructive"
      case "success":
        return "outline"
    }
  }

  const filteredLogs = filter === "all" ? logs : logs.filter((log) => log.level === filter)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Connection Logs</CardTitle>
            <CardDescription>{connectionId ? "Logs for selected connection" : "All system logs"}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchLogs} size="icon" variant="outline">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button onClick={clearLogs} size="icon" variant="outline">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] w-full rounded-md border p-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No logs to display</div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex-shrink-0 mt-0.5">{getLogIcon(log.level)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getLogBadgeVariant(log.level)} className="text-xs">
                        {log.level}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                      <code className="text-xs text-muted-foreground">{log.connectionId}</code>
                    </div>
                    <p className="text-sm break-words">{log.message}</p>
                    {log.details && (
                      <pre className="text-xs mt-2 p-2 bg-background rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
