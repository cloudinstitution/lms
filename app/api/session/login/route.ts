import { NextResponse } from "next/server"
import { ApiError, rateLimit, readJson, withApi } from "@/lib/server/http"
import { assertSameOrigin, authenticate, createSessionToken, setSessionCookie } from "@/lib/server/session"

/**
 * POST /api/session/login  { username, password }
 *
 * Verifies the credentials on the server (same Firestore collections as the existing login page)
 * and sets an HttpOnly, signed session cookie. The certificate / project APIs trust only this cookie,
 * never the browser's localStorage session.
 */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  rateLimit(req, "session-login", 15)

  const body = await readJson<{ username?: unknown; password?: unknown }>(req)
  const username = typeof body.username === "string" ? body.username.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""
  if (!username || !password) throw new ApiError(400, "Username and password are required")

  const user = await authenticate(username, password)
  if (!user) throw new ApiError(401, "Invalid credentials")

  const res = NextResponse.json({
    success: true,
    user: { role: user.role, name: user.name, studentId: user.role === "student" ? user.studentId : null },
  })
  setSessionCookie(res, await createSessionToken(user))
  return res
})
