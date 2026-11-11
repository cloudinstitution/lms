import { LETTER_IMAGES } from "./letter-assets"
import { buildInternshipOfferPdf } from "../internship-pdf"
import { internshipEmail } from "./internship-email"
import { getInternship, markInternshipEmail } from "./hr-service"
import { sendMail } from "./mailer"
import { ApiError } from "./http"

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
  const logo = LETTER_IMAGES[co.logo]
  const mail = internshipEmail(offer as any, logo ? "company-logo" : undefined)
  try {
    await sendMail({
      to: offer.candidate_email, cc: co.email && co.email !== offer.candidate_email ? co.email : undefined, replyTo: co.email || undefined,
      subject: mail.subject, text: mail.text, html: mail.html,
      attachments: [
        { filename, content: bytes, contentType: "application/pdf" },
        ...(logo ? [{ filename: "logo.png", content: Buffer.from(logo.data.split(",")[1], "base64"), contentType: logo.data.slice(5, logo.data.indexOf(";")), cid: "company-logo" }] : []),
      ],
    }, co.name)
    await markInternshipEmail(id, { email_status: "sent", email_sent_at: new Date().toISOString() })
    return { sent: true }
  } catch (e) {
    const error = e instanceof ApiError ? e.message : "The email could not be sent. Check the email settings on the server."
    await markInternshipEmail(id, { email_status: "failed", email_error: error })
    return { sent: false, error }
  }
}
