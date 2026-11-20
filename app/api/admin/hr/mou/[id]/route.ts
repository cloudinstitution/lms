import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { assertSameOrigin, requireSection } from "@/lib/server/session"
import { deleteMou } from "@/lib/server/mou-service"

export const DELETE = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  await deleteMou(id)
  return NextResponse.json({ ok: true })
})
