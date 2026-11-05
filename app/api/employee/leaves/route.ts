import { NextResponse } from "next/server"
import { rateLimit, readJson, withApi } from "@/lib/server/http"
import { employeeApplyLeave } from "@/lib/server/hr-service"
import { assertSameOrigin, requireEmployee } from "@/lib/server/session"

/** POST { from, to?, type?, reason?, half_day? } — apply for leave (starts as Pending for the admin to decide). */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  rateLimit(req, "employee-leave", 20)
  const user = await requireEmployee(req)
  const b = await readJson<Record<string, unknown>>(req)
  return NextResponse.json({ leave: await employeeApplyLeave(user, { from: b.from, to: b.to, type: b.type, reason: b.reason, half_day: b.half_day }) }, { status: 201 })
})
