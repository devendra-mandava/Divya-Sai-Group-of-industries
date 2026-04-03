import { sql } from "@vercel/postgres";
import { createSession, hashPassword, normalizeUsername } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const username = normalizeUsername(req.body?.username);
  const password = String(req.body?.password || "");
  const fullName = String(req.body?.fullName || "").trim();

  if (!username || password.length < 6) {
    return res.status(400).json({ error: "Username and a password of at least 6 characters are required" });
  }

  try {
    const existing = await sql`SELECT id FROM users WHERE username = ${username} LIMIT 1`;
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const result = await sql`
      INSERT INTO users (username, password_hash, full_name)
      VALUES (${username}, ${hashPassword(password)}, ${fullName || null})
      RETURNING id, username, full_name
    `;

    const user = result.rows[0];
    await createSession(res, user.id);

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name || "",
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Failed to sign up" });
  }
}
