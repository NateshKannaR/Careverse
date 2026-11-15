import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/index.js';
import { db } from '../db/storageAdapter.js';
import { NotificationRecord } from '../types/index.js';

let resendClient: Resend | null = null;
if (config.resendApiKey) {
  resendClient = new Resend(config.resendApiKey);
}

export interface SendEmailOptions {
  recipientEmail: string;
  recipientId: string;
  patientId?: string;
  type: NotificationRecord['type'];
  subject: string;
  htmlContent: string;
  textContent: string;
  metadata?: Record<string, any>;
  dedupHash?: string;
}

export interface EmailDeliveryResult {
  success: boolean;
  provider: 'resend' | 'simulator';
  status: 'sent' | 'simulated' | 'failed' | 'pending';
  notificationId: string;
  message: string;
}

export class EmailService {
  /**
   * Dispatches email via Resend if credentials present, or logs to development simulator.
   * Adheres strictly to rule: Never claim an email was delivered unless the provider confirms delivery.
   */
  public static async sendEmail(opts: SendEmailOptions): Promise<EmailDeliveryResult> {
    const notificationId = uuidv4();
    const scheduledFor = new Date().toISOString();

    // Check notification preferences
    const prefs = db.getNotificationPreferences(opts.recipientId);
    if (prefs && !prefs.email_enabled && opts.type !== 'emergency_sos') {
      console.log(`[EmailService] User ${opts.recipientId} has disabled email notifications.`);
      return {
        success: false,
        provider: 'simulator',
        status: 'simulated',
        notificationId,
        message: 'Notification skipped per user preferences.'
      };
    }

    // Check deduplication
    if (opts.dedupHash) {
      const existing = db.getAllNotifications().find(n => n.dedup_hash === opts.dedupHash);
      if (existing) {
        return {
          success: true,
          provider: 'simulator',
          status: existing.status,
          notificationId: existing.id,
          message: 'Notification already sent (deduplicated).'
        };
      }
    }

    if (resendClient && config.resendApiKey) {
      try {
        const response = await resendClient.emails.send({
          from: config.resendFromEmail,
          to: opts.recipientEmail,
          subject: opts.subject,
          html: opts.htmlContent,
          text: opts.textContent
        });

        if (response.error) {
          console.error('[EmailService] Resend API error:', response.error);
          const notification = db.createNotification({
            id: notificationId,
            recipient_id: opts.recipientId,
            patient_id: opts.patientId,
            type: opts.type,
            title: opts.subject,
            message: opts.textContent,
            channel: 'email',
            status: 'failed',
            scheduled_for: scheduledFor,
            dedup_hash: opts.dedupHash,
            metadata: { error: response.error, ...opts.metadata }
          });
          return {
            success: false,
            provider: 'resend',
            status: 'failed',
            notificationId: notification.id,
            message: response.error.message
          };
        }

        const notification = db.createNotification({
          id: notificationId,
          recipient_id: opts.recipientId,
          patient_id: opts.patientId,
          type: opts.type,
          title: opts.subject,
          message: opts.textContent,
          channel: 'email',
          status: 'sent',
          scheduled_for: scheduledFor,
          sent_at: new Date().toISOString(),
          dedup_hash: opts.dedupHash,
          metadata: { resendId: response.data?.id, ...opts.metadata }
        });

        return {
          success: true,
          provider: 'resend',
          status: 'sent',
          notificationId: notification.id,
          message: 'Delivered via Resend.'
        };
      } catch (err: any) {
        console.error('[EmailService] Exception sending via Resend:', err);
        const notification = db.createNotification({
          id: notificationId,
          recipient_id: opts.recipientId,
          patient_id: opts.patientId,
          type: opts.type,
          title: opts.subject,
          message: opts.textContent,
          channel: 'email',
          status: 'failed',
          scheduled_for: scheduledFor,
          dedup_hash: opts.dedupHash,
          metadata: { error: err.message, ...opts.metadata }
        });
        return {
          success: false,
          provider: 'resend',
          status: 'failed',
          notificationId: notification.id,
          message: err.message
        };
      }
    } else {
      // Development mode notification simulator
      const notification = db.createNotification({
        id: notificationId,
        recipient_id: opts.recipientId,
        patient_id: opts.patientId,
        type: opts.type,
        title: `[Simulated] ${opts.subject}`,
        message: opts.textContent,
        channel: 'email',
        status: 'simulated',
        scheduled_for: scheduledFor,
        sent_at: new Date().toISOString(),
        dedup_hash: opts.dedupHash,
        metadata: {
          simulated: true,
          recipientEmail: opts.recipientEmail,
          htmlPreview: opts.htmlContent,
          ...opts.metadata
        }
      });

      console.log(`[EmailService:Simulator] Dispatched simulated email to ${opts.recipientEmail}: "${opts.subject}"`);

      return {
        success: true,
        provider: 'simulator',
        status: 'simulated',
        notificationId: notification.id,
        message: 'Dispatched to development notification simulator.'
      };
    }
  }

  /**
   * Helper to construct formatted healthcare email template
   */
  public static buildEmailHtml(title: string, bodyContent: string, safetyNotice?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
          .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
          .header { background: #0d9488; padding: 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.9; }
          .content { padding: 32px 24px; }
          .safety-box { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px; margin-top: 24px; border-radius: 6px; font-size: 13px; color: #92400e; }
          .footer { background: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CAREVERSE</h1>
            <p>Your Health. Your Family. One Connected Circle.</p>
          </div>
          <div class="content">
            <h2 style="margin-top:0; color:#0f172a; font-size:18px;">${title}</h2>
            <div>${bodyContent}</div>
            ${
              safetyNotice
                ? `<div class="safety-box"><strong>Important Clinical Safety Note:</strong> ${safetyNotice}</div>`
                : ''
            }
          </div>
          <div class="footer">
            <p>Sent securely by CAREVERSE Intelligent Healthcare Ecosystem.</p>
            <p>To update your notification preferences, log in to your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
