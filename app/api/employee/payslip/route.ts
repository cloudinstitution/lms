import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { payslipData } from "@/lib/server/hr-service"
import { requireEmployee } from "@/lib/server/session"

/** GET ?month=2026-11 — the signed-in employee's own payslip figures. */
export const GET = withApi(async (req) => {
  const user = await requireEmployee(req)
  return NextResponse.json({ payslip: await payslipData(user.docId, new URL(req.url).searchParams.get("month") ?? "") })
})
