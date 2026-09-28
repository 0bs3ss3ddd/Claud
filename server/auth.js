// Регистрация, вход, сессии. Пароли — scrypt, сессии — случайный токен в HttpOnly-cookie,
// в базе хранится только SHA-256 от токена.
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 64;
export const SESSION_COOKIE = 'parta_sid';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored).split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// Хэш-заглушка: выравнивает время ответа для несуществующих email.
let dummyHash = null;
async function getDummyHash() {
  dummyHash ??= await hashPassword(randomBytes(12).toString('hex'));
  return dummyHash;
}

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k && !(k in out)) {
      try { out[k] = decodeURIComponent(v); } catch { out[k] = v; }
    }
  }
  return out;
}

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function validateCredentials({ email, password, name }, { register = false } = {}) {
  const e = normalizeEmail(email);
  if (!EMAIL_RE.test(e) || e.length > 254) return 'Проверьте email';
  if (typeof password !== 'string' || password.length < 8) return 'Пароль — минимум 8 символов';
  if (password.length > 128) return 'Пароль слишком длинный';
  if (register) {
    const n = String(name ?? '').trim();
    if (n.length < 1 || n.length > 60) return 'Имя — от 1 до 60 символов';
    if (/[\u0000-\u001f<>]/.test(n)) return 'Имя содержит недопустимые символы';
  }
  return null;
}

export function createAuth(db, config) {
  const q = {
    userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    userById: db.prepare('SELECT id, email, name, pro_until, created_at FROM users WHERE id = ?'),
    insertUser: db.prepare('INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)'),
    insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'),
    sessionUser: db.prepare(`SELECT u.id, u.email, u.name, u.pro_until, u.created_at FROM sessions s
      JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`),
    deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    deleteExpired: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
    userSessions: db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?'),
  };

  function cookieHeader(token, maxAgeSec) {
    const attrs = [
      `${SESSION_COOKIE}=${token}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${maxAgeSec}`,
    ];
    if (config.secureCookies) attrs.push('Secure');
    return attrs.join('; ');
  }

  function startSession(res, userId) {
    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    q.insertSession.run(sha256(token), userId, now, now + SESSION_TTL_MS);
    res.setHeader('Set-Cookie', cookieHeader(token, Math.floor(SESSION_TTL_MS / 1000)));
  }

  return {
    /** middleware: req.user = пользователь сессии или null */
    session(req, _res, next) {
      const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
      req.user = null;
      if (token && /^[A-Za-z0-9_-]{20,100}$/.test(token)) {
        req.sessionHash = sha256(token);
        req.user = q.sessionUser.get(req.sessionHash, Date.now()) ?? null;
      }
      next();
    },

    async register(req, res) {
      const err = validateCredentials(req.body ?? {}, { register: true });
      if (err) return res.status(400).json({ error: err });
      const email = normalizeEmail(req.body.email);
      const hash = await hashPassword(req.body.password);
      if (q.userByEmail.get(email)) {
        return res.status(409).json({ error: 'Этот email уже зарегистрирован — войдите' });
      }
      let info;
      try {
        info = q.insertUser.run(email, String(req.body.name).trim(), hash, Date.now());
      } catch {
        return res.status(409).json({ error: 'Этот email уже зарегистрирован — войдите' });
      }
      startSession(res, Number(info.lastInsertRowid));
      res.status(201).json({ ok: true });
    },

    async login(req, res) {
      const { email, password } = req.body ?? {};
      if (typeof password !== 'string' || password.length > 128 || typeof email !== 'string') {
        return res.status(400).json({ error: 'Неверный email или пароль' });
      }
      const user = q.userByEmail.get(normalizeEmail(email));
      const ok = await verifyPassword(password, user?.password_hash ?? (await getDummyHash()));
      if (!user || !ok) return res.status(401).json({ error: 'Неверный email или пароль' });
      q.deleteExpired.run(Date.now());
      startSession(res, user.id);
      res.json({ ok: true });
    },

    logout(req, res) {
      if (req.sessionHash) q.deleteSession.run(req.sessionHash);
      res.setHeader('Set-Cookie', cookieHeader('', 0));
      res.json({ ok: true });
    },

    /** Выйти на всех остальных устройствах */
    logoutOthers(req, res) {
      if (!req.user) return res.status(401).json({ error: 'Нужно войти' });
      q.userSessions.run(req.user.id, req.sessionHash);
      res.json({ ok: true });
    },

    reloadUser(id) {
      return q.userById.get(id) ?? null;
    },
  };
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Нужно войти', reason: 'auth' });
  next();
}
