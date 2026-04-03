import { sql } from "@vercel/postgres";
import { requireAuth } from "./_lib/auth.js";

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const { company, search } = req.query;
    if (!company) return res.status(400).json({ error: "company required" });

    try {
      let result;
      if (search) {
        result = await sql`
          SELECT * FROM parties
          WHERE company = ${company} AND name ILIKE ${"%" + search + "%"}
          ORDER BY updated_at DESC LIMIT 50
        `;
      } else {
        result = await sql`
          SELECT * FROM parties
          WHERE company = ${company}
          ORDER BY updated_at DESC LIMIT 100
        `;
      }
      return res.status(200).json(result.rows);
    } catch (error) {
      console.error("Parties GET error:", error);
      return res.status(500).json({ error: "Failed to fetch parties" });
    }
  }

  if (req.method === "POST") {
    const { company, name, phone, gst, street, city, state, pincode, ship_street, ship_city, ship_state, ship_pincode } = req.body;
    if (!company || !name) return res.status(400).json({ error: "company and name required" });

    try {
      // Check if party exists for this company
      const existing = await sql`
        SELECT id FROM parties WHERE company = ${company} AND LOWER(name) = LOWER(${name}) LIMIT 1
      `;

      let partyId;
      if (existing.rows.length > 0) {
        partyId = existing.rows[0].id;
        await sql`
          UPDATE parties SET
            phone = ${phone || null},
            gst = ${gst || null},
            street = ${street || null},
            city = ${city || null},
            state = ${state || null},
            pincode = ${pincode || null},
            ship_street = ${ship_street || null},
            ship_city = ${ship_city || null},
            ship_state = ${ship_state || null},
            ship_pincode = ${ship_pincode || null},
            updated_at = NOW()
          WHERE id = ${partyId}
        `;
      } else {
        const result = await sql`
          INSERT INTO parties (company, name, phone, gst, street, city, state, pincode, ship_street, ship_city, ship_state, ship_pincode)
          VALUES (${company}, ${name}, ${phone || null}, ${gst || null}, ${street || null}, ${city || null}, ${state || null}, ${pincode || null}, ${ship_street || null}, ${ship_city || null}, ${ship_state || null}, ${ship_pincode || null})
          RETURNING id
        `;
        partyId = result.rows[0].id;
      }

      return res.status(200).json({ id: partyId });
    } catch (error) {
      console.error("Parties POST error:", error);
      return res.status(500).json({ error: "Failed to save party" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
