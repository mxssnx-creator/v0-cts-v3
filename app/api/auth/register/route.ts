import { type NextRequest, NextResponse } from "next/server"
import { hashPassword, createToken, setSession } from "@/lib/auth"
import { query } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json()

    // Validate input
    if (!username || !email || !password) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters" }, { status: 400 })
    }

    // Check if user already exists
    const existingUsers = await query("SELECT id FROM users WHERE email = $1 OR username = $2", [email, username])

    if (existingUsers.length > 0) {
      return NextResponse.json({ success: false, error: "User already exists" }, { status: 409 })
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)

    const result = await query(
      `INSERT INTO users (username, email, password_hash, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, email, role`,
      [username, email, passwordHash, "user"],
    )

    const user = result[0]

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
    console.error("[v0] Registration error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
