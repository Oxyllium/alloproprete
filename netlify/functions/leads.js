// Admin API for lead management.
// All requests require Authorization: Bearer <ADMIN_PASSWORD>
//
// GET  ?action=list         → all leads from Sheet
// POST ?action=approve&row=N → approve lead, send email via Gmail (Apps Script)
// POST ?action=reject&row=N  → reject lead, update Sheet
// GET  ?action=getConfig    → client emails from Sheet
// POST ?action=saveConfig   → save client emails to Sheet

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "alloproprete2025";
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

function json(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
    body: JSON.stringify(data),
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return json(200, {});

  const authHeader = event.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (token !== ADMIN_PASSWORD) {
    return json(401, { error: "Non autorisé" });
  }

  const params = event.queryStringParameters || {};
  const action = params.action;

  try {
    // ── LIST LEADS ──
    if (action === "list") {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getLeads`);
      const data = await res.json();
      return json(200, data);
    }

    // ── APPROVE LEAD ──
    if (action === "approve") {
      const row = params.row;
      if (!row) return json(400, { error: "row parameter required" });

      // Send approve request to Apps Script (handles email + status update)
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approveLead",
          row: parseInt(row),
        }),
      });
      const data = await res.json();

      if (data.error) {
        return json(400, data);
      }

      return json(200, { success: true, sent_to: data.sent_to || [] });
    }

    // ── REJECT LEAD ──
    if (action === "reject") {
      const row = params.row;
      if (!row) return json(400, { error: "row parameter required" });

      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateStatus",
          row: parseInt(row),
          status: "rejeté",
        }),
      });

      return json(200, { success: true });
    }

    // ── GET CONFIG ──
    if (action === "getConfig") {
      const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getConfig`);
      const data = await res.json();
      return json(200, data);
    }

    // ── SAVE CONFIG ──
    if (action === "saveConfig") {
      const body = JSON.parse(event.body);
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveConfig",
          client_emails: body.client_emails,
        }),
      });
      return json(200, { success: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (error) {
    console.error("leads function error:", error);
    return json(500, { error: error.message });
  }
};
