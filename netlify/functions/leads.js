// Admin API for lead management.
// All requests require Authorization: Bearer <ADMIN_PASSWORD>
//
// GET  ?action=list         → all leads from Sheet
// POST ?action=approve&row=N → approve lead, send email, update Sheet
// POST ?action=reject&row=N  → reject lead, update Sheet
// GET  ?action=getConfig    → client emails from Sheet
// POST ?action=saveConfig   → save client emails to Sheet

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "alloproprete2025";
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM =
  process.env.RESEND_FROM || "AlloPropreté <noreply@alloproprete.fr>";

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

      // 1. Get lead details
      const detailRes = await fetch(
        `${GOOGLE_SCRIPT_URL}?action=getLead&row=${row}`
      );
      const lead = await detailRes.json();

      // 2. Get client emails from config
      const configRes = await fetch(`${GOOGLE_SCRIPT_URL}?action=getConfig`);
      const config = await configRes.json();
      const clientEmails = config.client_emails || [];

      if (clientEmails.length === 0) {
        return json(400, {
          error: "Aucun email client configuré. Allez dans Paramètres.",
        });
      }

      // 3. Send email via Resend
      const emailHtml = buildEmailHtml(lead);
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: clientEmails,
          subject: `Nouveau lead – ${lead.prestation || "Demande"} – ${lead.ville || "N/A"}`,
          html: emailHtml,
        }),
      });

      if (!resendRes.ok) {
        const err = await resendRes.text();
        throw new Error(`Resend error: ${err}`);
      }

      // 4. Update status in Sheet
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateStatus",
          row: parseInt(row),
          status: "approuvé",
          sent_to: clientEmails.join(", "),
          sent_at: new Date().toISOString(),
        }),
      });

      return json(200, { success: true, sent_to: clientEmails });
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

function buildEmailHtml(lead) {
  const date = lead.created_at
    ? new Date(lead.created_at).toLocaleString("fr-FR", {
        timeZone: "Europe/Paris",
      })
    : "N/A";

  const prestationLabels = {
    "fin-chantier": "Nettoyage fin de chantier",
    "etat-lieux": "Nettoyage avant état des lieux",
    bureaux: "Entretien de bureaux",
    copropriete: "Nettoyage copropriété",
    "locaux-commerciaux": "Nettoyage locaux commerciaux",
    industriel: "Nettoyage industriel",
    vitres: "Nettoyage de vitres",
    "remise-etat": "Remise en état",
    autre: "Autre",
  };

  const prestationLabel =
    prestationLabels[lead.prestation] || lead.prestation || "N/A";

  return `
<div style="font-family: -apple-system, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #1a365d; color: #fff; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; font-size: 20px; font-weight: 600;">Nouveau Lead AlloPropreté</h1>
    <p style="margin: 8px 0 0; opacity: 0.8; font-size: 14px;">Formulaire : ${lead.form_name || "devis"}</p>
  </div>
  <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 10px 0; font-weight: 600; color: #475569; width: 130px; vertical-align: top;">Nom</td>
        <td style="padding: 10px 0; color: #1e293b;">${lead.prenom || ""} ${lead.nom || ""}</td>
      </tr>
      <tr style="border-top: 1px solid #e2e8f0;">
        <td style="padding: 10px 0; font-weight: 600; color: #475569; vertical-align: top;">Email</td>
        <td style="padding: 10px 0;"><a href="mailto:${lead.email}" style="color: #059669;">${lead.email || "N/A"}</a></td>
      </tr>
      <tr style="border-top: 1px solid #e2e8f0;">
        <td style="padding: 10px 0; font-weight: 600; color: #475569; vertical-align: top;">Téléphone</td>
        <td style="padding: 10px 0;"><a href="tel:${lead.telephone}" style="color: #059669;">${lead.telephone || "N/A"}</a></td>
      </tr>
      <tr style="border-top: 1px solid #e2e8f0;">
        <td style="padding: 10px 0; font-weight: 600; color: #475569; vertical-align: top;">Ville</td>
        <td style="padding: 10px 0; color: #1e293b;">${lead.ville || "N/A"}</td>
      </tr>
      <tr style="border-top: 1px solid #e2e8f0;">
        <td style="padding: 10px 0; font-weight: 600; color: #475569; vertical-align: top;">Prestation</td>
        <td style="padding: 10px 0; color: #1e293b;">${prestationLabel}</td>
      </tr>
    </table>
    <div style="margin-top: 16px; padding: 16px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0;">
      <strong style="color: #475569; font-size: 14px;">Détails :</strong>
      <p style="margin: 8px 0 0; color: #1e293b; line-height: 1.6;">${(lead.details || "Aucun détail").replace(/\n/g, "<br>")}</p>
    </div>
    <p style="color: #94a3b8; font-size: 12px; margin-top: 16px; text-align: center;">
      Reçu le ${date} · Envoyé via AlloPropreté Admin
    </p>
  </div>
</div>`;
}
