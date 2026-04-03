import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";
import { sql } from "@vercel/postgres";

const SESSION_COOKIE = "dsgi_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf("=");
        if (idx === -1) return [part, ""];
        return [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))];
      })
  );
}

function buildCookie(value, maxAgeSeconds) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

export function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password, storedHash) {
  const [salt, expectedHex] = String(storedHash || "").split(":");
  if (!salt || !expectedHex) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export async function createSession(res, userId) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  await sql`
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt})
  `;

  res.setHeader("Set-Cookie", buildCookie(token, SESSION_MAX_AGE_SECONDS));
}

export async function clearSession(req, res) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) {
    await sql`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
  }
  res.setHeader("Set-Cookie", buildCookie("", 0));
}

export async function getSessionUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;

  const result = await sql`
    SELECT users.id, users.username, users.full_name, sessions.expires_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ${hashToken(token)}
    LIMIT 1
  `;

  const user = result.rows[0];
  if (!user) return null;

  const expiresAt = new Date(user.expires_at);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    await sql`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name || "",
  };
}

export async function requireAuth(req, res) {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return user;
}
