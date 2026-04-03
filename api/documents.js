import { sql } from "@vercel/postgres";
import { requireAuth } from "./_lib/auth.js";

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === "GET") {
    const { company, doc_type, search } = req.query;
    if (!company) return res.status(400).json({ error: "company required" });

    try {
      let result;
      if (doc_type && search) {
        result = await sql`
          SELECT
            documents.id,
            documents.company,
            documents.party_id,
            documents.doc_number,
            documents.doc_type,
            documents.party_name,
            documents.party_phone,
            documents.party_json,
            documents.doc_date,
            documents.due_date,
            documents.grand_total,
            documents.received_amount,
            documents.vehicle_no,
            documents.items_json,
            documents.extras_json,
            documents.tax_json,
            documents.notes,
            documents.created_at,
            parties.phone AS linked_party_phone,
            parties.street AS linked_party_street,
            parties.city AS linked_party_city,
            parties.state AS linked_party_state,
            parties.pincode AS linked_party_pincode,
            parties.ship_street AS linked_party_ship_street,
            parties.ship_city AS linked_party_ship_city,
            parties.ship_state AS linked_party_ship_state,
            parties.ship_pincode AS linked_party_ship_pincode
          FROM documents
          LEFT JOIN parties ON parties.id = documents.party_id
          WHERE documents.company = ${company} AND documents.doc_type = ${doc_type} AND documents.party_name ILIKE ${"%" + search + "%"}
          ORDER BY documents.created_at DESC LIMIT 100
        `;
      } else if (doc_type) {
        result = await sql`
          SELECT
            documents.id,
            documents.company,
            documents.party_id,
            documents.doc_number,
            documents.doc_type,
            documents.party_name,
            documents.party_phone,
            documents.party_json,
            documents.doc_date,
            documents.due_date,
            documents.grand_total,
            documents.received_amount,
            documents.vehicle_no,
            documents.items_json,
            documents.extras_json,
            documents.tax_json,
            documents.notes,
            documents.created_at,
            parties.phone AS linked_party_phone,
            parties.street AS linked_party_street,
            parties.city AS linked_party_city,
            parties.state AS linked_party_state,
            parties.pincode AS linked_party_pincode,
            parties.ship_street AS linked_party_ship_street,
            parties.ship_city AS linked_party_ship_city,
            parties.ship_state AS linked_party_ship_state,
            parties.ship_pincode AS linked_party_ship_pincode
          FROM documents
          LEFT JOIN parties ON parties.id = documents.party_id
          WHERE documents.company = ${company} AND documents.doc_type = ${doc_type}
          ORDER BY documents.created_at DESC LIMIT 100
        `;
      } else if (search) {
        result = await sql`
          SELECT
            documents.id,
            documents.company,
            documents.party_id,
            documents.doc_number,
            documents.doc_type,
            documents.party_name,
            documents.party_phone,
            documents.party_json,
            documents.doc_date,
            documents.due_date,
            documents.grand_total,
            documents.received_amount,
            documents.vehicle_no,
            documents.items_json,
            documents.extras_json,
            documents.tax_json,
            documents.notes,
            documents.created_at,
            parties.phone AS linked_party_phone,
            parties.street AS linked_party_street,
            parties.city AS linked_party_city,
            parties.state AS linked_party_state,
            parties.pincode AS linked_party_pincode,
            parties.ship_street AS linked_party_ship_street,
            parties.ship_city AS linked_party_ship_city,
            parties.ship_state AS linked_party_ship_state,
            parties.ship_pincode AS linked_party_ship_pincode
          FROM documents
          LEFT JOIN parties ON parties.id = documents.party_id
          WHERE documents.company = ${company} AND documents.party_name ILIKE ${"%" + search + "%"}
          ORDER BY documents.created_at DESC LIMIT 100
        `;
      } else {
        result = await sql`
          SELECT
            documents.id,
            documents.company,
            documents.party_id,
            documents.doc_number,
            documents.doc_type,
            documents.party_name,
            documents.party_phone,
            documents.party_json,
            documents.doc_date,
            documents.due_date,
            documents.grand_total,
            documents.received_amount,
            documents.vehicle_no,
            documents.items_json,
            documents.extras_json,
            documents.tax_json,
            documents.notes,
            documents.created_at,
            parties.phone AS linked_party_phone,
            parties.street AS linked_party_street,
            parties.city AS linked_party_city,
            parties.state AS linked_party_state,
            parties.pincode AS linked_party_pincode,
            parties.ship_street AS linked_party_ship_street,
            parties.ship_city AS linked_party_ship_city,
            parties.ship_state AS linked_party_ship_state,
            parties.ship_pincode AS linked_party_ship_pincode
          FROM documents
          LEFT JOIN parties ON parties.id = documents.party_id
          WHERE documents.company = ${company}
          ORDER BY documents.created_at DESC LIMIT 100
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
        party_phone: row.party_phone || row.linked_party_phone || "",
        is_duplicate: countMap[`${row.doc_type}:${row.doc_number}`] > 1,
      }));

      return res.status(200).json(rows);
    } catch (error) {
      console.error("Documents GET error:", error);
      return res.status(500).json({ error: "Failed to fetch documents" });
    }
  }

  if (req.method === "POST") {
    const {
      company,
      doc_type,
      doc_number,
      party_id,
      party_name,
      party_phone,
      party_json,
      doc_date,
      due_date,
      grand_total,
      received_amount,
      vehicle_no,
      items_json,
      extras_json,
      tax_json,
      notes,
    } = req.body;

    if (!company || !doc_type || !doc_number || !party_name || !doc_date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const result = await sql`
        INSERT INTO documents (company, doc_type, doc_number, party_id, party_name, party_phone, party_json, doc_date, due_date, grand_total, received_amount, vehicle_no, items_json, extras_json, tax_json, notes)
        VALUES (${company}, ${doc_type}, ${doc_number}, ${party_id || null}, ${party_name}, ${party_phone || null}, ${JSON.stringify(party_json || {})}, ${doc_date}, ${due_date || null}, ${grand_total || 0}, ${received_amount || 0}, ${vehicle_no || null}, ${JSON.stringify(items_json || [])}, ${JSON.stringify(extras_json || {})}, ${JSON.stringify(tax_json || {})}, ${notes || null})
        RETURNING id
      `;
      return res.status(200).json({ id: result.rows[0].id });
    } catch (error) {
      console.error("Documents POST error:", error);
      return res.status(500).json({ error: "Failed to save document" });
    }
  }

  if (req.method === "PUT") {
    const {
      id,
      company,
      doc_type,
      doc_number,
      party_id,
      party_name,
      party_phone,
      party_json,
      doc_date,
      due_date,
      grand_total,
      received_amount,
      vehicle_no,
      items_json,
      extras_json,
      tax_json,
      notes,
    } = req.body;

    if (!id || !company || !doc_type || !doc_number || !party_name || !doc_date) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      await sql`
        UPDATE documents
        SET
          company = ${company},
          doc_type = ${doc_type},
          doc_number = ${doc_number},
          party_id = ${party_id || null},
          party_name = ${party_name},
          party_phone = ${party_phone || null},
          party_json = ${JSON.stringify(party_json || {})},
          doc_date = ${doc_date},
          due_date = ${due_date || null},
          grand_total = ${grand_total || 0},
          received_amount = ${received_amount || 0},
          vehicle_no = ${vehicle_no || null},
          items_json = ${JSON.stringify(items_json || [])},
          extras_json = ${JSON.stringify(extras_json || {})},
          tax_json = ${JSON.stringify(tax_json || {})},
          notes = ${notes || null}
        WHERE id = ${id} AND company = ${company}
      `;
      return res.status(200).json({ id });
    } catch (error) {
      console.error("Documents PUT error:", error);
      return res.status(500).json({ error: "Failed to update document" });
    }
  }

  if (req.method === "DELETE") {
    const { id, company } = req.query;
    if (!id || !company) {
      return res.status(400).json({ error: "id and company required" });
    }

    try {
      await sql`DELETE FROM documents WHERE id = ${id} AND company = ${company}`;
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Documents DELETE error:", error);
      return res.status(500).json({ error: "Failed to delete document" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
