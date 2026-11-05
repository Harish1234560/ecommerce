import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';
import type { EmailContent } from '../emails/templates.js';
import { getSettings } from './settings.service.js';
import { logger } from '../utils/logger.js';

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

export const emailConfigured = transporter !== null;

// Sends an email if SMTP is configured; otherwise logs it. Never throws — email must not break a request.
export async function sendEmail(to: string, template: string, content: EmailContent, opts: { force?: boolean } = {}) {
  try {
    const settings = await getSettings();
    if (!opts.force && !settings.notifications.emailEnabled) return;
    if (!transporter) {
      logger.info('Email not sent (SMTP not configured)', { to, subject: content.subject });
      await prisma.emailLog.create({ data: { to, subject: content.subject, template, status: 'logged' } });
      return;
    }
    await transporter.sendMail({ from: env.EMAIL_FROM, to, subject: content.subject, html: content.html });
    await prisma.emailLog.create({ data: { to, subject: content.subject, template, status: 'sent' } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Email delivery failed', err, { to, template });
    await prisma.emailLog
      .create({ data: { to, subject: content.subject, template, status: 'failed', error: message.slice(0, 500) } })
      .catch(() => {});
  }
}
