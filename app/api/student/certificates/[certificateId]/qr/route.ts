import { renderQrPng } from "@/lib/server/certificate-pdf"
import { siteBaseUrl } from "@/lib/server/certificate-config"
import { loadOwnedCertificate } from "@/lib/server/certificates-service"
import { withApi } from "@/lib/server/http"
import { requireStudent } from "@/lib/server/session"

/** GET — the QR image for the student's own (valid) certificate. It encodes only the verification URL. */
export const GET = withApi<{ certificateId: string }>(async (req, { certificateId }) => {
  const student = await requireStudent(req)
  const cert = await loadOwnedCertificate(student, decodeURIComponent(certificateId), { forDownload: true })
  const png = await renderQrPng(siteBaseUrl(req), cert)
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" } })
})
