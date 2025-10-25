"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { ExchangeConnection } from "@/lib/types"

const EXCHANGES = {
  bybit: { name: "Bybit", apiTypes: ["unified", "perpetual_futures", "spot"] },
  bingx: { name: "BingX", apiTypes: ["perpetual_futures", "spot"] },
  pionex: { name: "Pionex", apiTypes: ["spot", "perpetual_futures"] },
  orangex: { name: "OrangeX", apiTypes: ["spot", "perpetual_futures"] },
  binance: { name: "Binance", apiTypes: ["perpetual_futures", "spot", "margin"] },
  okx: { name: "OKX", apiTypes: ["perpetual_futures", "spot", "margin"] },
}

export default function ExchangeConnectionManagerV2() {
  const [connections, setConnections] = useState<ExchangeConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    exchange: "bybit",
    api_type: "perpetual_futures",
    connection_method: "rest",
    connection_library: "native",
    api_key: "",
    api_secret: "",
    margin_type: "cross",
    position_mode: "hedge",
    is_testnet: false,
  })

  useEffect(() => {
    loadConnections()
  }, [])

  const loadConnections = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/settings/connections")

      if (!response.ok) {
        console.warn("Failed to load connections:", response.status)
        setConnections([])
        setError("Failed to load connections")
        return
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        console.warn("Invalid data format:", typeof data)
        setConnections([])
        setError("Invalid data format received")
        return
      }

      const validConnections = data
        .filter((c: any) => {
          if (!c || typeof c !== "object") return false
          if (typeof c.id !== "string" || !c.id) return false
          if (typeof c.name !== "string" || !c.name) return false
          if (typeof c.exchange !== "string" || !c.exchange) return false
          return true
        })
        .map((c: any) => ({
          ...c,
          is_enabled: Boolean(c.is_enabled),
          is_testnet: Boolean(c.is_testnet),
          volume_factor: typeof c.volume_factor === "number" ? c.volume_factor : 1,
          margin_type: c.margin_type || "cross",
          position_mode: c.position_mode || "hedge",
          api_type: c.api_type || "perpetual_futures",
          last_test_status: c.last_test_status || null,
          last_test_balance: typeof c.last_test_balance === "number" ? c.last_test_balance : undefined,
        }))

      setConnections(validConnections)
    } catch (error) {
      console.error("Load connections error:", error)
      setConnections([])
      setError(error instanceof Error ? error.message : "Failed to load connections")
    } finally {
      setLoading(false)
    }
  }

  const addConnection = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a connection name")
      return
    }
    if (!formData.api_key.trim() || !formData.api_secret.trim()) {
      toast.error("Please enter API credentials")
      return
    }

    try {
      const response = await fetch("/api/settings/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to add connection" }))
        throw new Error(error.error || "Failed to add connection")
      }

      toast.success("Connection added successfully")
      setShowAddForm(false)
      setFormData({
        name: "",
        exchange: "bybit",
        api_type: "perpetual_futures",
        connection_method: "rest",
        connection_library: "native",
        api_key: "",
        api_secret: "",
        margin_type: "cross",
        position_mode: "hedge",
        is_testnet: false,
      })
      await loadConnections()
    } catch (error) {
      console.error("Add connection error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to add connection")
    }
  }

  const deleteConnection = async (id: string) => {
    if (!confirm("Delete this connection?")) return

    try {
      const response = await fetch(`/api/settings/connections/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete")

      toast.success("Connection deleted")
      await loadConnections()
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete connection")
    }
  }

  const testConnection = async (id: string) => {
    setTestingId(id)
    try {
      const response = await fetch(`/api/settings/connections/${id}/test`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Test failed")
      }

      toast.success(`Connection successful! Balance: $${data.balance?.toFixed(2) || "0.00"}`)
      await loadConnections()
    } catch (error) {
      console.error("Test error:", error)
      toast.error(error instanceof Error ? error.message : "Test failed")
    } finally {
      setTestingId(null)
    }
  }

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/settings/connections/${id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: enabled, is_live_trade: false, is_preset_trade: false }),
      })

      if (!response.ok) throw new Error("Failed to toggle")

      toast.success(`Connection ${enabled ? "enabled" : "disabled"}`)
      await loadConnections()
    } catch (error) {
      console.error("Toggle error:", error)
      toast.error("Failed to toggle connection")
    }
  }

  const updateVolumeFactor = async (id: string, factor: number) => {
    try {
      const response = await fetch(`/api/settings/connections/${id}/volume`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume_factor: factor }),
      })

      if (!response.ok) throw new Error("Failed to update")

      setConnections((prev) => prev.map((c) => (c.id === id ? { ...c, volume_factor: factor } : c)))
      toast.success("Volume factor updated")
    } catch (error) {
      console.error("Update volume error:", error)
      toast.error("Failed to update volume factor")
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exchange Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exchange Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={loadConnections}>Retry</Button>
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
              <CardTitle>Exchange Connections</CardTitle>
              <CardDescription>Manage your exchange API connections</CardDescription>
            </div>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Connection
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddForm && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-lg">New Connection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Connection Name</Label>
                    <Input
                      placeholder="My Exchange Account"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Exchange</Label>
                    <Select
                      value={formData.exchange}
                      onValueChange={(value) => setFormData({ ...formData, exchange: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(EXCHANGES).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder="Enter API key"
                      value={formData.api_key}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>API Secret</Label>
                    <Input
                      type="password"
                      placeholder="Enter API secret"
                      value={formData.api_secret}
                      onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>API Type</Label>
                    <Select
                      value={formData.api_type}
                      onValueChange={(value) => setFormData({ ...formData, api_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXCHANGES[formData.exchange as keyof typeof EXCHANGES]?.apiTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replace(/_/g, " ").toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Margin Type</Label>
                    <Select
                      value={formData.margin_type}
                      onValueChange={(value) => setFormData({ ...formData, margin_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cross">Cross Margin</SelectItem>
                        <SelectItem value="isolated">Isolated Margin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Position Mode</Label>
                    <Select
                      value={formData.position_mode}
                      onValueChange={(value) => setFormData({ ...formData, position_mode: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hedge">Hedge Mode</SelectItem>
                        <SelectItem value="one-way">One-Way Mode</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Connection Method</Label>
                    <Select
                      value={formData.connection_method}
                      onValueChange={(value) => setFormData({ ...formData, connection_method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rest">REST API</SelectItem>
                        <SelectItem value="websocket">WebSocket</SelectItem>
                        <SelectItem value="typescript">TypeScript SDK</SelectItem>
                        <SelectItem value="library">Library</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Connection Library</Label>
                    <Select
                      value={formData.connection_library}
                      onValueChange={(value) => setFormData({ ...formData, connection_library: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="native">Native</SelectItem>
                        <SelectItem value="ccxt">CCXT</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_testnet}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_testnet: checked })}
                  />
                  <Label>Use Testnet</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addConnection}>Add Connection</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No connections configured yet.</p>
              <p className="text-sm mt-2">Click "Add Connection" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((conn) => {
                const exchangeConfig = EXCHANGES[conn.exchange as keyof typeof EXCHANGES]
                const exchangeName = exchangeConfig?.name || conn.exchange || "Unknown"
                const apiType = conn.api_type || "N/A"
                const marginType = conn.margin_type || "cross"
                const positionMode = conn.position_mode || "hedge"
                const volumeFactor = typeof conn.volume_factor === "number" ? conn.volume_factor : 1

                return (
                  <Card key={conn.id} className={conn.is_enabled ? "border-primary" : ""}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{conn.name}</CardTitle>
                            {conn.is_enabled && <Badge>Active</Badge>}
                            {conn.is_testnet && <Badge variant="outline">Testnet</Badge>}
                            {conn.last_test_status === "success" && <Badge className="bg-green-500">✓ Tested</Badge>}
                          </div>
                          <CardDescription>
                            {exchangeName} • {apiType}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={conn.is_enabled || false}
                            onCheckedChange={(checked) => toggleEnabled(conn.id, checked)}
                          />
                          <Button variant="ghost" size="icon" onClick={() => deleteConnection(conn.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Margin</p>
                          <p className="font-medium capitalize">{marginType}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Position Mode</p>
                          <p className="font-medium capitalize">{positionMode}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Connection Method</p>
                          <p className="font-medium capitalize">{conn.connection_method || "rest"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Volume Factor</p>
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="10"
                            value={volumeFactor}
                            onChange={(e) => updateVolumeFactor(conn.id, Number.parseFloat(e.target.value) || 1)}
                            className="h-8"
                          />
                        </div>
                        {typeof conn.last_test_balance === "number" && (
                          <div>
                            <p className="text-muted-foreground">Balance</p>
                            <p className="font-medium">${conn.last_test_balance.toFixed(2)}</p>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnection(conn.id)}
                        disabled={testingId === conn.id}
                      >
                        {testingId === conn.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          "Test Connection"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
