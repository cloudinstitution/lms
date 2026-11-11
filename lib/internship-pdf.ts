import { jsPDF } from "jspdf"

export type LetterImage = { data: string; w: number; h: number; fmt: "PNG" | "JPEG" }
type Company = { name: string; address: string[]; phone: string; email: string; website?: string; signatory: string; signatory_title: string }
export type InternshipLetter = {
  internship_id: string; candidate_name: string; position: string; location: string; work_mode?: string
  paid: boolean; stipend_amount: number; duration_value: number; duration_unit: string
  offer_date: string; start_date: string; end_date?: string; company: Company
}

const inr = (n: number) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })
const longDate = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : iso)

/** "60 Hours", "3 Months", "1 Month" */
export const durationText = (v: number, unit: string) => `${v} ${v === 1 ? unit.replace(/s$/, "") : unit}`

/**
 * One-page internship offer letter in the company's format: logo and contact block, title, date, details of the offer
 * (internship ID, position, dates, location, duration, stipend), sign-off with the company stamp, and an acceptance line.
 * Pure (no DOM / network): the images are passed in, so it runs in the browser or on the server.
 */
export function buildInternshipOfferPdf(o: InternshipLetter, images: { logo?: LetterImage | null; seal?: LetterImage | null } = {}): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight()
  const L = 40, R = W - 40, c = o.company
  const { logo, seal } = images

  // faint watermark
  if (logo) {
    try {
      const w = 330, h = (logo.h / logo.w) * w
      doc.saveGraphicsState(); doc.setGState(new (doc as any).GState({ opacity: 0.07 }))
      doc.addImage(logo.data, logo.fmt, (W - w) / 2, H / 2 - h / 2 + 30, w, h); doc.restoreGraphicsState()
    } catch { /* opacity unsupported: skip the watermark */ }
    const h = 40; doc.addImage(logo.data, logo.fmt, L - 6, 28, (logo.w / logo.h) * h, h)
  } else doc.setFont("times", "bold").setFontSize(18).text(c.name, L, 55)

  // contact block, top right
  doc.setFont("times", "normal").setFontSize(9.5)
  let y = 36
  for (const l of [c.phone, c.website ?? "", ...(doc.splitTextToSize(c.address.join(" "), 175) as string[])].filter(Boolean)) { doc.text(l, R, y, { align: "right" }); y += 13.5 }

  y = 138
  doc.setFont("times", "bold").setFontSize(16).setTextColor(47, 84, 170).text("INTERNSHIP OFFER LETTER", W / 2, y, { align: "center" }); doc.setTextColor(0)
  y += 46
  doc.setFont("times", "bold").setFontSize(10.5).text(`Date : ${longDate(o.offer_date)}`, R, y, { align: "right" })
  y += 34

  const line = 14.5
  const rich = (runs: [string, boolean][], gap = 8) => {
    doc.setFontSize(10.5); let x = L
    for (const [text, bold] of runs) {
      doc.setFont("times", bold ? "bold" : "normal")
      for (const word of text.split(/(\s+)/)) {
        if (!word) continue
        const w = doc.getTextWidth(word)
        if (x + w > R && word.trim()) { y += line; x = L }
        if (x === L && !word.trim()) continue
        doc.text(word, x, y); x += w
      }
    }
    y += line + gap
  }
  const para = (t: string, gap = 8) => { doc.setFont("times", "normal").setFontSize(10.5); for (const l of doc.splitTextToSize(t, R - L) as string[]) { doc.text(l, L, y); y += line } y += gap - 2 }

  doc.setFont("times", "bold").setFontSize(10.5).text(`Dear  ${o.candidate_name}`, L, y); y += line + 12
  rich([["We are pleased to offer you the position of ", false], [o.position, true], [" at ", false], [c.name, true], [". Your skills and enthusiasm will be a valuable asset to our team. ", false],
    [o.paid ? `This is a paid internship with a stipend of INR ${inr(o.stipend_amount)} per month.` : "Please note that this internship does not include a stipend.", true]], 4)
  rich([["If you accept this offer, please sign this Offer Letter and send the signed copy by email to ", false], [c.email, true], [" as confirmation of your acceptance.", false]], 12)

  doc.setFont("times", "bold").setFontSize(10.5).text("Details of the Offer:", L, y); doc.setLineWidth(0.6).line(L, y + 2, L + doc.getTextWidth("Details of the Offer:"), y + 2); y += line + 1
  const details: [string, string][] = [["Internship ID", o.internship_id], ["Position", o.position], ["Start Date", longDate(o.start_date)], ...(o.end_date ? [["End Date", longDate(o.end_date)] as [string, string]] : []),
    ["Work Location", `${o.location}${o.work_mode && o.work_mode !== "On-site" ? ` (${o.work_mode})` : ""}`], ["Duration", durationText(o.duration_value, o.duration_unit)], ["Stipend", o.paid ? `INR ${inr(o.stipend_amount)} per month` : "Unpaid (no stipend)"]]
  for (const [k, v] of details) { doc.setFont("times", "bold"); const lw = doc.getTextWidth(`${k}: `); doc.text(`${k}: `, L, y); doc.setFont("times", k === "Work Location" ? "normal" : "bold").text(v, L + lw, y); y += line }
  y += 10

  para("During the internship period, you will receive hands-on training, practical exposure, real time projects and guidance from our technical team. You are expected to follow the rules and regulations of the organization and maintain professional conduct throughout the internship.", 12)
  para(`Upon successful completion of the internship and submission of required tasks/projects, you will be awarded an Internship Completion Certificate from ${c.name}.`, 4)
  para("We wish you all the best and look forward to having you as a part of our organization.\nFor any queries, feel free to contact us.", 12)
  para("We look forward to your contribution and growth with us.", 14)

  doc.setFont("times", "normal").text("Sincerely,", L, y); y += 6
  if (seal) { const s = 70; doc.addImage(seal.data, seal.fmt, L - 4, y, s, s); y += s + 14 } else y += 40
  doc.setFont("times", "normal").setFontSize(10.5).text(c.signatory || "", L, y); y += line
  doc.setFont("times", "bold"); doc.text(c.signatory_title || "", L, y); y += line; doc.text(c.name, L, y); y += line
  doc.setFont("times", "normal")
  for (const t of [c.website ? `Website: ${c.website}` : "", `Email: ${c.email}`, c.phone ? `Phone: ${c.phone}` : ""].filter(Boolean)) { doc.text(t, L, y); y += line - 1 }

  // acceptance
  const ay = Math.max(y + 26, H - 78)
  doc.setFont("times", "bold").setFontSize(10).text("I accept the above offer.", L, ay)
  doc.setFont("times", "normal").text("Signature:", L, ay + 24).text("Date:", W / 2 + 20, ay + 24)
  doc.setLineWidth(0.5).line(L + 50, ay + 26, L + 220, ay + 26).line(W / 2 + 48, ay + 26, R, ay + 26)
  return doc
}
