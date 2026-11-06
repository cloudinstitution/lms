import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { runAutoSync } from "@/lib/server/jobs-service"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"

export const maxDuration = 60

/** "Find jobs now" — runs the search even if the automatic schedule is switched off. */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireAdmin(req)
  return NextResponse.json({ run: await runAutoSync("admin", { force: true }) })
})
