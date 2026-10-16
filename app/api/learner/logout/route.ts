import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { assertSameOrigin, clearLearnerCookie } from "@/lib/server/session"

/** POST /api/learner/logout — signs the learner out (student/admin sessions are untouched). */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  const res = NextResponse.json({ success: true })
  clearLearnerCookie(res)
  return res
})
