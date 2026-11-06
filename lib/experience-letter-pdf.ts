import { jsPDF } from "jspdf"

const dmy = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })

async function logoData(url: string): Promise<{ data: string; w: number; h: number } | null> {
  if (!url) return null
  try {
    const blob = await (await fetch(url)).blob()
    const data: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(blob) })
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = data })
    return { data, w: img.naturalWidth, h: img.naturalHeight }
  } catch { return null }
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`

/** Draws the experience letter on the company letterhead and downloads it. `l` comes from /api/admin/hr/experience-letter. */
export async function downloadExperienceLetter(l: any) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth()
  const L = 60, R = W - 60
  const e = l.employee, c = l.company

  const logo = await logoData(c.logo)
  if (logo) { const h = 38; doc.addImage(logo.data, "PNG", L - 20, 28, (logo.w / logo.h) * h, h) }
  doc.setFont("times", "bold").setFontSize(14).text(String(c.name), W / 2, 95, { align: "center" })
  doc.setFont("times", "normal").setFontSize(10)
  ;(c.address as string[]).forEach((line, i) => doc.text(line, W / 2, 110 + i * 13, { align: "center" }))
  doc.setDrawColor(0).setLineWidth(0.8).line(L - 20, 150, R + 20, 150)

  doc.setFontSize(11)
  doc.text(`Ref: ${l.reference}`, L, 180)
  doc.text(`Date: ${dmy(l.issued_on)}`, R, 180, { align: "right" })

  doc.setFont("times", "bold").setFontSize(15).text("EXPERIENCE LETTER", W / 2, 225, { align: "center" })
  const tw = doc.getTextWidth("EXPERIENCE LETTER")
  doc.setLineWidth(0.6).line(W / 2 - tw / 2, 229, W / 2 + tw / 2, 229)
  doc.setFontSize(12).text("TO WHOM IT MAY CONCERN", L, 270)

  const t = l.tenure
  const parts = [t.years ? plural(t.years, "year") : "", t.months ? plural(t.months, "month") : "", !t.years && !t.months ? plural(t.days, "day") : ""].filter(Boolean)
  const dept = e.department ? ` in the ${e.department} department` : ""
  const role = e.designation ? ` as ${e.designation}` : ""
  const paras = [
    `This is to certify that ${e.name} was employed with ${c.name}${role}${dept}, from ${dmy(e.joined_on)} to ${dmy(e.exit_date)}, a total period of ${parts.join(" and ")}${e.emp_id ? ` (Employee ID: ${e.emp_id})` : ""}.`,
    `During this period, ${e.name}'s conduct and performance were found to be good, and ${e.name} discharged all assigned responsibilities with sincerity and dedication.`,
    `${e.name} has been relieved from the services of the company with effect from ${dmy(e.exit_date)}. We wish ${e.name} all the very best in future endeavours.`,
  ]
  doc.setFont("times", "normal").setFontSize(12)
  let y = 300
  for (const para of paras) {
    const lines = doc.splitTextToSize(para, R - L) as string[]
    doc.text(lines, L, y, { align: "left", lineHeightFactor: 1.6 })
    y += lines.length * 12 * 1.6 + 14
  }

  y += 24
  doc.text("Yours sincerely,", L, y)
  doc.setFont("times", "bold").text(`For ${c.name}`, L, y + 20)
  doc.setFont("times", "normal")
  const sy = y + 90
  if (c.signatory) doc.setFont("times", "bold").text(c.signatory, L, sy)
  doc.setFont("times", "normal").text(c.signatory_title || "Authorized Signatory", L, sy + (c.signatory ? 16 : 0))
  doc.setFontSize(9).setTextColor(120).text("This is a computer-generated letter.", W / 2, 800, { align: "center" })
  doc.save(`experience-letter-${String(e.name).replace(/\s+/g, "-")}.pdf`)
}
