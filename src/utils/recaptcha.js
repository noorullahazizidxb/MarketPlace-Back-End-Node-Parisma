/**
 * Google reCAPTCHA v3 siteverify helper.
 * Requires RECAPTCHA_SECRET_KEY. When unset in development, verification is skipped with a warning.
 */
const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const DEFAULT_MIN_SCORE = 0.5;

export async function verifyRecaptchaToken(token, {
  secret = process.env.RECAPTCHA_SECRET_KEY,
  minScore = Number(process.env.RECAPTCHA_MIN_SCORE || DEFAULT_MIN_SCORE),
  expectedAction,
  remoteip,
} = {}) {
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      const err = new Error('reCAPTCHA is not configured');
      err.status = 503;
      throw err;
    }
    console.warn('[recaptcha] RECAPTCHA_SECRET_KEY unset — skipping verify (non-production)');
    return { success: true, score: 1, action: expectedAction || 'skip', skipped: true };
  }

  if (!token || typeof token !== 'string') {
    const err = new Error('reCAPTCHA token is required');
    err.status = 400;
    throw err;
  }

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (remoteip) body.set('remoteip', remoteip);

  const response = await fetch(SITEVERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await response.json().catch(() => null);
  if (!data?.success) {
    const err = new Error('reCAPTCHA verification failed');
    err.status = 400;
    err.details = data?.['error-codes'] || [];
    throw err;
  }
  if (typeof data.score === 'number' && data.score < minScore) {
    const err = new Error('reCAPTCHA score too low');
    err.status = 400;
    throw err;
  }
  if (expectedAction && data.action && data.action !== expectedAction) {
    const err = new Error('reCAPTCHA action mismatch');
    err.status = 400;
    throw err;
  }
  return data;
}
