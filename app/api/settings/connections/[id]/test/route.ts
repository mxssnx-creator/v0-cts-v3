import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import crypto from "crypto"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const testLog: string[] = []
  const startTime = Date.now()
  const { id } = await params

  try {
    testLog.push(`[${new Date().toISOString()}] Starting connection test for ID: ${id}`)

    // Get connection details
    const [connection] = await sql`
      SELECT * FROM exchange_connections WHERE id = ${id}
    `

    if (!connection) {
      testLog.push(`[${new Date().toISOString()}] ERROR: Connection not found`)
      return NextResponse.json({ error: "Connection not found", log: testLog }, { status: 404 })
    }

    testLog.push(`[${new Date().toISOString()}] Connection found: ${connection.name} (${connection.exchange})`)
    testLog.push(`[${new Date().toISOString()}] API Type: ${connection.api_type}`)
    testLog.push(`[${new Date().toISOString()}] Connection Method: ${connection.connection_method}`)
    testLog.push(`[${new Date().toISOString()}] Testnet: ${connection.is_testnet ? "Yes" : "No"}`)

    // Get minimum connect interval from settings
    const [settings] = await sql`SELECT minimum_connect_interval FROM system_settings LIMIT 1`
    const minInterval = settings?.minimum_connect_interval || 200
    testLog.push(`[${new Date().toISOString()}] Minimum connect interval: ${minInterval}ms`)

    // Wait for minimum interval
    await new Promise((resolve) => setTimeout(resolve, minInterval))

    let balance = 0
    let apiCapabilities: string[] = []

    // Real connection testing based on exchange
    if (connection.exchange === "bybit") {
      testLog.push(`[${new Date().toISOString()}] Connecting to Bybit API...`)
      const result = await testBybitConnection(connection, testLog)
      balance = result.balance
      apiCapabilities = result.capabilities
    } else if (connection.exchange === "bingx") {
      testLog.push(`[${new Date().toISOString()}] Connecting to BingX API...`)
      const result = await testBingXConnection(connection, testLog)
      balance = result.balance
      apiCapabilities = result.capabilities
    } else if (connection.exchange === "pionex") {
      testLog.push(`[${new Date().toISOString()}] Connecting to Pionex API...`)
      const result = await testPionexConnection(connection, testLog)
      balance = result.balance
      apiCapabilities = result.capabilities
    } else if (connection.exchange === "orangex") {
      testLog.push(`[${new Date().toISOString()}] Connecting to OrangeX API...`)
      const result = await testOrangeXConnection(connection, testLog)
      balance = result.balance
      apiCapabilities = result.capabilities
    } else {
      throw new Error(`Unsupported exchange: ${connection.exchange}`)
    }

    const duration = Date.now() - startTime
    testLog.push(`[${new Date().toISOString()}] Connection successful!`)
    testLog.push(`[${new Date().toISOString()}] Account Balance: ${balance.toFixed(2)} USDT`)
    testLog.push(`[${new Date().toISOString()}] Test completed in ${duration}ms`)

    // Update connection with test results
    await sql`
      UPDATE exchange_connections
      SET 
        last_test_status = 'success',
        last_test_balance = ${balance},
        last_test_log = ${JSON.stringify(testLog)},
        last_test_timestamp = CURRENT_TIMESTAMP,
        api_capabilities = ${JSON.stringify(apiCapabilities)}
      WHERE id = ${id}
    `

    return NextResponse.json({
      success: true,
      balance,
      capabilities: apiCapabilities,
      log: testLog,
      duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    testLog.push(`[${new Date().toISOString()}] ERROR: ${error instanceof Error ? error.message : "Unknown error"}`)
    testLog.push(`[${new Date().toISOString()}] Test failed after ${duration}ms`)

    console.error("[v0] Connection test failed:", error)

    // Update connection with error
    await sql`
      UPDATE exchange_connections
      SET 
        last_test_status = 'failed',
        last_test_log = ${JSON.stringify(testLog)},
        last_test_timestamp = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `

    return NextResponse.json({ error: "Connection test failed", log: testLog, duration }, { status: 500 })
  }
}

async function testBybitConnection(connection: any, log: string[]) {
  const timestamp = Date.now()
  const baseUrl = connection.is_testnet ? "https://api-testnet.bybit.com" : "https://api.bybit.com"

  log.push(`[${new Date().toISOString()}] Using endpoint: ${baseUrl}`)
  log.push(`[${new Date().toISOString()}] Generating signature...`)

  // Create signature for Bybit V5 API
  const recvWindow = "5000"
  const queryString = `api_key=${connection.api_key}&recv_window=${recvWindow}&timestamp=${timestamp}`
  const signature = crypto.createHmac("sha256", connection.api_secret).update(queryString).digest("hex")

  log.push(`[${new Date().toISOString()}] Fetching account balance...`)

  const response = await fetch(`${baseUrl}/v5/account/wallet-balance?accountType=UNIFIED`, {
    method: "GET",
    headers: {
      "X-BAPI-API-KEY": connection.api_key,
      "X-BAPI-SIGN": signature,
      "X-BAPI-TIMESTAMP": timestamp.toString(),
      "X-BAPI-RECV-WINDOW": recvWindow,
    },
  })

  const data = await response.json()

  if (!response.ok || data.retCode !== 0) {
    log.push(`[${new Date().toISOString()}] API Error: ${data.retMsg || "Unknown error"}`)
    throw new Error(data.retMsg || "Bybit API error")
  }

  log.push(`[${new Date().toISOString()}] Successfully retrieved account data`)

  const usdtBalance = data.result?.list?.[0]?.coin?.find((c: any) => c.coin === "USDT")?.walletBalance || 0

  return {
    balance: Number.parseFloat(usdtBalance),
    capabilities: ["unified", "perpetual_futures", "spot", "leverage", "hedge_mode", "trailing"],
  }
}

async function testBingXConnection(connection: any, log: string[]) {
  const timestamp = Date.now()
  const baseUrl = "https://open-api.bingx.com"

  log.push(`[${new Date().toISOString()}] Using endpoint: ${baseUrl}`)
  log.push(`[${new Date().toISOString()}] Generating signature...`)

  const queryString = `timestamp=${timestamp}`
  const signature = crypto.createHmac("sha256", connection.api_secret).update(queryString).digest("hex")

  log.push(`[${new Date().toISOString()}] Fetching account balance...`)

  const response = await fetch(`${baseUrl}/openApi/swap/v2/user/balance?${queryString}&signature=${signature}`, {
    method: "GET",
    headers: {
      "X-BX-APIKEY": connection.api_key,
    },
  })

  const data = await response.json()

  if (!response.ok || data.code !== 0) {
    log.push(`[${new Date().toISOString()}] API Error: ${data.msg || "Unknown error"}`)
    throw new Error(data.msg || "BingX API error")
  }

  log.push(`[${new Date().toISOString()}] Successfully retrieved account data`)

  const usdtBalance = data.data?.balance?.find((b: any) => b.asset === "USDT")?.balance || 0

  return {
    balance: Number.parseFloat(usdtBalance),
    capabilities: ["futures", "perpetual_futures", "leverage", "hedge_mode"],
  }
}

async function testPionexConnection(connection: any, log: string[]) {
  const timestamp = Date.now()
  const baseUrl = "https://api.pionex.com"

  log.push(`[${new Date().toISOString()}] Using endpoint: ${baseUrl}`)
  log.push(`[${new Date().toISOString()}] Generating signature...`)

  const queryString = `timestamp=${timestamp}`
  const signature = crypto.createHmac("sha256", connection.api_secret).update(queryString).digest("hex")

  log.push(`[${new Date().toISOString()}] Fetching account balance...`)

  const response = await fetch(`${baseUrl}/api/v1/account/balances?${queryString}&signature=${signature}`, {
    method: "GET",
    headers: {
      "PIONEX-KEY": connection.api_key,
    },
  })

  const data = await response.json()

  if (!response.ok || !data.result) {
    log.push(`[${new Date().toISOString()}] API Error: ${data.message || "Unknown error"}`)
    throw new Error(data.message || "Pionex API error")
  }

  log.push(`[${new Date().toISOString()}] Successfully retrieved account data`)

  const usdtBalance = data.data?.balances?.find((b: any) => b.coin === "USDT")?.free || 0

  return {
    balance: Number.parseFloat(usdtBalance),
    capabilities: ["futures", "perpetual_futures", "leverage", "hedge_mode"],
  }
}

async function testOrangeXConnection(connection: any, log: string[]) {
  const timestamp = Date.now()
  const baseUrl = "https://api.orangex.com"

  log.push(`[${new Date().toISOString()}] Using endpoint: ${baseUrl}`)
  log.push(`[${new Date().toISOString()}] Generating signature...`)

  const queryString = `timestamp=${timestamp}`
  const signature = crypto.createHmac("sha256", connection.api_secret).update(queryString).digest("hex")

  log.push(`[${new Date().toISOString()}] Fetching account balance...`)

  const response = await fetch(`${baseUrl}/v1/account/balance?${queryString}&signature=${signature}`, {
    method: "GET",
    headers: {
      "X-CH-APIKEY": connection.api_key,
    },
  })

  const data = await response.json()

  if (!response.ok || data.code !== "0") {
    log.push(`[${new Date().toISOString()}] API Error: ${data.msg || "Unknown error"}`)
    throw new Error(data.msg || "OrangeX API error")
  }

  log.push(`[${new Date().toISOString()}] Successfully retrieved account data`)

  const usdtBalance = data.data?.find((b: any) => b.asset === "USDT")?.free || 0

  return {
    balance: Number.parseFloat(usdtBalance),
    capabilities: ["futures", "perpetual_futures", "leverage"],
  }
}
