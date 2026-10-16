import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { decidePaymentRequest } from "@/lib/server/learners-service"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"

/** PUT /api/admin/payment-requests/:id { action: "approve" | "reject" } */
export const PUT = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  const admin = await requireAdmin(req)
  const body = await readJson<{ action?: unknown }>(req)
  return NextResponse.json(await decidePaymentRequest(admin.name, id, body.action))
})
