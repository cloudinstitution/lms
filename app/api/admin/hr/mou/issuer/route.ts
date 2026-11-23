import { NextResponse } from "next/server"
import { readJson, withApi } from "@/lib/server/http"
import { assertSameOrigin, requireSection } from "@/lib/server/session"
import { getIssuerSettings, getMouMailTemplate, getMouTemplateFile, removeSignatureImage, saveIssuerSettings, saveSignatureImage } from "@/lib/server/mou-service"

/** Everything the MOU tab needs for one issuing company: signer, signature, email draft, template. */
async function bundle(issuer: unknown) {
  const [settings, draft, f] = await Promise.all([getIssuerSettings(issuer), getMouMailTemplate(issuer), getMouTemplateFile(issuer)])
  return { settings, draft, template: { custom: f.custom, name: f.name, updated_at: f.updated_at ?? null } }
}

export const GET = withApi(async (req) => {
  await requireSection(req, "hr")
  return NextResponse.json(await bundle(new URL(req.url).searchParams.get("issuer")))
})

/** PUT { issuer, signer_name, signer_title, digital?, signature? (base64 image), remove_signature? } */
export const PUT = withApi(async (req) => {
  assertSameOrigin(req)
  await requireSection(req, "hr")
  const b = await readJson<any>(req)
  if (b.signature) await saveSignatureImage(b.issuer, b.signature)
  if (b.remove_signature === true) await removeSignatureImage(b.issuer)
  await saveIssuerSettings(b.issuer, b)
  return NextResponse.json(await bundle(b.issuer))
})
