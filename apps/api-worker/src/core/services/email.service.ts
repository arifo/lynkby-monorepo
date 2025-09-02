import { logger } from "../util/logger";

export interface SendMagicLinkParams {
  to: string;
  url: string;
  from: string;
  supportEmail?: string;
  appName?: string;
  provider: 'resend';
  apiKey: string;
}

class EmailService {
  async sendMagicLinkEmail(params: SendMagicLinkParams): Promise<void> {
    const { to, url, from, supportEmail, appName = 'Lynkby', provider, apiKey } = params;

    const subject = `${appName}: Your sign-in link`;
    const text = `Sign in to ${appName} by clicking the link below.\n\n${url}\n\nThis link expires in 15 minutes. If you didn't request this, you can ignore this email.\n\nNeed help? ${supportEmail || ''}`;
    const html = this.renderMagicLinkHTML({ appName, url, supportEmail });

    if (provider === 'resend') {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@lynkby.com',
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
      logger.info('Magic link email sent via Resend', { to });
      return;
    }

    throw new Error('Unsupported email provider');
  }

  private renderMagicLinkHTML({ appName, url, supportEmail }: { appName: string; url: string; supportEmail?: string }) {
    return `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;max-width:520px;margin:24px auto;padding:24px;border:1px solid #eee;border-radius:12px">
        <h1 style="font-size:20px;margin:0 0 12px">Sign in to ${appName}</h1>
        <p style="color:#444;margin:0 0 16px">Click the button below to sign in. This link expires in 15 minutes.</p>
        <p style="margin:0 0 24px"><a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Sign in</a></p>
        <p style="color:#666;font-size:12px;margin:16px 0">If the button doesn't work, copy and paste this URL into your browser:</p>
        <p style="word-break:break-all;font-size:12px;color:#111">${url}</p>
        ${supportEmail ? `<p style="color:#666;font-size:12px;margin-top:16px">Need help? Contact <a href="mailto:${supportEmail}">${supportEmail}</a></p>` : ''}
      </div>
    `;
  }
}

export const emailService = new EmailService();

