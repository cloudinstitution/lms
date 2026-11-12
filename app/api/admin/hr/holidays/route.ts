import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { addHoliday, listHolidays } from "@/lib/server/hr-service"
import { assertSameOrigin, requireSection } from "@/lib/server/session"

export const GET = withApi(async (req) => {
  await requireSection(req, "hr")
  return NextResponse.json({ holidays: await listHolidays(new URL(req.url).searchParams.get("year") || undefined) })
})

export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  return NextResponse.json({ holiday: await addHoliday(await readJson(req)) }, { status: 201 })
})
