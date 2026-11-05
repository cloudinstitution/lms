import { NextResponse } from "next/server"
import { withApi } from "@/lib/server/http"
import { assertSameOrigin, clearEmployeeCookie } from "@/lib/server/session"

export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  const res = NextResponse.json({ success: true })
  clearEmployeeCookie(res)
  return res
})
