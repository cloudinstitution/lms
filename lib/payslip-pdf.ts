import { jsPDF } from "jspdf"

// The letterhead (name, address, logo) comes from the employee's company (payslip.company).

const amt = (n: number) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })
const dmy = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? iso || "-" : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-")
}

async function logoData(url: string): Promise<{ data: string; w: number; h: number } | null> {
  if (!url) return null
  try {
    const blob = await (await fetch(url)).blob()
    const data: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(blob) })
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = data })
    return { data, w: img.naturalWidth, h: img.naturalHeight }
  } catch { return null }
}

/** Draws the payslip (letterhead, employee block, Earnings Full/Actual vs Deductions) from /api/…/payslip data and downloads it. */
export async function downloadPayslip(p: any) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth()
  const L = 40, R = W - 40
  const monthLabel = new Date(`${p.month}-01T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })

  const logo = await logoData(p.company?.logo ?? "")
  if (logo) { const h = 38; doc.addImage(logo.data, "PNG", L, 28, (logo.w / logo.h) * h, h) }
  doc.setFont("times", "bold").setFontSize(14).text(String(p.company?.name ?? ""), W / 2, 95, { align: "center" })
  doc.setFont("times", "normal").setFontSize(10)
  const addr: string[] = p.company?.address ?? []
  addr.forEach((l, i) => doc.text(l, W / 2, 110 + i * 13, { align: "center" }))
  doc.setFont("times", "bold").setFontSize(15).text(`Payslip for the Month of ${monthLabel}`, W / 2, 160, { align: "center" })

  // ---- table ----
  doc.setDrawColor(0).setLineWidth(0.8)
  const top = 172
  const info: [string, string][] = [
    ["Employee ID", p.employee.emp_id || "-"], ["Name", p.employee.name], ["Joining Date", dmy(p.employee.joined_on)], ["Designation", p.employee.designation || "-"], ["Department", p.employee.department || "-"],
    ["Location", p.employee.location || "-"], ["Total Working Days", String(p.working_days)], ["Effective Work Days", String(p.effective_days)], ["LOP", String(p.attendance.loss_of_pay_days)],
  ]
  const lineH = 17, infoH = info.length * lineH + 8
  const mid = 330 // divider between the left (earnings) and right (deductions) halves
  const cFull = 235, cAct = 318 // right edges of the Full / Actual columns (left half)
  doc.rect(L, top, R - L, infoH)
  doc.line(mid, top, mid, top + infoH)
  doc.setFont("times", "normal").setFontSize(12)
  info.forEach(([k, v], i) => doc.text(`${k}: ${v}`, L + 4, top + 16 + i * lineH))

  const headY = top + infoH
  const headH = 22
  doc.rect(L, headY, R - L, headH)
  doc.line(mid, headY, mid, headY + headH)
  doc.text("Earnings", L + 4, headY + 15); doc.text("Full", cFull, headY + 15, { align: "right" }); doc.text("Actual", cAct, headY + 15, { align: "right" })
  doc.text("Deductions", mid + 8, headY + 15); doc.text("Actual", R - 8, headY + 15, { align: "right" })

  const rowH = 30, rows = Math.max(6, p.earnings.length)
  const bodyY = headY + headH, bodyH = rows * rowH + 14
  doc.rect(L, bodyY, R - L, bodyH)
  doc.line(mid, bodyY, mid, bodyY + bodyH)
  doc.setFontSize(10.5)
  p.earnings.forEach((e: any, i: number) => {
    const y = bodyY + 22 + i * rowH
    doc.text(e.label, L + 6, y); doc.text(amt(e.full), cFull, y, { align: "right" }); doc.text(amt(e.actual), cAct, y, { align: "right" })
  })
  p.deductions.forEach((d: any, i: number) => {
    const y = bodyY + 22 + i * rowH
    doc.text(d.label, mid + 8, y); doc.text(amt(d.amount), R - 8, y, { align: "right" })
  })

  const totY = bodyY + bodyH, totH = 26
  doc.rect(L, totY, R - L, totH)
  doc.line(mid, totY, mid, totY + totH)
  doc.setFont("times", "normal").setFontSize(12)
  doc.text("Total Earnings: INR.", L + 4, totY + 17); doc.text(amt(p.total_full), cFull, totY + 17, { align: "right" }); doc.text(amt(p.total_actual), cAct, totY + 17, { align: "right" })
  doc.text("Total Deductions", mid + 8, totY + 17); doc.text(amt(p.total_deductions), R - 8, totY + 17, { align: "right" })

  const netY = totY + totH + 22
  doc.setFont("times", "bold").setFontSize(13).text(`Net Pay: INR. ${amt(p.net_pay)}`, L, netY)
  doc.setFont("times", "normal").setFontSize(9).setTextColor(110)
  doc.text("This is a computer-generated payslip and does not require a signature.", W / 2, netY + 36, { align: "center" })
  doc.save(`payslip-${p.employee.name.replace(/\s+/g, "-")}-${p.month}.pdf`)
}
