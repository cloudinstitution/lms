import nodemailer from "nodemailer"
import { ApiError } from "./http"

export type Mail = { to: string; cc?: string; replyTo?: string; subject: string; html: string; text?: string; attachments?: { filename: string; content: Buffer; contentType: string; cid?: string }[] }
export type Sender = (mail: Mail & { from: string }) => Promise<void>

/** The address mail is sent from, or "" when email isn't configured (GMAIL_USER + GMAIL_APP_PASSWORD, or SMTP_HOST/USER/PASSWORD). */
const smtpSet = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
const gmailSet = () => Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
/** The login address mail is sent through, or "" when email isn't configured. SMTP_* (e.g. your own domain's mailbox) wins over GMAIL_* when both are set. */
export const mailFrom = () => (smtpSet() ? process.env.SMTP_USER! : gmailSet() ? process.env.GMAIL_USER! : "")

/** The address shown in "From". Set MAIL_FROM (e.g. info@cloudinstitution.com) to show it instead of the login address; Gmail only honours it if it is a verified "Send mail as" alias of the login account. */
const shownFrom = (login: string) => (process.env.MAIL_FROM || "").trim().match(/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/)?.[0] || login

let override: Sender | null = null
/** Test seam: replace the real mail transport. Pass null to restore. */
export const setMailSender = (s: Sender | null) => { override = s }

export async function sendMail(mail: Mail, fromName = "Cloud Institution"): Promise<void> {
  const addr = mailFrom()
  if (!addr && !override) throw new ApiError(503, "Email isn't set up on the server (add GMAIL_USER and GMAIL_APP_PASSWORD).")
  const full = { ...mail, from: `"${fromName.replace(/"/g, "")}" <${shownFrom(addr || "no-reply@example.com")}>` }
  if (override) return override(full)
  const transporter = smtpSet()
    ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT || "587"), secure: process.env.SMTP_SECURE === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } })
    : nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } })
  await transporter.sendMail(full)
}
