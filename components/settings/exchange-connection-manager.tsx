"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2, TestTube, Trash2, ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { EXCHANGE_CONFIGS } from "@/lib/config"
import { ExchangeConnectionDialog } from "./exchange-connection-dialog"

interface BaseConnection {
  id: string
  name: string
  exchange: string
  api_type: string
  connection_method: string
  connection_library: string
  margin_type: string
  position_mode: string
  is_testnet: boolean
  is_enabled: boolean
  last_test_status?: string
  last_test_balance?: number
  last_test_log?: string[]
  created_at: string
}

export default function ExchangeConnectionManager() {
  const [connections, setConnections] = useState<BaseConnection[]>([])
  const [testingConnection, setTestingConnection] = useState<string | null>(null)
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    loadConnections()
  }, [])

  const loadConnections = async () => {
    try {
      setLoading(true)
      console.log("[v0] Loading base connections...")

      const response = await fetch("/api/settings/connections")

      if (!response.ok) {
        console.warn("[v0] API returned non-OK status:", response.status)
        setConnections([])
        return
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        console.error("[v0] Invalid data format:", typeof data)
        setConnections([])
        return
      }

      const userConnections = data.filter((c: any) => !c.is_predefined)

      console.log("[v0] Loaded", userConnections.length, "base connections")
      setConnections(userConnections)
    } catch (error) {
      console.error("[v0] Failed to load connections:", error)
      setConnections([])
      if (!isInitialLoad) {
        toast.error("Failed to load connections")
      }
    } finally {
      setLoading(false)
      setIsInitialLoad(false)
    }
  }

  const deleteConnection = async (id: string) => {
    if (!confirm("Are you sure you want to delete this connection?")) return

    try {
      const response = await fetch(`/api/settings/connections/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete connection")

      toast.success("Connection deleted successfully")
      await loadConnections()
    } catch (error) {
      console.error("[v0] Failed to delete connection:", error)
      toast.error("Failed to delete connection")
    }
  }

  const testConnection = async (id: string) => {
    setTestingConnection(id)
    try {
      console.log("[v0] Testing connection:", id)

      const response = await fetch(`/api/settings/connections/${id}/test`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Connection test failed")
      }

      toast.success(`Connection successful! Balance: $${data.balance.toFixed(2)}`)
      await loadConnections()
    } catch (error) {
      console.error("[v0] Connection test failed:", error)
      toast.error(error instanceof Error ? error.message : "Connection test failed")
    } finally {
      setTestingConnection(null)
    }
  }

  const toggleConnectionEnabled = async (id: string, enabled: boolean) => {
    try {
      console.log("[v0] Toggling connection:", id, "enabled:", enabled)

      const response = await fetch(`/api/settings/connections/${id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_enabled: enabled,
        }),
      })

      if (!response.ok) throw new Error("Failed to toggle connection")

      setConnections((prev) => prev.map((conn) => (conn.id === id ? { ...conn, is_enabled: enabled } : conn)))
      toast.success(`Connection ${enabled ? "enabled" : "disabled"}`)

      await loadConnections()
    } catch (error) {
      console.error("[v0] Failed to toggle connection:", error)
      toast.error("Failed to toggle connection")
    }
  }

  const toggleLogExpansion = (id: string) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const getExchangeStatus = (exchange: string) => {
    const config = EXCHANGE_CONFIGS[exchange as keyof typeof EXCHANGE_CONFIGS] as any
    return config?.status || "active"
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exchange Connections</CardTitle>
          <CardDescription>Loading connections...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Base Exchange Connections</CardTitle>
              <CardDescription>
                Configure API credentials and connection settings - These are base configurations independent from
                active trading connections
              </CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Connection
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {connections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No connections configured yet</p>
              <p className="text-sm mt-2">Click "Add Connection" to create your first exchange connection</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((connection) => {
                const exchangeConfig = EXCHANGE_CONFIGS[connection.exchange as keyof typeof EXCHANGE_CONFIGS] as any
                const exchangeName = exchangeConfig?.name || connection.exchange || "Unknown"
                const exchangeStatus = getExchangeStatus(connection.exchange)
                const isExpanded = expandedLogs[connection.id]

                return (
                  <Card
                    key={connection.id}
                    className={`${connection.is_enabled ? "border-primary" : "border-muted"} transition-all`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Left: Test Connection + Log Link */}
                        <div className="flex flex-col gap-2 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testConnection(connection.id)}
                            disabled={testingConnection === connection.id || !connection.is_enabled}
                            className="h-9 w-24"
                          >
                            {testingConnection === connection.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <TestTube className="h-4 w-4 mr-2" />
                            )}
                            Test
                          </Button>

                          {connection.last_test_log && connection.last_test_log.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleLogExpansion(connection.id)}
                              className="h-9 w-24 px-2"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Log
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3 ml-1" />
                              ) : (
                                <ChevronDown className="h-3 w-3 ml-1" />
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Center: Connection Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-base truncate">{connection.name}</h3>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {exchangeName}
                            </Badge>
                            {connection.is_testnet && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                Testnet
                              </Badge>
                            )}
                            {exchangeStatus === "failing" && (
                              <Badge variant="destructive" className="text-xs shrink-0">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Failing
                              </Badge>
                            )}
                            {connection.last_test_status === "success" && (
                              <Badge variant="default" className="text-xs bg-green-500 shrink-0">
                                ✓ Tested
                              </Badge>
                            )}
                            {connection.last_test_status === "failed" && (
                              <Badge variant="destructive" className="text-xs shrink-0">
                                ✗ Failed
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <div>
                              <span className="font-medium">API Type:</span> {connection.api_type || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Method:</span> {connection.connection_method || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Margin:</span>{" "}
                              <span className="capitalize">{connection.margin_type || "N/A"}</span>
                            </div>
                            <div>
                              <span className="font-medium">Position:</span>{" "}
                              <span className="capitalize">{connection.position_mode || "N/A"}</span>
                            </div>
                            {connection.last_test_balance !== undefined && connection.last_test_balance !== null && (
                              <div className="col-span-2">
                                <span className="font-medium">Balance:</span>{" "}
                                <span className="font-semibold text-foreground">
                                  ${connection.last_test_balance.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Enable/Disable + Delete */}
                        <div className="flex flex-col gap-2 shrink-0">
                          <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                            <Label htmlFor={`enable-${connection.id}`} className="text-xs font-medium cursor-pointer">
                              {connection.is_enabled ? "Enabled" : "Disabled"}
                            </Label>
                            <Switch
                              id={`enable-${connection.id}`}
                              checked={connection.is_enabled}
                              onCheckedChange={(checked) => toggleConnectionEnabled(connection.id, checked)}
                            />
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteConnection(connection.id)}
                            className="text-destructive hover:text-destructive h-9"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>

                      {/* Expandable Log Section */}
                      {isExpanded && connection.last_test_log && connection.last_test_log.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="bg-muted rounded-md p-3 max-h-48 overflow-y-auto">
                            <div className="space-y-1 font-mono text-xs">
                              {connection.last_test_log.map((log, idx) => (
                                <div
                                  key={idx}
                                  className={`${
                                    log.includes("[ERROR]") || log.includes("✗")
                                      ? "text-red-600"
                                      : log.includes("[SUCCESS]") || log.includes("✓")
                                        ? "text-green-600"
                                        : log.includes("[INFO]")
                                          ? "text-blue-600"
                                          : "text-foreground"
                                  }`}
                                >
                                  {log}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ExchangeConnectionDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onSuccess={loadConnections} />
    </div>
  )
}
