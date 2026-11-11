import nodemailer from "nodemailer"
import { ApiError } from "./http"

export type Mail = { to: string; cc?: string; replyTo?: string; subject: string; html: string; text?: string; attachments?: { filename: string; content: Buffer; contentType: string }[] }
export type Sender = (mail: Mail & { from: string }) => Promise<void>

/** The address mail is sent from, or "" when email isn't configured (GMAIL_USER + GMAIL_APP_PASSWORD, or SMTP_HOST/USER/PASSWORD). */
export const mailFrom = () =>
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD ? process.env.GMAIL_USER : process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD ? process.env.SMTP_USER : ""

let override: Sender | null = null
/** Test seam: replace the real mail transport. Pass null to restore. */
export const setMailSender = (s: Sender | null) => { override = s }

export async function sendMail(mail: Mail, fromName = "Cloud Institution"): Promise<void> {
  const addr = mailFrom()
  if (!addr && !override) throw new ApiError(503, "Email isn't set up on the server (add GMAIL_USER and GMAIL_APP_PASSWORD).")
  const full = { ...mail, from: `"${fromName.replace(/"/g, "")}" <${addr || "no-reply@example.com"}>` }
  if (override) return override(full)
  const transporter = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({ service: "gmail", auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } })
    : nodemailer.createTransport({ host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT || "587"), secure: process.env.SMTP_SECURE === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } })
  await transporter.sendMail(full)
}
