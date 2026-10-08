import type { NextRequest } from "next/server"

/** Branding + privacy settings for certificates. Every value can be overridden with an env var. */
export const certificateConfig = {
  orgName: () => process.env.CERT_ORG_NAME || "Cloud Institution",
  signatoryName: () => process.env.CERT_SIGNATORY_NAME || "Dilip D",
  signatoryTitle: () => process.env.CERT_SIGNATORY_TITLE || "CEO",
  /** Time zone used to decide the issue date (so an approval at 02:00 IST isn't dated "yesterday"). */
  timeZone: () => process.env.CERT_TIMEZONE || "Asia/Kolkata",
  /** Let anyone holding the verify link download the PDF (privacy setting; off by default). */
  publicDownload: () => process.env.CERT_PUBLIC_DOWNLOAD === "true",
  /**
   * Only accept the random token on the public verify endpoint. Because the certificate code equals
   * the (guessable) student ID, turning this on stops people from enumerating certificates by ID.
   */
  tokenOnlyVerify: () => process.env.CERT_VERIFY_TOKEN_ONLY === "true",
}

/** Public origin written into QR codes. Set NEXT_PUBLIC_SITE_URL in production so it never changes. */
export function siteBaseUrl(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured && !configured.includes("your-domain.com")) return configured.replace(/\/+$/, "")
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host")
  const proto = req.headers.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}
