/**
 * security-alert.service.ts
 *
 * Central pipeline for all suspected attacks / anomalies.
 * Every security event flows through `recordSecurityEvent()` which:
 *   1. Persists the event to Postgres (security_events table)
 *   2. Broadcasts it to the admin WebSocket room (live dashboard)
 *   3. Emails platform admins for HIGH / CRITICAL severity
 *
 * Email flood-control: we dedupe HIGH+ emails per (eventType, ipAddress)
 * using Redis so a single attack doesn't spam admins with 100+ emails.
 */

import { Request } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';
import redis from '../config/redis';
import { getIO } from '../config/socket';
import { sendTransactionalEmail } from './email.service';

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EventType =
  | 'BRUTE_FORCE_LOGIN'          // Repeated failed password logins
  | 'OTP_BOMB'                   // OTP request flood
  | 'OTP_FAILURE_SPREE'          // Repeated wrong OTP codes
  | 'ROLE_ESCALATION'            // A user was promoted to ADMIN/SUPER_ADMIN
  | 'ADMIN_CREATED'              // A new admin account was created
  | 'ADMIN_DELETED'              // An admin account was deleted
  | 'SUSPICIOUS_REQUEST'         // SQLi / XSS / path-traversal probe detected
  | 'RATE_LIMIT_HIT'             // An IP hit the global rate limiter
  | 'AUTH_RATE_LIMIT_HIT'        // An IP hit the tighter auth limiter
  | 'PAYMENT_WEBHOOK_BAD_SIG'    // Paystack / Hubtel webhook with bad signature
  | 'UNAUTHORIZED_ADMIN_ACCESS'  // Non-admin tried to hit /api/admin/*
  | 'IMPERSONATION_STARTED'      // Support started impersonating a user
  | 'MAINTENANCE_TOGGLED'        // Maintenance mode was toggled
  | 'PAYMENT_SETTINGS_CHANGED'   // Gateway credentials were modified
  | 'MANUAL';                    // Recorded manually by an admin

export interface RecordEventInput {
  eventType: EventType | string;
  severity: Severity;
  message: string;
  source?: string;              // app | rate-limit | webhook | middleware | scheduler
  ipAddress?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  userAgent?: string | null;
  endpoint?: string | null;
  method?: string | null;
  details?: Record<string, unknown>;
  req?: Request;                // Optional: auto-populate IP/UA/endpoint/method
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function extractRequestContext(req?: Request) {
  if (!req) return {};
  // Respect X-Forwarded-For (behind nginx/Cloudflare). req.ip already
  // honours `trust proxy` if configured; fall back to socket addr.
  const xff = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  const ip = xff || req.ip || req.socket?.remoteAddress || undefined;
  return {
    ipAddress: ip,
    userAgent: req.headers['user-agent']?.toString(),
    endpoint: req.originalUrl || req.url,
    method: req.method,
  };
}

/**
 * Dedupe email alerts so a flood of the same event-type from one IP
 * does not send hundreds of emails. TTL = 10 minutes.
 * Returns true if this is the first alert in the window (=> send email).
 */
async function shouldSendEmail(eventType: string, ipAddress?: string | null): Promise<boolean> {
  try {
    const key = `security:alert:${eventType}:${ipAddress || 'unknown'}`;
    // SETNX-style guard
    const res = await redis.set(key, '1', 'EX', 600, 'NX');
    return res === 'OK';
  } catch (err) {
    // If Redis is down we DO send the email – safer to over-notify than miss a real attack.
    logger.warn('Security dedupe check failed, sending email anyway', { err });
    return true;
  }
}

/**
 * Return the list of admin emails that should receive HIGH+ alerts.
 * Falls back to the site settings `email` if no admin accounts have emails.
 */
async function getAdminRecipients(): Promise<string[]> {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        status: 'ACTIVE',
        email: { not: null },
      },
      select: { email: true },
    });
    const emails = admins.map((a) => a.email!).filter(Boolean);
    if (emails.length > 0) return emails;

    // Fallback: site settings contact email
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { email: true },
    });
    if (settings?.email) return [settings.email];
  } catch (err) {
    logger.error('Failed to resolve security alert recipients', { err });
  }
  return [];
}

function severityColor(sev: Severity): string {
  switch (sev) {
    case 'CRITICAL': return '#7f1d1d';
    case 'HIGH':     return '#b91c1c';
    case 'MEDIUM':   return '#ca8a04';
    default:         return '#475569';
  }
}

function renderEmail(input: RecordEventInput & { id: string; createdAt: Date }): string {
  const colour = severityColor(input.severity);
  const rows: Array<[string, string]> = [
    ['Event',     input.eventType],
    ['Severity',  input.severity],
    ['Source',    input.source || 'app'],
    ['IP',        input.ipAddress || '—'],
    ['User',      input.userEmail || input.userId || '—'],
    ['Endpoint',  `${input.method || ''} ${input.endpoint || '—'}`],
    ['User-Agent', (input.userAgent || '—').slice(0, 120)],
    ['Time',      input.createdAt.toISOString()],
  ];
  const tableRows = rows.map(
    ([k, v]) => `<tr><td style="padding:6px 12px;color:#64748b;font-size:13px">${k}</td>`
              + `<td style="padding:6px 12px;font-family:monospace;font-size:13px">${escapeHtml(v)}</td></tr>`
  ).join('');

  const details = input.details
    ? `<pre style="background:#0f172a;color:#e2e8f0;padding:12px;border-radius:6px;overflow:auto;font-size:12px">${escapeHtml(JSON.stringify(input.details, null, 2))}</pre>`
    : '';

  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto">
      <div style="background:${colour};color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
        <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.8">GroomLink Security Alert</div>
        <div style="font-size:20px;font-weight:700;margin-top:4px">${escapeHtml(input.message)}</div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;padding:20px;border-radius:0 0 8px 8px">
        <table style="width:100%;border-collapse:collapse">${tableRows}</table>
        ${details}
        <div style="margin-top:18px">
          <a href="https://dash.groomlinkgh.com/security?event=${input.id}"
             style="background:#0f172a;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px">
             Open in Admin Dashboard
          </a>
        </div>
        <p style="color:#64748b;font-size:12px;margin-top:20px;line-height:1.5">
          You received this because your account has the ADMIN or SUPER_ADMIN role on GroomLink.
          To stop receiving these, ask a super admin to change your role or remove your email.
        </p>
      </div>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------
// Public API
// ---------------------------------------------------------------

/**
 * Record a security event. This is the ONLY entry point triggers should call.
 * Never throws – failures are logged and swallowed so app flow is never broken
 * by the alerting pipeline itself.
 */
export async function recordSecurityEvent(input: RecordEventInput): Promise<void> {
  try {
    const reqCtx = extractRequestContext(input.req);
    const data = {
      eventType: input.eventType,
      severity: input.severity,
      source: input.source || 'app',
      ipAddress: input.ipAddress ?? reqCtx.ipAddress ?? null,
      userId: input.userId ?? null,
      userEmail: input.userEmail ?? null,
      userAgent: input.userAgent ?? reqCtx.userAgent ?? null,
      endpoint: input.endpoint ?? reqCtx.endpoint ?? null,
      method: input.method ?? reqCtx.method ?? null,
      message: input.message,
      details: (input.details ?? undefined) as any,
    };

    // 1. Persist
    const event = await prisma.securityEvent.create({ data });

    // 2. Live broadcast to admins (dashboard badge + toast)
    try {
      const io = getIO();
      io.to('role:admin').emit('security:event', event);
    } catch (_) {
      // getIO throws before initialiseSocket – ignore in tests
    }

    // 3. Email for HIGH+ severity (deduped per event-type + IP)
    if (data.severity === 'HIGH' || data.severity === 'CRITICAL') {
      const shouldSend = await shouldSendEmail(data.eventType, data.ipAddress);
      if (shouldSend) {
        const recipients = await getAdminRecipients();
        if (recipients.length > 0) {
          const html = renderEmail({ ...input, ...data, id: event.id, createdAt: event.createdAt });
          const subject = `[${data.severity}] GroomLink Security Alert — ${data.eventType}`;
          // Send in parallel; don't await the inner sends to block callers
          await Promise.all(recipients.map((to) =>
            sendTransactionalEmail(to, subject, html).catch((e) =>
              logger.warn('Security email failed', { to, err: e?.message }))
          ));
        } else {
          logger.warn('Security HIGH+ event: no admin recipients resolved', { eventType: data.eventType });
        }
      }
    }

    logger.info('Security event recorded', {
      id: event.id,
      eventType: data.eventType,
      severity: data.severity,
      ip: data.ipAddress,
    });
  } catch (err) {
    logger.error('recordSecurityEvent failed', { err, input });
    // Never rethrow – alerting must not break the request path.
  }
}

// ---------------------------------------------------------------
// Counter-based triggers (sliding window in Redis)
// ---------------------------------------------------------------

/**
 * Increment a Redis counter with a TTL. Returns the new count.
 */
async function incrWindow(key: string, windowSec: number): Promise<number> {
  try {
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, windowSec);
    return n;
  } catch (err) {
    logger.warn('Security counter incr failed', { key, err });
    return 0;
  }
}

/**
 * Called on every failed login. Raises BRUTE_FORCE_LOGIN when >= 5 failures
 * from the same IP within 5 minutes.
 */
export async function recordFailedLogin(opts: {
  ipAddress?: string | null;
  identifier: string;                 // phone number or email used
  reason: string;
  req?: Request;
}): Promise<void> {
  const ip = opts.ipAddress || extractRequestContext(opts.req).ipAddress || 'unknown';
  const count = await incrWindow(`sec:login:fail:${ip}`, 5 * 60);
  if (count === 5 || count === 10 || count === 25) {
    await recordSecurityEvent({
      eventType: 'BRUTE_FORCE_LOGIN',
      severity: count >= 25 ? 'CRITICAL' : count >= 10 ? 'HIGH' : 'MEDIUM',
      message: `${count} failed login attempts from ${ip} in 5 min (latest: ${opts.identifier})`,
      ipAddress: ip,
      req: opts.req,
      details: { count, identifier: opts.identifier, reason: opts.reason },
    });
  }
}

/**
 * Called on every OTP request. Raises OTP_BOMB at 10+ per 5 min per IP.
 */
export async function recordOtpRequest(opts: {
  ipAddress?: string | null;
  identifier: string;                 // phone or email
  req?: Request;
}): Promise<void> {
  const ip = opts.ipAddress || extractRequestContext(opts.req).ipAddress || 'unknown';
  const count = await incrWindow(`sec:otp:req:${ip}`, 5 * 60);
  if (count === 10 || count === 20 || count === 50) {
    await recordSecurityEvent({
      eventType: 'OTP_BOMB',
      severity: count >= 50 ? 'CRITICAL' : count >= 20 ? 'HIGH' : 'MEDIUM',
      message: `${count} OTP requests from ${ip} in 5 min (latest target: ${opts.identifier})`,
      ipAddress: ip,
      req: opts.req,
      details: { count, identifier: opts.identifier },
    });
  }
}

/**
 * Called on every wrong OTP verification. Raises OTP_FAILURE_SPREE at 5+ per 5 min.
 */
export async function recordOtpFailure(opts: {
  ipAddress?: string | null;
  identifier: string;
  req?: Request;
}): Promise<void> {
  const ip = opts.ipAddress || extractRequestContext(opts.req).ipAddress || 'unknown';
  const count = await incrWindow(`sec:otp:fail:${ip}`, 5 * 60);
  if (count === 5 || count === 15) {
    await recordSecurityEvent({
      eventType: 'OTP_FAILURE_SPREE',
      severity: count >= 15 ? 'HIGH' : 'MEDIUM',
      message: `${count} wrong OTP codes from ${ip} in 5 min (target: ${opts.identifier})`,
      ipAddress: ip,
      req: opts.req,
      details: { count, identifier: opts.identifier },
    });
  }
}

/**
 * Called when any admin/super-admin is created. Always CRITICAL.
 */
export async function recordAdminCreated(opts: {
  newAdminId: string;
  newAdminEmail?: string | null;
  newAdminRole: string;
  performedBy?: string | null;
  req?: Request;
}): Promise<void> {
  await recordSecurityEvent({
    eventType: 'ADMIN_CREATED',
    severity: 'CRITICAL',
    message: `New ${opts.newAdminRole} account created${opts.newAdminEmail ? ` (${opts.newAdminEmail})` : ''}`,
    userId: opts.newAdminId,
    userEmail: opts.newAdminEmail || null,
    req: opts.req,
    details: { performedBy: opts.performedBy, role: opts.newAdminRole },
  });
}

/**
 * Called when an existing user is promoted to ADMIN or SUPER_ADMIN.
 */
export async function recordRoleEscalation(opts: {
  targetUserId: string;
  targetEmail?: string | null;
  fromRole: string;
  toRole: string;
  performedBy?: string | null;
  req?: Request;
}): Promise<void> {
  await recordSecurityEvent({
    eventType: 'ROLE_ESCALATION',
    severity: 'CRITICAL',
    message: `User ${opts.targetEmail || opts.targetUserId} role changed ${opts.fromRole} → ${opts.toRole}`,
    userId: opts.targetUserId,
    userEmail: opts.targetEmail || null,
    req: opts.req,
    details: opts,
  });
}

/**
 * Called when a payment webhook arrives with an invalid signature.
 */
export async function recordBadWebhookSignature(opts: {
  provider: string;
  ipAddress?: string | null;
  reason?: string;
  req?: Request;
}): Promise<void> {
  await recordSecurityEvent({
    eventType: 'PAYMENT_WEBHOOK_BAD_SIG',
    severity: 'HIGH',
    message: `${opts.provider} webhook received with INVALID signature`,
    ipAddress: opts.ipAddress ?? null,
    req: opts.req,
    source: 'webhook',
    details: { provider: opts.provider, reason: opts.reason },
  });
}
