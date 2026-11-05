import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { experienceLetterData } from "@/lib/server/hr-service"
import { requireAdmin } from "@/lib/server/session"

/** GET ?employee_id=… — figures for the experience letter (only for employees marked Exited). */
export const GET = withApi(async (req) => {
  await requireAdmin(req)
  return NextResponse.json({ letter: await experienceLetterData(new URL(req.url).searchParams.get("employee_id") ?? "") })
})
