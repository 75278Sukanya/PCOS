const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const db = new DatabaseSync(path.join(ROOT, 'pcos-management.db'));
const OAUTH = {
  google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET },
  twitter: { clientId: process.env.TWITTER_CLIENT_ID, clientSecret: process.env.TWITTER_CLIENT_SECRET }
};

db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS oauth_accounts (
    provider TEXT NOT NULL,
    provider_user_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (provider, provider_user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    code_verifier TEXT,
    expires_at INTEGER NOT NULL
  );
`);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.pdf': 'application/pdf',
  '.mp4': 'video/mp4', '.ico': 'image/x-icon'
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function createPdf(text) {
  const safeLines = String(text).replace(/[^\x20-\x7E\n]/g, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean).flatMap(line => line.match(/.{1,86}(?:\s|$)|.{1,86}/g) || ['']);
  const pages = [];
  for (let i = 0; i < safeLines.length; i += 42) pages.push(safeLines.slice(i, i + 42));
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`];
  pages.forEach((lines, i) => {
    const page = 3 + i * 2, stream = page + 1;
    const body = ['BT', '/F1 11 Tf', '50 790 Td', ...lines.flatMap((line, n) => [`(${line.replace(/[\\()]/g, '\\$&')}) Tj`, n < lines.length - 1 ? '0 -17 Td' : '']), 'ET'].join('\n');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${stream} 0 R >>`, `<< /Length ${Buffer.byteLength(body)} >>\nstream\n${body}\nendstream`);
  });
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  let pdf = '%PDF-1.4\n', offsets = [0];
  objects.forEach((obj, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const start = Buffer.byteLength(pdf); pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(x => `${String(x).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(pdf, 'ascii');
}

function redirect(res, location) { res.writeHead(302, { Location: location }); res.end(); }
function appUrl(req) { return process.env.APP_URL || `http://${req.headers.host}`; }
function oauthCallbackUrl(req, provider) {
  // X requires 127.0.0.1 rather than localhost during local development.
  const baseUrl = process.env.APP_URL || (provider === 'twitter' ? `http://127.0.0.1:${PORT}` : appUrl(req));
  return `${baseUrl}/api/oauth/${provider}/callback`;
}
function oauthError(res, message) { redirect(res, `/login.html?error=${encodeURIComponent(message)}`); }
function randomUrlSafe(bytes = 32) { return crypto.randomBytes(bytes).toString('base64url'); }
function saveOauthState(provider, codeVerifier = null) {
  const state = randomUrlSafe();
  db.prepare('DELETE FROM oauth_states WHERE expires_at <= ?').run(Date.now());
  db.prepare('INSERT INTO oauth_states (state, provider, code_verifier, expires_at) VALUES (?, ?, ?, ?)').run(state, provider, codeVerifier, Date.now() + 10 * 60 * 1000);
  return state;
}
function consumeOauthState(provider, state) {
  const record = db.prepare('SELECT * FROM oauth_states WHERE state = ? AND provider = ? AND expires_at > ?').get(state, provider, Date.now());
  db.prepare('DELETE FROM oauth_states WHERE state = ?').run(state);
  return record;
}
function createOrSignInOAuthUser(res, { provider, providerUserId, email, firstName, lastName }) {
  let account = db.prepare('SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?').get(provider, providerUserId);
  let userId;
  if (account) userId = account.user_id;
  else {
    const existing = email && db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) userId = existing.id;
    else userId = Number(db.prepare('INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)').run(firstName || 'PCOS', lastName || 'Member', email || `${provider}-${providerUserId}@oauth.local`, hashPassword(randomUrlSafe())).lastInsertRowid);
    db.prepare('INSERT INTO oauth_accounts (provider, provider_user_id, user_id) VALUES (?, ?, ?)').run(provider, providerUserId, userId);
  }
  createSession(res, userId, true);
  redirect(res, '/report-plan.html');
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1_000_000) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('Invalid request data.')); } });
    req.on('error', reject);
  });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function passwordMatches(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(value => {
    const index = value.indexOf('=');
    return [value.slice(0, index).trim(), decodeURIComponent(value.slice(index + 1))];
  }));
}

function currentUser(req) {
  const sessionId = cookies(req).session;
  if (!sessionId) return null;
  const row = db.prepare(`SELECT users.id, users.first_name, users.last_name, users.email
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.id = ? AND sessions.expires_at > ?`).get(sessionId, Date.now());
  return row || null;
}

function createSession(res, userId, remember) {
  const id = crypto.randomBytes(32).toString('hex');
  const lifetime = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(id, userId, Date.now() + lifetime);
  const maxAge = remember ? `; Max-Age=${Math.floor(lifetime / 1000)}` : '';
  res.setHeader('Set-Cookie', `session=${id}; HttpOnly; SameSite=Lax; Path=/${maxAge}`);
}

async function handleApi(req, res, pathname) {
  if (req.method === 'POST' && pathname === '/api/recommendation-pdf') {
    const { content = '' } = await readJson(req);
    if (typeof content !== 'string' || !content.trim() || content.length > 20_000) return sendJson(res, 400, { error: 'Invalid plan content.' });
    const pdf = createPdf(content);
    res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="my-pcos-plan.pdf"', 'Content-Length': pdf.length });
    return res.end(pdf);
  }
  if (req.method === 'POST' && pathname === '/api/auth/signup') {
    const { firstName = '', lastName = '', email = '', password = '' } = await readJson(req);
    const cleaned = { firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase() };
    if (!cleaned.firstName || !cleaned.lastName || !/^\S+@\S+\.\S+$/.test(cleaned.email)) return sendJson(res, 400, { error: 'Enter your name and a valid email address.' });
    if (password.length < 8) return sendJson(res, 400, { error: 'Password must contain at least 8 characters.' });
    try {
      const result = db.prepare('INSERT INTO users (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)').run(cleaned.firstName, cleaned.lastName, cleaned.email, hashPassword(password));
      createSession(res, Number(result.lastInsertRowid), true);
      return sendJson(res, 201, { user: { firstName: cleaned.firstName, lastName: cleaned.lastName, email: cleaned.email } });
    } catch (error) {
      if (String(error.message).includes('UNIQUE')) return sendJson(res, 409, { error: 'An account with this email already exists.' });
      throw error;
    }
  }
  if (req.method === 'POST' && pathname === '/api/auth/login') {
    const { email = '', password = '', remember = false } = await readJson(req);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (!user || !passwordMatches(password, user.password_hash)) return sendJson(res, 401, { error: 'Email or password is incorrect.' });
    createSession(res, user.id, Boolean(remember));
    return sendJson(res, 200, { user: { firstName: user.first_name, lastName: user.last_name, email: user.email } });
  }
  if (req.method === 'POST' && pathname === '/api/auth/logout') {
    const session = cookies(req).session;
    if (session) db.prepare('DELETE FROM sessions WHERE id = ?').run(session);
    res.setHeader('Set-Cookie', 'session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    return sendJson(res, 200, { ok: true });
  }
  if (req.method === 'GET' && pathname === '/api/auth/me') {
    const user = currentUser(req);
    return user ? sendJson(res, 200, { user: { firstName: user.first_name, lastName: user.last_name, email: user.email } }) : sendJson(res, 401, { error: 'Not signed in.' });
  }
  return sendJson(res, 404, { error: 'API route not found.' });
}

async function handleOAuth(req, res, pathname, query) {
  const provider = pathname.split('/')[3];
  if (!['google', 'twitter'].includes(provider)) return sendJson(res, 404, { error: 'Provider not found.' });
  const callbackUrl = oauthCallbackUrl(req, provider);
  if (pathname.endsWith('/start')) {
    if (!OAUTH[provider].clientId || !OAUTH[provider].clientSecret) return oauthError(res, `${provider === 'twitter' ? 'Twitter/X' : 'Google'} sign-in has not been configured yet.`);
    if (provider === 'google') {
      const state = saveOauthState(provider);
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.search = new URLSearchParams({ client_id: OAUTH.google.clientId, redirect_uri: callbackUrl, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' });
      return redirect(res, url);
    }
    const verifier = randomUrlSafe(48);
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    const state = saveOauthState(provider, verifier);
    const url = new URL('https://x.com/i/oauth2/authorize');
    url.search = new URLSearchParams({ response_type: 'code', client_id: OAUTH.twitter.clientId, redirect_uri: callbackUrl, scope: 'users.read users.email', state, code_challenge: challenge, code_challenge_method: 'S256' });
    return redirect(res, url);
  }
  if (!pathname.endsWith('/callback')) return sendJson(res, 404, { error: 'OAuth route not found.' });
  if (query.error) return oauthError(res, 'Sign-in was cancelled or declined.');
  const state = consumeOauthState(provider, query.state);
  if (!state || !query.code) return oauthError(res, 'This sign-in request expired. Please try again.');
  try {
    if (provider === 'google') {
      const body = new URLSearchParams({ code: query.code, client_id: OAUTH.google.clientId, client_secret: OAUTH.google.clientSecret, redirect_uri: callbackUrl, grant_type: 'authorization_code' });
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      if (!tokenResponse.ok) throw new Error('Google token exchange failed.');
      const token = await tokenResponse.json();
      const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } });
      const profile = await profileResponse.json();
      if (!profileResponse.ok || !profile.sub || !profile.email || profile.email_verified === false) throw new Error('Google did not return a verified email address.');
      return createOrSignInOAuthUser(res, { provider, providerUserId: profile.sub, email: profile.email, firstName: profile.given_name, lastName: profile.family_name });
    }
    const body = new URLSearchParams({ code: query.code, grant_type: 'authorization_code', client_id: OAUTH.twitter.clientId, redirect_uri: callbackUrl, code_verifier: state.code_verifier });
    const authorization = `Basic ${Buffer.from(`${OAUTH.twitter.clientId}:${OAUTH.twitter.clientSecret}`).toString('base64')}`;
    const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: authorization }, body });
    if (!tokenResponse.ok) throw new Error('Twitter/X token exchange failed.');
    const token = await tokenResponse.json();
    const profileResponse = await fetch('https://api.x.com/2/users/me?user.fields=id,name,username', { headers: { Authorization: `Bearer ${token.access_token}` } });
    const profileData = await profileResponse.json();
    const profile = profileData.data;
    if (!profileResponse.ok || !profile?.id) throw new Error('Twitter/X did not return a profile.');
    const name = (profile.name || profile.username || 'PCOS Member').trim().split(/\s+/);
    return createOrSignInOAuthUser(res, { provider, providerUserId: profile.id, email: profile.email, firstName: name[0], lastName: name.slice(1).join(' ') || 'Member' });
  } catch (error) {
    console.error(error);
    return oauthError(res, 'We could not complete that sign-in. Please try again.');
  }
}

function serveFile(req, res, pathname) {
  const safePath = pathname === '/' ? '/home.html' : pathname;
  const file = path.resolve(ROOT, `.${safePath}`);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return sendJson(res, 404, { error: 'Not found.' });
  res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    if (pathname.startsWith('/api/oauth/')) return await handleOAuth(req, res, pathname, Object.fromEntries(url.searchParams));
    if (pathname.startsWith('/api/')) return await handleApi(req, res, pathname);
    serveFile(req, res, pathname);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) sendJson(res, 500, { error: 'Something went wrong. Please try again.' });
  }
}).listen(PORT, () => console.log(`PCOS Management is running at http://localhost:${PORT}`));
