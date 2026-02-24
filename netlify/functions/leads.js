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

// ── Microsoft Ads: fetch monthly spend data via Reporting API ──
async function fetchMsAdsSpendData() {
  const accessToken = await getMsAdsAccessToken();
  if (!accessToken) throw new Error("Could not get MS Ads access token");

  const reportingHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    DeveloperToken: MS_ADS_DEVELOPER_TOKEN,
    CustomerAccountId: MS_ADS_ACCOUNT_ID,
    CustomerId: MS_ADS_CUSTOMER_ID,
  };

  // Date range: last 12 months
  const now = new Date();
  const startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);

  // 1. Submit report request
  const submitRes = await fetch(
    "https://reporting.api.bingads.microsoft.com/Reporting/v13/GenerateReport/Submit",
    {
      method: "POST",
      headers: reportingHeaders,
      body: JSON.stringify({
        ReportRequest: {
          Type: "AccountPerformanceReportRequest",
          Aggregation: "Monthly",
          Columns: ["TimePeriod", "Spend", "Clicks", "Impressions", "Conversions"],
          ExcludeColumnHeaders: false,
          ExcludeReportHeader: true,
          ExcludeReportFooter: true,
          Format: "Csv",
          ReturnOnlyCompleteData: false,
          Scope: {
            AccountIds: [parseInt(MS_ADS_ACCOUNT_ID)],
          },
          Time: {
            CustomDateRangeStart: {
              Day: 1,
              Month: startDate.getMonth() + 1,
              Year: startDate.getFullYear(),
            },
            CustomDateRangeEnd: {
              Day: now.getDate(),
              Month: now.getMonth() + 1,
              Year: now.getFullYear(),
            },
          },
        },
      }),
    }
  );

  const submitData = await submitRes.json();
  const reportRequestId = submitData.ReportRequestId;
  if (!reportRequestId) {
    throw new Error("Failed to submit report: " + JSON.stringify(submitData));
  }

  // 2. Poll for report completion (max 20s, every 2s)
  let downloadUrl = null;
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const pollRes = await fetch(
      "https://reporting.api.bingads.microsoft.com/Reporting/v13/GenerateReport/Poll",
      {
        method: "POST",
        headers: reportingHeaders,
        body: JSON.stringify({ ReportRequestId: reportRequestId }),
      }
    );

    const pollData = await pollRes.json();
    const status = pollData.ReportRequestStatus?.Status;

    if (status === "Success") {
      downloadUrl = pollData.ReportRequestStatus.ReportDownloadUrl;
      break;
    }
    if (status !== "Pending") {
      throw new Error("Report failed with status: " + status);
    }
  }

  if (!downloadUrl) throw new Error("Report timed out");

  // 3. Download ZIP file
  const zipRes = await fetch(downloadUrl);
  const zipBuffer = Buffer.from(await zipRes.arrayBuffer());

  // 4. Unzip and parse CSV
  const AdmZip = require("adm-zip");
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  const csvContent = entries[0].getData().toString("utf8");

  // 5. Parse CSV into monthly data
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());
  const months = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.replace(/"/g, "").trim());
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx];
    });

    months.push({
      period: row.TimePeriod || row.GregorianDate || "",
      spend: parseFloat(row.Spend) || 0,
      clicks: parseInt(row.Clicks) || 0,
      impressions: parseInt(row.Impressions) || 0,
      conversions: parseInt(row.Conversions) || 0,
    });
  }

  return months;
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

    // ── GET SPEND DATA (MS Ads Reporting) ──
    if (action === "getSpendData") {
      const months = await fetchMsAdsSpendData();
      return json(200, { months });
    }

    // ── BUDGET (manual spend tracking) ──
    if (action === "getBudgets") {
      const data = await gasGet("getBudgets");
      return json(200, data);
    }

    if (action === "saveBudget") {
      const body = JSON.parse(event.body);
      await gasGet("addBudget", {
        data: { month: body.month, amount: body.amount, source: body.source },
      });
      return json(200, { success: true });
    }

    if (action === "deleteBudget") {
      const row = params.row;
      if (!row) return json(400, { error: "row parameter required" });
      await gasGet("deleteBudget", { row });
      return json(200, { success: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (error) {
    console.error("leads function error:", error);
    return json(500, { error: error.message });
  }
};
