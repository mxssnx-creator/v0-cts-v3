"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ConnectionCard } from "@/components/dashboard/connection-card"
import { SystemOverview } from "@/components/dashboard/system-overview"
import { RealTimeTicker } from "@/components/dashboard/real-time-ticker"
import type { ExchangeConnection } from "@/lib/types"
import { RefreshCw, Plus } from "lucide-react"
import { toast } from "sonner"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { AuthGuard } from "@/components/auth-guard"
import { useAuth } from "@/lib/auth-context"
import { getPredefinedConnectionsAsStatic } from "@/lib/connection-predefinitions"

export default function Dashboard() {
  const { user } = useAuth()
  const [activeConnections, setActiveConnections] = useState<ExchangeConnection[]>([])
  const [availableConnections, setAvailableConnections] = useState<ExchangeConnection[]>([])
  const [selectedConnection, setSelectedConnection] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [hasRealConnections, setHasRealConnections] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedToAdd, setSelectedToAdd] = useState<string>("")

  useEffect(() => {
    const initialize = async () => {
      console.log("[v0] Dashboard initializing...")

      // Load connections without waiting for migrations
      await loadConnections()
      await loadSystemStats()

      const savedSelection = localStorage.getItem("selectedExchange")
      if (savedSelection) {
        setSelectedConnection(savedSelection)
      }
    }

    initialize().catch((error) => {
      console.error("[v0] Dashboard initialization error:", error)
      setLoading(false)
    })
  }, [])

  const loadConnections = async () => {
    try {
      console.log("[v0] Loading connections from API")
      const response = await fetch("/api/settings/connections")

      const predefinedConnections = getPredefinedConnectionsAsStatic()

      if (!response.ok) {
        console.log("[v0] Connections API not available yet")
        setActiveConnections(predefinedConnections)
        setAvailableConnections([])
        setHasRealConnections(false)
        setLoading(false)
        return
      }

      const data = await response.json()
      if (!Array.isArray(data)) {
        console.log("[v0] Invalid connections data:", data)
        setActiveConnections(predefinedConnections)
        setAvailableConnections([])
        setHasRealConnections(false)
        setLoading(false)
        return
      }

      console.log("[v0] Loaded connections:", data.length)

      // Remove any predefined connections from database data to avoid duplicates
      const userConnections = data.filter((c: ExchangeConnection) => !c.is_predefined)

      // Merge predefined with user connections
      const allConnections = [...predefinedConnections, ...userConnections]

      const activeConns = allConnections.filter((c: ExchangeConnection) => c?.is_active === true)
      const notActive = allConnections.filter((c: ExchangeConnection) => c && c.is_active !== true)

      setActiveConnections(activeConns)
      setAvailableConnections(notActive)

      const enabledConnections = activeConns.filter((c: ExchangeConnection) => c?.is_enabled)
      setHasRealConnections(enabledConnections.length > 0)

      if (activeConns.length > 0 && !selectedConnection) {
        const savedSelection = localStorage.getItem("selectedExchange")
        setSelectedConnection(savedSelection || activeConns[0]?.id || "")
      }
    } catch (error) {
      console.error("[v0] Failed to load connections:", error)
      const predefinedConnections = getPredefinedConnectionsAsStatic()
      setActiveConnections(predefinedConnections)
      setAvailableConnections([])
      setHasRealConnections(false)
    } finally {
      setLoading(false)
    }
  }

  const loadSystemStats = async () => {
    try {
      console.log("[v0] Loading system stats from API")
      const response = await fetch("/api/structure/metrics")
      if (!response.ok) {
        console.log("[v0] System stats not available yet")
        return
      }

      const data = await response.json()
      console.log("[v0] Loaded system stats")
      setSystemStats(data)
    } catch (error) {
      console.error("[v0] Failed to load system stats:", error)
    }
  }

  const handleToggleEnable = async (id: string, enabled: boolean) => {
    try {
      console.log("[v0] Toggling connection:", id, "enabled:", enabled)

      const response = await fetch(`/api/settings/connections/${id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: enabled, is_live_trade: false, is_preset_trade: false }),
      })

      if (!response.ok) throw new Error("Failed to toggle connection")

      toast.success(`Connection ${enabled ? "enabled" : "disabled"}`)
      await loadConnections()
      await loadSystemStats()
    } catch (error) {
      console.error("[v0] Failed to toggle connection:", error)
      toast.error("Failed to toggle connection")
    }
  }

  const handleToggleLiveTrade = async (id: string, enabled: boolean) => {
    try {
      console.log("[v0] Toggling live trade:", id, "enabled:", enabled)

      const response = await fetch(`/api/settings/connections/${id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_live_trade: enabled }),
      })

      if (!response.ok) throw new Error("Failed to toggle live trade")

      toast.success(`Live trading ${enabled ? "enabled" : "disabled"}`)
      await loadConnections()
      await loadSystemStats()
    } catch (error) {
      console.error("[v0] Failed to toggle live trade:", error)
      toast.error("Failed to toggle live trade")
    }
  }

  const handleAddAsActive = async () => {
    if (!selectedToAdd) {
      toast.error("Please select a connection")
      return
    }

    try {
      console.log("[v0] Adding connection as active:", selectedToAdd)

      const response = await fetch(`/api/settings/connections/${selectedToAdd}/active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      })

      if (!response.ok) throw new Error("Failed to add connection as active")

      toast.success("Connection added as active")
      setShowAddDialog(false)
      setSelectedToAdd("")
      await loadConnections()
      await loadSystemStats()
    } catch (error) {
      console.error("[v0] Failed to add connection as active:", error)
      toast.error("Failed to add connection as active")
    }
  }

  const handleRemoveFromActive = async (id: string) => {
    try {
      console.log("[v0] Removing connection from active:", id)

      const response = await fetch(`/api/settings/connections/${id}/active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      })

      if (!response.ok) throw new Error("Failed to remove connection from active")

      toast.success("Connection removed from active")
      await loadConnections()
      await loadSystemStats()
    } catch (error) {
      console.error("[v0] Failed to remove connection from active:", error)
      toast.error("Failed to remove connection from active")
    }
  }

  const handleDeleteConnection = async (id: string) => {
    if (!confirm("Remove this connection from active connections?")) return

    await handleRemoveFromActive(id)
  }

  const getConnectionStatus = (connection: ExchangeConnection) => {
    if (!connection.is_enabled) return "disabled"
    if (connection.is_enabled && !connection.is_live_trade) return "connecting"
    return "connected"
  }

  const getConnectionProgress = (connection: ExchangeConnection) => {
    if (!connection.is_enabled) return 0
    return connection.is_live_trade ? 100 : 50
  }

  const handleRefresh = async () => {
    setLoading(true)
    await Promise.all([loadConnections(), loadSystemStats()])
    toast.success("Dashboard refreshed")
  }

  const handleExchangeChange = (value: string) => {
    setSelectedConnection(value)
    localStorage.setItem("selectedExchange", value)
  }

  const [systemStats, setSystemStats] = useState({
    activeConnections: 0,
    totalPositions: 0,
    dailyPnL: 0,
    totalBalance: 0,
    indicationsActive: 0,
    indicationsTotal: 0,
    strategiesActive: 0,
    strategiesTotal: 0,
    systemLoad: 25,
    databaseSize: 45,
    activeSymbols: 0,
    realPositions: 0,
    pseudoPositionsBase: 0,
    pseudoPositionsMain: 0,
    pseudoPositionsReal: 0,
    pseudoPositionsActive: 0,
    profitFactorLast20h: 0,
    profitFactorLast50: 0,
    profitFactorLast25: 0,
    livePositions: 0,
    pseudoBasePF20h: 0,
    pseudoBasePF25: 0,
    pseudoMainPF20h: 0,
    pseudoMainPF25: 0,
    pseudoRealPF20h: 0,
    pseudoRealPF25: 0,
    pseudoActivePF20h: 0,
    pseudoActivePF25: 0,
  })

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto py-2 px-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="md:hidden" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  CTS v3
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Crypto Trading System - Welcome, {user?.username || "Guest"}
                </p>
              </div>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-base">Exchange Selection</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Select value={selectedConnection} onValueChange={handleExchangeChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select active exchange connection" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeConnections.map((connection) => (
                        <SelectItem key={connection.id} value={connection.id}>
                          {connection.name} ({connection.exchange})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {activeConnections.filter((c) => c.is_enabled).length} enabled
                </p>
              </div>
            </CardContent>
          </Card>

          <RealTimeTicker />

          <Card>
            <CardHeader>
              <CardTitle>Trade Engine</CardTitle>
              <CardDescription>Real-time trading engine status and metrics</CardDescription>
            </CardHeader>
            <CardContent className="py-2 px-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Active Symbols</p>
                  <p className="text-2xl font-bold">{systemStats.activeSymbols || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Trading pairs</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Indications</p>
                  <p className="text-2xl font-bold">
                    {systemStats.indicationsActive}/{systemStats.indicationsTotal}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {systemStats.indicationsTotal > 0
                      ? `${Math.round((systemStats.indicationsActive / systemStats.indicationsTotal) * 100)}% active`
                      : "0% active"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Strategies</p>
                  <p className="text-2xl font-bold">
                    {systemStats.strategiesActive}/{systemStats.strategiesTotal}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {systemStats.strategiesTotal > 0
                      ? `${Math.round((systemStats.strategiesActive / systemStats.strategiesTotal) * 100)}% active`
                      : "0% active"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Live Positions</p>
                  <p className="text-2xl font-bold">{systemStats.livePositions || 0}</p>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <div>PF 20h: {systemStats.profitFactorLast20h?.toFixed(2) || "0.00"}</div>
                    <div>PF 25 trades: {systemStats.profitFactorLast25?.toFixed(2) || "0.00"}</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">Pseudo Positions</p>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Base</p>
                    <p className="text-lg font-bold">{systemStats.pseudoPositionsBase || 0}</p>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <div>
                        {systemStats.totalPositions > 0
                          ? `${Math.round((systemStats.pseudoPositionsBase / systemStats.totalPositions) * 100)}%`
                          : "0%"}
                      </div>
                      <div>PF 20h: {systemStats.pseudoBasePF20h?.toFixed(2) || "0.00"}</div>
                      <div>PF 25: {systemStats.pseudoBasePF25?.toFixed(2) || "0.00"}</div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Main</p>
                    <p className="text-lg font-bold">{systemStats.pseudoPositionsMain || 0}</p>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <div>
                        {systemStats.totalPositions > 0
                          ? `${Math.round((systemStats.pseudoPositionsMain / systemStats.totalPositions) * 100)}%`
                          : "0%"}
                      </div>
                      <div>PF 20h: {systemStats.pseudoMainPF20h?.toFixed(2) || "0.00"}</div>
                      <div>PF 25: {systemStats.pseudoMainPF25?.toFixed(2) || "0.00"}</div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Real</p>
                    <p className="text-lg font-bold">{systemStats.pseudoPositionsReal || 0}</p>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <div>
                        {systemStats.totalPositions > 0
                          ? `${Math.round((systemStats.pseudoPositionsReal / systemStats.totalPositions) * 100)}%`
                          : "0%"}
                      </div>
                      <div>PF 20h: {systemStats.pseudoRealPF20h?.toFixed(2) || "0.00"}</div>
                      <div>PF 25: {systemStats.pseudoRealPF25?.toFixed(2) || "0.00"}</div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Active</p>
                    <p className="text-lg font-bold">{systemStats.pseudoPositionsActive || 0}</p>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <div>
                        {systemStats.totalPositions > 0
                          ? `${Math.round((systemStats.pseudoPositionsActive / systemStats.totalPositions) * 100)}%`
                          : "0%"}
                      </div>
                      <div>PF 20h: {systemStats.pseudoActivePF20h?.toFixed(2) || "0.00"}</div>
                      <div>PF 25: {systemStats.pseudoActivePF25?.toFixed(2) || "0.00"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">Profit Factor</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Last 20 Hours</p>
                    <p className="text-lg font-bold">{systemStats.profitFactorLast20h?.toFixed(2) || "0.00"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Average performance</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last 50 Positions</p>
                    <p className="text-lg font-bold">{systemStats.profitFactorLast50?.toFixed(2) || "0.00"}</p>
                    <p className="text-xs text-muted-foreground mt-1">Average performance</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Trade Interval</p>
                  <p className="text-sm font-medium">1.0s</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Position Cooldown</p>
                  <p className="text-sm font-medium">20s</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Max Concurrent</p>
                  <p className="text-sm font-medium">10</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Active Connections</h2>
              <div className="flex gap-2">
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Connection
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add as Active Connection</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Select a connection from Settings to add as active. Each connection can only be added once.
                      </p>
                      <Select value={selectedToAdd} onValueChange={setSelectedToAdd}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a connection" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableConnections.length === 0 ? (
                            <div className="p-2 text-xs text-muted-foreground text-center">
                              No available connections. Add connections in Settings first.
                            </div>
                          ) : (
                            availableConnections.map((connection) => (
                              <SelectItem key={connection.id} value={connection.id}>
                                {connection.name} ({connection.exchange}) - {connection.api_type}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={handleAddAsActive} disabled={!selectedToAdd}>
                          Add as Active
                        </Button>
                        <Button
                          className="flex-1 bg-transparent"
                          variant="outline"
                          onClick={() => setShowAddDialog(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button size="sm" onClick={() => (window.location.href = "/settings")}>
                  Manage Connections
                </Button>
              </div>
            </div>

            {activeConnections.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">No active connections</p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => setShowAddDialog(true)}>Add Connection</Button>
                    <Button variant="outline" onClick={() => (window.location.href = "/settings")}>
                      Go to Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-3 max-w-4xl mx-auto">
                {activeConnections.map((connection) => (
                  <ConnectionCard
                    key={connection.id}
                    connection={connection}
                    onToggleEnable={handleToggleEnable}
                    onToggleLiveTrade={handleToggleLiveTrade}
                    onDelete={handleRemoveFromActive}
                    balance={connection.last_test_balance || 0}
                    status={getConnectionStatus(connection)}
                    progress={getConnectionProgress(connection)}
                  />
                ))}
              </div>
            )}
          </div>

          <SystemOverview stats={systemStats} />
        </div>
      </div>
    </AuthGuard>
  )
}
