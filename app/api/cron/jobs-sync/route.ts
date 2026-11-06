import { NextRequest, NextResponse } from "next/server"
import { ApiError, withApi } from "@/lib/server/http"
import { runAutoSync } from "@/lib/server/jobs-service"

export const maxDuration = 60

/** Called by the scheduler (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`). Does nothing when CRON_SECRET is unset. */
const handle = withApi(async (req: NextRequest) => {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) throw new ApiError(401, "Not allowed")
  return NextResponse.json({ run: await runAutoSync("schedule") })
})
export const GET = handle
export const POST = handle
