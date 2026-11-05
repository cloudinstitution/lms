import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { updateEmployee } from "@/lib/server/hr-service"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"

/** PUT — edit details, salary or set status Active / Inactive (employees are never deleted, so history stays). */
export const PUT = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  await requireAdmin(req)
  await updateEmployee(id, await readJson(req))
  return NextResponse.json({ ok: true })
})
