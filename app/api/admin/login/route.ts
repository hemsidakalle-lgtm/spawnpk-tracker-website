import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const ADMIN_USERNAME = "Admin"
const ADMIN_PASSWORD = "Hellcat1337!"

function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const sessionToken = generateSessionToken()
    const cookieStore = await cookies()
    
    cookieStore.set("admin_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
