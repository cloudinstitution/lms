import JSZip from "jszip"
import { jsPDF } from "jspdf"

/**
 * Turns a filled MOU (.docx) into a PDF without Word/LibreOffice (which a serverless host doesn't have): the paragraphs, headings,
 * numbered/bulleted lists, tables, inline images (seal / signature), letterhead header + footer and "Page X of Y" are re-laid-out
 * on US-Letter pages with the standard PDF fonts. It follows the same text as the Word file; fonts differ slightly (Helvetica for Calibri).
 */

const PAGE_W = 612, PAGE_H = 792, EMU = 12700, TWIP = 1 / 20
const FONT_SCALE = 0.93 // Calibri is narrower than Helvetica
const LINE = 1.3

const entity = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
  const l = e.toLowerCase()
  if (l === "amp") return "&"; if (l === "lt") return "<"; if (l === "gt") return ">"; if (l === "quot") return '"'; if (l === "apos") return "'"
  return String.fromCodePoint(l[1] === "x" ? parseInt(l.slice(2), 16) : parseInt(l.slice(1), 10))
})
/** Standard PDF fonts only cover Latin text: map the odd symbols and drop what can't be drawn. */
const safe = (s: string) => s.replace(/₹/g, "Rs. ").replace(/[▪◦●]/g, "-").replace(/[   ]/g, " ").replace(/[^\u0009 -~¡-ÿ–—‘’“”•…]/g, "")

type Style = { b: boolean; i: boolean; size: number; color: [number, number, number]; script: boolean }
type Tok = { kind: "word"; text: string; st: Style; w: number } | { kind: "space"; st: Style; w: number } | { kind: "img"; w: number; h: number; data: Uint8Array; fmt: "PNG" | "JPEG" } | { kind: "br" } | { kind: "tab"; w: number }
type Line = { toks: Tok[]; width: number; h: number; ends: boolean }

const hex = (c: string | undefined): [number, number, number] => (c && /^[0-9a-f]{6}$/i.test(c) ? [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)] : [0, 0, 0])
const attr = (x: string, re: RegExp) => x.match(re)?.[1]

export async function docxToPdf(docx: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(docx)
  const read = async (n: string) => (await zip.file(n)?.async("string")) ?? ""
  const doc = new jsPDF({ unit: "pt", format: "letter" })
  const documentXml = await read("word/document.xml")
  const rels = await read("word/_rels/document.xml.rels")
  const numbering = await read("word/numbering.xml")
  const body = documentXml.slice(documentXml.indexOf("<w:body>") + 8)

  // ----- images -----
  const imgCache = new Map<string, { data: Uint8Array; fmt: "PNG" | "JPEG" } | null>()
  const loadImg = async (relsXml: string, rid: string, base = "word/") => {
    const key = base + rid + relsXml
    if (imgCache.has(key)) return imgCache.get(key)!
    const m = relsXml.match(new RegExp(`<Relationship [^>]*Id="${rid}"[^>]*>`))?.[0]
    const target = m && attr(m, /Target="([^"]+)"/)
    const f = target ? zip.file(base + target.replace(/^\//, "").replace(/^word\//, "")) : null
    const data = f ? await f.async("uint8array") : null
    const out = data ? { data, fmt: (data[0] === 0x89 ? "PNG" : "JPEG") as "PNG" | "JPEG" } : null
    imgCache.set(key, out); return out
  }

  // ----- numbering (decimal vs bullet per numId) -----
  const numKind = (numId: string) => {
    const abs = numbering.match(new RegExp(`<w:num w:numId="${numId}"[^>]*>\\s*<w:abstractNumId w:val="(\\d+)"`))?.[1]
    const a = abs ? numbering.match(new RegExp(`<w:abstractNum w:abstractNumId="${abs}"[\\s\\S]*?</w:abstractNum>`))?.[0] : ""
    return a?.match(/<w:numFmt w:val="(\w+)"/)?.[1] === "decimal" ? "decimal" : "bullet"
  }
  const counters = new Map<string, number>()

  // ----- text measuring + wrapping -----
  const setStyle = (s: Style) => { doc.setFont("helvetica", s.b && s.i ? "bolditalic" : s.b ? "bold" : s.i || s.script ? "italic" : "normal"); doc.setFontSize(s.size) }
  const wOf = (text: string, st: Style) => { setStyle(st); return doc.getTextWidth(text) }

  async function runsOf(pXml: string, base: Style, rel: string): Promise<Tok[]> {
    const toks: Tok[] = []
    for (const r of pXml.match(/<w:r(?: [^>]*)?>[\s\S]*?<\/w:r>/g) ?? []) {
      const rpr = r.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1] ?? ""
      const sz = attr(rpr, /<w:sz w:val="(\d+)"/)
      const st: Style = {
        b: /<w:b\/>|<w:b w:val="(1|true)"/.test(rpr) || base.b, i: /<w:i\/>|<w:i w:val="(1|true)"/.test(rpr) || base.i,
        size: (sz ? parseInt(sz, 10) / 2 : base.size) * FONT_SCALE,
        color: attr(rpr, /<w:color w:val="([0-9A-Fa-f]{6})"/) ? hex(attr(rpr, /<w:color w:val="([0-9A-Fa-f]{6})"/)) : base.color,
        script: /Script|Segoe|Brush|Cursive/i.test(attr(rpr, /w:ascii="([^"]*)"/) ?? ""),
      }
      if (st.script) { st.i = true }
      // text / tabs / breaks / drawings, in order
      for (const part of r.match(/<w:t(?: [^>]*)?>[\s\S]*?<\/w:t>|<w:tab\/>|<w:br[^>]*\/>|<w:drawing>[\s\S]*?<\/w:drawing>/g) ?? []) {
        if (part.startsWith("<w:tab")) toks.push({ kind: "tab", w: 36 })
        else if (part.startsWith("<w:br")) { if (!/w:type="page"/.test(part)) toks.push({ kind: "br" }) }
        else if (part.startsWith("<w:drawing")) {
          const rid = attr(part, /r:embed="([^"]+)"/), ext = part.match(/<wp:extent cx="(\d+)" cy="(\d+)"/)
          const img = rid ? await loadImg(rel, rid) : null
          if (img && ext) toks.push({ kind: "img", w: parseInt(ext[1], 10) / EMU, h: parseInt(ext[2], 10) / EMU, ...img })
        } else {
          const text = safe(entity(part.replace(/<[^>]+>/g, "")))
          for (const piece of text.split(/( +)/)) {
            if (!piece) continue
            if (/^ +$/.test(piece)) toks.push({ kind: "space", st, w: wOf(" ", st) * piece.length })
            else toks.push({ kind: "word", text: piece, st, w: wOf(piece, st) })
          }
        }
      }
    }
    return toks
  }

  function wrap(toks: Tok[], width: number, firstIndent = 0): Line[] {
    const lines: Line[] = []
    let cur: Tok[] = [], w = 0, h = 0, lim = width - firstIndent
    const flush = (ends: boolean) => {
      while (cur.length && cur[cur.length - 1].kind === "space") { w -= (cur.pop() as { w: number }).w }
      lines.push({ toks: cur, width: w, h: h || 12 * LINE, ends }); cur = []; w = 0; h = 0; lim = width
    }
    const hOf = (t: Tok) => (t.kind === "img" ? t.h + 2 : t.kind === "word" || t.kind === "space" ? t.st.size * LINE : 0)
    for (const t of toks) {
      if (t.kind === "br") { flush(true); continue }
      if (t.kind === "space" && cur.length === 0) continue
      const tw = "w" in t ? t.w : 0
      if (t.kind !== "space" && w + tw > lim + 0.01 && cur.length > 0) flush(false)
      cur.push(t); w += tw; h = Math.max(h, hOf(t))
    }
    flush(true)
    return lines
  }

  // ----- paging -----
  const TOP = 72, BOTTOM = 722, LEFT = 72, RIGHT = PAGE_W - 72
  let y = TOP
  const newPage = () => { doc.addPage(); y = TOP }
  const need = (h: number) => { if (y + h > BOTTOM) newPage() }

  function drawLine(l: Line, x0: number, width: number, jc: string, justify: boolean) {
    const gaps = l.toks.filter((t) => t.kind === "space").length
    const extra = justify && jc === "both" && !l.ends && gaps > 0 ? (width - l.width) / gaps : 0
    let x = jc === "center" ? x0 + (width - l.width) / 2 : jc === "right" ? x0 + width - l.width : x0
    const base = y + l.h * 0.78
    for (const t of l.toks) {
      if (t.kind === "word") { setStyle(t.st); doc.setTextColor(...t.st.color); doc.text(t.text, x, base - (l.h - t.st.size * LINE) * 0.2); x += t.w }
      else if (t.kind === "space") x += t.w + extra
      else if (t.kind === "tab") x += t.w
      else if (t.kind === "img") { try { doc.addImage(t.data, t.fmt, x, y + l.h - t.h - 1, t.w, t.h) } catch { /* unreadable image: skip */ } x += t.w }
    }
    doc.setTextColor(0)
  }

  // ----- walk the body -----
  const DEF: Style = { b: false, i: false, size: 11, color: [0, 0, 0], script: false }
  for (const el of body.match(/<w:tbl>[\s\S]*?<\/w:tbl>|<w:p(?: [^>]*)?>[\s\S]*?<\/w:p>|<w:p\/>/g) ?? []) {
    if (el.startsWith("<w:tbl>")) {
      const cols = [...el.matchAll(/<w:gridCol w:w="(\d+)"/g)].map((m) => parseInt(m[1], 10) * TWIP)
      const total = cols.reduce((a, b) => a + b, 0) || RIGHT - LEFT, k = Math.min(1, (RIGHT - LEFT) / total)
      for (const row of el.match(/<w:tr(?: [^>]*)?>[\s\S]*?<\/w:tr>/g) ?? []) {
        const cells = row.match(/<w:tc>[\s\S]*?<\/w:tc>/g) ?? []
        const laid: { lines: Line[]; fill?: string }[] = []
        for (let c = 0; c < cells.length; c++) {
          const cw = (cols[c] ?? 80) * k - 10.8
          const toks: Tok[] = []
          for (const p of cells[c].match(/<w:p(?: [^>]*)?>[\s\S]*?<\/w:p>/g) ?? []) { if (toks.length) toks.push({ kind: "br" }); toks.push(...(await runsOf(p, DEF, rels))) }
          laid.push({ lines: wrap(toks, cw), fill: attr(cells[c], /<w:shd [^>]*w:fill="([0-9A-Fa-f]{6})"/) })
        }
        const rh = Math.max(...laid.map((c) => c.lines.reduce((a, l) => a + l.h, 0)), 14) + 6
        need(rh)
        let x = LEFT
        laid.forEach((c, i) => {
          const cw = (cols[i] ?? 80) * k
          if (c.fill && c.fill.toUpperCase() !== "AUTO") { doc.setFillColor(...hex(c.fill)); doc.rect(x, y, cw, rh, "F") }
          doc.setDrawColor(120).setLineWidth(0.5).rect(x, y, cw, rh)
          const save = y; y += 3
          for (const l of c.lines) { drawLine(l, x + 5.4, cw - 10.8, "left", false); y += l.h }
          y = save; x += cw
        })
        y += rh
      }
      y += 8; continue
    }

    const ppr = el.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/)?.[1] ?? ""
    const style = attr(ppr, /<w:pStyle w:val="([^"]+)"/)
    const heading = style === "Heading1" ? 1 : style === "Heading2" ? 2 : 0
    const base: Style = heading === 1 ? { ...DEF, b: true, size: 16 } : heading === 2 ? { ...DEF, b: true, size: 13 } : DEF
    if (/<w:pageBreakBefore\/>/.test(ppr) && y > TOP) newPage()
    if (/<w:br w:type="page"\/>/.test(el) && y > TOP && !/<w:t[ >]/.test(el)) { newPage(); continue }
    const before = attr(ppr, /<w:spacing [^>]*w:before="(\d+)"/), after = attr(ppr, /<w:spacing [^>]*w:after="(\d+)"/)
    const sb = before !== undefined ? parseInt(before, 10) * TWIP : heading ? 0 : 0, sa = after !== undefined ? parseInt(after, 10) * TWIP : 8
    const jc = attr(ppr, /<w:jc w:val="(\w+)"/) ?? "left"
    const numId = attr(ppr, /<w:numId w:val="(\d+)"/)
    const left = numId ? 36 : parseInt(attr(ppr, /<w:ind [^>]*w:left="(\d+)"/) ?? "0", 10) * TWIP
    const toks = await runsOf(el, base, rels)
    const lines = wrap(toks, RIGHT - LEFT - left)
    const total = lines.reduce((a, l) => a + l.h, 0)
    let marker = ""
    if (numId) {
      if (numKind(numId) === "decimal") { const n = (counters.get(numId) ?? 0) + 1; counters.set(numId, n); marker = `${n}.` } else marker = "•"
    }
    y += y > TOP ? sb : 0
    // keep headings with what follows, and don't strand a one-line paragraph tail
    if (heading) need(total + 40); else need(Math.min(total, lines[0].h * 2))
    for (let n = 0; n < lines.length; n++) {
      const l = lines[n]
      if (y + l.h > BOTTOM) newPage()
      if (n === 0 && marker) { doc.setFont("helvetica", "normal").setFontSize(11 * FONT_SCALE).setTextColor(0); doc.text(marker, LEFT + 18, y + l.h * 0.78) }
      drawLine(l, LEFT + left, RIGHT - LEFT - left, jc, true)
      y += l.h
    }
    y += sa
  }

  // ----- letterhead header / footer + page numbers on every page -----
  const hdr = await read("word/header1.xml"), ftr = await read("word/footer1.xml")
  const placed = async (xml: string, relsName: string) => {
    const rid = attr(xml, /r:embed="([^"]+)"/), ext = xml.match(/<wp:extent cx="(\d+)" cy="(\d+)"/)
    if (!rid || !ext) return null
    const img = await loadImg(await read(relsName), rid)
    const posV = parseInt(attr(xml, /<wp:positionV [^>]*>\s*<wp:posOffset>(-?\d+)</) ?? "0", 10)
    return img ? { ...img, w: parseInt(ext[1], 10) / EMU, h: parseInt(ext[2], 10) / EMU, y: posV / EMU } : null
  }
  const H = await placed(hdr, "word/_rels/header1.xml.rels"), F = await placed(ftr, "word/_rels/footer1.xml.rels")
  const hasPageNo = /instrText[^>]*>\s*PAGE\s*</.test(ftr)
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    try { if (H) doc.addImage(H.data, H.fmt, 0, H.y, PAGE_W, H.h) } catch { /* skip */ }
    try { if (F) doc.addImage(F.data, F.fmt, 0, F.y, PAGE_W, F.h) } catch { /* skip */ }
    if (hasPageNo) { doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(89, 89, 89); doc.text(`Page ${p} of ${pages}`, RIGHT, F ? F.y - 6 : PAGE_H - 40, { align: "right" }); doc.setTextColor(0) }
  }
  doc.setProperties({ title: "Memorandum of Understanding" })
  return Buffer.from(doc.output("arraybuffer"))
}
