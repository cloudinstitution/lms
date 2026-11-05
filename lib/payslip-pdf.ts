import { jsPDF } from "jspdf"

const inr = (n: number) => "Rs. " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Draws a one-page payslip from the figures returned by /api/admin/hr/payslip and downloads it. */
export function downloadPayslip(p: any) {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const W = doc.internal.pageSize.getWidth()
  const monthLabel = new Date(`${p.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
  doc.setFont("helvetica", "bold").setFontSize(20).text("Cloud Institution", W / 2, 60, { align: "center" })
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(90).text("Payslip for " + monthLabel, W / 2, 80, { align: "center" })
  doc.setDrawColor(200).line(40, 95, W - 40, 95)

  doc.setTextColor(0).setFontSize(11)
  const info: [string, string][] = [["Employee", p.employee.name], ["Designation", p.employee.designation || "-"], ["Department", p.employee.department || "-"], ["Date of joining", p.employee.joined_on || "-"]]
  info.forEach(([k, v], i) => { doc.setFont("helvetica", "bold").text(k + ":", 40, 120 + i * 18); doc.setFont("helvetica", "normal").text(String(v), 150, 120 + i * 18) })
  const a = p.attendance
  const att: [string, string][] = [["Days in month", String(p.days_in_month)], ["Present", String(a.present)], ["Absent / Half days", `${a.absent} / ${a.half_day}`], ["Loss of pay days", String(a.loss_of_pay_days)]]
  att.forEach(([k, v], i) => { doc.setFont("helvetica", "bold").text(k + ":", 330, 120 + i * 18); doc.setFont("helvetica", "normal").text(v, 450, 120 + i * 18) })

  let y = 220
  doc.setFillColor(236, 253, 245).rect(40, y, W - 80, 24, "F")
  doc.setFont("helvetica", "bold").text("Earnings", 50, y + 16).text("Amount", 280, y + 16, { align: "right" }).text("Deductions", 320, y + 16).text("Amount", W - 50, y + 16, { align: "right" })
  const earn: [string, number][] = [["Basic pay", p.earnings.basic], ["HRA", p.earnings.hra], ["Allowances", p.earnings.allowances]]
  const ded: [string, number][] = [["Loss of pay", p.deductions.loss_of_pay], ["Other deductions", p.deductions.other]]
  doc.setFont("helvetica", "normal")
  for (let i = 0; i < 3; i++) {
    const row = y + 44 + i * 22
    if (earn[i]) { doc.text(earn[i][0], 50, row); doc.text(inr(earn[i][1]), 280, row, { align: "right" }) }
    if (ded[i]) { doc.text(ded[i][0], 320, row); doc.text(inr(ded[i][1]), W - 50, row, { align: "right" }) }
  }
  y += 44 + 3 * 22 + 6
  doc.line(40, y, W - 40, y)
  doc.setFont("helvetica", "bold").text("Gross earnings", 50, y + 20).text(inr(p.earnings.gross), 280, y + 20, { align: "right" })
  doc.text("Total deductions", 320, y + 20).text(inr(p.deductions.total), W - 50, y + 20, { align: "right" })
  y += 50
  doc.setFillColor(5, 150, 105).rect(40, y, W - 80, 36, "F")
  doc.setTextColor(255).setFontSize(13).text("Net pay", 50, y + 23).text(inr(p.net_pay), W - 50, y + 23, { align: "right" })

  doc.setTextColor(0).setFontSize(10).setFont("helvetica", "normal")
  const b = p.leave_balance
  doc.text(`Leave balance for ${p.month.slice(0, 4)}: ${b.taken} taken, ${b.remaining} remaining of ${b.total}`, 40, y + 70)
  doc.setTextColor(120).setFontSize(9).text("This is a computer-generated payslip and does not need a signature.", W / 2, 780, { align: "center" })
  doc.save(`payslip-${p.employee.name.replace(/\s+/g, "-")}-${p.month}.pdf`)
}
