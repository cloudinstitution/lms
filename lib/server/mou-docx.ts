import JSZip from "jszip"
import { type MouIssuer } from "../mou-issuers"
import { GENAI_FOOTER_B64, GENAI_HEADER_B64, MOU_TEMPLATE_B64 } from "./mou-template-asset"

export type MouVars = { company: string; address: string; name: string; designation: string; email: string; phone: string; business?: string; date: string }
export type SigImage = { data: Buffer; ext: "jpg" | "png"; w: number; h: number }
export type MouSigning = {
  issuer: MouIssuer
  /** The template is the built-in Cloud Institution wording: swap in GenAI Labs' name, address, contacts and letterhead. */
  deriveForIssuer: boolean
  signer: { name: string; title: string }
  /** Put the issuing company's stamp and a "digitally signed" signature (typed name, or the uploaded signature image) in its signature block. */
  digital: boolean
  seal?: SigImage | null
  signature?: SigImage | null
  signedOn: string
  ref: string
}

/** What an empty value becomes in the letter: a blank line to write on by hand, never a leftover [bracket]. */
const BLANK = "________________"
const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
const BUSINESS_PLACEHOLDER = "[software development / IT services / product engineering – specify]"

/** The placeholders an MOU template should contain. */
export const MOU_TOKENS = ["[Company Name]", "[Company Address]", "[Name]", "[Designation]", "[Email]", "[Phone]"] as const

export const builtinMouTemplate = () => Buffer.from(MOU_TEMPLATE_B64, "base64")

/** Pixel size of a PNG or JPEG, or null if it's neither. */
export function imageInfo(buf: Buffer): { ext: "jpg" | "png"; w: number; h: number } | null {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47 && buf.toString("ascii", 12, 16) === "IHDR") return { ext: "png", w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue }
      const m = buf[i + 1]
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { ext: "jpg", h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }
      i += 2 + buf.readUInt16BE(i + 2)
    }
  }
  return null
}

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

const EMU = 914400
function drawing(rid: string, id: number, name: string, w: number, h: number, widthIn: number, maxHeightIn: number): string {
  let cx = Math.round(widthIn * EMU), cy = Math.round((cx * h) / w)
  if (cy > maxHeightIn * EMU) { cy = Math.round(maxHeightIn * EMU); cx = Math.round((cy * w) / h) }
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="${name}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`
}

/**
 * Fill the template's [Company Name] / [Company Address] / [Name] / [Designation] / [Email] / [Phone] placeholders (and the
 * "29 January 2026"-style date, or [Date]) and return the finished .docx. Letterhead, fonts and layout are untouched.
 * With `signing`, the issuing company's side is also completed: who signs, GenAI Labs wording/letterhead if needed, and a digital
 * signature (stamp image + "digitally signed" line) in its signature block.
 */
export async function fillMouDocx(template: Buffer, v: MouVars, signing?: MouSigning): Promise<Buffer> {
  const zip = await JSZip.loadAsync(template)
  const files = Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n))
  const map: [string, string][] = [
    ["[Company Name]", v.company], ["[Company Address]", v.address], ["[Name]", v.name], ["[Designation]", v.designation], ["[Email]", v.email], ["[Phone]", v.phone], ["[Date]", v.date],
  ]
  for (const f of files) {
    let xml = await zip.file(f)!.async("string")
    for (const [token, value] of map) xml = xml.split(token).join(xmlEsc(value.trim() || BLANK))
    if (v.business?.trim()) xml = xml.split(BUSINESS_PLACEHOLDER).join(xmlEsc(v.business.trim()))
    if (f === "word/document.xml") {
      xml = xml.replace(/entered into on \d{1,2} [A-Za-z]+ \d{4}/, `entered into on ${xmlEsc(v.date)}`)
      if (signing) xml = await applyIssuer(zip, xml, signing)
    }
    zip.file(f, xml)
  }
  return Buffer.from(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }))
}

async function applyIssuer(zip: JSZip, docXml: string, s: MouSigning): Promise<string> {
  let xml = docXml
  const I = s.issuer
  if (s.deriveForIssuer && I.id !== "cloud-institution") {
    // The built-in wording is Cloud Institution's: swap the party details, contacts and letterhead for this company.
    xml = xml.replace(/<w:t xml:space="preserve">Cloud Institution<\/w:t>/, `<w:t xml:space="preserve">${xmlEsc(I.name)}</w:t>`)
    xml = xml.replace(/, a company incorporated in 2023 under the Companies Act, 2013 and engaged in technology training, having its registered office at [^<]*?, represented by /, `, having its registered office at ${xmlEsc(I.address)}, represented by `)
    xml = xml.split("For Cloud Institution").join(`For ${xmlEsc(I.name)}`)
    xml = xml.replace(">Dilip D<", `>${xmlEsc(I.coord_name)}<`).replace(">CEO<", `>${xmlEsc(I.coord_title)}<`)
      .replace("dilipd@cloudinstitution.com", xmlEsc(I.coord_email)).replace("+91 81052 25363", xmlEsc(I.coord_phone))
    if (zip.file("word/media/lh_header.png")) zip.file("word/media/lh_header.png", Buffer.from(GENAI_HEADER_B64, "base64"))
    if (zip.file("word/media/lh_footer.png")) zip.file("word/media/lh_footer.png", Buffer.from(GENAI_FOOTER_B64, "base64"))
  }
  // who signs for the issuing company
  const name = xmlEsc(s.signer.name.trim() || "______________"), title = xmlEsc(s.signer.title.trim() || "______________")
  xml = xml.split("[Signer Name]").join(name).split("[Signer Designation]").join(title)
  xml = xml.split("Mr. Dilip Desing").join(name).split("Dilip Desing").join(name).split("Chief Executive Officer").join(title)

  if (!s.digital || !zip.file("word/_rels/document.xml.rels") || !zip.file("[Content_Types].xml")) return xml
  let rels = await zip.file("word/_rels/document.xml.rels")!.async("string")
  let types = await zip.file("[Content_Types].xml")!.async("string")
  const addImage = (img: SigImage, rid: string, file: string) => {
    zip.file(`word/media/${file}.${img.ext}`, img.data)
    rels = rels.replace("</Relationships>", `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${file}.${img.ext}"/></Relationships>`)
    const mime = img.ext === "png" ? "image/png" : "image/jpeg"
    if (!new RegExp(`Extension="${img.ext}"`, "i").test(types)) types = types.replace("<Default ", `<Default Extension="${img.ext}" ContentType="${mime}"/><Default `)
  }
  if (s.seal) addImage(s.seal, "rIdMouSeal", "mou-seal")
  if (s.signature) addImage(s.signature, "rIdMouSig", "mou-signature")

  // Signature line of the first (issuing company) block: signature image or the typed name, plus a "digitally signed" caption.
  const sigPara = /<w:p>(?:(?!<w:p>)[\s\S])*?Signature: _{10,}<\/w:t><\/w:r><\/w:p>/
  if (sigPara.test(xml)) {
    const mark = s.signature
      ? `<w:r>${drawing("rIdMouSig", 9001, "Signature", s.signature.w, s.signature.h, 2.0, 0.6)}</w:r>`
      : `<w:r><w:rPr><w:rFonts w:ascii="Segoe Script" w:hAnsi="Segoe Script" w:cs="Segoe Script"/><w:i/><w:iCs/><w:color w:val="1F3A93"/><w:sz w:val="34"/></w:rPr><w:t xml:space="preserve">${name}</w:t></w:r>`
    const caption = `Digitally signed by ${name}, ${title} — ${xmlEsc(s.signedOn)} (Ref: ${xmlEsc(s.ref)})`
    xml = xml.replace(sigPara, `<w:p><w:pPr><w:jc w:val="both"/></w:pPr><w:r><w:t xml:space="preserve">Signature: </w:t></w:r>${mark}</w:p><w:p><w:pPr><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:color w:val="595959"/><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">${caption}</w:t></w:r></w:p>`)
    xml = xml.replace("Date: ______________________________", `Date: ${xmlEsc(s.signedOn)}`)
  }
  if (s.seal) xml = xml.replace('<w:t xml:space="preserve">Seal:</w:t></w:r>', `<w:t xml:space="preserve">Seal: </w:t></w:r><w:r>${drawing("rIdMouSeal", 9002, "Company seal", s.seal.w, s.seal.h, 1.0, 1.0)}</w:r>`)
  zip.file("word/_rels/document.xml.rels", rels)
  zip.file("[Content_Types].xml", types)
  return xml
}
