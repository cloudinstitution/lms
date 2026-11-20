import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireSection } from "@/lib/server/session"
import { getMouMailTemplate, saveMouMailTemplate } from "@/lib/server/mou-service"

/** PUT { subject, body } saves the default email draft; PUT { reset: true } goes back to the built-in one. */
export const PUT = withApi(async (req) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  await saveMouMailTemplate(await readJson<any>(req))
  return NextResponse.json({ draft: await getMouMailTemplate() })
})
