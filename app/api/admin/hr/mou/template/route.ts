import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireSection } from "@/lib/server/session"
import { getMouTemplateFile, resetMouTemplateFile, saveMouTemplateFile } from "@/lib/server/mou-service"

export const maxDuration = 60

/** The MOU Word template currently in use (built-in or uploaded), as a download. */
export const GET = withApi(async (req) => {
  await requireSection(req, "hr")
  const f = await getMouTemplateFile()
  return new Response(new Uint8Array(f.buf), { headers: { "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "content-disposition": `attachment; filename="${f.name.replace(/"/g, "")}"`, "cache-control": "no-store" } })
})

/** PUT { filename, data (base64 .docx) } — use your own MOU template. It must contain [Company Name]. */
export const PUT = withApi(async (req) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  const b = await readJson<any>(req)
  await saveMouTemplateFile(b.filename, b.data)
  const f = await getMouTemplateFile()
  return NextResponse.json({ template: { custom: f.custom, name: f.name, updated_at: f.updated_at ?? null } })
})

/** DELETE — go back to the built-in template. */
export const DELETE = withApi(async (req) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  await resetMouTemplateFile()
  return NextResponse.json({ ok: true })
})
