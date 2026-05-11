/**
 * securityProbe.ts
 *
 * Lightweight request middleware that scans the URL path, query string and
 * request body for classic attack probe patterns (SQL injection, XSS, path
 * traversal, shell / env leakage). It does NOT block the request – it
 * records a SUSPICIOUS_REQUEST security event and lets the downstream
 * validation / auth layers handle the actual rejection.
 *
 * Keeping the detector permissive means legitimate traffic is never broken
 * by a false positive, and the admin dashboard gets a reliable signal of
 * who's probing us.
 */

import { NextFunction, Request, Response } from 'express';
import { recordSecurityEvent } from '../services/security-alert.service';

// Compiled once at startup.
const PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'sql_union',           re: /\bunion\s+select\b/i },
  { name: 'sql_boolean',         re: /\b(or|and)\s+1\s*=\s*1\b/i },
  { name: 'sql_sleep',           re: /\b(sleep|benchmark|pg_sleep)\s*\(/i },
  { name: 'sql_comment_probe',   re: /(--\s|#\s|\/\*|\*\/).*(drop|delete|update|insert)\b/i },
  { name: 'xss_script_tag',      re: /<\s*script[\s>]/i },
  { name: 'xss_on_handler',      re: /\bon(error|load|click|mouseover)\s*=/i },
  { name: 'xss_javascript_url',  re: /javascript:\s*[^\s]/i },
  { name: 'path_traversal',      re: /\.\.(\/|\\){2,}|(\/|\\)etc(\/|\\)passwd/i },
  { name: 'env_leak_probe',      re: /\.env\b|\/\.git\/|wp-admin|phpmyadmin|\.sql\b/i },
  { name: 'cmd_injection',       re: /[;&|`$]\s*(cat|wget|curl|nc|bash|sh|chmod|rm)\s/i },
];

// Static asset / upload paths – don't match against binary bodies.
const SKIP_PATHS = [/^\/uploads\//, /^\/api\/uploads\//, /^\/favicon/];

function scan(value: string): string | null {
  for (const { name, re } of PATTERNS) {
    if (re.test(value)) return name;
  }
  return null;
}

function safeStringify(obj: unknown, limit = 4000): string {
  try {
    const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return s.length > limit ? s.slice(0, limit) : s;
  } catch {
    return '';
  }
}

export function securityProbe(req: Request, _res: Response, next: NextFunction): void {
  try {
    const url = req.originalUrl || req.url || '';
    if (SKIP_PATHS.some((re) => re.test(url))) return next();

    // Compose a single haystack from URL + body (bodies already parsed by express.json)
    const haystack = [
      url,
      req.body ? safeStringify(req.body) : '',
    ].join(' \u0001 ');

    const match = scan(haystack);
    if (match) {
      // Fire-and-forget – don't hold up the request.
      recordSecurityEvent({
        eventType: 'SUSPICIOUS_REQUEST',
        severity: 'HIGH',
        source: 'middleware',
        message: `Suspicious request pattern detected: ${match}`,
        req,
        details: {
          pattern: match,
          url,
          bodyPreview: safeStringify(req.body, 500),
        },
      }).catch(() => { /* swallow */ });
    }
  } catch {
    // Never let the detector break requests
  }
  next();
}
