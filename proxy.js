// vpota-password-gate v1 — marker dùng bởi apply-gate.ps1 / set-gate-password.ps1, đừng xoá
/**
 * Password gate cho prototype VP-OTA chạy trên Next.js (Vercel).
 *
 * Next.js 16+  → lưu file này thành `proxy.js` ở root repo (cạnh package.json).
 * Next.js 15-  → lưu thành `middleware.js` và đổi `export function proxy` thành
 *                `export function middleware`.
 *
 * Logic giống hệt `middleware.js` bản static, chỉ khác cách cho request đi tiếp:
 * ở đây dùng NextResponse.next() thay cho header x-middleware-next.
 *
 * Đổi password: chạy `set-gate-password.ps1`.
 */

import { NextResponse } from 'next/server';

const SITE_NAME = 'Combo Prototype';
const SALT = 'vpota-gate-v1';
const PASSWORD_HASH =
  '8768dd82debf7da5d491050d6989f76472273679f4adfd343759f99dcbb9de0b';

const COOKIE_NAME = 'vpota_gate';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const GATE_PATH = '/__gate';

export const config = { matcher: '/((?!_next/static|_next/image).*)' };

export async function proxy(request) {
  const url = new URL(request.url);

  if (url.pathname === `${GATE_PATH}/logout`) {
    const response = NextResponse.redirect(new URL('/', request.url), 303);
    response.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
    return response;
  }

  if (url.pathname === GATE_PATH && request.method === 'POST') {
    const form = await request.formData();
    const next = safePath(form.get('next'));
    const submitted = await sha256(`${SALT}:${String(form.get('password') || '')}`);

    if (!timingSafeEqual(submitted, PASSWORD_HASH)) {
      return loginPage(next, true);
    }

    const response = NextResponse.redirect(new URL(next, request.url), 303);
    response.cookies.set(COOKIE_NAME, await sessionToken(), {
      path: '/',
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });
    return response;
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie && timingSafeEqual(cookie, await sessionToken())) {
    return NextResponse.next();
  }

  return loginPage(safePath(url.pathname + url.search), false);
}

async function sha256(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sessionToken() {
  return sha256(`${PASSWORD_HASH}:cookie-v1`);
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function safePath(value) {
  const path = typeof value === 'string' ? value : '';
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith(GATE_PATH)) return '/';
  return path;
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}

function loginPage(next, failed) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(SITE_NAME)} — Protected</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 24px; background: #f8fafc;
    background-image: radial-gradient(circle at 15% 15%, #e0e7ff 0%, transparent 45%),
                      radial-gradient(circle at 85% 85%, #ede9fe 0%, transparent 45%);
    font-family: Inter, -apple-system, "Segoe UI", Roboto, sans-serif; color: #0f172a;
  }
  .card {
    width: 100%; max-width: 380px; background: #fff; border: 1px solid #e2e8f0;
    border-radius: 16px; padding: 32px; box-shadow: 0 12px 32px rgba(15, 23, 42, .08);
  }
  .mark {
    width: 44px; height: 44px; border-radius: 12px; background: #312e81; color: #fff;
    display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 20px;
  }
  h1 { margin: 0 0 6px; font-size: 19px; font-weight: 600; letter-spacing: -.01em; }
  p.sub { margin: 0 0 24px; font-size: 13.5px; line-height: 1.5; color: #64748b; }
  label { display: block; font-size: 12.5px; font-weight: 600; color: #334155; margin-bottom: 6px; }
  input[type=password] {
    width: 100%; padding: 11px 13px; font-size: 14px; font-family: inherit; color: #0f172a;
    border: 1px solid #cbd5e1; border-radius: 9px; outline: none; background: #fff;
    transition: border-color .15s, box-shadow .15s;
  }
  input[type=password]:focus { border-color: #312e81; box-shadow: 0 0 0 3px rgba(49, 46, 129, .12); }
  button {
    width: 100%; margin-top: 16px; padding: 11px 16px; font-size: 14px; font-weight: 600;
    font-family: inherit; color: #fff; background: #312e81; border: 0; border-radius: 9px;
    cursor: pointer; transition: background .15s;
  }
  button:hover { background: #3730a3; }
  .error {
    margin: 14px 0 0; padding: 10px 12px; border-radius: 9px; background: #fef2f2;
    border: 1px solid #fecaca; color: #b91c1c; font-size: 13px;
  }
  .foot { margin: 22px 0 0; font-size: 11.5px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
  <main class="card">
    <div class="mark" aria-hidden="true">&#128274;</div>
    <h1>${escapeHtml(SITE_NAME)}</h1>
    <p class="sub">This prototype is private. Enter the access password to continue.</p>
    <form method="POST" action="${GATE_PATH}" autocomplete="off">
      <input type="hidden" name="next" value="${escapeHtml(next)}">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autofocus required
             autocomplete="current-password" placeholder="Enter password">
      <button type="submit">Unlock</button>
    </form>
    ${failed ? '<p class="error">Wrong password. Please try again.</p>' : ''}
    <p class="foot">Internal prototype — do not share outside the team.</p>
  </main>
</body>
</html>`;

  return new NextResponse(html, {
    status: 401,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
