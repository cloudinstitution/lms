import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireSection } from "@/lib/server/session"
import { deleteMou, updateMou } from "@/lib/server/mou-service"

export const DELETE = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  await deleteMou(id)
  return NextResponse.json({ ok: true })
})

/** PATCH { company?, address?, name?, designation?, email?, phone?, business?, mou_date? } — correct a company's details. */
export const PATCH = withApi<{ id: string }>(async (req, { id }) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  return NextResponse.json({ mou: await updateMou(id, await readJson<any>(req)) })
})
