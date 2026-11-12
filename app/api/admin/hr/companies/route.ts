import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { listCompanies, saveCompany } from "@/lib/server/hr-service"
import { assertSameOrigin, requireSection } from "@/lib/server/session"

export const GET = withApi(async (req) => {
  await requireSection(req, "hr")
  return NextResponse.json({ companies: await listCompanies() })
})

/** POST { id?, name, address } — add a company, or edit one when id is given. `address` is up to 3 lines (array or newline-separated). */
export const POST = withApi(async (req) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  return NextResponse.json({ company: await saveCompany(await readJson(req)) })
})
