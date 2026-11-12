import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { experienceLetterData } from "@/lib/server/hr-service"
import { requireSection } from "@/lib/server/session"

/** GET ?employee_id=… — figures for the experience letter (only for employees marked Exited). */
export const GET = withApi(async (req) => {
  await requireSection(req, "hr")
  return NextResponse.json({ letter: await experienceLetterData(new URL(req.url).searchParams.get("employee_id") ?? "") })
})
