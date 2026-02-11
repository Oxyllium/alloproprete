// ============================================================
// Google Apps Script – Oxyllium Leads Lead Management
// Déployer en tant qu'Application Web (accès : Tous)
// Emails envoyés via Gmail (MailApp) – gratuit
// ============================================================

var SHEET_LEADS = "Leads";
var SHEET_CONFIG = "Config";

// ── All requests via GET (POST redirect issues with Google Apps Script) ──
function doGet(e) {
  var action = (e.parameter && e.parameter.action) || "";

  if (action === "getLeads") return jsonResponse(getLeads());
  if (action === "getLead") return jsonResponse(getLead(e.parameter.row));
  if (action === "getConfig") return jsonResponse(getConfig());

  // Write actions also via GET (to avoid POST redirect issues)
  if (action === "addLead") return jsonResponse(addLead(JSON.parse(e.parameter.data)));
  if (action === "updateStatus") return jsonResponse(updateStatus(JSON.parse(e.parameter.data)));
  if (action === "saveConfig") return jsonResponse(saveConfig(JSON.parse(e.parameter.data)));
  if (action === "approveLead") return jsonResponse(approveLead(e.parameter.row, e.parameter.leadType || "", e.parameter.priceTTC || ""));

  return jsonResponse({ error: "Unknown action: " + action });
}

// ── POST requests (kept as fallback) ──
function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action || "";

  if (action === "addLead") return jsonResponse(addLead(body.data));
  if (action === "updateStatus") return jsonResponse(updateStatus(body));
  if (action === "saveConfig") return jsonResponse(saveConfig(body));
  if (action === "approveLead") return jsonResponse(approveLead(body.row));

  return jsonResponse({ error: "Unknown POST action" });
}

// ── Add a new lead ──
function addLead(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_LEADS);

  sheet.appendRow([
    new Date().toISOString(),
    data.form_name || "",
    data.nom || "",
    data.prenom || "",
    data.email || "",
    data.telephone || "",
    data.ville || "",
    data.prestation || "",
    data.details || "",
    "nouveau",
    "",
    "",
    data.source_url || "",
    "",
    "",
    data.msclkid || ""
  ]);

  return { success: true };
}

// ── Get all leads ──
function getLeads() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_LEADS);
  var data = sheet.getDataRange().getValues();

  if (data.length <= 1) return { leads: [] };

  var headers = data[0];
  var leads = [];

  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    row._row = i + 1;
    leads.push(row);
  }

  leads.reverse();
  return { leads: leads };
}

// ── Get a single lead by row number ──
function getLead(rowNum) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_LEADS);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var values = sheet.getRange(parseInt(rowNum), 1, 1, sheet.getLastColumn()).getValues()[0];

  var lead = {};
  for (var j = 0; j < headers.length; j++) {
    lead[headers[j]] = values[j];
  }
  lead._row = parseInt(rowNum);
  return lead;
}

// ── Approve lead: send email + update status ──
function approveLead(rowNum, leadType, priceTTC) {
  var lead = getLead(rowNum);
  var config = getConfig();
  var clientEmails = config.client_emails || [];

  if (clientEmails.length === 0) {
    return { error: "Aucun email client configuré. Allez dans Paramètres." };
  }

  var prestationLabels = {
    "fin-chantier": "Nettoyage fin de chantier",
    "etat-lieux": "Nettoyage avant état des lieux",
    "bureaux": "Entretien de bureaux",
    "copropriete": "Nettoyage copropriété",
    "locaux-commerciaux": "Nettoyage locaux commerciaux",
    "industriel": "Nettoyage industriel",
    "vitres": "Nettoyage de vitres",
    "remise-etat": "Remise en état",
    "autre": "Autre"
  };

  var presta = prestationLabels[lead.prestation] || lead.prestation || "Demande";
  var subject = "Nouveau lead – " + presta + " – " + (lead.ville || "N/A");

  var htmlBody = ""
    + "<div style='font-family: -apple-system, Arial, sans-serif; max-width: 600px; margin: 0 auto;'>"
    + "<div style='background: #1a365d; color: #fff; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;'>"
    + "<h1 style='margin: 0; font-size: 20px; font-weight: 600;'>Nouveau Lead Oxyllium Leads</h1>"
    + "<p style='margin: 8px 0 0; opacity: 0.8; font-size: 14px;'>Formulaire : " + (lead.form_name || "devis") + "</p>"
    + "</div>"
    + "<div style='padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none;'>"
    + "<table style='width: 100%; border-collapse: collapse;'>"
    + "<tr>"
    + "<td style='padding: 10px 0; font-weight: 600; color: #475569; width: 130px;'>Nom</td>"
    + "<td style='padding: 10px 0; color: #1e293b;'>" + (lead.prenom || "") + " " + (lead.nom || "") + "</td>"
    + "</tr>"
    + "<tr style='border-top: 1px solid #e2e8f0;'>"
    + "<td style='padding: 10px 0; font-weight: 600; color: #475569;'>Email</td>"
    + "<td style='padding: 10px 0;'><a href='mailto:" + (lead.email || "") + "' style='color: #059669;'>" + (lead.email || "N/A") + "</a></td>"
    + "</tr>"
    + "<tr style='border-top: 1px solid #e2e8f0;'>"
    + "<td style='padding: 10px 0; font-weight: 600; color: #475569;'>Téléphone</td>"
    + "<td style='padding: 10px 0;'><a href='tel:" + (lead.telephone || "") + "' style='color: #059669;'>" + (lead.telephone || "N/A") + "</a></td>"
    + "</tr>"
    + "<tr style='border-top: 1px solid #e2e8f0;'>"
    + "<td style='padding: 10px 0; font-weight: 600; color: #475569;'>Ville</td>"
    + "<td style='padding: 10px 0; color: #1e293b;'>" + (lead.ville || "N/A") + "</td>"
    + "</tr>"
    + "<tr style='border-top: 1px solid #e2e8f0;'>"
    + "<td style='padding: 10px 0; font-weight: 600; color: #475569;'>Prestation</td>"
    + "<td style='padding: 10px 0; color: #1e293b;'>" + presta + "</td>"
    + "</tr>"
    + "</table>"
    + "<div style='margin-top: 16px; padding: 16px; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0;'>"
    + "<strong style='color: #475569; font-size: 14px;'>Détails :</strong>"
    + "<p style='margin: 8px 0 0; color: #1e293b; line-height: 1.6;'>" + (lead.details || "Aucun détail").toString().replace(/\n/g, "<br>") + "</p>"
    + "</div>"
    + (leadType ? "<div style='margin-top: 12px; padding: 14px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;'>"
    + "<table style='width: 100%; border-collapse: collapse;'>"
    + "<tr><td style='font-weight: 600; color: #1e40af; font-size: 14px;'>Type de lead</td><td style='text-align: right; color: #1e40af; font-size: 14px;'>" + leadType + "</td></tr>"
    + "<tr><td style='font-weight: 700; color: #1e40af; font-size: 16px; padding-top: 6px;'>Prix TTC</td><td style='text-align: right; font-weight: 700; color: #1e40af; font-size: 16px; padding-top: 6px;'>" + priceTTC + " €</td></tr>"
    + "</table></div>" : "")
    + "<p style='color: #94a3b8; font-size: 12px; margin-top: 16px; text-align: center;'>"
    + "Envoyé via Oxyllium Leads Admin</p>"
    + "</div>"
    + "</div>";

  for (var i = 0; i < clientEmails.length; i++) {
    MailApp.sendEmail({
      to: clientEmails[i].trim(),
      subject: subject,
      htmlBody: htmlBody,
      name: "Oxyllium Leads"
    });
  }

  updateStatus({
    row: parseInt(rowNum),
    status: "approuvé",
    sent_to: clientEmails.join(", "),
    sent_at: new Date().toISOString(),
    lead_type: leadType || "",
    price_ttc: priceTTC || ""
  });

  return { success: true, sent_to: clientEmails };
}

// ── Update lead status ──
function updateStatus(body) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_LEADS);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var row = parseInt(body.row);
  var statusCol = headers.indexOf("status") + 1;
  var sentToCol = headers.indexOf("sent_to") + 1;
  var sentAtCol = headers.indexOf("sent_at") + 1;
  var leadTypeCol = headers.indexOf("lead_type") + 1;
  var priceTtcCol = headers.indexOf("price_ttc") + 1;

  if (statusCol > 0) sheet.getRange(row, statusCol).setValue(body.status);
  if (body.sent_to && sentToCol > 0) sheet.getRange(row, sentToCol).setValue(body.sent_to);
  if (body.sent_at && sentAtCol > 0) sheet.getRange(row, sentAtCol).setValue(body.sent_at);
  if (body.lead_type && leadTypeCol > 0) sheet.getRange(row, leadTypeCol).setValue(body.lead_type);
  if (body.price_ttc && priceTtcCol > 0) sheet.getRange(row, priceTtcCol).setValue(body.price_ttc);

  return { success: true };
}

// ── Get config (client emails) ──
function getConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_CONFIG);
  var lastRow = sheet.getLastRow();

  if (lastRow <= 1) return { client_emails: [] };

  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var emails = [];
  for (var i = 0; i < values.length; i++) {
    var e = values[i][0].toString().trim();
    if (e !== "") emails.push(e);
  }

  return { client_emails: emails };
}

// ── Save config (client emails) ──
function saveConfig(body) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_CONFIG);
  var emails = body.client_emails || [];

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 1).clearContent();
  }

  for (var i = 0; i < emails.length; i++) {
    sheet.getRange(i + 2, 1).setValue(emails[i]);
  }

  return { success: true };
}

// ── Helper : JSON response ──
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
