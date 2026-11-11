import { NextResponse } from "next/server"
import { deleteInternship } from "@/lib/server/hr-service"
import { withApi } from "@/lib/server/http"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"

export const DELETE = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  await requireAdmin(req)
  await deleteInternship(id)
  return NextResponse.json({ ok: true })
})
