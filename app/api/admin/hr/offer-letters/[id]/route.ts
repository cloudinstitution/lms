import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { deleteOfferLetter } from "@/lib/server/hr-service"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"

export const DELETE = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  await requireAdmin(req)
  await deleteOfferLetter(id)
  return NextResponse.json({ ok: true })
})
