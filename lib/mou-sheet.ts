export type SheetCompany = { company: string; address: string; designation: string; name: string; email: string; phone: string; business: string; row: number }
export type MouSheetProblem = { row: number; reason: string; text: string }

const EMAIL_IN_TEXT = /[^\s@<>,;:()"']+@[^\s@<>,;:()"']+\.[^\s@<>,;:()"']{2,}/
const norm = (v: unknown) => String(v ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
const HEADS: Record<keyof Omit<SheetCompany, "row">, string[]> = {
  company: ["company", "company name", "name of the company", "organisation", "organization", "organisation name", "organization name", "firm", "firm name", "client", "employer"],
  address: ["address", "company address", "office address", "registered address", "full address", "postal address", "communication address", "mailing address", "location", "company location", "office location", "office", "registered office", "head office", "adress", "addr"],
  designation: ["designation", "title", "role", "position", "job title", "contact designation", "signatory designation"],
  name: ["name", "contact", "contact name", "contact person", "person", "representative", "authorised signatory", "authorized signatory", "signatory", "hr name", "hr", "spoc", "poc", "name of the representative", "represented by"],
  email: ["email", "email id", "emailid", "e mail", "e mail id", "email address", "mail", "mail id", "contact email", "hr email", "official email"],
  phone: ["phone", "phone number", "mobile", "mobile number", "contact number", "contact no", "mobile no", "phone no", "whatsapp"],
  business: ["business", "industry", "domain", "sector", "engaged in", "nature of business", "type of business", "company type"],
}

/**
 * Read a list of companies from spreadsheet rows (first sheet as array of arrays). Columns are found by their headings
 * (Company, Address, Designation, Name, Email, Phone, Business — any order, several spellings). Only the company name is required;
 * a row with no email can still get its MOU file but can't be emailed. The heading row may sit under a title.
 */
export function parseCompanySheet(grid: unknown[][]): { companies: SheetCompany[]; problems: MouSheetProblem[]; headerFound: boolean; found: string[] } {
  const rows = grid.map((r) => (Array.isArray(r) ? r : [])).filter((r) => r.some((c) => String(c ?? "").trim() !== ""))
  if (rows.length === 0) return { companies: [], problems: [], headerFound: false, found: [] }
  const cols = {} as Record<keyof typeof HEADS, number>
  const keys = Object.keys(HEADS) as (keyof typeof HEADS)[]
  const score = (r: unknown[]) => r.filter((c) => keys.some((k) => HEADS[k].includes(norm(c)))).length
  let headRow = 0, best = 0
  rows.slice(0, 10).forEach((r, i) => { const s = score(r); if (s > best) { best = s; headRow = i } })
  const headerFound = best >= 1
  const found: string[] = []
  if (headerFound) {
    const head = rows[headRow].map(norm)
    for (const k of keys) { const i = head.findIndex((h, idx) => HEADS[k].includes(h) && !Object.values(cols).includes(idx)); if (i >= 0) { cols[k] = i; found.push(k) } }
    // looser: any heading that merely contains the word
    const loose: [keyof typeof HEADS, RegExp][] = [["company", /compan|organi[sz]ation|firm/], ["email", /e ?mail|gmail/], ["address", /addr|adress|registered office|location/], ["designation", /designation|title/], ["phone", /phone|mobile|contact n/]]
    for (const [k, re] of loose) if (cols[k] === undefined) { const i = head.findIndex((h, idx) => re.test(h) && !Object.values(cols).includes(idx)); if (i >= 0) { cols[k] = i; found.push(k) } }
  }
  if (cols.company === undefined) {
    return { companies: [], problems: [{ row: headRow + 1, reason: "Couldn't find a Company column. Add a heading called \"Company\" (and \"Address\", \"Designation\", \"Name\", \"Email\").", text: "" }], headerFound, found }
  }
  const companies: SheetCompany[] = [], problems: MouSheetProblem[] = [], seen = new Set<string>()
  // City / State / Pincode columns next to the address are added to it, so a short address still comes out whole
  const PLACE = /^(city|town|district|state|pin|pincode|pin code|postal code|zip|zip code|country)$/
  const placeCols = rows[headRow].map(norm).map((h, i) => (PLACE.test(h) && !Object.values(cols).includes(i) ? i : -1)).filter((i) => i >= 0)
  const get = (r: unknown[], k: keyof typeof HEADS) => (cols[k] === undefined ? "" : String(r[cols[k]] ?? "").replace(/\s+/g, " ").trim())
  rows.slice(headRow + 1).forEach((r, idx) => {
    const rowNo = idx + headRow + 2
    const company = get(r, "company")
    const rawEmail = get(r, "email")
    const email = (EMAIL_IN_TEXT.exec(rawEmail)?.[0] ?? "").toLowerCase()
    const text = [company, rawEmail].filter(Boolean).join(" · ")
    if (company.length < 2) return problems.push({ row: rowNo, reason: "No company name", text })
    if (rawEmail && !email) return problems.push({ row: rowNo, reason: "Not a valid email", text })
    const key = `${company.toLowerCase()}|${email}`
    if (seen.has(key)) return problems.push({ row: rowNo, reason: "Repeated company/email in the file", text })
    seen.add(key)
    const addrParts = [get(r, "address"), ...placeCols.map((i) => String(r[i] ?? "").replace(/\s+/g, " ").trim())].filter(Boolean)
    const address = addrParts.filter((part, i) => !addrParts.slice(0, i).some((q) => q.toLowerCase().includes(part.toLowerCase()))).join(", ")
    companies.push({ company, address, designation: get(r, "designation"), name: get(r, "name"), email, phone: get(r, "phone"), business: get(r, "business"), row: rowNo })
  })
  return { companies, problems, headerFound, found }
}
