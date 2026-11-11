import { durationText } from "../internship-pdf"

type Offer = {
  internship_id: string; candidate_name: string; position: string; location: string; work_mode?: string; paid: boolean; stipend_amount: number
  duration_value: number; duration_unit: string; start_date: string; end_date?: string
  company: { name: string; email: string; phone: string; website?: string; signatory: string; signatory_title: string }
}

const esc = (s: string) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
const inr = (n: number) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })
const longDate = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : iso)

/** The rows shown in the "offer at a glance" table (also used for the plain-text version). */
export function offerRows(o: Offer): [string, string][] {
  return [
    ["Internship ID", o.internship_id], ["Position", o.position], ["Internship type", o.paid ? `Paid — stipend of INR ${inr(o.stipend_amount)} per month` : "Unpaid (no stipend)"],
    ["Start date", longDate(o.start_date)], ...(o.end_date ? [["End date", longDate(o.end_date)] as [string, string]] : []), ["Duration", durationText(o.duration_value, o.duration_unit)],
    ["Work location", `${o.location}${o.work_mode && o.work_mode !== "On-site" ? ` (${o.work_mode})` : ""}`],
  ]
}

/** Subject, plain-text and HTML bodies for the internship offer email. `logoCid` is the inline logo attachment id, if any. */
export function internshipEmail(o: Offer, logoCid?: string): { subject: string; text: string; html: string } {
  const co = o.company, rows = offerRows(o)
  const subject = `Internship Offer Letter – ${o.position} | ${co.name} (${o.internship_id})`
  const contact = [co.website, co.email, co.phone].filter((x): x is string => Boolean(x))
  const intro = `We are delighted to offer you the position of ${o.position} at ${co.name}. After reviewing your profile, we believe your skills and enthusiasm will be a valuable addition to our team. Your official offer letter is attached to this email as a PDF.`
  const steps = [`Read the attached offer letter carefully.`, `Sign the letter (a clear photo or scan of your signature is fine).`, `Reply to this email, or send the signed copy to ${co.email}, to confirm your acceptance.`]
  const text = [
    `Dear ${o.candidate_name},`, ``, `Greetings from ${co.name}!`, ``, intro, ``, `OFFER AT A GLANCE`, ...rows.map(([k, v]) => `  ${k}: ${v}`), ``,
    `NEXT STEPS`, ...steps.map((s, i) => `  ${i + 1}. ${s}`), ``, `If you have any questions, simply reply to this email${co.phone ? ` or call us on ${co.phone}` : ""}.`, ``, `We look forward to welcoming you to ${co.name}.`, ``,
    `Warm regards,`, co.signatory || co.name, co.signatory ? co.signatory_title : "", co.name, ...contact, ``, `---`,
    `This email and its attachment are intended only for ${o.candidate_name} and may contain confidential information. If you received it by mistake, please let us know and delete it. Reference: ${o.internship_id}`,
  ].filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n")

  const accent = "#2f54aa"
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f6;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your internship offer letter from ${esc(co.name)} is attached (Internship ID ${esc(o.internship_id)}).</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1f2937;">
<tr><td style="padding:22px 28px;border-bottom:3px solid ${accent};">${logoCid ? `<img src="cid:${esc(logoCid)}" alt="${esc(co.name)}" height="44" style="display:block;height:44px;border:0;">` : `<span style="font-size:20px;font-weight:700;color:${accent};">${esc(co.name)}</span>`}</td></tr>
<tr><td style="padding:28px 28px 8px 28px;">
<h1 style="margin:0 0 16px 0;font-size:20px;line-height:28px;color:${accent};">Internship Offer Letter</h1>
<p style="margin:0 0 14px 0;font-size:15px;line-height:24px;">Dear ${esc(o.candidate_name)},</p>
<p style="margin:0 0 14px 0;font-size:15px;line-height:24px;">Greetings from <b>${esc(co.name)}</b>!</p>
<p style="margin:0 0 20px 0;font-size:15px;line-height:24px;">We are delighted to offer you the position of <b>${esc(o.position)}</b> at <b>${esc(co.name)}</b>. After reviewing your profile, we believe your skills and enthusiasm will be a valuable addition to our team. Your official offer letter is attached to this email as a PDF.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;border-collapse:separate;margin:0 0 22px 0;">
<tr><td colspan="2" style="padding:10px 16px;background:#f8fafc;border-bottom:1px solid #e5e7eb;font-size:12px;letter-spacing:.06em;font-weight:700;color:#475569;text-transform:uppercase;">Offer at a glance</td></tr>
${rows.map(([k, v], i) => `<tr><td style="padding:9px 16px;font-size:14px;color:#64748b;width:38%;${i ? "border-top:1px solid #f1f5f9;" : ""}">${esc(k)}</td><td style="padding:9px 16px;font-size:14px;font-weight:600;${i ? "border-top:1px solid #f1f5f9;" : ""}">${esc(v)}</td></tr>`).join("\n")}
</table>
<p style="margin:0 0 8px 0;font-size:15px;font-weight:700;">Next steps</p>
<ol style="margin:0 0 20px 0;padding-left:22px;font-size:15px;line-height:24px;">${steps.map((s) => `<li style="margin-bottom:4px;">${esc(s).replace(esc(co.email), `<a href="mailto:${esc(co.email)}" style="color:${accent};">${esc(co.email)}</a>`)}</li>`).join("")}</ol>
<p style="margin:0 0 14px 0;font-size:15px;line-height:24px;">If you have any questions, simply reply to this email${co.phone ? ` or call us on <b>${esc(co.phone)}</b>` : ""}.</p>
<p style="margin:0 0 22px 0;font-size:15px;line-height:24px;">We look forward to welcoming you to ${esc(co.name)}.</p>
<p style="margin:0 0 4px 0;font-size:15px;line-height:24px;">Warm regards,</p>
<p style="margin:0 0 24px 0;font-size:15px;line-height:22px;"><b>${esc(co.signatory || co.name)}</b>${co.signatory ? `<br>${esc(co.signatory_title)}` : ""}<br>${esc(co.name)}${contact.length ? `<br><span style="color:#64748b;font-size:13px;">${contact.map((c) => (c.includes("@") ? `<a href="mailto:${esc(c)}" style="color:#64748b;">${esc(c)}</a>` : esc(c))).join(" &nbsp;|&nbsp; ")}</span>` : ""}</p>
</td></tr>
<tr><td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e5e7eb;font-size:11.5px;line-height:17px;color:#94a3b8;">This email and its attachment are intended only for ${esc(o.candidate_name)} and may contain confidential information. If you received it by mistake, please let us know and delete it.<br>Reference: ${esc(o.internship_id)}</td></tr>
</table></td></tr></table></body></html>`
  return { subject, text, html }
}
