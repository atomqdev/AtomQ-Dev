/**
 * Email sending utility using Resend
 * Used for admin login OTP verification
 *
 * Configuration:
 *   RESEND_API_KEY    — Resend API key (required)
 *   RESEND_FROM_EMAIL — Sender address from a verified domain
 *                        e.g. "AtomQ <noreply@atomq.dev>"
 *                        Defaults to "AtomQ <onboarding@resend.dev>" (test only)
 *
 * In development mode (NODE_ENV !== 'production'), email send failures
 * are tolerated — the OTP is always logged to server console so the
 * flow can be tested even without a working email service.
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Sender address — must be from a verified domain in Resend.
// Set RESEND_FROM_EMAIL in production to your verified domain sender.
// Example: RESEND_FROM_EMAIL="AtomQ <noreply@atomq.dev>"
//
// "onboarding@resend.dev" is Resend's test sender — it can ONLY send
// to the email address of the Resend account owner. It will NOT work
// in production for sending to arbitrary admin emails.
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'AtomQ <onboarding@resend.dev>'

// Warn once at startup if using test sender in production
if (process.env.NODE_ENV === 'production' && DEFAULT_FROM.includes('onboarding@resend.dev')) {
  console.warn(
    '[OTP] WARNING: Using Resend test sender (onboarding@resend.dev) in production. ' +
    'This can only send emails to the Resend account owner. ' +
    'Set RESEND_FROM_EMAIL to a verified domain sender, e.g. "AtomQ <noreply@atomq.dev>"'
  )
}

export interface SendOtpEmailOptions {
  to: string
  otp: string
  name?: string | null
  expiryMinutes?: number
}

/**
 * Build the OTP email HTML
 */
function buildOtpHtml(otp: string, displayName: string, expiryMinutes: number): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;">
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="margin:0;font-size:24px;color:#111827;">&#128274; Admin Login Verification</h1>
    </div>
    <p style="font-size:16px;color:#374151;margin-bottom:8px;">Hello <strong>${displayName}</strong>,</p>
    <p style="font-size:16px;color:#374151;margin-bottom:24px;">You are logging in to <strong>AtomQ</strong> as an administrator. Please use the following One-Time Password to complete your login:</p>
    <div style="text-align:center;margin:32px 0;">
      <div style="display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#ffffff;font-size:36px;font-weight:700;letter-spacing:8px;padding:16px 32px;border-radius:12px;font-family:'Courier New',monospace;">${otp}</div>
    </div>
    <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px 16px;margin:24px 0;">
      <p style="margin:0;font-size:14px;color:#92400e;">&#9201;&#65039; This OTP expires in <strong>${expiryMinutes} minutes</strong>. Do not share this code with anyone.</p>
    </div>
    <p style="font-size:14px;color:#6b7280;margin-top:24px;">If you did not attempt to log in, please ignore this email. Your account is safe.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">This is an automated message from AtomQ. Please do not reply to this email.</p>
  </div>
</body>
</html>`
}

/**
 * Send OTP verification email for admin login.
 *
 * Always logs the OTP to server console regardless of email success.
 * In non-production environments, email failures are tolerated —
 * the OTP flow proceeds using the console-logged OTP.
 */
export async function sendOtpEmail({ to, otp, name, expiryMinutes = 5 }: SendOtpEmailOptions): Promise<{ success: boolean; error?: string }> {
  const isProduction = process.env.NODE_ENV === 'production'
  const displayName = name || 'Admin'

  // ALWAYS log OTP to server console for debugging/testing
  console.log(`[OTP] Admin login OTP for ${to}: ${otp} (expires in ${expiryMinutes} min)`)

  // Skip actual email sending if no API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.log('[OTP] No RESEND_API_KEY configured — skipping email send')
    return { success: true }
  }

  try {
    const html = buildOtpHtml(otp, displayName, expiryMinutes)

    console.log(`[OTP] Sending email from "${DEFAULT_FROM}" to "${to}"`)

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to,
      subject: 'Your Admin Login OTP - AtomQ',
      html,
    })

    if (error) {
      console.error('[OTP] Resend returned error:', JSON.stringify(error, null, 2))

      // In non-production, tolerate email failures (OTP is logged to console)
      if (!isProduction) {
        console.log('[OTP] Dev mode: Allowing OTP flow to continue despite email failure')
        return { success: true }
      }

      // Provide specific error message for common Resend issues
      const errMsg = typeof error.message === 'string' ? error.message : String(error)
      if (errMsg.includes('validation') || errMsg.includes('Verification')) {
        console.error(
          '[OTP] HINT: The sender address may not be verified, or the recipient is not allowed. ' +
          'Set RESEND_FROM_EMAIL to a verified domain sender in production.'
        )
      }

      return { success: false, error: `Email delivery failed: ${errMsg}` }
    }

    console.log(`[OTP] Verification email sent successfully to ${to} (id: ${data?.id})`)
    return { success: true }
  } catch (err: any) {
    console.error('[OTP] Email send threw exception:', err?.message || err)

    // In non-production, tolerate email failures
    if (!isProduction) {
      console.log('[OTP] Dev mode: Allowing OTP flow to continue despite email exception')
      return { success: true }
    }

    return { success: false, error: `Email delivery failed: ${err?.message || 'Unknown error'}` }
  }
}
