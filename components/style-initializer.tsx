"use client"

import { useEffect } from "react"

export function StyleInitializer() {
  useEffect(() => {
    // Apply saved style variant on mount
    const savedStyle = localStorage.getItem("style-variant") || "default"
    const root = document.documentElement

    root.classList.remove("style-default", "style-new-york", "style-minimal", "style-rounded", "style-compact")

    // Add the saved style class
    root.classList.add(`style-${savedStyle}`)
  }, [])

  return null
}
