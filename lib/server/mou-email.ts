const esc = (s: string) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

export const MOU_PLACEHOLDERS = ["company", "name", "designation", "address", "date", "id", "org", "signer", "signer_title"] as const
export type MouMailVars = Record<(typeof MOU_PLACEHOLDERS)[number], string>

/** The built-in draft. {org}, {signer} and {signer_title} fill in with the issuing company and who signs for it. */
export const DEFAULT_MOU_MAIL = {
  subject: "Memorandum of Understanding – {org} & {company}",
  body: `Dear {name},

Greetings from {org}!

We would like to formalise our hiring collaboration with {company} for trained students, covering internships and placements, through a Memorandum of Understanding (MOU). The MOU is a zero-cost collaboration: neither party charges the other any fee.

Your MOU is attached to this email. It has already been digitally signed on behalf of {org} by {signer}. Please:
1. Read it and let us know if you would like any changes.
2. Sign and seal it on the last page, as {designation}.
3. Reply to this email with the signed copy.

We look forward to a long and fruitful partnership.

Warm regards,
{signer}
{signer_title}
{org}`,
}

export function fillMouTemplate(t: string, v: MouMailVars): string {
  return t.replace(/\{(\w+)\}/g, (m, k: string) => ((MOU_PLACEHOLDERS as readonly string[]).includes(k) ? v[k as keyof MouMailVars] : m))
}

/** Subject, plain-text and branded HTML for the MOU email, from the (possibly customised) draft. */
export function mouEmail(tpl: { subject: string; body: string }, v: MouMailVars, logoCid?: string): { subject: string; text: string; html: string } {
  const subject = fillMouTemplate(tpl.subject, v).replace(/[\r\n]+/g, " ").trim() || "Memorandum of Understanding"
  const text = fillMouTemplate(tpl.body, v).replace(/\r\n/g, "\n").trim()
  const accent = "#2f54aa"
  const blocks = text.split(/\n{2,}/).map((b) => {
    const lines = b.split("\n")
    const listy = lines.length > 1 && lines.slice(1).every((l) => /^\s*(\d+[.)]|[-•*])\s+/.test(l))
    if (listy) return `<p style="margin:0 0 6px 0;font-size:15px;line-height:24px;">${esc(lines[0])}</p><ol style="margin:0 0 16px 0;padding-left:22px;font-size:15px;line-height:24px;">${lines.slice(1).map((l) => `<li style="margin-bottom:4px;">${esc(l.replace(/^\s*(\d+[.)]|[-•*])\s+/, ""))}</li>`).join("")}</ol>`
    return `<p style="margin:0 0 16px 0;font-size:15px;line-height:24px;">${lines.map(esc).join("<br>")}</p>`
  }).join("\n")
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1f2937;">
<tr><td style="padding:22px 28px;border-bottom:3px solid ${accent};">${logoCid ? `<img src="cid:${esc(logoCid)}" alt="${esc(v.org)}" height="40" style="display:block;height:40px;border:0;">` : `<span style="font-size:20px;font-weight:700;color:${accent};">${esc(v.org)}</span>`}</td></tr>
<tr><td style="padding:26px 28px 6px 28px;">${blocks}</td></tr>
<tr><td style="padding:14px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:11.5px;line-height:17px;color:#94a3b8;">This email and its attachment are intended only for ${esc(v.company)}. If you received it by mistake, please let us know and delete it.<br>Reference: ${esc(v.id)}</td></tr>
</table></td></tr></table></body></html>`
  return { subject, text, html }
}
