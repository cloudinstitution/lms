import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { requireSection } from "@/lib/server/session"
import { getMou, renderMouMail } from "@/lib/server/mou-service"

/** The email exactly as this company will receive (or received) it. */
export const GET = withApi<{ id: string }>(async (req, { id }) => {
  await requireSection(req, "hr")
  const m = renderMouMail(await getMou(id))
  return NextResponse.json({ subject: m.subject, text: m.text })
})
