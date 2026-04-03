import { sql } from "@vercel/postgres";
import { createSession, normalizeUsername, verifyPassword } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const username = normalizeUsername(req.body?.username);
  const password = String(req.body?.password || "");

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const result = await sql`
      SELECT id, username, password_hash, full_name
      FROM users
      WHERE username = ${username}
      LIMIT 1
    `;

    const user = result.rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    await createSession(res, user.id);
    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name || "",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Failed to log in" });
  }
}
