import { type NextRequest, NextResponse } from "next/server"
import { verifyPassword, createToken, setSession } from "@/lib/auth"
import { query } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Missing email or password" }, { status: 400 })
    }

    // Find user
    const users = await query(
      "SELECT id, username, email, password_hash, role, is_active FROM users WHERE email = $1",
      [email],
    )

    if (users.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    const user = users[0]

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json({ success: false, error: "Account is disabled" }, { status: 403 })
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash)

    if (!isValid) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 })
    }

    // Create JWT token
    const token = await createToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    })

    // Set session cookie
    await setSession(token)

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        token,
      },
    })
  } catch (error) {
    console.error("[v0] Login error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
