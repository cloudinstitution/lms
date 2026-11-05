import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { employeeOverview } from "@/lib/server/hr-service"
import { requireEmployee } from "@/lib/server/session"

/** GET /api/employee/me?month=2026-11 — own profile, leave balance, leaves, holidays and that month's attendance. */
export const GET = withApi(async (req) => {
  const user = await requireEmployee(req)
  return NextResponse.json(await employeeOverview(user, new URL(req.url).searchParams.get("month") || undefined))
})
