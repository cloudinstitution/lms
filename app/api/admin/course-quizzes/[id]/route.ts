import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { adminDeleteQuiz } from "@/lib/server/learning-service"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"

export const DELETE = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  await requireAdmin(req)
  await adminDeleteQuiz(id)
  return NextResponse.json({ ok: true })
})
