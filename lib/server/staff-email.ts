const esc = (s: string) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

export type StaffLogin = { name: string; email: string; password: string; role_label: string; pages: string[] | null; login_url: string }

/** Subject, plain-text and HTML bodies for the "your account has been created" email. */
export function staffLoginEmail(u: StaffLogin): { subject: string; text: string; html: string } {
  const org = "Cloud Institution", accent = "#2f54aa"
  const pages = u.pages === null ? "All pages" : u.pages.length ? u.pages.join(", ") : "Dashboard only"
  const subject = `Your ${org} account has been created`
  const rows: [string, string][] = [["Login page", u.login_url], ["Email / username", u.email], ["Password", u.password], ["Role", u.role_label], ["Pages you can open", pages]]
  const text = [
    `Dear ${u.name},`, ``, `An account has been created for you on the ${org} portal.`, ``, `YOUR LOGIN DETAILS`, ...rows.map(([k, v]) => `  ${k}: ${v}`), ``,
    `Please log in and keep these details private. Do not share your password with anyone. If you did not expect this email, or need your access changed, contact your administrator.`, ``, `Regards,`, `${org} Administration`,
  ].join("\n")
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1f2937;">
<tr><td style="padding:20px 28px;border-bottom:3px solid ${accent};font-size:20px;font-weight:700;color:${accent};">${org}</td></tr>
<tr><td style="padding:26px 28px 8px 28px;">
<h1 style="margin:0 0 14px 0;font-size:20px;color:${accent};">Your account has been created</h1>
<p style="margin:0 0 12px 0;font-size:15px;line-height:24px;">Dear ${esc(u.name)},</p>
<p style="margin:0 0 18px 0;font-size:15px;line-height:24px;">An account has been created for you on the ${org} portal. Your login details are below.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;border-collapse:separate;margin:0 0 20px 0;">
${rows.map(([k, v], i) => `<tr><td style="padding:9px 16px;font-size:14px;color:#64748b;width:38%;${i ? "border-top:1px solid #f1f5f9;" : ""}">${esc(k)}</td><td style="padding:9px 16px;font-size:14px;font-weight:600;word-break:break-all;${i ? "border-top:1px solid #f1f5f9;" : ""}">${k === "Login page" ? `<a href="${esc(v)}" style="color:${accent};">${esc(v)}</a>` : k === "Password" ? `<span style="font-family:Consolas,Menlo,monospace;background:#f1f5f9;padding:2px 6px;border-radius:4px;">${esc(v)}</span>` : esc(v)}</td></tr>`).join("\n")}
</table>
<p style="margin:0 0 18px 0;text-align:center;"><a href="${esc(u.login_url)}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:11px 26px;border-radius:6px;">Log in</a></p>
<p style="margin:0 0 22px 0;font-size:14px;line-height:22px;color:#475569;">Please keep these details private and do not share your password. If you did not expect this email, or need your access changed, contact your administrator.</p>
<p style="margin:0 0 24px 0;font-size:15px;line-height:22px;">Regards,<br><b>${org} Administration</b></p>
</td></tr></table></td></tr></table></body></html>`
  return { subject, text, html }
}
