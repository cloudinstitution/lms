import { LETTER_IMAGES } from "./letter-assets"
import { buildInternshipOfferPdf, durationText } from "../internship-pdf"
import { getInternship, markInternshipEmail } from "./hr-service"
import { sendMail } from "./mailer"
import { ApiError } from "./http"

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)

/** The offer letter as PDF bytes, built on the server (logos are embedded, so this works on serverless hosting). */
export async function internshipPdf(id: string): Promise<{ bytes: Buffer; filename: string; offer: Awaited<ReturnType<typeof getInternship>> }> {
  const offer = await getInternship(id)
  const doc = buildInternshipOfferPdf(offer as any, { logo: LETTER_IMAGES[offer.company.logo] ?? null, seal: LETTER_IMAGES[offer.company.seal] ?? null })
  return { bytes: Buffer.from(doc.output("arraybuffer")), filename: `Internship-Offer-${offer.internship_id}.pdf`, offer }
}

/** Emails the letter to the candidate. Records the outcome on the offer and returns it; never throws for a mail failure. */
export async function emailInternship(id: string): Promise<{ sent: boolean; error?: string }> {
  const { bytes, filename, offer } = await internshipPdf(id)
  const co = offer.company
  try {
    await sendMail({
      to: offer.candidate_email, cc: co.email && co.email !== offer.candidate_email ? co.email : undefined, replyTo: co.email || undefined,
      subject: `Internship Offer Letter – ${co.name} (${offer.internship_id})`,
      text: `Dear ${offer.candidate_name},\n\nCongratulations! Please find attached your internship offer letter from ${co.name} (Internship ID: ${offer.internship_id}).\n\nPosition: ${offer.position}\nStart date: ${offer.start_date}\nDuration: ${durationText(offer.duration_value, offer.duration_unit)}\n${offer.paid ? `Stipend: INR ${offer.stipend_amount} per month` : "This is an unpaid internship."}\n\nPlease sign the letter and email the signed copy to ${co.email} to confirm your acceptance.\n\nRegards,\n${co.signatory || co.name}\n${co.name}`,
      html: `<p>Dear ${esc(offer.candidate_name)},</p><p>Congratulations! Please find attached your internship offer letter from <b>${esc(co.name)}</b> (Internship ID: <b>${esc(offer.internship_id)}</b>).</p>
<table cellpadding="4" style="border-collapse:collapse"><tr><td><b>Position</b></td><td>${esc(offer.position)}</td></tr><tr><td><b>Start date</b></td><td>${esc(offer.start_date)}</td></tr><tr><td><b>Duration</b></td><td>${esc(durationText(offer.duration_value, offer.duration_unit))}</td></tr><tr><td><b>Stipend</b></td><td>${offer.paid ? `INR ${esc(String(offer.stipend_amount))} per month` : "Unpaid internship"}</td></tr></table>
<p>Please sign the letter and email the signed copy to <a href="mailto:${esc(co.email)}">${esc(co.email)}</a> to confirm your acceptance.</p><p>Regards,<br>${esc(co.signatory || co.name)}<br>${esc(co.name)}</p>`,
      attachments: [{ filename, content: bytes, contentType: "application/pdf" }],
    }, co.name)
    await markInternshipEmail(id, { email_status: "sent", email_sent_at: new Date().toISOString() })
    return { sent: true }
  } catch (e) {
    const error = e instanceof ApiError ? e.message : "The email could not be sent. Check the email settings on the server."
    await markInternshipEmail(id, { email_status: "failed", email_error: error })
    return { sent: false, error }
  }
}
