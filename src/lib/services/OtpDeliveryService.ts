/**
 * OTP Delivery Service
 *
 * Abstraction over OTP delivery channels. Provider selection:
 *   1. If RESEND_API_KEY is set → ResendEmailProvider (production email)
 *   2. Otherwise → DevConsoleProvider (logs + returns OTP in API response meta)
 *
 * To add SMS (Twilio) in future: implement the OtpDeliveryProvider interface
 * and add a provider selector condition here.
 */

export interface OtpDeliveryResult {
  success: boolean;
  error?: string;
  /**
   * Only populated in dev mode (no real provider configured).
   * Include this in API response meta so the UI can display it for testing.
   * Never include in production responses.
   */
  devOtp?: string;
}

interface OtpDeliveryProvider {
  send(recipient: string | null | undefined, code: string, userId: string): Promise<OtpDeliveryResult>;
}

// ── Dev Console Provider ──────────────────────────────────────────────────────
// Used when no real provider is configured. Returns the OTP in the result
// so route handlers can include it in the API response meta for easier local testing.
class DevConsoleProvider implements OtpDeliveryProvider {
  async send(recipient: string | null | undefined, code: string, userId: string): Promise<OtpDeliveryResult> {
    const target = recipient || userId;
    console.log(`[DEV OTP] Recipient: ${target} | Code: ${code}`);
    return { success: true, devOtp: code };
  }
}

// ── Resend Email Provider ─────────────────────────────────────────────────────
// Uses the Resend API (https://resend.com) for transactional email delivery.
// Set RESEND_API_KEY in your environment to activate.
class ResendEmailProvider implements OtpDeliveryProvider {
  private readonly apiKey: string;
  private readonly fromAddress: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.fromAddress = process.env.RESEND_FROM_EMAIL || "noreply@mediflow.app";
  }

  async send(recipient: string | null | undefined, code: string): Promise<OtpDeliveryResult> {
    if (!recipient || !recipient.includes("@")) {
      // Recipient is a phone number or missing — fall back to console in this stub.
      // Wire Twilio/AWS SNS here for SMS delivery in the future.
      console.warn(`[OTP] ResendEmailProvider received non-email recipient (${recipient}). Logging OTP instead.`);
      console.log(`[DEV OTP] Code: ${code}`);
      return { success: true };
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: [recipient],
          subject: "Your MediFlow Verification Code",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px">
              <h2 style="color:#1e293b">MediFlow Verification</h2>
              <p style="color:#475569">Your one-time verification code is:</p>
              <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0f172a;padding:16px 0">
                ${code}
              </div>
              <p style="color:#64748b;font-size:14px">
                This code expires in 5 minutes. Do not share it with anyone.
              </p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error("[OTP] Resend API error:", errBody);
        return { success: false, error: "Failed to send verification email" };
      }

      return { success: true };
    } catch (err) {
      console.error("[OTP] Resend fetch error:", err);
      return { success: false, error: "OTP delivery network error" };
    }
  }
}

// ── Provider Factory ──────────────────────────────────────────────────────────
function getProvider(): OtpDeliveryProvider {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    return new ResendEmailProvider(resendKey);
  }
  return new DevConsoleProvider();
}

export const OtpDeliveryService = {
  /**
   * Deliver an OTP to the given recipient (email or phone number).
   *
   * In production (RESEND_API_KEY set): sends real email.
   * In dev (no key): logs to console and returns devOtp in result.
   *
   * Route handlers should include result.devOtp in API response meta when present.
   */
  async deliver(
    recipient: string | null | undefined,
    code: string,
    userId: string
  ): Promise<OtpDeliveryResult> {
    const provider = getProvider();
    return provider.send(recipient, code, userId);
  },
};
