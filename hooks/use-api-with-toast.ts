"use client"

import { useState, useCallback } from "react"
import { toast } from "@/lib/simple-toast"

type ApiState<T> = {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApiWithToast<T = any>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(
    async (
      apiCall: () => Promise<Response>,
      options?: {
        successMessage?: string
        errorMessage?: string
        showSuccessToast?: boolean
        showErrorToast?: boolean
      },
    ) => {
      const {
        successMessage = "Operation successful",
        errorMessage = "Operation failed",
        showSuccessToast = true,
        showErrorToast = true,
      } = options || {}

      setState({ data: null, loading: true, error: null })

      try {
        const response = await apiCall()
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || errorMessage)
        }

        setState({ data, loading: false, error: null })

        if (showSuccessToast) {
          toast.success(successMessage)
        }

        return data
      } catch (error: any) {
        const errorMsg = error.message || errorMessage
        setState({ data: null, loading: false, error: errorMsg })

        if (showErrorToast) {
          toast.error(errorMsg)
        }

        throw error
      }
    },
    [],
  )

  return { ...state, execute }
}
