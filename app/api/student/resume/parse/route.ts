import { NextResponse } from "next/server"
import { ApiError, rateLimit, withApi } from "@/lib/server/http"
import { parseConfidence, parseResumeText } from "@/lib/resume-parse"

export const maxDuration = 30
const MAX = 5 * 1024 * 1024

async function textOf(buf: Buffer, name: string): Promise<string> {
  const head = buf.subarray(0, 4).toString("latin1")
  if (head === "%PDF") {
    const { extractText, getDocumentProxy } = await import("unpdf")
    const pdf = await getDocumentProxy(new Uint8Array(buf))
    const { text } = await extractText(pdf, { mergePages: true })
    return Array.isArray(text) ? text.join("\n") : text
  }
  if (head.startsWith("PK") && /\.docx$/i.test(name)) {
    const mammoth = await import("mammoth")
    return (await mammoth.extractRawText({ buffer: buf })).value
  }
  if (/\.doc$/i.test(name) || head.startsWith("\xd0\xcf\x11\xe0")) throw new ApiError(400, "Old .doc files can't be read. Please save it as PDF or DOCX and upload again.")
  throw new ApiError(400, "Please upload a PDF or DOCX resume.")
}

/** POST multipart { resume } → { profile, confidence }. Reads a student's uploaded resume so it can be rebuilt as an ATS resume. Nothing is stored. */
export const POST = withApi(async (req) => {
  rateLimit(req, "resume-parse", 10)
  const form = await req.formData().catch(() => null)
  const file = form?.get("resume")
  if (!(file instanceof File)) throw new ApiError(400, "Choose a resume file")
  if (file.size > MAX) throw new ApiError(400, "Resume must be smaller than 5 MB.")
  let text = ""
  try { text = await textOf(Buffer.from(await file.arrayBuffer()), file.name) } catch (e) { if (e instanceof ApiError) throw e; throw new ApiError(400, "We couldn't read that file. Try saving it again as a PDF or DOCX.") }
  if (text.replace(/\s/g, "").length < 80) throw new ApiError(400, "No readable text found — this looks like a scanned image. Upload a text-based PDF/DOCX, or fill the form by hand.")
  const profile = parseResumeText(text)
  return NextResponse.json({ profile, confidence: parseConfidence(profile) })
})
