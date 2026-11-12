import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { payslipData } from "@/lib/server/hr-service"
import { requireSection } from "@/lib/server/session"

/** GET ?employee_id=…&month=2026-11 — figures for one payslip (the PDF is drawn in the browser). */
export const GET = withApi(async (req) => {
  await requireSection(req, "hr")
  const q = new URL(req.url).searchParams
  return NextResponse.json({ payslip: await payslipData(q.get("employee_id") ?? "", q.get("month") ?? "") })
})
