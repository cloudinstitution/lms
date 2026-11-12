import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireAdmin } from "@/lib/server/session"
import { createStaff, listStaff } from "@/lib/server/staff-service"

export const GET = withApi(async (req) => {
  await requireAdmin(req)
  return NextResponse.json({ users: await listStaff() })
})

export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireAdmin(req)
  return NextResponse.json({ user: await createStaff(await readJson(req)) }, { status: 201 })
})
