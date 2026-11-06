import { jsPDF } from "jspdf"
import { offerTerms } from "./offer-letter-terms"

const inr = (n: number) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })
const dmy = (iso: string) => iso.split("-").reverse().join("-")
const dMONy = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-").toUpperCase()

async function loadImage(url: string): Promise<{ data: string; w: number; h: number; fmt: "PNG" | "JPEG" } | null> {
  if (!url) return null
  try {
    const blob = await (await fetch(url)).blob()
    const data: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(blob) })
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = data })
    return { data, w: img.naturalWidth, h: img.naturalHeight, fmt: /jpe?g/i.test(blob.type) ? "JPEG" : "PNG" }
  } catch { return null }
}

/** Offer letter + terms + compensation table on the company letterhead. `o` is an offer record (with its company) from /api/admin/hr/offer-letters. */
export async function downloadOfferLetter(o: any) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight()
  const L = 52, R = W - 52
  const c = o.company, co = String(c.name)
  const [logo, seal] = await Promise.all([loadImage(c.logo), loadImage(c.seal)])
  const TOP = 118, BOTTOM = H - 78 // usable body area between the letterhead and the footer bar
  let y = TOP

  const chrome = () => {
    if (logo) { const h = 58, w = (logo.w / logo.h) * h; doc.addImage(logo.data, logo.fmt, (W - w) / 2, 18, w, h) }
    else doc.setFont("times", "bold").setFontSize(18).text(co, W / 2, 55, { align: "center" })
    // footer bar: phone | email | address
    doc.setFillColor(0, 0, 0).rect(0, H - 56, W, 56, "F")
    doc.setTextColor(255).setFont("helvetica", "bold").setFontSize(11)
    doc.text(c.phone || "", 30, H - 26)
    doc.text(c.email || "", W / 2 - 40, H - 26, { align: "center" })
    doc.setFont("helvetica", "normal").setFontSize(7.5)
    const addr = doc.splitTextToSize((c.address as string[]).join(" "), 190) as string[]
    addr.slice(0, 4).forEach((l, i) => doc.text(l, W - 215, H - 40 + i * 9.5))
    doc.setTextColor(0)
  }
  const newPage = () => { doc.addPage(); chrome(); y = TOP }
  const ensure = (h: number) => { if (y + h > BOTTOM) newPage() }

  /** Write a paragraph (justified-looking, wrapped); `**x**` is not supported, so bold runs are drawn by the caller. */
  const para = (text: string, opts: { size?: number; bold?: boolean; gap?: number; indent?: number } = {}) => {
    const size = opts.size ?? 11
    doc.setFont("times", opts.bold ? "bold" : "normal").setFontSize(size)
    for (const block of text.split("\n")) {
      const lines = doc.splitTextToSize(block, R - L - (opts.indent ?? 0)) as string[]
      for (const ln of lines) { ensure(size * 1.45); doc.text(ln, L + (opts.indent ?? 0), y); y += size * 1.45 }
    }
    y += opts.gap ?? 6
  }
  /** A paragraph made of normal and bold runs on flowing lines. */
  const rich = (runs: [string, boolean][], size = 11, gap = 6) => {
    doc.setFontSize(size)
    let x = L
    ensure(size * 1.45)
    for (const [text, bold] of runs) {
      doc.setFont("times", bold ? "bold" : "normal")
      for (const word of text.split(/(\s+)/)) {
        if (!word) continue
        const w = doc.getTextWidth(word)
        if (x + w > R && word.trim()) { y += size * 1.45; ensure(size * 1.45); x = L }
        if (x === L && !word.trim()) continue
        doc.text(word, x, y); x += w
      }
    }
    y += size * 1.45 + gap
  }

  chrome()
  // ---------- page 1: the offer ----------
  doc.setFont("times", "bold").setFontSize(15).text("OFFER LETTER", W / 2, y + 4, { align: "center" })
  doc.setFont("times", "normal").setFontSize(11).text(`Date: ${dmy(o.offer_date)}`, R, y + 24, { align: "right" })
  y += 26
  doc.setFont("times", "bold").setFontSize(11).text(`Dear ${o.candidate_name}`, L, y); y += 15
  if (o.candidate_email) { doc.text(`Email id: ${o.candidate_email}`, L, y); y += 15 }
  y += 8
  rich([["We have greatly enjoyed our recent discussions with you and are pleased to offer you the role of ", false], [o.designation, true], [` at `, false], [co, true], [`.${o.location ? " Your place of posting will be " : ""}`, false], ...(o.location ? [[o.location, true] as [string, boolean]] : [])])
  rich([["Our annual total compensation will be ", false], [`INR ${inr(o.annual_total)}`, true], [". You will receive a monthly salary of ", false], [`INR ${inr(o.monthly_total)}`, true],
    [`. This offer also includes an annual incentive (if applicable) as per company policy.${o.prior_experience_months ? ` ${co} has recognized ${o.prior_experience_months} months of your prior experience as relevant, and your appointment will be governed by the terms and conditions of employment outlined in this offer letter and the Employment Agreement, as well as any rules, regulations and practices currently in place at the time of employment.` : " Your appointment will be governed by the terms and conditions of employment outlined in this offer letter and the Employment Agreement, as well as any rules, regulations and practices currently in place at the time of employment."}`, false]])
  rich([["We request that you join us on or before ", false], [dMONy(o.joining_date) + ".", true]])
  para("Please note:", { bold: true, gap: 2 })
  para(`•  This offer is subject to satisfactory professional reference checks\n•  This offer is valid from the date of offer. Any extension shall be at the discretion of ${co} and shall be communicated to you in writing\n•  Prior to beginning work with ${co}, you must provide evidence of your right to work in India and other documentation requested by ${co}.`, { indent: 6, gap: 8 })
  para(`We are delighted to welcome you to the team! You are joining ${co} at an exciting time, and we know your fresh thinking and expertise will help us accomplish great things. If you have any further questions or need clarification on this offer, please feel free to contact us.`, { gap: 10 })
  para("Best regards,", { gap: 0 })
  para(`For ${co},`, { bold: true, gap: 4 })
  if (seal) { const s = 78; ensure(s + 30); doc.addImage(seal.data, seal.fmt, L, y, s, s); y += s + 4 } else y += 50
  if (c.signatory) para(c.signatory, { bold: true, gap: 0 })
  para(c.signatory_title && c.signatory_title !== "Authorized Signatory" ? `${c.signatory_title}` : co, { bold: true, gap: 16 })
  para("I have read the offer, understood and accept the above-mentioned terms and conditions.", { gap: 30 })
  ensure(30)
  doc.setFont("times", "bold").setFontSize(11).text("Signature:", L, y); doc.text("Date:", R - 150, y)
  doc.setDrawColor(0).setLineWidth(0.5).line(L + 58, y + 2, L + 230, y + 2).line(R - 118, y + 2, R, y + 2)

  // ---------- terms ----------
  const T = offerTerms(co, o.terms)
  newPage()
  for (const sec of T.before) { ensure(40); para(sec.title, { bold: true, gap: 2 }); sec.paras.forEach((p) => para(p, { gap: 5 })); y += 6 }

  // compensation table
  ensure(190)
  doc.setFont("times", "bold").setFontSize(13).text("Compensation and Benefits", W / 2, y, { align: "center" }); y += 14
  doc.setFillColor(238, 238, 238).rect(L, y, R - L, 20, "F")
  doc.setFontSize(10.5).text("Name:", L + 8, y + 14); doc.setFont("times", "normal").text(o.candidate_name, L + 48, y + 14)
  doc.setFont("times", "bold").text("Designation:", L + 250, y + 14); doc.setFont("times", "normal").text(o.designation, L + 318, y + 14, { maxWidth: R - L - 322 })
  y += 32
  const cSl = L + 8, cDesc = L + 80, cMon = R - 110, cYr = R - 14
  doc.setFillColor(238, 238, 238).rect(L, y, R - L, 22, "F")
  doc.setFont("times", "bold").setFontSize(10.5).text("Sl. No.", cSl, y + 15).text("Description", cDesc, y + 15).text("Monthly", cMon, y + 15, { align: "right" }).text("Yearly", cYr, y + 15, { align: "right" })
  y += 22
  doc.setFont("times", "normal")
  o.components.forEach((r: any, i: number) => {
    ensure(26)
    doc.text(String(i + 1), cSl + 10, y + 17, { align: "center" }); doc.text(r.label, cDesc, y + 17); doc.text(inr(r.monthly), cMon, y + 17, { align: "right" }); doc.text(inr(r.monthly * 12), cYr, y + 17, { align: "right" })
    y += 26
  })
  doc.setFillColor(238, 238, 238).rect(L, y, R - L, 24, "F")
  doc.setFont("times", "bold").text("Total", cDesc, y + 16).text(inr(o.monthly_total), cMon, y + 16, { align: "right" }).text(inr(o.annual_total), cYr, y + 16, { align: "right" })
  y += 40

  for (const sec of T.after) { ensure(40); para(sec.title, { bold: true, gap: 2 }); sec.paras.forEach((p) => para(p, { gap: 5 })); y += 6 }
  ensure(120)
  y += 10
  para(T.witness, { gap: 40 })
  if (seal) { ensure(90); doc.addImage(seal.data, seal.fmt, R - 130, y - 10, 78, 78); y += 74 } else y += 30
  if (c.signatory) { doc.setFont("times", "bold").setFontSize(11).text(c.signatory, R - 90, y, { align: "center" }); y += 14 }
  doc.setFont("times", "bold").setFontSize(11).text(c.signatory_title && c.signatory_title !== "Authorized Signatory" ? c.signatory_title : co, R - 90, y, { align: "center" })
  doc.save(`offer-letter-${String(o.candidate_name).replace(/\s+/g, "-")}.pdf`)
}
