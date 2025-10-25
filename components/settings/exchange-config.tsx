"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createExchangeAPI, type ExchangeConfig } from "@/lib/exchanges"
import { Eye, EyeOff, Wifi, WifiOff, AlertCircle, CheckCircle } from "lucide-react"

const SUPPORTED_EXCHANGES = [
  { id: "bybit", name: "Bybit", description: "Professional crypto derivatives exchange" },
  { id: "bingx", name: "BingX", description: "Global crypto trading platform" },
  { id: "pionex", name: "Pionex", description: "Crypto trading with built-in bots" },
  { id: "orangex", name: "OrangeX", description: "Advanced crypto trading platform" },
]

const MARGIN_MODE_OPTIONS = {
  bybit: [
    { value: "cross", label: "Cross Margin" },
    { value: "isolated", label: "Isolated Margin" },
  ],
  bingx: [
    { value: "cross", label: "Cross Margin" },
    { value: "isolated", label: "Isolated Margin" },
  ],
  pionex: [
    { value: "cross", label: "Cross Margin" },
    { value: "isolated", label: "Isolated Margin" },
  ],
  orangex: [
    { value: "cross", label: "Cross Margin" },
    { value: "isolated", label: "Isolated Margin" },
  ],
}

const POSITION_TYPE_OPTIONS = {
  bybit: [
    { value: "single", label: "One-Way Mode (Single)" },
    { value: "hedge", label: "Hedge Mode (Both Sides)" },
  ],
  bingx: [
    { value: "single", label: "One-Way Mode (Single)" },
    { value: "hedge", label: "Hedge Mode (Both Sides)" },
  ],
  pionex: [{ value: "single", label: "One-Way Mode (Single)" }],
  orangex: [
    { value: "single", label: "One-Way Mode (Single)" },
    { value: "hedge", label: "Hedge Mode (Both Sides)" },
  ],
}

export default function ExchangeConfigComponent() {
  const [exchanges, setExchanges] = useState<ExchangeConfig[]>([])
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [connecting, setConnecting] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Load saved exchange configurations
    const saved = localStorage.getItem("exchange-configs")
    if (saved) {
      setExchanges(JSON.parse(saved))
    } else {
      // Initialize with default configs
      const defaultConfigs = SUPPORTED_EXCHANGES.map((ex) => ({
        id: ex.id,
        name: ex.name,
        apiKey: "",
        apiSecret: "",
        passphrase: "",
        testnet: true,
        status: "disconnected" as const,
        marginMode: "cross" as const,
        hedgingMode: "single" as const,
      }))
      setExchanges(defaultConfigs)
    }
  }, [])

  const saveExchanges = (newExchanges: ExchangeConfig[]) => {
    setExchanges(newExchanges)
    localStorage.setItem("exchange-configs", JSON.stringify(newExchanges))
  }

  const updateExchange = (id: string, updates: Partial<ExchangeConfig>) => {
    const newExchanges = exchanges.map((ex) => (ex.id === id ? { ...ex, ...updates } : ex))
    saveExchanges(newExchanges)
  }

  const testConnection = async (id: string) => {
    setConnecting((prev) => ({ ...prev, [id]: true }))

    const exchange = exchanges.find((ex) => ex.id === id)
    if (!exchange) return

    try {
      const api = createExchangeAPI(exchange)
      const connected = await api.connect()

      if (connected) {
        const balance = await api.getBalance()
        updateExchange(id, {
          status: "connected",
          lastPing: new Date(),
          balance,
        })
      } else {
        updateExchange(id, { status: "error" })
      }
    } catch (error) {
      updateExchange(id, { status: "error" })
    } finally {
      setConnecting((prev) => ({ ...prev, [id]: false }))
    }
  }

  const disconnectExchange = async (id: string) => {
    const exchange = exchanges.find((ex) => ex.id === id)
    if (!exchange) return

    try {
      const api = createExchangeAPI(exchange)
      await api.disconnect()
      updateExchange(id, { status: "disconnected" })
    } catch (error) {
      console.error("Disconnect error:", error)
    }
  }

  const toggleSecretVisibility = (id: string) => {
    setShowSecrets((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Connected
          </Badge>
        )
      case "error":
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="secondary">Disconnected</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Exchange Integrations</h2>
        <p className="text-gray-600 mt-2">Configure API credentials for supported exchanges</p>
      </div>

      <Tabs defaultValue={SUPPORTED_EXCHANGES[0].id} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {SUPPORTED_EXCHANGES.map((ex) => (
            <TabsTrigger key={ex.id} value={ex.id} className="flex items-center gap-2">
              {getStatusIcon(exchanges.find((e) => e.id === ex.id)?.status || "disconnected")}
              {ex.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {SUPPORTED_EXCHANGES.map((exchangeInfo) => {
          const exchange = exchanges.find((ex) => ex.id === exchangeInfo.id)
          if (!exchange) return null

          return (
            <TabsContent key={exchangeInfo.id} value={exchangeInfo.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {exchangeInfo.name}
                        {getStatusBadge(exchange.status)}
                      </CardTitle>
                      <CardDescription>{exchangeInfo.description}</CardDescription>
                    </div>
                    {exchange.status === "connected" && exchange.balance && (
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Balance</p>
                        <p className="text-lg font-semibold">${exchange.balance.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${exchange.id}-api-key`}>API Key</Label>
                      <Input
                        id={`${exchange.id}-api-key`}
                        type="text"
                        value={exchange.apiKey}
                        onChange={(e) => updateExchange(exchange.id, { apiKey: e.target.value })}
                        placeholder="Enter API key"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${exchange.id}-api-secret`}>API Secret</Label>
                      <div className="relative">
                        <Input
                          id={`${exchange.id}-api-secret`}
                          type={showSecrets[exchange.id] ? "text" : "password"}
                          value={exchange.apiSecret}
                          onChange={(e) => updateExchange(exchange.id, { apiSecret: e.target.value })}
                          placeholder="Enter API secret"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => toggleSecretVisibility(exchange.id)}
                        >
                          {showSecrets[exchange.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {exchange.id === "bybit" && (
                    <div className="space-y-2">
                      <Label htmlFor={`${exchange.id}-passphrase`}>Passphrase (Optional)</Label>
                      <Input
                        id={`${exchange.id}-passphrase`}
                        type={showSecrets[exchange.id] ? "text" : "password"}
                        value={exchange.passphrase || ""}
                        onChange={(e) => updateExchange(exchange.id, { passphrase: e.target.value })}
                        placeholder="Enter passphrase if required"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`${exchange.id}-testnet`}
                      checked={exchange.testnet}
                      onCheckedChange={(checked) => updateExchange(exchange.id, { testnet: checked })}
                    />
                    <Label htmlFor={`${exchange.id}-testnet`}>Use Testnet</Label>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-medium text-sm">Connection Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`${exchange.id}-margin-mode`}>Margin Mode</Label>
                        <Select
                          value={exchange.marginMode || "cross"}
                          onValueChange={(value) =>
                            updateExchange(exchange.id, { marginMode: value as "cross" | "isolated" })
                          }
                        >
                          <SelectTrigger id={`${exchange.id}-margin-mode`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MARGIN_MODE_OPTIONS[exchange.id as keyof typeof MARGIN_MODE_OPTIONS]?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">Cross margin shares balance across all positions</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`${exchange.id}-position-type`}>Trading (Position) Type</Label>
                        <Select
                          value={exchange.hedgingMode || "single"}
                          onValueChange={(value) =>
                            updateExchange(exchange.id, { hedgingMode: value as "single" | "hedge" })
                          }
                        >
                          <SelectTrigger id={`${exchange.id}-position-type`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {POSITION_TYPE_OPTIONS[exchange.id as keyof typeof POSITION_TYPE_OPTIONS]?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                          One-way mode allows only one position direction per symbol
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h5 className="font-medium text-blue-800 text-sm mb-1">Current Configuration</h5>
                      <div className="text-xs text-blue-700 space-y-1">
                        <p>
                          • Margin Mode: <strong className="capitalize">{exchange.marginMode || "cross"}</strong>
                        </p>
                        <p>
                          • Position Type:{" "}
                          <strong className="capitalize">
                            {exchange.hedgingMode === "single" ? "One-Way (Single)" : "Hedge Mode"}
                          </strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    {exchange.status === "connected" ? (
                      <Button
                        onClick={() => disconnectExchange(exchange.id)}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <WifiOff className="h-4 w-4" />
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        onClick={() => testConnection(exchange.id)}
                        disabled={!exchange.apiKey || !exchange.apiSecret || connecting[exchange.id]}
                        className="flex items-center gap-2"
                      >
                        <Wifi className="h-4 w-4" />
                        {connecting[exchange.id] ? "Connecting..." : "Test Connection"}
                      </Button>
                    )}
                  </div>

                  {exchange.lastPing && (
                    <p className="text-sm text-gray-500">Last connected: {exchange.lastPing.toLocaleString()}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
