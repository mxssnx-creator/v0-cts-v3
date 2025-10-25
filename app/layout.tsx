import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { StyleInitializer } from "@/components/style-initializer"
import { AuthProvider } from "@/lib/auth-context"
import { Toaster } from "@/components/ui/sonner"
import { SiteLoggerProvider } from "@/components/site-logger-provider"

export const metadata: Metadata = {
  title: "CTS v3 - Crypto Trading System",
  description: "Advanced crypto trading system with real-time analytics and automated strategies",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="antialiased style-default" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans">
        <StyleInitializer />
        <ThemeProvider
          attribute="class"
          defaultTheme="white"
          enableSystem={false}
          themes={["dark", "white", "grey", "blackwhite"]}
        >
          <AuthProvider>
            <SiteLoggerProvider>
              <SidebarProvider defaultOpen={true}>
                <AppSidebar />
                <main className="flex-1 w-full">{children}</main>
              </SidebarProvider>
            </SiteLoggerProvider>
          </AuthProvider>
          <Toaster position="top-right" expand={true} richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
