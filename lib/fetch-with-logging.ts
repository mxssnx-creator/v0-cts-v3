"use client"

import { SiteLogger } from "./site-logger"

export async function fetchWithLogging(url: string, options?: RequestInit): Promise<Response> {
  const startTime = Date.now()
  const method = options?.method || "GET"

  try {
    SiteLogger.debug("API", `${method} ${url} - Request started`, {
      method,
      url,
      headers: options?.headers,
    })

    const response = await fetch(url, options)
    const duration = Date.now() - startTime

    if (response.ok) {
      SiteLogger.info("API", `${method} ${url} - ${response.status}`, {
        method,
        url,
        status: response.status,
        duration: `${duration}ms`,
      })
    } else {
      SiteLogger.warning("API", `${method} ${url} - ${response.status}`, {
        method,
        url,
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
      })
    }

    return response
  } catch (error: any) {
    const duration = Date.now() - startTime
    SiteLogger.error("API", `${method} ${url} - Failed`, {
      method,
      url,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    })
    throw error
  }
}
