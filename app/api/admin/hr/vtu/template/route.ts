import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireSection } from "@/lib/server/session"
import { getVtuTemplate, saveVtuTemplate } from "@/lib/server/vtu-service"

export const GET = withApi(async (req) => {
  await requireSection(req, "hr")
  return NextResponse.json({ template: await getVtuTemplate() })
})

/** PUT { subject, body } saves the default draft; PUT { reset: true } goes back to the built-in one. */
export const PUT = withApi(async (req) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  await saveVtuTemplate(await readJson<any>(req))
  return NextResponse.json({ template: await getVtuTemplate() })
})
