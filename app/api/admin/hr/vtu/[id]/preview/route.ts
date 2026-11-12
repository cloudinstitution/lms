import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { requireSection } from "@/lib/server/session"
import { getVtuInternship, renderVtuMail } from "@/lib/server/vtu-service"

/** The email exactly as this student will receive (or received) it. */
export const GET = withApi<{ id: string }>(async (req, { id }) => {
  await requireSection(req, "hr")
  const m = renderVtuMail(await getVtuInternship(id))
  return NextResponse.json({ subject: m.subject, text: m.text })
})
