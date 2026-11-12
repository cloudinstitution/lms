import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { deleteHoliday } from "@/lib/server/hr-service"
import { assertSameOrigin, requireSection } from "@/lib/server/session"

export const DELETE = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  await deleteHoliday(id)
  return NextResponse.json({ ok: true })
})
