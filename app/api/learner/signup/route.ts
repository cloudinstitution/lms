import { NextResponse } from "next/server"
import { rateLimit, readJson, withApi } from "@/lib/server/http"
import { signupLearner } from "@/lib/server/learners-service"
import { assertSameOrigin, createSessionToken, setLearnerCookie } from "@/lib/server/session"

/** POST /api/learner/signup { name, email, phone?, password } — creates a learner account and signs it in. */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  rateLimit(req, "learner-signup", 10)
  const body = await readJson<{ name?: unknown; email?: unknown; phone?: unknown; password?: unknown }>(req)
  const user = await signupLearner(body)
  const res = NextResponse.json({ success: true, user: { role: user.role, name: user.name, email: user.email } }, { status: 201 })
  setLearnerCookie(res, await createSessionToken(user))
  return res
})
