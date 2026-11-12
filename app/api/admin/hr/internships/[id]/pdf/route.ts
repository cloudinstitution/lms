import { internshipPdf } from "@/lib/server/internship-service"
import { withApi } from "@/lib/server/http"
import { requireSection } from "@/lib/server/session"

export const maxDuration = 60

/** The offer letter as a PDF download. */
export const GET = withApi<{ id: string }>(async (req, { id }) => {
  await requireSection(req, "hr")
  const { bytes, filename } = await internshipPdf(id)
  return new Response(new Uint8Array(bytes), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${filename}"`, "cache-control": "no-store" } })
})
