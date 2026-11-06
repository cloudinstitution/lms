import { NextResponse } from "next/server"
import { rateLimit, withApi } from "@/lib/server/http"
import { runAutoSyncIfStale } from "@/lib/server/jobs-service"

export const maxDuration = 60

/** Called when someone opens the jobs page: refreshes the automatic job list if it is over 12 hours old. Needs no login and no scheduler. */
export const POST = withApi(async (req) => {
  rateLimit(req, "jobs-refresh", 6)
  return NextResponse.json(await runAutoSyncIfStale().catch(() => ({ ran: false, added: 0 })))
})
