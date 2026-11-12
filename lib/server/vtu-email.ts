const esc = (s: string) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

export const VTU_PLACEHOLDERS = ["name", "program", "weeks", "date", "id", "coordinator"] as const
export type VtuMailVars = Record<(typeof VTU_PLACEHOLDERS)[number], string>

export const DEFAULT_VTU_MAIL = {
  subject: "Internship Offer Letter – {program} | Cloud Institution (VTU Internship)",
  body: `Dear {name},

Greetings from Cloud Institution!

Thank you for applying for an internship with us through the VTU Internship Portal. We are pleased to offer you a {weeks}-week internship in {program}.

Your offer letter is attached to this email as a PDF. Please:
1. Print the letter and fill in the Faculty Coordinator / HOD details on it.
2. Get it signed and sealed by your HOD / Internship Coordinator.
3. Reply to this email with the signed copy within one month.

The Internship Manual and the program schedule will be shared with you on the day of commencement.

If you have any questions, simply reply to this email.

Warm regards,
{coordinator}
Cloud Institution
info@cloudinstitution.com | +91 76763 70336`,
}

/** Replace {name}, {program}, … in the admin's draft. Unknown {words} are left as typed. */
export function fillVtuTemplate(t: string, v: VtuMailVars): string {
  return t.replace(/\{(\w+)\}/g, (m, k: string) => ((VTU_PLACEHOLDERS as readonly string[]).includes(k) ? v[k as keyof VtuMailVars] : m))
}

/** Subject, plain-text and branded HTML for the VTU offer email, from the (possibly customised) draft. */
export function vtuEmail(tpl: { subject: string; body: string }, v: VtuMailVars, logoCid?: string): { subject: string; text: string; html: string } {
  const subject = fillVtuTemplate(tpl.subject, v).replace(/[\r\n]+/g, " ").trim() || "Internship Offer Letter"
  const text = fillVtuTemplate(tpl.body, v).replace(/\r\n/g, "\n").trim()
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
<tr><td style="padding:22px 28px;border-bottom:3px solid ${accent};">${logoCid ? `<img src="cid:${esc(logoCid)}" alt="Cloud Institution" height="40" style="display:block;height:40px;border:0;">` : `<span style="font-size:20px;font-weight:700;color:${accent};">Cloud Institution</span>`}</td></tr>
<tr><td style="padding:26px 28px 6px 28px;">${blocks}</td></tr>
<tr><td style="padding:14px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:11.5px;line-height:17px;color:#94a3b8;">This email and its attachment are intended only for ${esc(v.name)}. If you received it by mistake, please let us know and delete it.<br>Reference: ${esc(v.id)}</td></tr>
</table></td></tr></table></body></html>`
  return { subject, text, html }
}
