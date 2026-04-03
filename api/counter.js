import { sql } from "@vercel/postgres";
import { requireAuth } from "./_lib/auth.js";

function getFiscalYear() {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  // Indian FY: April-March. If month >= 3 (April), FY = next year's last 2 digits
  const fy = month >= 3 ? (year + 1) % 100 : year % 100;
  return String(fy).padStart(2, "0");
}

function formatDocNumber(company, docType, seq, fy) {
  if (docType === "Quotation") {
    return String(seq);
  }
  const pad = String(seq).padStart(2, "0");
  if (company === "enterprises") {
    return `FY${fy}-E-${pad}`;
  }
  return `FY${fy}-${pad}`;
}

export default async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { company, doc_type } = req.query;
  if (!company || !doc_type) {
    return res.status(400).json({ error: "company and doc_type required" });
  }

  const fy = getFiscalYear();

  try {
    // Upsert counter and atomically increment
    const result = await sql`
      INSERT INTO counters (company, doc_type, fiscal_year, current_value)
      VALUES (${company}, ${doc_type}, ${fy}, 1)
      ON CONFLICT (company, doc_type, fiscal_year)
      DO UPDATE SET current_value = counters.current_value + 1
      RETURNING current_value
    `;

    const seq = result.rows[0].current_value;
    const docNumber = formatDocNumber(company, doc_type, seq, fy);

    return res.status(200).json({ docNumber, seq, fy });
  } catch (error) {
    console.error("Counter error:", error);
    return res.status(500).json({ error: "Failed to get next number" });
  }
}
