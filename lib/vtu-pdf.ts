import { jsPDF } from "jspdf"
import type { LetterImage } from "./internship-pdf"

export const VTU_ORG = {
  name: "Cloud Institution", website: "www.cloudinstitution.com", email: "info@cloudinstitution.com", phone: "+91 76763 70336",
  address: "2, HB complex, 4th Floor, Cloud Institution, 100 Feet Ring Rd, near Silk Board, Dollar Scheme Colony, BTM 1st Stage, Bengaluru, Karnataka 560068",
  signatory: "Dilip D",
}

export type VtuLetter = {
  vtu_id: string; candidate_name: string; usn?: string; college?: string; program: string; weeks: number; offer_date: string
  coordinator_name: string; coordinator_title: string
}

const longDate = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : iso)

/**
 * One-page "Internship Offer Letter" for students coming through the VTU Internship Portal, in the Cloud Institution format:
 * logo and contact block, the offer text (program + weeks), requirements list, sign-off with stamp, and the HOD authorization block.
 * Pure (no DOM / network), so it runs in the browser or on the server.
 */
export function buildVtuOfferPdf(o: VtuLetter, images: { logo?: LetterImage | null; seal?: LetterImage | null } = {}): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth()
  const L = 44, R = W - 44
  const { logo, seal } = images
  const blue: [number, number, number] = [47, 84, 170]

  // header: logo + website (left), phone + address (right), rule underneath
  if (logo) { const h = 24; doc.addImage(logo.data, logo.fmt, L - 4, 36, (logo.w / logo.h) * h, h) } else doc.setFont("times", "bold").setFontSize(18).text(VTU_ORG.name, L, 55)
  doc.setFont("times", "normal").setFontSize(9).setTextColor(...blue).text(VTU_ORG.website, L + 12, 80).setTextColor(0)
  doc.setFont("times", "normal").setFontSize(10).text(VTU_ORG.phone, R, 34, { align: "right" })
  let hy = 52
  for (const l of doc.splitTextToSize(VTU_ORG.address, 190) as string[]) { doc.text(l, R, hy, { align: "right" }); hy += 13 }
  doc.setDrawColor(90).setLineWidth(0.6).line(L - 4, 96, R + 4, 96)

  let y = 130
  doc.setFont("times", "bold").setFontSize(17).setTextColor(...blue).text("INTERNSHIP OFFER LETTER", W / 2, y, { align: "center" }); doc.setTextColor(0)
  y += 24
  doc.setFont("times", "normal").setFontSize(10.5).text(`Date: ${longDate(o.offer_date)}`, R, y, { align: "right" })
  doc.setFontSize(8.5).setTextColor(110).text(`Ref: ${o.vtu_id}`, R, y + 12, { align: "right" }); doc.setTextColor(0)
  y += 10

  const line = 15
  doc.setFont("times", "normal").setFontSize(11).text("To,", L, y); y += line
  doc.text(o.candidate_name, L, y); y += line
  const who = [o.usn ? `USN: ${o.usn}` : "", o.college].filter(Boolean).join(" | ")
  if (who) { doc.setFontSize(10).text(who, L, y); y += line }
  y += 8

  const rich = (runs: [string, boolean][], gap = 10, x0 = L) => {
    doc.setFontSize(11); let x = x0
    for (const [text, bold] of runs) {
      doc.setFont("times", bold ? "bold" : "normal")
      for (const word of text.split(/(\s+)/)) {
        if (!word) continue
        const w = doc.getTextWidth(word)
        if (x + w > R && word.trim()) { y += line; x = x0 }
        if (x === x0 && !word.trim()) continue
        doc.text(word, x, y); x += w
      }
    }
    y += line + gap
  }

  rich([[`Subject: Internship Offer Letter – ${o.program} Internship`, true]], 6)
  rich([["Thank you for exploring Internship opportunities with ", false], [VTU_ORG.name, true], [" through the ", false], ["VTU Internship Portal", true], [". We are pleased to offer you an Internship with our organization.", false]])
  rich([["This internship will run for ", false], [`${o.weeks} weeks`, true], [" as per VTU Guidelines. The Internship will provide you with hands-on exposure through guided tasks, structured modules, and practical projects on ", false], [o.program, false], [" and related platforms.", false]])
  rich([["During the internship, you will be engaged in application development, supporting feature implementation, testing, preparing documentation, and cross-functional collaboration. These activities will require you to apply your technical knowledge and demonstrate your professional skills effectively.", false]])
  rich([["All ", false], ["Internship policies and professional guidelines", true], [" will be provided in the ", false], ["Internship Manual", true], [", which will be shared with you on the day of program commencement.", false]], 8)
  rich([["As part of the process, you are required to:", true]], 0)
  for (const b of ["Print this offer letter and fill in the Faculty Coordinator details below.", "Obtain HOD / Internship Coordinator signature with seal.", "Please email the signed copy within one month of receiving this letter."]) {
    doc.setFont("times", "normal").setFontSize(11).text("•", L + 14, y); const lines = doc.splitTextToSize(b, R - L - 40) as string[]
    for (const l of lines) { doc.text(l, L + 28, y); y += line }
  }
  y += 8
  rich([["We look forward to your participation and wish you a productive internship.", false]], 14)

  // sign-off: coordinator (left), stamp + signatory (right)
  const sy = y
  doc.setFont("times", "normal").setFontSize(11).text("Warm regards,", L, y); y += line
  doc.text(o.coordinator_name, L, y); y += line
  doc.text(`${o.coordinator_title},`, L, y); y += line
  doc.setFont("times", "bold").text(VTU_ORG.name, L, y); y += line
  doc.setFont("times", "normal").text(`${VTU_ORG.email} | ${VTU_ORG.phone}`, L, y); y += line
  if (seal) { const s = 66; doc.addImage(seal.data, seal.fmt, R - s - 14, sy - 6, s, (seal.h / seal.w) * s) }
  doc.setFont("times", "bold").setFontSize(9.5).text(VTU_ORG.signatory, R - 47, sy + 70, { align: "center" }).text(VTU_ORG.name, R - 47, sy + 82, { align: "center" })
  y = Math.max(y, sy + 90) + 22

  doc.setFont("times", "bold").setFontSize(11).text("Authorization from Internship In-charge Faculty / HOD", L, y); y += 30
  doc.setFont("times", "normal")
  doc.text("Name: _____________________________   Designation: ____________________", L, y); y += 26
  doc.text("Contact No.: _______________________  Email: _________________________  Dept: ______________", L, y); y += 30
  doc.text("Sign and Seal of HOD: ___________________________________", L, y)
  return doc
}
