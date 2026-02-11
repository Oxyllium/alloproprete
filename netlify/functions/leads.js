// Admin API for lead management.
// All requests require Authorization: Bearer <ADMIN_PASSWORD>
// All calls to Google Apps Script use GET to avoid POST redirect issues.

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "alloproprete2025";
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbzELKo-z_iv1uOZ11VnORBp0QCzaonYWTbh5l5B3ahtnX_ZvnYXYRvH6OL2f5bymwE4jA/exec";

// Microsoft Ads Offline Conversions
const MS_ADS_CLIENT_ID = process.env.MS_ADS_CLIENT_ID || "";
const MS_ADS_CLIENT_SECRET = process.env.MS_ADS_CLIENT_SECRET || "";
const MS_ADS_REFRESH_TOKEN = process.env.MS_ADS_REFRESH_TOKEN || "";
const MS_ADS_DEVELOPER_TOKEN = process.env.MS_ADS_DEVELOPER_TOKEN || "";
const MS_ADS_CUSTOMER_ID = process.env.MS_ADS_CUSTOMER_ID || "";
const MS_ADS_ACCOUNT_ID = process.env.MS_ADS_ACCOUNT_ID || "";
const MS_ADS_CONVERSION_NAME = process.env.MS_ADS_CONVERSION_NAME || "Lead Validé";

// ── Microsoft Ads: get OAuth access token ──
async function getMsAdsAccessToken() {
  if (!MS_ADS_CLIENT_ID || !MS_ADS_REFRESH_TOKEN) return null;

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: MS_ADS_CLIENT_ID,
      client_secret: MS_ADS_CLIENT_SECRET,
      refresh_token: MS_ADS_REFRESH_TOKEN,
      scope: "https://ads.microsoft.com/msads.manage offline_access",
    }),
  });

  const data = await res.json();
  return data.access_token || null;
}

// ── Microsoft Ads: upload offline conversion ──
async function uploadOfflineConversion(msclkid, priceTTC) {
  if (!msclkid || !MS_ADS_DEVELOPER_TOKEN) {
    console.log("Skipping MS Ads conversion: no msclkid or developer token");
    return null;
  }

  const accessToken = await getMsAdsAccessToken();
  if (!accessToken) {
    console.log("Skipping MS Ads conversion: could not get access token");
    return null;
  }

  const res = await fetch(
    "https://campaign.api.bingads.microsoft.com/CampaignManagement/v13/OfflineConversions/Apply",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        DeveloperToken: MS_ADS_DEVELOPER_TOKEN,
        CustomerAccountId: MS_ADS_ACCOUNT_ID,
        CustomerId: MS_ADS_CUSTOMER_ID,
      },
      body: JSON.stringify({
        OfflineConversions: [
          {
            ConversionCurrencyCode: "EUR",
            ConversionName: MS_ADS_CONVERSION_NAME,
            ConversionTime: new Date().toISOString(),
            ConversionValue: parseFloat(priceTTC) || 0,
            MicrosoftClickId: msclkid,
          },
        ],
      }),
    }
  );

  const result = await res.json();
  console.log("MS Ads conversion result:", JSON.stringify(result));
  return result;
}

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

      // Fetch lead to get msclkid for offline conversion
      const lead = await gasGet("getLead", { row });
      const msclkid = lead.msclkid || "";

      // Send email + update status via Apps Script
      const data = await gasGet("approveLead", { row, leadType, priceTTC });

      if (data.error) {
        return json(400, data);
      }

      // Upload offline conversion to Microsoft Ads (non-blocking)
      if (msclkid) {
        try {
          await uploadOfflineConversion(msclkid, priceTTC);
        } catch (err) {
          console.error("MS Ads conversion upload failed:", err.message);
        }
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
