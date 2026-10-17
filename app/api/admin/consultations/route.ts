import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { listConsultations, setConsultationStatus } from "@/lib/server/consultations-service"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"

export const GET = withApi(async (req) => {
  await requireAdmin(req)
  return NextResponse.json({ consultations: await listConsultations() })
})

/** PUT /api/admin/consultations { id, status: "New" | "Contacted" } */
export const PUT = withApi(async (req) => {
  assertSameOrigin(req)
  await requireAdmin(req)
  const b = await readJson<{ id?: unknown; status?: unknown }>(req)
  await setConsultationStatus(String(b.id ?? ""), b.status)
  return NextResponse.json({ ok: true })
})
