import { NextResponse } from "next/server"
import { ApiError, rateLimit, readJson, withApi } from "@/lib/server/http"
import { authenticateEmployee } from "@/lib/server/hr-service"
import { assertSameOrigin, createSessionToken, setEmployeeCookie } from "@/lib/server/session"

/** POST /api/employee/login { email, password } — 404 when the email is not an employee (so the login page can say so). */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  rateLimit(req, "employee-login", 15)
  const body = await readJson<{ email?: unknown; password?: unknown }>(req)
  const email = typeof body.email === "string" ? body.email : ""
  const password = typeof body.password === "string" ? body.password : ""
  if (!email || !password) throw new ApiError(400, "Email and password are required")
  const user = await authenticateEmployee(email, password)
  if (!user) throw new ApiError(404, "No employee account with this email", "not_employee")
  const res = NextResponse.json({ success: true, user: { role: user.role, name: user.name, email: user.email } })
  setEmployeeCookie(res, await createSessionToken(user))
  return res
})
