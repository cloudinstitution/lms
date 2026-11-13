import { NextResponse } from "next/server"
import { rateLimit, readJson, withApi } from "@/lib/server/http"
import { employeeMarkAttendance } from "@/lib/server/hr-service"
import { assertSameOrigin, requireEmployee } from "@/lib/server/session"

/** POST { lat, lng, accuracy? } — mark today's attendance from the employee's current position (Present near the office, Absent away). */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  rateLimit(req, "employee-attendance", 30)
  const user = await requireEmployee(req)
  const b = await readJson<Record<string, unknown>>(req)
  return NextResponse.json(await employeeMarkAttendance(user, { lat: b.lat, lng: b.lng, accuracy: b.accuracy }))
})
