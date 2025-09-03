import { logger } from "../util/logger";
import { BaseService } from "./base.service";

export interface SendMagicLinkParams {
  to: string;
  url: string;
  code?: string;
}

class EmailService extends BaseService {
  async sendMagicLinkEmail(params: SendMagicLinkParams): Promise<void> {
    // Use environment variables with fallbacks to params
    const from =  this.getEnvVar('EMAIL_FROM') || 'noreply@lynkby.com';
    const supportEmail =  this.getEnvVar('SUPPORT_EMAIL');
    const appName =  this.getEnvVar('APP_NAME') || 'Lynkby';
    const provider = 'resend';
    const apiKey = this.getRequiredEnvVar('RESEND_API_KEY');
    
    const { to, url, code } = params;

    const subject = `${appName}: Your sign-in link`;
    const text = `Sign in to ${appName}\n\nYou have two ways to complete your sign-in:\n\n1. Click this link: ${url}\n\n${code ? `2. Or enter this 6-digit code in the waiting tab: ${code}\n\n` : ''}Both methods expire in 15 minutes.\n\n📱 Mobile email app users:\nIf you're using Gmail, Outlook, or another email app on your phone:\n- Tap the link above\n- If it opens in the email app, look for "Open in browser" or "Open externally"\n- Or use the 6-digit code method instead\n\nIf you didn't request this, you can ignore this email.\n\nNeed help? ${supportEmail || ''}`;
    const html = this.renderMagicLinkHTML({ appName, url, supportEmail, code });

    if (provider === 'resend') {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
          subject,
          text,
          html,
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        logger.warn('Failed to send magic link via Resend', { status: resp.status, body: errText });
        throw new Error(`Email send failed: ${resp.status}`);
      }
      logger.info('Magic link email sent via Resend', { to, url });
      return;
    }

    throw new Error('Unsupported email provider');
  }

  private renderMagicLinkHTML({ appName, url, supportEmail, code }: { appName: string; url: string; supportEmail?: string; code?: string }) {
    return `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segue UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;max-width:520px;margin:24px auto;padding:24px;border:1px solid #eee;border-radius:12px">
        <h1 style="font-size:20px;margin:0 0 12px">Sign in to ${appName}</h1>
        <p style="color:#444;margin:0 0 16px">You have two ways to complete your sign-in:</p>
        
        <!-- Primary method: Magic link -->
        <div style="background:#f0f9ff;border:1px solid #0ea5e9;border-radius:8px;padding:16px;margin:16px 0">
          <h3 style="color:#0369a1;margin:0 0 8px;font-size:16px">Method 1: Click the magic link</h3>
          <p style="color:#444;margin:0 0 12px;font-size:14px">Click the button below to sign in instantly:</p>
          <p style="margin:0 0 12px"><a href="${url}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:500">Sign in to ${appName}</a></p>
          <p style="color:#666;font-size:12px;margin:0">This link expires in 15 minutes.</p>
        </div>

        ${code ? `
          <!-- Fallback method: 6-digit code -->
          <div style="background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;padding:16px;margin:16px 0">
            <h3 style="color:#495057;margin:0 0 8px;font-size:16px">Method 2: Use the 6-digit code</h3>
            <p style="color:#666;margin:0 0 8px;font-size:14px">If you can't use the link above, enter this code in the waiting tab:</p>
            <div style="background:#fff;border:2px solid #4f46e5;border-radius:8px;padding:16px;text-align:center;margin:12px 0">
              <p style="font-size:32px;font-weight:bold;color:#4f46e5;margin:0;letter-spacing:4px;font-family:monospace">${code}</p>
            </div>
            <p style="color:#666;font-size:12px;margin:0">This code also expires in 15 minutes.</p>
          </div>
        ` : ''}

        <!-- Instructions for mobile users -->
        <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin:16px 0">
          <h3 style="color:#856404;margin:0 0 8px;font-size:16px">📱 Using mobile email app?</h3>
          <p style="color:#856404;margin:0 0 8px;font-size:14px">If you're using Gmail, Outlook, or another email app on your phone:</p>
          <ol style="color:#856404;margin:0;padding-left:20px;font-size:14px">
            <li>Tap the "Sign in" button above</li>
            <li>Or use the 6-digit code method instead</li>
          </ol>
        </div>

        <!-- Troubleshooting -->
        <div style="border-top:1px solid #eee;padding-top:16px;margin-top:16px">
          <p style="color:#666;font-size:12px;margin:0 0 8px">If the button doesn't work, copy and paste this URL into your browser:</p>
          <p style="word-break:break-all;font-size:12px;color:#111;background:#f8f9fa;padding:8px;border-radius:4px;margin:0">${url}</p>
        </div>

        ${supportEmail ? `<p style="color:#666;font-size:12px;margin-top:16px">Need help? Contact <a href="mailto:${supportEmail}">${supportEmail}</a></p>` : ''}
      </div>
    `;
  }
}

export const emailService = new EmailService();

