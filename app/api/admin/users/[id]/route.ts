import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"
import { deleteStaff, updateStaff } from "@/lib/server/staff-service"

export const PATCH = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  const me = await requireAdmin(req)
  return NextResponse.json({ user: await updateStaff(id, me.docId, await readJson(req)) })
})

export const DELETE = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  const me = await requireAdmin(req)
  await deleteStaff(id, me.docId)
  return NextResponse.json({ ok: true })
})
