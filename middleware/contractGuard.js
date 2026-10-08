const crypto = require('crypto');
const axios = require('axios');

/**
 * Anti-spam guard for the contract signing flow.
 *
 * Layers (all enforced server-side, so bots that POST straight to the API are stopped):
 *  1. Signed form token  - issued by GET /api/contract-token, HMAC-signed, must be at least
 *                          MIN_FILL_MS old (humans read a contract) and at most MAX_AGE_MS old.
 *  2. Honeypot           - hidden `website` field must be empty.
 *  3. Origin check       - Origin/Referer must be our own site when present.
 *  4. Rate limits        - per IP and per email address (each submission emails the client via DocuSeal).
 *  5. Turnstile          - Cloudflare Turnstile, enforced only when TURNSTILE_SECRET_KEY is set.
 *
 * Env:
 *  - CONTRACT_TOKEN_SECRET (falls back to WEBHOOK_SECRET_TOKEN, then a per-process random secret)
 *  - TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY (optional)
 */

const SECRET = process.env.CONTRACT_TOKEN_SECRET
  || process.env.WEBHOOK_SECRET_TOKEN
  || crypto.randomBytes(32).toString('hex');

const MIN_FILL_MS = 20 * 1000;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;
const IP_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };
const EMAIL_LIMIT = { max: 2, windowMs: 24 * 60 * 60 * 1000 };
const ALLOWED_HOSTS = new Set([
  'fishtownwebdesign.com',
  'www.fishtownwebdesign.com',
  'localhost',
  'localhost:7000'
]);

const sign = (payload) => crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');

function issueToken() {
  const payload = `${Date.now()}.${crypto.randomBytes(8).toString('hex')}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (typeof token !== 'string') return { ok: false, reason: 'missing' };
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(parts[2]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) {
    return { ok: false, reason: 'bad-signature' };
  }
  const age = Date.now() - Number(parts[0]);
  if (!(age >= 0)) return { ok: false, reason: 'future' };
  if (age < MIN_FILL_MS) return { ok: false, reason: 'too-fast' };
  if (age > MAX_AGE_MS) return { ok: false, reason: 'expired' };
  return { ok: true };
}

// Tokens are single-use: remember spent ones until they would expire anyway.
const spentTokens = new Map();
// key -> [timestamps]
const hits = new Map();

function overLimit(key, { max, windowMs }) {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  hits.set(key, recent);
  return recent.length >= max;
}

function record(key) {
  const list = hits.get(key) || [];
  list.push(Date.now());
  hits.set(key, list);
}

setInterval(() => {
  const now = Date.now();
  for (const [token, t] of spentTokens) if (now - t > MAX_AGE_MS) spentTokens.delete(token);
  for (const [key, list] of hits) {
    const recent = list.filter((t) => now - t < EMAIL_LIMIT.windowMs);
    if (recent.length) hits.set(key, recent); else hits.delete(key);
  }
}, 10 * 60 * 1000).unref();

const JUNK = /^(test|testing|fake|asdf|qwerty|none|n\/a|na|abc|xxx+|a+|1+)$/i;
const JUNK_WORDS = /\b(test|testing|fake|asdf|qwerty|lorem|ipsum|abc123|sample|dummy)\b/i;

// Returns an error message for obviously fake details, or null if they look plausible.
function validateContent(body) {
  const name = String(body.client_name || '').trim();
  const address = String(body.business_address || '').trim();
  const phoneDigits = String(body.client_phone || '').replace(/\D/g, '');
  const local = String(body.client_email || '').split('@')[0];

  const nameWords = name.split(/\s+/).filter(Boolean);
  if (nameWords.length < 2 || nameWords.some((w) => JUNK.test(w)) || /[\d@/\\<>]|https?:/i.test(name)) {
    return 'Please enter your full first and last name.';
  }
  if (address.length < 8 || !/\d/.test(address) || !/\s/.test(address) || JUNK_WORDS.test(address)) {
    return 'Please enter your full street address, including street number, city and state.';
  }
  let phone = phoneDigits;
  if (phone.length === 11 && phone[0] === '1') phone = phone.slice(1);
  if (phone.length !== 10 || /^[01]/.test(phone) || /^(\d)\1+$/.test(phone) || /1234567|7654321|123123/.test(phone)) {
    return 'Please enter a valid 10-digit phone number.';
  }
  if (JUNK_WORDS.test(local) || JUNK_WORDS.test(String(body.business_name || ''))) {
    return 'Please use your real contact details.';
  }
  return null;
}

function originAllowed(req) {
  const source = req.get('origin') || req.get('referer');
  if (!source) return false;
  try {
    return ALLOWED_HOSTS.has(new URL(source).host);
  } catch (e) {
    return false;
  }
}

async function verifyTurnstile(token, ip) {
  try {
    const params = new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token || '',
      remoteip: ip || ''
    });
    const res = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 }
    );
    return !!res.data?.success;
  } catch (e) {
    return false;
  }
}

function tokenHandler(req, res) {
  res.set('Cache-Control', 'no-store');
  res.json({
    token: issueToken(),
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || null
  });
}

function guard(logger) {
  return async (req, res, next) => {
    const ip = req.ip;
    const body = req.body || {};
    const email = String(body.client_email || '').trim().toLowerCase();
    const block = (reason, status = 400, message = 'We could not verify your submission. Please reload the page and try again.') => {
      logger.warn('Contract submission blocked', { reason, ip, email: email ? '***' : null });
      return res.status(status).json({ success: false, message });
    };

    // Honeypot: pretend success so bots don't adapt.
    if (body.website) {
      logger.warn('Contract honeypot tripped', { ip });
      return res.status(200).json({ success: true, message: 'OK' });
    }

    if (!originAllowed(req)) return block('bad-origin', 403);

    const contentError = validateContent(body);
    if (contentError) return block('junk-content', 400, contentError);

    if (overLimit(`ip:${ip}`, IP_LIMIT)) {
      return block('ip-rate-limit', 429, 'Too many attempts. Please try again later or email help@fishtownwebdesign.com.');
    }
    if (email && overLimit(`email:${email}`, EMAIL_LIMIT)) {
      return block('email-rate-limit', 429, 'A contract was already sent to this email. Please check your inbox or contact help@fishtownwebdesign.com.');
    }

    const verdict = verifyToken(body.form_token);
    if (!verdict.ok) return block(`token-${verdict.reason}`);
    if (spentTokens.has(body.form_token)) return block('token-reused');

    if (process.env.TURNSTILE_SECRET_KEY) {
      if (!(await verifyTurnstile(body.turnstile_token, ip))) return block('turnstile-failed');
    }

    // Count the attempt only after it passed every check but before DocuSeal is called,
    // so bots can't burn the limit for real users' emails with junk requests.
    spentTokens.set(body.form_token, Date.now());
    record(`ip:${ip}`);
    if (email) record(`email:${email}`);
    next();
  };
}

module.exports = { guard, tokenHandler };
