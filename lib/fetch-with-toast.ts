import { toast } from "@/lib/simple-toast"
import { extractToastFromResponse, type ToastMessage } from "@/lib/api-toast"

export async function fetchWithToast(url: string, options?: RequestInit): Promise<Response> {
  try {
    const response = await fetch(url, options)

    // Check for toast message in response headers
    const toastMessage = extractToastFromResponse(response)
    if (toastMessage) {
      showToast(toastMessage)
    }

    return response
  } catch (error) {
    toast.error("Network Error: Failed to connect to the server")
    throw error
  }
}

function showToast(message: ToastMessage) {
  const fullMessage = message.description ? `${message.message}: ${message.description}` : message.message

  switch (message.type) {
    case "success":
      toast.success(fullMessage)
      break
    case "error":
      toast.error(fullMessage)
      break
    case "info":
      toast.info(fullMessage)
      break
    case "warning":
      toast.info(fullMessage)
      break
  }
}
