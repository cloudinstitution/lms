import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { assertSameOrigin, clearSessionCookie } from "@/lib/server/session"

/** POST /api/session/logout — clears the server session cookie. */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  const res = NextResponse.json({ success: true })
  clearSessionCookie(res)
  return res
})
