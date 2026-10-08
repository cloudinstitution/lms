import { NextResponse } from "next/server"
import { loadOwnedCertificate, toCertificateView } from "@/lib/server/certificates-service"
import { siteBaseUrl } from "@/lib/server/certificate-config"
import { withApi } from "@/lib/server/http"
import { requireStudent } from "@/lib/server/session"

/** GET /api/student/certificates/{certificate_id} — 403 if it belongs to another student. */
export const GET = withApi<{ certificateId: string }>(async (req, { certificateId }) => {
  const student = await requireStudent(req)
  const cert = await loadOwnedCertificate(student, decodeURIComponent(certificateId), { forDownload: false })
  return NextResponse.json({ certificate: { ...toCertificateView(cert, siteBaseUrl(req)), qr_code_url: cert.qr_code_url, certificate_file_url: cert.certificate_file_url } })
})
