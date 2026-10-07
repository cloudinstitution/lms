import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { readSessionUser } from "@/lib/server/session"

/** GET /api/session/me — who the server thinks you are (401 when the cookie is missing/expired). */
export const GET = withApi(async (req) => {
  const user = await readSessionUser(req)
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 })
  return NextResponse.json({
    authenticated: true,
    user: { role: user.role, name: user.name, studentId: user.role === "student" ? user.studentId : null },
  })
})
