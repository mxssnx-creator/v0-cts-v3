"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConnectionPredefinitionSelector } from "./connection-predefinition-selector"
import { Save, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ExchangeConfig {
  name: string
  library: string
  packageName: string
  api_types: Array<{
    value: string
    label: string
    description: string
    capabilities: string[]
  }>
  connection_methods: Array<{
    value: string
    label: string
    description: string
    priority: number
    packageName?: string
  }>
  rate_limits: {
    requests_per_second: number
    requests_per_minute: number
  }
  docs_url: string
}

const EXCHANGE_CONFIGS: Record<string, ExchangeConfig> = {
  bybit: {
    name: "Bybit",
    library: "pybit",
    packageName: "pybit",
    api_types: [
      {
        value: "unified",
        label: "Unified Trading Account",
        description: "Multi-asset unified margin account",
        capabilities: ["leverage", "hedge_mode", "trailing", "spot", "futures"],
      },
      {
        value: "perpetual_futures",
        label: "Perpetual Futures (USDT)",
        description: "USDT-margined perpetual contracts",
        capabilities: ["leverage", "hedge_mode", "trailing"],
      },
      { value: "spot", label: "Spot Trading", description: "Spot market trading", capabilities: ["market", "limit"] },
    ],
    connection_methods: [
      { value: "rest", label: "REST API", description: "Standard HTTP requests", priority: 1 },
      {
        value: "library",
        label: "Python Library",
        description: "Official Python SDK",
        packageName: "pybit",
        priority: 2,
      },
      { value: "typescript", label: "TypeScript Native", description: "Native TypeScript implementation", priority: 3 },
    ],
    rate_limits: { requests_per_second: 10, requests_per_minute: 120 },
    docs_url: "https://bybit-exchange.github.io/docs/",
  },
  bingx: {
    name: "BingX",
    library: "bingx-trading-api",
    packageName: "bingx-trading-api",
    api_types: [
      {
        value: "perpetual_futures",
        label: "Perpetual Futures (USDT)",
        description: "USDT-margined perpetual contracts",
        capabilities: ["leverage", "hedge_mode", "trailing"],
      },
      { value: "spot", label: "Spot Trading", description: "Spot market trading", capabilities: ["market", "limit"] },
    ],
    connection_methods: [
      { value: "rest", label: "REST API", description: "Standard HTTP requests", priority: 1 },
      {
        value: "library",
        label: "Python Library",
        description: "BingX Trading API SDK",
        packageName: "bingx-trading-api",
        priority: 2,
      },
    ],
    rate_limits: { requests_per_second: 5, requests_per_minute: 300 },
    docs_url: "https://bingx-api.github.io/docs/",
  },
}

interface ConnectionForm {
  name: string
  exchange: string
  api_type: string
  connection_method: string
  connection_library: string
  api_key: string
  api_secret: string
  margin_type: string
  position_mode: string
  is_testnet: boolean
}

interface ExchangeConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  editConnection?: any
}

export function ExchangeConnectionDialog({
  open,
  onOpenChange,
  onSuccess,
  editConnection,
}: ExchangeConnectionDialogProps) {
  const [saving, setSaving] = useState(false)
  const [showPredefined, setShowPredefined] = useState(true)

  const [form, setForm] = useState<ConnectionForm>({
    name: "",
    exchange: "bybit",
    api_type: "perpetual_futures",
    connection_method: "library",
    connection_library: "pybit",
    api_key: "",
    api_secret: "",
    margin_type: "cross",
    position_mode: "hedge",
    is_testnet: false,
  })

  useEffect(() => {
    if (editConnection) {
      setForm({
        name: editConnection.name || "",
        exchange: editConnection.exchange || "bybit",
        api_type: editConnection.api_type || "perpetual_futures",
        connection_method: editConnection.connection_method || "library",
        connection_library: editConnection.connection_library || "pybit",
        api_key: editConnection.api_key || "",
        api_secret: editConnection.api_secret || "",
        margin_type: editConnection.margin_type || "cross",
        position_mode: editConnection.position_mode || "hedge",
        is_testnet: editConnection.is_testnet || false,
      })
      setShowPredefined(false)
    }
  }, [editConnection])

  useEffect(() => {
    const config = EXCHANGE_CONFIGS[form.exchange]
    if (config) {
      setForm((prev) => ({
        ...prev,
        connection_library: config.library,
        api_type: config.api_types[0]?.value || "perpetual_futures",
      }))
    }
  }, [form.exchange])

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter a connection name")
      return
    }
    if (!form.api_key.trim() || !form.api_secret.trim()) {
      toast.error("Please enter API key and secret")
      return
    }

    setSaving(true)
    try {
      const url = editConnection ? `/api/settings/connections/${editConnection.id}` : "/api/settings/connections"
      const method = editConnection ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.details || errorData.error || "Failed to save connection")
      }

      toast.success(editConnection ? "Connection updated successfully" : "Connection added successfully")
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Failed to save connection:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save connection")
    } finally {
      setSaving(false)
    }
  }

  const loadPredefinedConnection = (predefinition: any) => {
    setForm({
      name: predefinition.name,
      exchange: predefinition.id.split("-")[0],
      api_type: predefinition.apiType,
      connection_method: predefinition.connectionMethod,
      connection_library: predefinition.id.split("-")[0] === "bybit" ? "pybit" : "bingx-trading-api",
      api_key: predefinition.apiKey || "",
      api_secret: predefinition.apiSecret || "",
      margin_type: predefinition.marginType,
      position_mode: predefinition.positionMode,
      is_testnet: false,
    })
    setShowPredefined(false)
  }

  const selectedExchangeConfig = EXCHANGE_CONFIGS[form.exchange]
  const selectedApiType = selectedExchangeConfig?.api_types.find((t) => t.value === form.api_type)
  const selectedConnectionMethod = selectedExchangeConfig?.connection_methods.find(
    (m) => m.value === form.connection_method,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editConnection ? "Edit Connection" : "Add New Connection"}</DialogTitle>
          <DialogDescription>
            {editConnection ? "Update your exchange connection settings" : "Configure a new exchange API connection"}
          </DialogDescription>
        </DialogHeader>

        {!editConnection && showPredefined && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Quick Setup - Use Template</h3>
              <Button variant="outline" size="sm" onClick={() => setShowPredefined(false)}>
                Manual Configuration
              </Button>
            </div>
            <ConnectionPredefinitionSelector onSelect={loadPredefinedConnection} />
          </div>
        )}

        {(!showPredefined || editConnection) && (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="api">API Configuration</TabsTrigger>
              <TabsTrigger value="trading">Trading Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Connection Name *</Label>
                  <Input
                    id="name"
                    placeholder="My Bybit Account"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exchange">Exchange *</Label>
                  <Select value={form.exchange} onValueChange={(value) => setForm({ ...form, exchange: value })}>
                    <SelectTrigger id="exchange">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXCHANGE_CONFIGS).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key *</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter API key"
                    value={form.api_key}
                    onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-secret">API Secret *</Label>
                  <Input
                    id="api-secret"
                    type="password"
                    placeholder="Enter API secret"
                    value={form.api_secret}
                    onChange={(e) => setForm({ ...form, api_secret: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="testnet"
                  checked={form.is_testnet}
                  onCheckedChange={(checked) => setForm({ ...form, is_testnet: checked })}
                />
                <Label htmlFor="testnet">Use Testnet (for testing only)</Label>
              </div>
            </TabsContent>

            <TabsContent value="api" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api-type">API Type</Label>
                  <Select value={form.api_type} onValueChange={(value) => setForm({ ...form, api_type: value })}>
                    <SelectTrigger id="api-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedExchangeConfig?.api_types.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{type.label}</span>
                            <span className="text-xs text-muted-foreground">{type.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedApiType && (
                    <div className="p-2 bg-muted rounded-md">
                      <p className="text-xs font-medium mb-1">{selectedApiType.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedApiType.capabilities.map((cap) => (
                          <Badge key={cap} variant="secondary" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="connection-method">Connection Method</Label>
                  <Select
                    value={form.connection_method}
                    onValueChange={(value) => setForm({ ...form, connection_method: value })}
                  >
                    <SelectTrigger id="connection-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedExchangeConfig?.connection_methods
                        .sort((a, b) => a.priority - b.priority)
                        .map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{method.label}</span>
                              <span className="text-xs text-muted-foreground">{method.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {selectedConnectionMethod && (
                    <div className="p-2 bg-muted rounded-md">
                      <p className="text-xs font-medium">{selectedConnectionMethod.description}</p>
                      {selectedConnectionMethod.packageName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Package: {selectedConnectionMethod.packageName}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="connection-library">Connection Library</Label>
                  <Input
                    id="connection-library"
                    placeholder="e.g., pybit, ccxt"
                    value={form.connection_library}
                    onChange={(e) => setForm({ ...form, connection_library: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Library or SDK to use for API communication</p>
                </div>
              </div>

              {selectedExchangeConfig && (
                <div className="p-3 bg-muted rounded-md space-y-2">
                  <h4 className="text-sm font-medium">Rate Limits</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Per Second:</span>{" "}
                      <span className="font-medium">{selectedExchangeConfig.rate_limits.requests_per_second}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Per Minute:</span>{" "}
                      <span className="font-medium">{selectedExchangeConfig.rate_limits.requests_per_minute}</span>
                    </div>
                  </div>
                  <a
                    href={selectedExchangeConfig.docs_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-block"
                  >
                    View API Documentation →
                  </a>
                </div>
              )}
            </TabsContent>

            <TabsContent value="trading" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="margin-type">Margin Type</Label>
                  <Select value={form.margin_type} onValueChange={(value) => setForm({ ...form, margin_type: value })}>
                    <SelectTrigger id="margin-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cross">
                        <div className="flex flex-col">
                          <span className="font-medium">Cross Margin</span>
                          <span className="text-xs text-muted-foreground">Share margin across all positions</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="isolated">
                        <div className="flex flex-col">
                          <span className="font-medium">Isolated Margin</span>
                          <span className="text-xs text-muted-foreground">Separate margin per position</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position-mode">Position Mode</Label>
                  <Select
                    value={form.position_mode}
                    onValueChange={(value) => setForm({ ...form, position_mode: value })}
                  >
                    <SelectTrigger id="position-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hedge">
                        <div className="flex flex-col">
                          <span className="font-medium">Hedge Mode</span>
                          <span className="text-xs text-muted-foreground">Hold long and short simultaneously</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="one-way">
                        <div className="flex flex-col">
                          <span className="font-medium">One-Way Mode</span>
                          <span className="text-xs text-muted-foreground">Single direction per symbol</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h4 className="text-sm font-medium">Trading Configuration Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Exchange:</span>{" "}
                    <span className="font-medium">{selectedExchangeConfig?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">API Type:</span>{" "}
                    <span className="font-medium">{selectedApiType?.label}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Margin:</span>{" "}
                    <span className="font-medium capitalize">{form.margin_type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Position:</span>{" "}
                    <span className="font-medium capitalize">{form.position_mode}</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          {!editConnection && showPredefined && (
            <Button onClick={() => setShowPredefined(false)}>Manual Configuration</Button>
          )}
          {(!showPredefined || editConnection) && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editConnection ? "Update" : "Add"} Connection
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
