import { jsPDF } from "jspdf"
import type { Tailored } from "./resume-ats"

type R = Tailored["resume"]

/**
 * ATS-friendly resume: one column, standard section headings, real selectable text, no tables, icons, photos or
 * colours that confuse parsers. Pure (no DOM) so it can run in the browser or in tests.
 */
export function buildResumePdf(r: R): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight()
  const L = 46, RT = W - 46, BOTTOM = H - 46
  let y = 50
  const ensure = (h: number) => { if (y + h > BOTTOM) { doc.addPage(); y = 50 } }
  const text = (t: string, o: { size?: number; bold?: boolean; x?: number; w?: number; gap?: number; align?: "center" } = {}) => {
    const size = o.size ?? 10
    doc.setFont("helvetica", o.bold ? "bold" : "normal").setFontSize(size)
    const lines = doc.splitTextToSize(t, o.w ?? RT - (o.x ?? L)) as string[]
    for (const ln of lines) { ensure(size * 1.4); o.align === "center" ? doc.text(ln, W / 2, y, { align: "center" }) : doc.text(ln, o.x ?? L, y); y += size * 1.4 }
    y += o.gap ?? 0
  }
  const heading = (t: string) => { ensure(34); y += 8; doc.setFont("helvetica", "bold").setFontSize(11).text(t.toUpperCase(), L, y); y += 4; doc.setDrawColor(0).setLineWidth(0.6).line(L, y, RT, y); y += 13 }
  const bullets = (pts: string[]) => pts.forEach((p) => { ensure(14); doc.setFont("helvetica", "normal").setFontSize(10).text("•", L + 4, y); text(p, { x: L + 16, w: RT - L - 16 }) })
  const row = (left: string, right: string) => { ensure(14); doc.setFont("helvetica", "bold").setFontSize(10).text(left, L, y); if (right) doc.setFont("helvetica", "normal").text(right, RT, y, { align: "right" }); y += 14 }

  text(r.name || "Your Name", { size: 20, bold: true, align: "center", gap: 2 })
  if (r.headline) text(r.headline, { size: 11, align: "center", gap: 2 })
  text([r.email, r.phone, r.location, r.linkedin, r.github].map((x) => x.trim()).filter(Boolean).join("  |  "), { size: 9.5, align: "center" })

  if (r.summary) { heading("Professional Summary"); text(r.summary) }
  if (r.skills.length) { heading("Skills"); text(r.skills.join(", ")) }
  if (r.experience.length) {
    heading("Experience")
    r.experience.forEach((e) => { row(e.role || e.company, e.period); if (e.role && e.company) { doc.setFont("helvetica", "italic").setFontSize(10).text(e.company, L, y); y += 14 } bullets(e.points); y += 4 })
  }
  if (r.projects.length) {
    heading("Projects")
    r.projects.forEach((p) => { row(p.name, ""); if (p.tech.trim()) text(`Technologies: ${p.tech.trim()}`, { size: 9.5 }); bullets(p.points); y += 4 })
  }
  if (r.education.length) {
    heading("Education")
    r.education.forEach((e) => { row(e.degree, e.year); text([e.institution, e.score].map((x) => x.trim()).filter(Boolean).join("  |  "), { gap: 3 }) })
  }
  if (r.certifications.length) { heading("Certifications"); bullets(r.certifications) }
  return doc
}

export const resumeFileName = (name: string, company: string) =>
  `${(name || "Resume").trim().replace(/[^A-Za-z0-9]+/g, "_")}_Resume${company ? `_${company.trim().replace(/[^A-Za-z0-9]+/g, "_")}` : ""}.pdf`.slice(0, 80)

/** Browser helpers: a File to attach to the application, or a download. */
export const resumeFile = (r: R, company: string) => new File([buildResumePdf(r).output("arraybuffer")], resumeFileName(r.name, company), { type: "application/pdf" })
export const downloadResume = (r: R, company: string) => buildResumePdf(r).save(resumeFileName(r.name, company))
