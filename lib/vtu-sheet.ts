export type SheetStudent = { name: string; email: string; usn: string; college: string; row: number }
export type SheetProblem = { row: number; reason: string; text: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const norm = (v: unknown) => String(v ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
const NAME_H = new Set(["name", "student name", "full name", "candidate name", "student", "candidate", "name of the student", "name of student"])
const EMAIL_H = new Set(["email", "email id", "emailid", "e mail", "e mail id", "email address", "mail", "mail id", "student email", "student email id", "email id of the student", "gmail"])
const USN_H = new Set(["usn", "u s n", "university seat number", "reg no", "register number", "registration number", "roll no", "roll number"])
const COLLEGE_H = new Set(["college", "college name", "institution", "institute", "university"])

/**
 * Read a student list from spreadsheet rows (first sheet as an array of arrays). Finds the Name / Email (and optional USN / College)
 * columns by their headings; if there are no recognisable headings, the column full of addresses is the email and the next text column the name.
 * Duplicate and invalid rows are reported instead of silently dropped.
 */
export function parseStudentSheet(grid: unknown[][]): { students: SheetStudent[]; problems: SheetProblem[]; headerFound: boolean } {
  const rows = grid.map((r) => (Array.isArray(r) ? r : [])).filter((r) => r.some((c) => String(c ?? "").trim() !== ""))
  if (rows.length === 0) return { students: [], problems: [], headerFound: false }

  let nameCol = -1, emailCol = -1, usnCol = -1, collegeCol = -1, start = 0, headerFound = false
  const head = rows[0].map(norm)
  head.forEach((h, i) => {
    if (nameCol < 0 && NAME_H.has(h)) nameCol = i
    else if (emailCol < 0 && EMAIL_H.has(h)) emailCol = i
    else if (usnCol < 0 && USN_H.has(h)) usnCol = i
    else if (collegeCol < 0 && COLLEGE_H.has(h)) collegeCol = i
  })
  // a looser match on the heading if the exact ones missed (e.g. "Student Email ID (Gmail)")
  if (emailCol < 0) emailCol = head.findIndex((h) => /\be?\s?mail\b|gmail/.test(h) && h !== "")
  if (nameCol < 0) nameCol = head.findIndex((h, i) => i !== emailCol && /\bname\b/.test(h))
  if (emailCol >= 0 || nameCol >= 0) { headerFound = true; start = 1 }

  if (emailCol < 0) {
    // no heading: the email column is the one where most cells look like addresses
    const width = Math.max(...rows.map((r) => r.length))
    let best = -1, bestN = 0
    for (let c = 0; c < width; c++) { const n = rows.filter((r) => EMAIL_RE.test(String(r[c] ?? "").trim())).length; if (n > bestN) { best = c; bestN = n } }
    emailCol = best
    start = 0
  }
  if (emailCol < 0) return { students: [], problems: [{ row: 1, reason: "Couldn't find an email column. Add a heading called \"Email\" (and \"Name\").", text: "" }], headerFound }
  if (nameCol < 0) nameCol = rows.slice(start).reduce<number>((found, r) => found >= 0 ? found : r.findIndex((c, i) => i !== emailCol && i !== usnCol && i !== collegeCol && /[A-Za-z]{2}/.test(String(c ?? "")) && !String(c).includes("@")), -1)

  const students: SheetStudent[] = [], problems: SheetProblem[] = [], seen = new Set<string>()
  rows.slice(start).forEach((r, idx) => {
    const rowNo = idx + start + 1
    const email = String(r[emailCol] ?? "").trim().toLowerCase()
    const name = nameCol >= 0 ? String(r[nameCol] ?? "").replace(/\s+/g, " ").trim() : ""
    const text = [name, email].filter(Boolean).join(" · ")
    if (!email) return problems.push({ row: rowNo, reason: "No email", text })
    if (!EMAIL_RE.test(email)) return problems.push({ row: rowNo, reason: "Not a valid email", text })
    if (name.length < 2) return problems.push({ row: rowNo, reason: "No name", text })
    if (seen.has(email)) return problems.push({ row: rowNo, reason: "Repeated email in the file", text })
    seen.add(email)
    students.push({ name, email, usn: usnCol >= 0 ? String(r[usnCol] ?? "").trim() : "", college: collegeCol >= 0 ? String(r[collegeCol] ?? "").trim() : "", row: rowNo })
  })
  return { students, problems, headerFound }
}
