import { jsPDF } from "jspdf"
import { LOGO_PNG_BASE64 } from "./server/certificate-logo"

export interface BrochureCourse {
  id: number
  title: string
  fullDescription?: string
  description?: string
  duration: string
  level: string
  category: string
  price: string
  originalPrice?: string
  skills?: string[]
  curriculum?: { module: string; lessons: number; duration: string; topics: string[] }[]
  highlights?: string[]
}

const NAVY: [number, number, number] = [15, 40, 70]
const GREEN: [number, number, number] = [5, 150, 105]
const INK: [number, number, number] = [55, 65, 81]
const W = 595.28
const H = 841.89
const M = 48

// Standard PDF fonts have no rupee sign.
const money = (s: string) => s.replace(/₹\s*(\d+)/g, (_, n) => `Rs. ${Number(n).toLocaleString("en-IN")}`)

/** One-page-ish course brochure, built entirely in the browser (no server round trip). */
export function buildBrochure(course: BrochureCourse, siteUrl: string): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  let y = 0

  const header = () => {
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, W, 86, "F")
    try { doc.addImage(`data:image/png;base64,${LOGO_PNG_BASE64}`, "PNG", M, 18, 50, 50) } catch { /* logo is optional */ }
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold"); doc.setFontSize(20)
    doc.text("CLOUD INSTITUTION", M + 64, 46)
    doc.setFont("helvetica", "normal"); doc.setFontSize(10)
    doc.text("Course Brochure", M + 64, 64)
    y = 120
  }
  const need = (h: number) => {
    if (y + h > H - 48) { doc.addPage(); header() }
  }
  const heading = (t: string) => {
    need(40)
    doc.setTextColor(...GREEN); doc.setFont("helvetica", "bold"); doc.setFontSize(13)
    doc.text(t.toUpperCase(), M, y)
    doc.setDrawColor(...GREEN); doc.setLineWidth(1); doc.line(M, y + 6, M + 40, y + 6)
    y += 26
  }
  const para = (t: string, size = 10.5, x = M, width = W - M * 2) => {
    doc.setTextColor(...INK); doc.setFont("helvetica", "normal"); doc.setFontSize(size)
    for (const line of doc.splitTextToSize(t, width) as string[]) { need(size + 6); doc.text(line, x, y); y += size + 5 }
  }

  header()
  doc.setTextColor(...NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(24)
  for (const line of doc.splitTextToSize(course.title, W - M * 2) as string[]) { doc.text(line, M, y); y += 30 }
  y += 4

  // Key facts
  const facts: [string, string][] = [["Duration", course.duration], ["Level", course.level], ["Category", course.category], ["Fee", money(course.price)]]
  const colW = (W - M * 2) / facts.length
  doc.setFillColor(240, 253, 250); doc.roundedRect(M, y, W - M * 2, 52, 6, 6, "F")
  facts.forEach(([k, v], i) => {
    const x = M + 14 + i * colW
    doc.setTextColor(107, 114, 128); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.text(k.toUpperCase(), x, y + 20)
    doc.setTextColor(...NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(i === 2 ? 9 : 12)
    doc.text((doc.splitTextToSize(v, colW - 18) as string[]).slice(0, 2), x, y + 36)
  })
  y += 78

  heading("About this course")
  para(course.fullDescription || course.description || "")
  y += 8

  if (course.skills?.length) {
    heading("What you will learn")
    const half = Math.ceil(course.skills.length / 2)
    const startY = y
    ;[course.skills.slice(0, half), course.skills.slice(half)].forEach((col, ci) => {
      let cy = startY
      col.forEach((s) => {
        doc.setTextColor(...GREEN); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("+", M + ci * 250, cy)
        doc.setTextColor(...INK); doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.text(s, M + 14 + ci * 250, cy)
        cy += 17
      })
      y = Math.max(y, cy)
    })
    y += 12
  }

  if (course.curriculum?.length) {
    heading("Curriculum")
    course.curriculum.forEach((m, i) => {
      need(64)
      doc.setTextColor(...NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(11.5)
      doc.text(`${i + 1}. ${m.module}`, M, y)
      doc.setTextColor(107, 114, 128); doc.setFont("helvetica", "normal"); doc.setFontSize(9)
      doc.text(`${m.lessons} lessons  |  ${m.duration}`, W - M, y, { align: "right" })
      y += 15
      para(m.topics.join("  •  "), 9.5, M + 12, W - M * 2 - 12)
      y += 6
    })
    y += 4
  }

  if (course.highlights?.length) {
    heading("Highlights")
    course.highlights.forEach((h) => para(`•  ${h}`))
    y += 8
  }

  need(56)
  doc.setFillColor(...NAVY); doc.roundedRect(M, y, W - M * 2, 56, 6, 6, "F")
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(13)
  doc.text("Ready to start? Enroll online", M + 16, y + 24)
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5)
  doc.text(`${siteUrl.replace(/^https?:\/\//, "")}/courses/${course.id}`, M + 16, y + 42)

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setTextColor(150, 150, 150); doc.setFont("helvetica", "normal"); doc.setFontSize(8)
    doc.text(`Cloud Institution  |  ${course.title}  |  Page ${p} of ${pages}`, W / 2, H - 28, { align: "center" })
  }
  return doc
}

export function downloadBrochure(course: BrochureCourse) {
  const doc = buildBrochure(course, window.location.origin)
  doc.save(`${course.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")}-Brochure.pdf`)
}
