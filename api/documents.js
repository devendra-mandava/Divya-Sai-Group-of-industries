import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { company, doc_type, search } = req.query;
    if (!company) return res.status(400).json({ error: "company required" });

    try {
      let result;
      if (doc_type && search) {
        result = await sql`
          SELECT id, doc_number, doc_type, party_name, doc_date, grand_total, created_at
          FROM documents
          WHERE company = ${company} AND doc_type = ${doc_type} AND party_name ILIKE ${"%" + search + "%"}
          ORDER BY created_at DESC LIMIT 100
        `;
      } else if (doc_type) {
        result = await sql`
          SELECT id, doc_number, doc_type, party_name, doc_date, grand_total, created_at
          FROM documents
          WHERE company = ${company} AND doc_type = ${doc_type}
          ORDER BY created_at DESC LIMIT 100
        `;
      } else if (search) {
        result = await sql`
          SELECT id, doc_number, doc_type, party_name, doc_date, grand_total, created_at
          FROM documents
          WHERE company = ${company} AND party_name ILIKE ${"%" + search + "%"}
          ORDER BY created_at DESC LIMIT 100
        `;
      } else {
        result = await sql`
          SELECT id, doc_number, doc_type, party_name, doc_date, grand_total, created_at
          FROM documents
          WHERE company = ${company}
          ORDER BY created_at DESC LIMIT 100
        `;
      }

      // Detect duplicate doc_numbers within same company+doc_type
      const countMap = {};
      for (const row of result.rows) {
        const key = `${row.doc_type}:${row.doc_number}`;
        countMap[key] = (countMap[key] || 0) + 1;
      }
      const rows = result.rows.map((row) => ({
        ...row,
        is_duplicate: countMap[`${row.doc_type}:${row.doc_number}`] > 1,
      }));

      return res.status(200).json(rows);
    } catch (error) {
      console.error("Documents GET error:", error);
      return res.status(500).json({ error: "Failed to fetch documents" });
    }
  }

  if (req.method === "POST") {
    const { company, doc_type, doc_number, party_id, party_name, doc_date, due_date, grand_total, vehicle_no, items_json, extras_json, tax_json, notes } = req.body;

    if (!company || !doc_type || !doc_number || !party_name || !doc_date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const result = await sql`
        INSERT INTO documents (company, doc_type, doc_number, party_id, party_name, doc_date, due_date, grand_total, vehicle_no, items_json, extras_json, tax_json, notes)
        VALUES (${company}, ${doc_type}, ${doc_number}, ${party_id || null}, ${party_name}, ${doc_date}, ${due_date || null}, ${grand_total || 0}, ${vehicle_no || null}, ${JSON.stringify(items_json || [])}, ${JSON.stringify(extras_json || {})}, ${JSON.stringify(tax_json || {})}, ${notes || null})
        RETURNING id
      `;
      return res.status(200).json({ id: result.rows[0].id });
    } catch (error) {
      console.error("Documents POST error:", error);
      return res.status(500).json({ error: "Failed to save document" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
