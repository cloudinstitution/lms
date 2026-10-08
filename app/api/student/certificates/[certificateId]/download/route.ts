import { renderCertificatePdf } from "@/lib/server/certificate-pdf"
import { siteBaseUrl } from "@/lib/server/certificate-config"
import { loadOwnedCertificate } from "@/lib/server/certificates-service"
import { withApi } from "@/lib/server/http"
import { requireStudent } from "@/lib/server/session"

/**
 * GET /api/student/certificates/{certificate_id}/download[?inline=1]
 * The backend checks ownership, project.status == "Accepted" and certificate.status == "Valid" on every call,
 * then renders the PDF from the stored record (so refreshing/re-downloading never creates anything new).
 */
export const GET = withApi<{ certificateId: string }>(async (req, { certificateId }) => {
  const student = await requireStudent(req)
  const cert = await loadOwnedCertificate(student, decodeURIComponent(certificateId), { forDownload: true })
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
