import { NextResponse } from "next/server"
import { deleteInternship } from "@/lib/server/hr-service"
import { withApi } from "@/lib/server/http"
import { assertSameOrigin, requireSection } from "@/lib/server/session"

export const DELETE = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  await deleteInternship(id)
  return NextResponse.json({ ok: true })
})
