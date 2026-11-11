import { NextResponse } from "next/server"
import { emailInternship } from "@/lib/server/internship-service"
import { withApi } from "@/lib/server/http"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"

export const maxDuration = 60

/** Email the letter to the candidate (again). */
export const POST = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  await requireAdmin(req)
  return NextResponse.json({ email: await emailInternship(id) })
})
