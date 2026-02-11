// Admin API for lead management.
// All requests require Authorization: Bearer <ADMIN_PASSWORD>
// All calls to Google Apps Script use GET to avoid POST redirect issues.

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "alloproprete2025";
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbzELKo-z_iv1uOZ11VnORBp0QCzaonYWTbh5l5B3ahtnX_ZvnYXYRvH6OL2f5bymwE4jA/exec";

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

async function gasGet(action, extraParams) {
  let url = `${GOOGLE_SCRIPT_URL}?action=${action}`;
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      url += `&${key}=${encodeURIComponent(typeof value === "string" ? value : JSON.stringify(value))}`;
    }
  }
  const res = await fetch(url);
  return res.json();
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
      const data = await gasGet("getLeads");
      return json(200, data);
    }

    // ── APPROVE LEAD ──
    if (action === "approve") {
      const row = params.row;
      const leadType = params.leadType || "";
      const priceTTC = params.priceTTC || "";
      if (!row) return json(400, { error: "row parameter required" });

      const data = await gasGet("approveLead", { row, leadType, priceTTC });

      if (data.error) {
        return json(400, data);
      }

      return json(200, { success: true, sent_to: data.sent_to || [] });
    }

    // ── REJECT LEAD ──
    if (action === "reject") {
      const row = params.row;
      if (!row) return json(400, { error: "row parameter required" });

      await gasGet("updateStatus", {
        data: { row: parseInt(row), status: "rejeté" },
      });

      return json(200, { success: true });
    }

    // ── GET CONFIG ──
    if (action === "getConfig") {
      const data = await gasGet("getConfig");
      return json(200, data);
    }

    // ── SAVE CONFIG ──
    if (action === "saveConfig") {
      const body = JSON.parse(event.body);
      await gasGet("saveConfig", {
        data: { client_emails: body.client_emails },
      });
      return json(200, { success: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (error) {
    console.error("leads function error:", error);
    return json(500, { error: error.message });
  }
};
