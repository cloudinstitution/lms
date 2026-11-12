import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { addLeave, listLeaves } from "@/lib/server/hr-service"
import { assertSameOrigin, requireSection } from "@/lib/server/session"

export const GET = withApi(async (req) => {
  await requireSection(req, "hr")
  const q = new URL(req.url).searchParams
  return NextResponse.json({ leaves: await listLeaves({ year: q.get("year") || undefined, employee_id: q.get("employee_id") || undefined }) })
})

/** POST { employee_id, from, to?, type?, reason?, half_day?, status?: "Approved" | "Pending" } */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  return NextResponse.json({ leave: await addLeave(await readJson(req)) }, { status: 201 })
})
