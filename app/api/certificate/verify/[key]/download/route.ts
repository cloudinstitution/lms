import { renderCertificatePdf } from "@/lib/server/certificate-pdf"
import { certificateConfig, siteBaseUrl } from "@/lib/server/certificate-config"
import { findCertificateForVerify } from "@/lib/server/certificates-service"
import { ApiError, rateLimit, withApi } from "@/lib/server/http"

export const dynamic = "force-dynamic"

/** GET — public PDF download, only when the institute enabled it (CERT_PUBLIC_DOWNLOAD=true). Off by default. */
export const GET = withApi<{ key: string }>(async (req, { key }) => {
  rateLimit(req, "verify-download", 30)
  if (!certificateConfig.publicDownload()) throw new ApiError(403, "Public download is disabled for certificates")
  const cert = await findCertificateForVerify(decodeURIComponent(key))
  if (!cert) throw new ApiError(404, "Certificate not found")
  if (cert.status !== "Valid") throw new ApiError(403, "Certificate is not valid")
  const pdf = await renderCertificatePdf(cert, siteBaseUrl(req))
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${cert.certificate_id.replace(/[^\w.-]/g, "_")}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
})
