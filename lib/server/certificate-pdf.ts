import { jsPDF } from "jspdf"
import QRCode from "qrcode"
import { certificateConfig } from "./certificate-config"
import { formatIssueDate, verifyUrlFor } from "./certificates-service"
import { LOGO_PNG_BASE64 } from "./certificate-logo"
import { SEAL_PNG_BASE64 } from "./certificate-seal"
import type { CertificateDoc } from "./types"

const W = 841.89 // A4 landscape, points
const H = 595.28
const NAVY = "#1b2a49"
const GOLD = "#b8934a"
const INK = "#2b2b2b"
const PEN = "#14308a"

/** PNG of the QR code. It encodes ONLY the verification URL (random token) — no personal data. */
export async function renderQrPng(baseUrl: string, cert: Pick<CertificateDoc, "certificate_token">): Promise<Buffer> {
  return QRCode.toBuffer(verifyUrlFor(baseUrl, cert), { errorCorrectionLevel: "H", margin: 2, width: 600, type: "png" })
}

function fitSize(doc: jsPDF, font: [string, string], text: string, max: number, min: number, width: number): number {
  let size = max
  doc.setFont(font[0], font[1])
  while (size > min) {
    doc.setFontSize(size)
    if (doc.getTextWidth(text) <= width) break
    size -= 1
  }
  return size
}

/**
 * Render the certificate as a one-page landscape A4 PDF. It is generated from the stored record every time it is
 * requested, so downloading / refreshing never creates anything new — same record, same ID, same QR.
 */
export async function renderCertificatePdf(cert: CertificateDoc, baseUrl: string): Promise<Buffer> {
  const org = certificateConfig.orgName()
  const signer = certificateConfig.signatoryName()
  const signerTitle = certificateConfig.signatoryTitle()
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4", compress: true })
  doc.setProperties({
    title: `Certificate ${cert.certificate_id}`,
    subject: "Certificate of Course Completion",
    author: org,
  })
  const cx = W / 2

  const centered = (text: string, y: number, charSpace = 0) => {
    const width = doc.getTextWidth(text) + charSpace * text.length
    doc.text(text, (W - width) / 2, y, charSpace ? { charSpace } : undefined)
  }

  // Background and frames
  doc.setFillColor("#ffffff") // pure white so the logo's own white background is invisible
  doc.rect(0, 0, W, H, "F")
  doc.setDrawColor(NAVY)
  doc.setLineWidth(4)
  doc.rect(18, 18, W - 36, H - 36, "S")
  doc.setDrawColor(GOLD)
  doc.setLineWidth(1.2)
  doc.rect(28, 28, W - 56, H - 56, "S")
  doc.setFillColor(GOLD)
  for (const [x, y] of [[28, 28], [W - 28, 28], [28, H - 28], [W - 28, H - 28]]) doc.rect(x - 5, y - 5, 10, 10, "F")

  // Logo + organisation
  doc.addImage(`data:image/png;base64,${LOGO_PNG_BASE64}`, "PNG", cx - 26, 42, 52, 56)
  doc.setTextColor(NAVY)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  centered(org.toUpperCase(), 124, 2.5)

  // Title
  doc.setFont("times", "bold")
  doc.setFontSize(29)
  centered("CERTIFICATE OF COURSE COMPLETION", 164, 1)
  doc.setDrawColor(GOLD)
  doc.setLineWidth(1)
  doc.line(cx - 140, 192, cx + 140, 192)

  // Recipient
  doc.setTextColor(INK)
  doc.setFont("times", "italic")
  doc.setFontSize(15)
  centered("This certificate is proudly presented to", 220)

  const nameSize = fitSize(doc, ["times", "bold"], cert.student_name, 38, 20, W - 200)
  doc.setTextColor(NAVY)
  doc.setFont("times", "bold")
  doc.setFontSize(nameSize)
  centered(cert.student_name, 262)
  doc.setDrawColor(GOLD)
  doc.setLineWidth(0.8)
  doc.line(cx - 200, 282, cx + 200, 282)

  doc.setTextColor(INK)
  doc.setFont("times", "italic")
  doc.setFontSize(15)
  centered("for successfully completing the course", 318)

  // Course name: up to two lines, shrinking to fit
  const titleW = W - 200
  let titleSize = 28
  let lines: string[] = []
  doc.setFont("times", "bold")
  for (; titleSize >= 12; titleSize--) {
    doc.setFontSize(titleSize)
    lines = doc.splitTextToSize(cert.course_name, titleW) as string[]
    if (lines.length <= 2) break
  }
  if (lines.length > 2) lines = [lines[0], `${lines[1].slice(0, Math.max(0, lines[1].length - 1))}…`]
  doc.setTextColor(NAVY)
  doc.setFontSize(titleSize)
  lines.forEach((line, i) => centered(line, 360 + i * (titleSize + 4)))

  // Bottom-left: signature
  const sx = 100
  doc.setTextColor(PEN)
  doc.setFont("times", "bolditalic")
  doc.setFontSize(30)
  const sigW = doc.getTextWidth(signer)
  doc.text(signer, sx + 90 - sigW / 2, 486, { angle: 4 })
  doc.setDrawColor(INK)
  doc.setLineWidth(0.8)
  doc.line(sx - 10, 494, sx + 190, 494)
  doc.setTextColor(NAVY)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text(signer, sx + 90, 510, { align: "center" })
  doc.setTextColor(INK)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.text(signerTitle, sx + 90, 524, { align: "center" })
  // Company seal beside the signature
  doc.addImage(`data:image/png;base64,${SEAL_PNG_BASE64}`, "PNG", sx + 170, 448, 66, 69)

  // Bottom-centre: ID and date
  doc.setTextColor(NAVY)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text(`Certificate ID: ${cert.certificate_id}`, 480, 480, { align: "center" })
  doc.setTextColor(INK)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10.5)
  doc.text(`Date of Issue: ${formatIssueDate(cert.issue_date)}`, 480, 500, { align: "center" })

  // Bottom-right: QR
  const qrPng = await renderQrPng(baseUrl, cert)
  const qs = 92
  const qx = W - 100 - qs
  doc.addImage(`data:image/png;base64,${qrPng.toString("base64")}`, "PNG", qx, 428, qs, qs)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text("Scan to verify authenticity", qx + qs / 2, 530, { align: "center" })

  return Buffer.from(doc.output("arraybuffer"))
}
