import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { addHoliday, listHolidays } from "@/lib/server/hr-service"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"

export const GET = withApi(async (req) => {
  await requireAdmin(req)
  return NextResponse.json({ holidays: await listHolidays(new URL(req.url).searchParams.get("year") || undefined) })
})

export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireAdmin(req)
  return NextResponse.json({ holiday: await addHoliday(await readJson(req)) }, { status: 201 })
})
