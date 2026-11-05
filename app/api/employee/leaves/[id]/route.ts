import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { employeeCancelLeave } from "@/lib/server/hr-service"
import { assertSameOrigin, requireEmployee } from "@/lib/server/session"

/** DELETE — cancel one of your own pending requests. */
export const DELETE = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  await employeeCancelLeave(await requireEmployee(req), id)
  return NextResponse.json({ ok: true })
})
