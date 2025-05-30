import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // In a real application, you would validate credentials against a database
    // This is a simplified example for demonstration purposes

    // Check if it's an admin login
    if (email === "admin@example.com" && password === "admin123") {
      return NextResponse.json({
        success: true,
        user: {
          id: 1,
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
        },
      })
    }

    // Check if it's a student login
    if (email === "student@example.com" && password === "student123") {
      return NextResponse.json({
        success: true,
        user: {
          id: 2,
          name: "Student User",
          email: "student@example.com",
          role: "student",
        },
      })
    }

    // If credentials don't match
    return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ success: false, message: "An error occurred" }, { status: 500 })
  }
}
