import { renderCertificatePdf } from "@/lib/server/certificate-pdf"
import { siteBaseUrl } from "@/lib/server/certificate-config"
import { adminLoadCertificate } from "@/lib/server/certificates-service"
import { withApi } from "@/lib/server/http"
import { requireAdmin } from "@/lib/server/session"

/** GET — admin view/download of any certificate (including revoked ones). */
export const GET = withApi<{ certificateId: string }>(async (req, { certificateId }) => {
  await requireAdmin(req)
  const cert = await adminLoadCertificate(decodeURIComponent(certificateId))
  const pdf = await renderCertificatePdf(cert, siteBaseUrl(req))
  const inline = req.nextUrl.searchParams.get("inline") === "1"
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${cert.certificate_id.replace(/[^\w.-]/g, "_")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  })
})
