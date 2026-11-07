import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { SOURCES, getAutoSettings, saveAutoSettings, sourceReady } from "@/lib/server/jobs-service"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"

export const GET = withApi(async (req) => {
  await requireAdmin(req)
  return NextResponse.json({ settings: await getAutoSettings(), sources: SOURCES.map((s) => ({ ...s, ready: !s.needs_key || sourceReady(s.id) })) })
})

export const PUT = withApi(async (req) => {
  assertSameOrigin(req)
  await requireAdmin(req)
  return NextResponse.json({ settings: await saveAutoSettings(await readJson(req)) })
})
