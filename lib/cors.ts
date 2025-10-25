import { NextResponse } from "next/server"

/**
 * CORS utility for API routes
 * Provides consistent CORS headers across all API endpoints
 */

export interface CorsOptions {
  origin?: string | string[]
  methods?: string[]
  allowedHeaders?: string[]
  credentials?: boolean
  maxAge?: number
}

const defaultOptions: CorsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400, // 24 hours
}

/**
 * Get CORS headers based on options
 */
export function getCorsHeaders(options: CorsOptions = {}): Record<string, string> {
  const opts = { ...defaultOptions, ...options }

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": opts.methods!.join(", "),
    "Access-Control-Allow-Headers": opts.allowedHeaders!.join(", "),
    "Access-Control-Max-Age": opts.maxAge!.toString(),
  }

  // Handle origin
  if (typeof opts.origin === "string") {
    headers["Access-Control-Allow-Origin"] = opts.origin
  } else if (Array.isArray(opts.origin)) {
    headers["Access-Control-Allow-Origin"] = opts.origin.join(", ")
  }

  // Handle credentials
  if (opts.credentials) {
    headers["Access-Control-Allow-Credentials"] = "true"
  }

  return headers
}

/**
 * Create a CORS-enabled response
 */
export function corsResponse(data: any, status = 200, options: CorsOptions = {}): NextResponse {
  const headers = getCorsHeaders(options)

  return NextResponse.json(data, {
    status,
    headers,
  })
}

/**
 * Handle preflight OPTIONS request
 */
export function handlePreflight(options: CorsOptions = {}): NextResponse {
  const headers = getCorsHeaders(options)

  return new NextResponse(null, {
    status: 200,
    headers,
  })
}

/**
 * Wrap an API handler with CORS support
 */
export function withCors(handler: (request: Request) => Promise<NextResponse>, options: CorsOptions = {}) {
  return async (request: Request): Promise<NextResponse> => {
    // Handle preflight
    if (request.method === "OPTIONS") {
      return handlePreflight(options)
    }

    // Execute handler and add CORS headers
    const response = await handler(request)
    const headers = getCorsHeaders(options)

    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}
