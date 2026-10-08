import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { markNotificationRead } from "@/lib/server/projects-service"
import { assertSameOrigin, requireStudent } from "@/lib/server/session"

export const PUT = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  const student = await requireStudent(req)
  await markNotificationRead(student, id)
  return NextResponse.json({ ok: true })
})
