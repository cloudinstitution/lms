import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { createEmployee, employeesWithBalance } from "@/lib/server/hr-service"
import { assertSameOrigin, requireSection } from "@/lib/server/session"

const thisYear = () => String(new Date(Date.now() + 330 * 60000).getUTCFullYear())

/** GET /api/admin/hr/employees?year=2026 — employees with leave taken / pending / remaining. */
export const GET = withApi(async (req) => {
  await requireSection(req, "hr")
  const year = new URL(req.url).searchParams.get("year") || thisYear()
  return NextResponse.json({ year, employees: await employeesWithBalance(year) })
})

export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  return NextResponse.json({ employee: await createEmployee(await readJson(req)) }, { status: 201 })
})
