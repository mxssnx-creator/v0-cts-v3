export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("=".repeat(60))
    console.log("[v0] 🚀 AUTOMATIC DEPLOYMENT INITIALIZATION STARTING")
    console.log("=".repeat(60))
    console.log("[v0] Environment Details:")
    console.log("  - Runtime:", process.env.NEXT_RUNTIME)
    console.log("  - Vercel Environment:", process.env.VERCEL_ENV || "local")
    console.log("  - Database Connected:", !!process.env.DATABASE_URL)
    console.log("  - Deployment ID:", process.env.VERCEL_DEPLOYMENT_ID || "local")
    console.log("=".repeat(60))

    try {
      // Import dynamically to avoid Edge Runtime issues
      const { DatabaseInitializer } = await import("./lib/db-initializer")

      console.log("[v0] Starting database initialization...")
      const startTime = Date.now()

      const success = await DatabaseInitializer.initialize()

      const duration = Date.now() - startTime

      if (success) {
        console.log("=".repeat(60))
        console.log("[v0] ✅ DEPLOYMENT INITIALIZATION SUCCESSFUL")
        console.log("=".repeat(60))
        console.log("[v0] All database tables created and ready")
        console.log("[v0] Initialization completed in", duration, "ms")
        console.log("[v0] System is ready to accept requests")
        console.log("=".repeat(60))
      } else {
        console.log("=".repeat(60))
        console.error("[v0] ❌ DEPLOYMENT INITIALIZATION FAILED")
        console.log("=".repeat(60))
        console.error("[v0] Database initialization did not complete successfully")
        console.error("[v0] The app will start but may have limited functionality")
        console.log("=".repeat(60))
      }
    } catch (error) {
      console.log("=".repeat(60))
      console.error("[v0] ❌ DEPLOYMENT INITIALIZATION ERROR")
      console.log("=".repeat(60))
      console.error("[v0] Error during initialization:", error)
      console.error("[v0] The app will start but database may not be initialized")
      console.log("=".repeat(60))
      // Don't throw - allow app to start even if initialization fails
    }
  } else {
    console.log("[v0] Skipping initialization (Edge Runtime)")
  }
}
