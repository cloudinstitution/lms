import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { decideLeave, deleteLeave } from "@/lib/server/hr-service"
import { assertSameOrigin, requireSection } from "@/lib/server/session"

export const PUT = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  await decideLeave(id, (await readJson<{ status?: unknown }>(req)).status)
  return NextResponse.json({ ok: true })
})

export const DELETE = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  await deleteLeave(id)
  return NextResponse.json({ ok: true })
})
