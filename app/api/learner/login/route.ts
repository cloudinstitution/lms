import { NextResponse } from "next/server"
import { ApiError, rateLimit, readJson, withApi } from "@/lib/server/http"
import { authenticateLearner } from "@/lib/server/learners-service"
import { assertSameOrigin, createSessionToken, setLearnerCookie } from "@/lib/server/session"

/** POST /api/learner/login { email, password } */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  rateLimit(req, "learner-login", 15)
  const body = await readJson<{ email?: unknown; password?: unknown }>(req)
  const email = typeof body.email === "string" ? body.email : ""
  const password = typeof body.password === "string" ? body.password : ""
  if (!email || !password) throw new ApiError(400, "Email and password are required")
  const user = await authenticateLearner(email, password)
  if (!user) throw new ApiError(404, "No account found with this email", "not_learner")
  const res = NextResponse.json({ success: true, user: { role: user.role, name: user.name, email: user.email } })
  setLearnerCookie(res, await createSessionToken(user))
  return res
})
