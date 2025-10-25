/**
 * Connection Predefinitions
 * Pre-configured exchange connection templates for quick setup
 */

export interface ConnectionPredefinition {
  id: string
  name: string
  displayName: string
  description: string
  apiType: string
  connectionMethod: string
  marginType: string
  positionMode: string
  maxLeverage: number
  contractType: string
  documentationUrl: string
  testnetSupported: boolean
  apiKey?: string
  apiSecret?: string
  defaultSettings: {
    baseVolumeFactorLive: number
    baseVolumeFactorPreset: number
    profitFactorMinBase: number
    profitFactorMinMain: number
    profitFactorMinReal: number
    trailingWithTrailing: boolean
    trailingOnly: boolean
    blockEnabled: boolean
    blockOnly: boolean
    dcaEnabled: boolean
    dcaOnly: boolean
  }
}

export interface ExchangeConnection {
  id: string
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
  is_enabled: boolean
  is_active: boolean
  is_predefined: boolean
  is_live_trade: boolean
  is_preset_trade: boolean
  last_test_status: any | null
  last_test_balance: any | null
  last_test_log: any[]
  api_capabilities: any[]
  rate_limits: any | null
  volume_factor: number
  created_at: string
  updated_at: string
}

export const CONNECTION_PREDEFINITIONS: ConnectionPredefinition[] = [
  {
    id: "bybit-x03",
    name: "Bybit X03",
    displayName: "Bybit X03 (Unified Trading)",
    description: "Bybit Unified Trading Account with up to 125x leverage",
    apiType: "unified", // Priority: Unified
    connectionMethod: "typescript",
    marginType: "cross",
    positionMode: "hedge",
    maxLeverage: 125,
    contractType: "usdt-perpetual",
    documentationUrl: "https://bybit-exchange.github.io/docs/v5/intro",
    testnetSupported: true,
    apiKey: "4Gba1MjGbrTTfDAauP",
    apiSecret: "QYtOgsHZThh3koyBUDK0DCMUjq3ihmD7YBB2",
    defaultSettings: {
      baseVolumeFactorLive: 1.0,
      baseVolumeFactorPreset: 1.0,
      profitFactorMinBase: 0.6,
      profitFactorMinMain: 0.6,
      profitFactorMinReal: 0.6,
      trailingWithTrailing: true,
      trailingOnly: false,
      blockEnabled: true,
      blockOnly: false,
      dcaEnabled: false,
      dcaOnly: false,
    },
  },
  {
    id: "bingx-x01",
    name: "BingX X01",
    displayName: "BingX X01 (Perpetual Futures)",
    description: "BingX USDT Perpetual Futures with up to 150x leverage",
    apiType: "futures", // Futures type
    connectionMethod: "typescript",
    marginType: "cross",
    positionMode: "hedge",
    maxLeverage: 150,
    contractType: "usdt-perpetual",
    documentationUrl: "https://bingx-api.github.io/docs/#/en-us/swapV2/introduce",
    testnetSupported: false,
    apiKey: "5MdpxA3eWbqSH3JZ5w6cdCK3Sd19Z2mPiNpmfAPfa5kmPB5bquHn8D8qDXzx2HhnyRLmrCQgpphI8DbLLZQw",
    apiSecret: "5uRfPgalVBD9DFAD5McQfbpAWmtiYGiinwiWSMX4Bii9SNPigJXsM1KnLCXT1reH5Wzcvj6RQmIvJrCUgaIhuw",
    defaultSettings: {
      baseVolumeFactorLive: 1.0,
      baseVolumeFactorPreset: 1.0,
      profitFactorMinBase: 0.6,
      profitFactorMinMain: 0.6,
      profitFactorMinReal: 0.6,
      trailingWithTrailing: true,
      trailingOnly: false,
      blockEnabled: true,
      blockOnly: false,
      dcaEnabled: false,
      dcaOnly: false,
    },
  },
  {
    id: "pionex-x01",
    name: "Pionex X01",
    displayName: "Pionex X01 (Perpetual Futures)",
    description: "Pionex USDT Perpetual Futures with up to 100x leverage",
    apiType: "futures", // Futures type
    connectionMethod: "typescript",
    marginType: "cross",
    positionMode: "hedge",
    maxLeverage: 100,
    contractType: "usdt-perpetual",
    documentationUrl: "https://pionex-doc.gitbook.io/apidocs/",
    testnetSupported: false,
    apiKey: "5qYgjSMoB4yZHbyEmvUZXNS9CbxePn8JZPGVPX583dSavuradn5Ph2RBCKhMrZ2A36",
    apiSecret: "BpIL7YjAyXkWIoLWgCw3PMmCCr1uJsIttSA8VMhBMBFcLX3mziuQUM1KQ31S1BYW",
    defaultSettings: {
      baseVolumeFactorLive: 1.0,
      baseVolumeFactorPreset: 1.0,
      profitFactorMinBase: 0.6,
      profitFactorMinMain: 0.6,
      profitFactorMinReal: 0.6,
      trailingWithTrailing: true,
      trailingOnly: false,
      blockEnabled: true,
      blockOnly: false,
      dcaEnabled: false,
      dcaOnly: false,
    },
  },
  {
    id: "orangex-x01",
    name: "OrangeX X01",
    displayName: "OrangeX X01 (Perpetual Futures)",
    description: "OrangeX USDT Perpetual Futures trading",
    apiType: "futures", // Futures type
    connectionMethod: "typescript",
    marginType: "cross",
    positionMode: "hedge",
    maxLeverage: 125,
    contractType: "usdt-perpetual",
    documentationUrl: "https://openapi-docs.orangex.com/",
    testnetSupported: false,
    apiKey: "c0c89d0f",
    apiSecret: "b89147149b54e11e36e1514b",
    defaultSettings: {
      baseVolumeFactorLive: 1.0,
      baseVolumeFactorPreset: 1.0,
      profitFactorMinBase: 0.6,
      profitFactorMinMain: 0.6,
      profitFactorMinReal: 0.6,
      trailingWithTrailing: true,
      trailingOnly: false,
      blockEnabled: true,
      blockOnly: false,
      dcaEnabled: false,
      dcaOnly: false,
    },
  },
  {
    id: "binance-x01",
    name: "Binance X01",
    displayName: "Binance X01 (USDⓈ-M Futures)",
    description: "Binance USDT-margined perpetual futures with up to 125x leverage",
    apiType: "perpetual_futures",
    connectionMethod: "typescript",
    marginType: "cross",
    positionMode: "hedge",
    maxLeverage: 125,
    contractType: "usdt-perpetual",
    documentationUrl: "https://binance-docs.github.io/apidocs/futures/en/",
    testnetSupported: true,
    defaultSettings: {
      baseVolumeFactorLive: 1.0,
      baseVolumeFactorPreset: 1.0,
      profitFactorMinBase: 0.6,
      profitFactorMinMain: 0.6,
      profitFactorMinReal: 0.6,
      trailingWithTrailing: true,
      trailingOnly: false,
      blockEnabled: true,
      blockOnly: false,
      dcaEnabled: false,
      dcaOnly: false,
    },
  },
  {
    id: "okx-x01",
    name: "OKX X01",
    displayName: "OKX X01 (Perpetual Swap)",
    description: "OKX USDT perpetual swap contracts with up to 125x leverage",
    apiType: "perpetual_futures",
    connectionMethod: "typescript",
    marginType: "cross",
    positionMode: "hedge",
    maxLeverage: 125,
    contractType: "usdt-perpetual",
    documentationUrl: "https://www.okx.com/docs-v5/en/",
    testnetSupported: true,
    defaultSettings: {
      baseVolumeFactorLive: 1.0,
      baseVolumeFactorPreset: 1.0,
      profitFactorMinBase: 0.6,
      profitFactorMinMain: 0.6,
      profitFactorMinReal: 0.6,
      trailingWithTrailing: true,
      trailingOnly: false,
      blockEnabled: true,
      blockOnly: false,
      dcaEnabled: false,
      dcaOnly: false,
    },
  },
]

export function getConnectionPredefinition(exchangeId: string): ConnectionPredefinition | undefined {
  return CONNECTION_PREDEFINITIONS.find((p) => p.id === exchangeId)
}

export function getAllConnectionPredefinitions(): ConnectionPredefinition[] {
  return CONNECTION_PREDEFINITIONS
}

export function getPredefinedConnectionsAsStatic(): ExchangeConnection[] {
  return CONNECTION_PREDEFINITIONS.map((pred) => ({
    id: pred.id,
    name: pred.name,
    exchange: pred.id.split("-")[0],
    api_type: pred.apiType,
    connection_method: pred.connectionMethod,
    connection_library:
      pred.id.split("-")[0] === "bybit"
        ? "bybit-api"
        : pred.id.split("-")[0] === "bingx"
          ? "bingx-trading-api"
          : pred.id.split("-")[0] === "pionex"
            ? "pionex-python"
            : "rest",
    api_key: pred.apiKey || "",
    api_secret: pred.apiSecret || "",
    margin_type: pred.marginType,
    position_mode: pred.positionMode,
    is_testnet: false,
    is_enabled: false,
    is_active: true, // Always show in dashboard
    is_predefined: true,
    is_live_trade: false,
    is_preset_trade: false,
    last_test_status: null,
    last_test_balance: null,
    last_test_log: [],
    api_capabilities: [],
    rate_limits: null,
    volume_factor: pred.defaultSettings.baseVolumeFactorLive,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))
}
