import { toast as sonnerToast } from "sonner"

export const toast = {
  success: (message: string) => {
    console.log(`✅ SUCCESS: ${message}`)
    sonnerToast.success(message)
  },
  info: (message: string) => {
    console.log(`ℹ️ INFO: ${message}`)
    sonnerToast.info(message)
  },
  warning: (message: string) => {
    console.log(`⚠️ WARNING: ${message}`)
    sonnerToast.warning(message)
  },
  error: (message: string) => {
    console.log(`❌ ERROR: ${message}`)
    sonnerToast.error(message)
  },
}
