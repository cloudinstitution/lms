import JSZip from "jszip"
import { MOU_TEMPLATE_B64 } from "./mou-template-asset"

export type MouVars = { company: string; address: string; name: string; designation: string; email: string; phone: string; business?: string; date: string }

/** What an empty value becomes in the letter: a blank line to write on by hand, never a leftover [bracket]. */
const BLANK = "________________"
const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const BUSINESS_PLACEHOLDER = "[software development / IT services / product engineering – specify]"

/** The placeholders an MOU template should contain. */
export const MOU_TOKENS = ["[Company Name]", "[Company Address]", "[Name]", "[Designation]", "[Email]", "[Phone]"] as const

export const builtinMouTemplate = () => Buffer.from(MOU_TEMPLATE_B64, "base64")

/** Does this look like a usable template (a .docx with at least the company-name placeholder)? Returns an error message or "". */
export async function checkMouTemplate(buf: Buffer): Promise<string> {
  let zip: JSZip
  try { zip = await JSZip.loadAsync(buf) } catch { return "That isn't a valid Word (.docx) file." }
  const doc = zip.file("word/document.xml")
  if (!doc) return "That isn't a valid Word (.docx) file."
  const xml = await doc.async("string")
  if (!xml.includes("[Company Name]")) return "The template must contain the placeholder [Company Name] (and ideally [Company Address], [Name], [Designation], [Email], [Phone])."
  return ""
}

/**
 * Fill the template's [Company Name] / [Company Address] / [Name] / [Designation] / [Email] / [Phone] placeholders (and the
 * "29 January 2026"-style date, or [Date]) and return the finished .docx. Letterhead, fonts and layout are untouched.
 */
export async function fillMouDocx(template: Buffer, v: MouVars): Promise<Buffer> {
  const zip = await JSZip.loadAsync(template)
  const files = Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n))
  const map: [string, string][] = [
    ["[Company Name]", v.company], ["[Company Address]", v.address], ["[Name]", v.name], ["[Designation]", v.designation], ["[Email]", v.email], ["[Phone]", v.phone], ["[Date]", v.date],
  ]
  for (const f of files) {
    let xml = await zip.file(f)!.async("string")
    for (const [token, value] of map) xml = xml.split(token).join(xmlEsc(value.trim() || BLANK))
    if (v.business?.trim()) xml = xml.split(BUSINESS_PLACEHOLDER).join(xmlEsc(v.business.trim()))
    if (f === "word/document.xml") xml = xml.replace(/entered into on \d{1,2} [A-Za-z]+ \d{4}/, `entered into on ${xmlEsc(v.date)}`)
    zip.file(f, xml)
  }
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }))
}
