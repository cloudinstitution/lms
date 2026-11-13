import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { attendanceForDate, attendanceSummary, saveAttendance } from "@/lib/server/hr-service"
import { assertSameOrigin, requireSection } from "@/lib/server/session"

/** GET ?date=2026-11-05 → { records: {employee_id: status}, details: { employee_id: {source:"self", distance_m, away} } }; GET ?month=2026-11 → monthly totals. */
export const GET = withApi(async (req) => {
  await requireSection(req, "hr")
  const q = new URL(req.url).searchParams
  if (q.get("month")) return NextResponse.json({ summary: await attendanceSummary(q.get("month")!) })
  return NextResponse.json(await attendanceForDate(q.get("date") ?? ""))
})

/** POST { date, records: [{ employee_id, status }] } */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  const b = await readJson<{ date?: unknown; records?: unknown }>(req)
  return NextResponse.json(await saveAttendance(b.date, b.records))
})
